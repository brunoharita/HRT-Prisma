-- M8.1: explicit, cumulative Person x Knowledge evidence. Resume text alone never
-- promotes an assessment or practical skill claim. No organization practice source
-- exists in this movement, so demonstrated_skill has no write path.
create table public.person_competency_evidence_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  person_id uuid not null,
  profile_id uuid not null,
  concept_id uuid not null references public.knowledge_concepts(id) on delete restrict,
  nature text not null check (nature in ('contextual','certified')),
  source_index integer not null check (source_index >= 0),
  source_quote text not null check (char_length(btrim(source_quote)) between 5 and 2000),
  credential_name text,
  credential_issuer text,
  decision_reason text not null check (char_length(btrim(decision_reason)) between 10 and 2000),
  decided_by_auth_user_id uuid not null references auth.users(id) on delete restrict,
  decided_at timestamptz not null default now(),
  foreign key (organization_id, person_id) references public.people(organization_id,id) on delete cascade,
  foreign key (organization_id, profile_id) references public.professional_profiles(organization_id,id) on delete cascade,
  unique (profile_id, concept_id, nature, source_index),
  check ((nature='contextual' and credential_name is null and credential_issuer is null)
    or (nature='certified' and coalesce(char_length(btrim(credential_name)),0) >= 2
      and coalesce(char_length(btrim(credential_issuer)),0) >= 2))
);
create index person_competency_evidence_links_person_idx
  on public.person_competency_evidence_links(organization_id,person_id,profile_id,concept_id);
create function private.m81_validate_person_competency_link() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_profile public.professional_profiles; v_concept public.knowledge_concepts; v_source jsonb; v_text text;
begin
  select * into v_profile from public.professional_profiles where id=new.profile_id and organization_id=new.organization_id;
  select * into v_concept from public.knowledge_concepts where id=new.concept_id;
  if v_profile.id is null or v_profile.person_id is distinct from new.person_id
    or v_profile.review_status<>'approved' or v_profile.superseded_at is not null
    or v_concept.id is null or v_concept.status<>'approved'
    or v_concept.concept_type in ('occupation','certification')
    or (v_concept.scope='organization' and v_concept.organization_id is distinct from new.organization_id) then
    raise exception 'COMPETENCY_EVIDENCE_SCOPE_INVALID' using errcode='42501';
  end if;
  if new.nature='contextual' then
    v_source:=v_profile.profile_data->'experiences'->new.source_index;
    v_text:=concat_ws(' ',v_source->>'role',v_source->>'organization',v_source->>'description',v_source->>'evidenceText');
    if v_source is null or jsonb_typeof(v_source)<>'object'
      or char_length(btrim(coalesce(v_source->>'description','')))<15
      or char_length(btrim(new.source_quote))<15
      or pg_catalog.strpos(pg_catalog.lower(v_text),pg_catalog.lower(btrim(new.source_quote)))=0 then
      raise exception 'COMPETENCY_CONTEXT_SOURCE_INVALID' using errcode='23514';
    end if;
  else
    v_source:=v_profile.profile_data->'certifications'->new.source_index;
    if v_source is null or jsonb_typeof(v_source)<>'string'
      or btrim(new.source_quote)<>btrim(v_source#>>'{}') then
      raise exception 'COMPETENCY_CERTIFICATION_SOURCE_INVALID' using errcode='23514';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.m81_validate_person_competency_link() from public,anon,authenticated;
create trigger m81_validate_person_competency_link before insert or update on public.person_competency_evidence_links
  for each row execute function private.m81_validate_person_competency_link();
alter table public.person_competency_evidence_links enable row level security;
create policy person_competency_evidence_links_read on public.person_competency_evidence_links for select to authenticated
  using ((select private.has_org_role(organization_id,
    array['super_admin','owner','admin','recruiter','member']::public.membership_role[])));
revoke all on public.person_competency_evidence_links from public, anon, authenticated;
grant select on public.person_competency_evidence_links to authenticated;
grant all on public.person_competency_evidence_links to service_role;

create function public.link_person_competency_evidence(
  p_organization_id uuid, p_person_id uuid, p_profile_id uuid, p_concept_id uuid,
  p_nature text, p_source_index integer, p_source_quote text,
  p_credential_name text, p_credential_issuer text, p_reason text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_profile public.professional_profiles; v_concept public.knowledge_concepts;
  v_source jsonb; v_source_text text; v_id uuid; v_existing public.person_competency_evidence_links;
begin
  v_actor := private.require_knowledge_admin(p_organization_id);
  if p_nature not in ('contextual','certified') or p_source_index is null or p_source_index < 0
    or char_length(btrim(coalesce(p_reason,''))) < 10 then
    raise exception 'COMPETENCY_EVIDENCE_INPUT_INVALID' using errcode='22023';
  end if;
  select * into v_profile from public.professional_profiles
    where id=p_profile_id and organization_id=p_organization_id and person_id=p_person_id
      and review_status='approved' and superseded_at is null for share;
  if v_profile.id is null then raise exception 'PUBLISHED_PROFILE_REQUIRED' using errcode='40001'; end if;
  select * into v_concept from public.knowledge_concepts where id=p_concept_id and status='approved'
    and concept_type not in ('occupation','certification')
    and (scope='global' or (scope='organization' and organization_id=p_organization_id));
  if v_concept.id is null then raise exception 'COMPETENCY_CONCEPT_DENIED' using errcode='42501'; end if;
  if p_nature='contextual' then
    v_source := v_profile.profile_data->'experiences'->p_source_index;
    v_source_text := concat_ws(' ',v_source->>'role',v_source->>'organization',v_source->>'description',v_source->>'evidenceText');
    if v_source is null or jsonb_typeof(v_source)<>'object'
      or char_length(btrim(coalesce(p_source_quote,'')))<15
      or pg_catalog.strpos(pg_catalog.lower(v_source_text),pg_catalog.lower(btrim(p_source_quote)))=0
      or char_length(btrim(coalesce(v_source->>'description','')))<15
      or p_credential_name is not null or p_credential_issuer is not null then
      raise exception 'CONTEXTUAL_SOURCE_NOT_SUPPORTED' using errcode='22023';
    end if;
  else
    v_source := v_profile.profile_data->'certifications'->p_source_index;
    v_source_text := v_source #>> '{}';
    if v_source is null or jsonb_typeof(v_source)<>'string'
      or char_length(btrim(coalesce(v_source_text,'')))<5
      or btrim(coalesce(p_source_quote,''))<>btrim(v_source_text)
      or char_length(btrim(coalesce(p_credential_name,'')))<2
      or char_length(btrim(coalesce(p_credential_issuer,'')))<2 then
      raise exception 'CERTIFICATION_SOURCE_NOT_SUPPORTED' using errcode='22023';
    end if;
  end if;
  insert into public.person_competency_evidence_links
    (organization_id,person_id,profile_id,concept_id,nature,source_index,source_quote,
      credential_name,credential_issuer,decision_reason,decided_by_auth_user_id)
  values(p_organization_id,p_person_id,p_profile_id,p_concept_id,p_nature,p_source_index,btrim(p_source_quote),
    nullif(btrim(p_credential_name),''),nullif(btrim(p_credential_issuer),''),btrim(p_reason),v_actor)
  on conflict (profile_id,concept_id,nature,source_index) do nothing
  returning id into v_id;
  if v_id is null then
    select * into v_existing from public.person_competency_evidence_links
      where profile_id=p_profile_id and concept_id=p_concept_id and nature=p_nature and source_index=p_source_index;
    if v_existing.id is null or v_existing.source_quote is distinct from btrim(p_source_quote)
      or v_existing.credential_name is distinct from nullif(btrim(p_credential_name),'')
      or v_existing.credential_issuer is distinct from nullif(btrim(p_credential_issuer),'')
      or v_existing.decision_reason is distinct from btrim(p_reason) then
      raise exception 'COMPETENCY_EVIDENCE_ALREADY_LINKED' using errcode='23505';
    end if;
    v_id := v_existing.id;
  end if;
  return v_id;
end $$;
revoke all on function public.link_person_competency_evidence(uuid,uuid,uuid,uuid,text,integer,text,text,text,text) from public, anon;
grant execute on function public.link_person_competency_evidence(uuid,uuid,uuid,uuid,text,integer,text,text,text,text) to authenticated;

create or replace function public.load_person_professional_evidence_map_v6(
  p_organization_id uuid, p_person_id uuid
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_base jsonb; v_associations jsonb; v_linked jsonb;
begin
  v_base := public.load_person_professional_evidence_map_v5(p_organization_id,p_person_id);
  select coalesce(jsonb_agg(
    (item - 'nature' - 'concept' - 'explanation') || jsonb_build_object(
      'nature', case when item->>'nature'='demonstrated' then
        case when (item#>>'{verification,qualifiesAsVerified}')::boolean then 'verified_assessment'
          else 'assessment_result' end else item->>'nature' end,
      'concept', (item->'concept') || jsonb_build_object(
        'classificationState',case when subgroup.id is null then 'pending' else 'classified' end,
        'classification',case when subgroup.id is null then 'null'::jsonb else jsonb_build_object(
          'macroGroupCode',macro.code,'macroGroupLabel',macro.label,
          'subgroupId',subgroup.id,'subgroupCode',subgroup.code,'subgroupLabel',subgroup.label,
          'classificationVersion',classification.version,'taxonomyVersion',classification.taxonomy_version) end),
      'explanation',(item->'explanation') || jsonb_build_object('taxonomyVersion','competency-taxonomy-2.0.0')
    ) order by ordinal),'[]'::jsonb) into v_associations
  from jsonb_array_elements(v_base->'associations') with ordinality rows(item,ordinal)
  left join public.knowledge_competency_classifications classification
    on classification.concept_id=(item#>>'{concept,id}')::uuid and classification.is_current
  left join public.competency_subgroups subgroup on subgroup.id=classification.subgroup_id
  left join public.competency_macro_groups macro on macro.code=subgroup.macro_group_code
  where item#>>'{concept,type}' not in ('occupation','certification')
    and not (item->>'nature'='contextual' and item->>'id' like 'profile-competency:%');
  select coalesce(jsonb_agg(jsonb_build_object(
    'id','curated-evidence:'||link.id::text,'nature',link.nature,
    'concept',jsonb_build_object('id',concept.id,'label',concept.canonical_label,'type',concept.concept_type,
      'scope',concept.scope,'version',concept.version,
      'classificationState',case when subgroup.id is null then 'pending' else 'classified' end,
      'classification',case when subgroup.id is null then 'null'::jsonb else jsonb_build_object(
        'macroGroupCode',macro.code,'macroGroupLabel',macro.label,
        'subgroupId',subgroup.id,'subgroupCode',subgroup.code,'subgroupLabel',subgroup.label,
        'classificationVersion',classification.version,'taxonomyVersion',classification.taxonomy_version) end),
    'observedTerm',concept.canonical_label,
    'evidence',jsonb_build_object('id',link.id,
      'title',case when link.nature='certified' then link.credential_name else concept.canonical_label end,
      'fact',case when link.nature='certified' then 'Credencial declarada, emissor informado e vínculo confirmado por operador autorizado.'
        else 'Uso em experiência publicada associado por operador autorizado; permanece autorrelato.' end,
      'quote',link.source_quote,'recordedAt',link.decided_at,
      'source',jsonb_build_object('kind',case when profile.source_document_id is null then 'published_profile' else 'document' end,
        'label',case when link.nature='certified' then 'Credencial: '||link.credential_issuer else 'Experiência no Perfil publicado' end,
        'documentId',profile.source_document_id,'filename',document.filename,'pageNumber',null,
        'fieldPath',case when link.nature='certified' then 'certifications' else 'experiences.'||link.source_index::text||'.description' end,
        'reviewId',profile.review_id,'evidenceLinkId',null,'spatialRegionId',null)),
    'explanation',jsonb_build_object('method','Vínculo factual confirmado por operador autorizado.',
      'methodVersion','competency-evidence-link-1.0.0','taxonomyVersion','competency-taxonomy-2.0.0',
      'knowledgeGlobalVersion',null,'knowledgeOrganizationVersion',null,'sourceName',null,'sourceVersion',null,
      'humanDecision','Vínculo confirmado por operador autorizado.'),
    'verification',null
  ) order by link.decided_at,link.id),'[]'::jsonb) into v_linked
  from public.person_competency_evidence_links link
  join public.professional_profiles profile on profile.id=link.profile_id and profile.organization_id=link.organization_id
    and profile.id=(v_base#>>'{profile,id}')::uuid
  join public.knowledge_concepts concept on concept.id=link.concept_id and concept.status='approved'
  left join public.documents document on document.id=profile.source_document_id and document.organization_id=profile.organization_id
  left join public.knowledge_competency_classifications classification on classification.concept_id=concept.id and classification.is_current
  left join public.competency_subgroups subgroup on subgroup.id=classification.subgroup_id
  left join public.competency_macro_groups macro on macro.code=subgroup.macro_group_code
  where link.organization_id=p_organization_id and link.person_id=p_person_id;
  return (v_base-'contractVersion'-'taxonomyVersions'-'associations') || jsonb_build_object(
    'contractVersion','person-professional-evidence-4.0.0',
    'taxonomyVersions',jsonb_build_object('occupation','position-taxonomy-1.0.0',
      'competency','competency-taxonomy-2.0.0'),
    'associations',v_associations||v_linked);
end $$;
revoke all on function public.load_person_professional_evidence_map_v6(uuid,uuid) from public,anon;
grant execute on function public.load_person_professional_evidence_map_v6(uuid,uuid) to authenticated;
