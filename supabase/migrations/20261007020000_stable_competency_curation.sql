-- Stable human decisions for normalized fragments. No raw Profile or old run is rewritten.
do $$ begin
  if (select md5(regexp_replace(prosrc,'\s','','g')) from pg_proc where oid='public.load_person_professional_evidence_map_v3(uuid,uuid)'::regprocedure)<>'9c091f4516d9fb16bc90c0ab372215aa'
    or (select md5(regexp_replace(prosrc,'\s','','g')) from pg_proc where oid='public.complete_profile_competency_normalization(uuid,uuid,jsonb,text,text,integer,integer)'::regprocedure)<>'b8cb06b9d477cd53a143dfec1787826e'
    or (select md5(regexp_replace(prosrc,'\s','','g')) from pg_proc where oid='private.m76_curate_profile_competency(uuid,uuid,uuid,integer,text,text,public.knowledge_scope,text,uuid,text,text,public.knowledge_concept_type)'::regprocedure)<>'166f4cabfeb37ca29277bac4a2888c7f' then
    raise exception 'CURATION_BASELINE_DRIFT';
  end if;
end $$;
create table public.profile_competency_curation_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null,
  profile_id uuid not null,
  original_term text not null check (length(btrim(original_term)) > 0),
  source_text text not null check (length(btrim(source_text)) > 0 and strpos(original_term,source_text)>0),
  normalized_label text not null,
  concept_id uuid not null references public.knowledge_concepts(id) on delete restrict,
  knowledge_term_id uuid references public.knowledge_terms(id) on delete restrict,
  proposal_id uuid references public.knowledge_proposals(id) on delete restrict,
  decided_by_auth_user_id uuid not null references auth.users(id) on delete restrict,
  decided_at timestamptz not null default now(),
  recorded_at timestamptz not null default now(),
  method_version text not null default 'stable-competency-curation-1.0.0',
  origin text not null check (origin in ('curation','recovered_knowledge')),
  foreign key (organization_id,person_id) references public.people(organization_id,id) on delete cascade,
  foreign key (organization_id,profile_id) references public.professional_profiles(organization_id,id) on delete cascade,
  unique (organization_id,profile_id,original_term,source_text),
  check (knowledge_term_id is not null or proposal_id is not null)
);
alter table public.profile_competency_curation_decisions enable row level security;
revoke all on public.profile_competency_curation_decisions from public,anon,authenticated;
create index profile_competency_curation_person_idx on public.profile_competency_curation_decisions
  (organization_id,person_id,original_term,source_text);

-- Private lookup: exact grounded declaration/fragment, same Person and tenant, no future profile.
-- Called only under existing guarded projection / worker / curation functions.
create function private.find_competency_curation_decision(p_org uuid,p_person uuid,p_profile uuid,p_original text,p_source text)
returns public.profile_competency_curation_decisions language sql stable security invoker set search_path='' as $$
  select d.* from public.profile_competency_curation_decisions d
  join public.professional_profiles origin on origin.id=d.profile_id and origin.organization_id=d.organization_id
    and origin.person_id=d.person_id and origin.review_status='approved'
  join public.professional_profiles target on target.id=p_profile and target.organization_id=p_org
    and target.person_id=p_person and target.review_status='approved'
  where d.organization_id=p_org and d.person_id=p_person and d.original_term=p_original and d.source_text=p_source
    and origin.profile_version<=target.profile_version and origin.created_at<=target.created_at
  order by (d.profile_id=p_profile) desc,origin.profile_version desc,d.decided_at desc,d.id limit 1
$$;
revoke all on function private.find_competency_curation_decision(uuid,uuid,uuid,text,text) from public,anon,authenticated;

-- Recovery is not a new decision. Only existing, unambiguous human approvals on current grounded atoms.
with basis as (
  select distinct on (r.profile_id) r.* from public.profile_competency_normalization_runs r
  join public.professional_profiles p on p.id=r.profile_id and p.organization_id=r.organization_id
    and p.review_status='approved' and p.superseded_at is null
  where r.status='complete' and r.method_version='declared-competency-normalization-1.0.0'
  order by r.profile_id,r.sequence desc
), candidates as (
  select b.organization_id,p.person_id,b.profile_id,item,t.id term_id,t.concept_id,t.approved_by_auth_user_id,
    coalesce(proposal.decided_at,changes.created_at,t.created_at) decided_at,proposal.id proposal_id,
    row_number() over (partition by b.organization_id,b.profile_id,item->>'originalTerm',item->>'sourceText'
      order by (t.scope='organization') desc,t.created_at desc,t.id) choice
  from basis b join public.professional_profiles p on p.id=b.profile_id and p.organization_id=b.organization_id
  cross join lateral jsonb_array_elements(b.result) item
  join public.knowledge_terms t on t.normalized_term=private.normalize_knowledge_term(item->>'normalizedTerm')
    and t.status='approved' and not t.ambiguous and t.approved_by_auth_user_id is not null
    and (t.scope='global' or t.organization_id=b.organization_id)
  join public.knowledge_concepts c on c.id=t.concept_id and c.status='approved'
    and c.concept_type not in ('occupation','certification') and (c.scope='global' or c.organization_id=b.organization_id)
  left join lateral (select q.id,q.decided_at from public.knowledge_proposals q
    where q.status='approved' and q.published_concept_id=t.concept_id
      and q.decided_by_auth_user_id=t.approved_by_auth_user_id
      and private.normalize_knowledge_term(q.original_proposal->>'observed_term')=t.normalized_term
    order by q.decided_at desc limit 1) proposal on true
  left join lateral (select cs.created_at from public.knowledge_change_sets cs
    cross join lateral jsonb_array_elements(cs.changed_entities) e
    where cs.scope=t.scope and cs.organization_id is not distinct from t.organization_id and cs.version=t.version
      and e->>'operation'='approve_alias' and e->>'concept_id'=t.concept_id::text
      and e->>'normalized_term'=t.normalized_term order by cs.created_at desc limit 1) changes on true
  where ((t.term_type='alias' and changes.created_at is not null) or proposal.id is not null)
    and p.profile_data->'competencies'->>((item->>'originalIndex')::integer)=item->>'originalTerm'
    and length(btrim(item->>'sourceText'))>0 and strpos(item->>'originalTerm',item->>'sourceText')>0
    and private.resolve_normalized_competency(b.organization_id,item->>'normalizedTerm',jsonb_build_array(item->>'normalizedTerm'))->>'conceptId'=t.concept_id::text
)
insert into public.profile_competency_curation_decisions
  (organization_id,person_id,profile_id,original_term,source_text,normalized_label,concept_id,
   knowledge_term_id,proposal_id,decided_by_auth_user_id,decided_at,origin)
select organization_id,person_id,profile_id,item->>'originalTerm',item->>'sourceText',item->>'normalizedTerm',concept_id,
  term_id,proposal_id,approved_by_auth_user_id,decided_at,'recovered_knowledge' from candidates where choice=1
on conflict (organization_id,profile_id,original_term,source_text) do nothing;

-- A global proposal is not complete until an authorized reviewer actually approves it.
create function private.persist_approved_competency_fragment() returns trigger
language plpgsql security invoker set search_path='' as $$
declare target jsonb:=new.original_proposal->'curated_profile_fragment'; p public.professional_profiles; c public.knowledge_concepts;
begin
  if target is null or new.status<>'approved' or new.published_concept_id is null
    or old.status='approved' then return new; end if;
  select * into p from public.professional_profiles where id=(target->>'profileId')::uuid
    and organization_id=(target->>'organizationId')::uuid and person_id=(target->>'personId')::uuid
    and review_status='approved';
  select * into c from public.knowledge_concepts where id=new.published_concept_id and status='approved'
    and concept_type not in ('occupation','certification') and (scope='global' or organization_id=p.organization_id);
  if p.id is null or c.id is null or new.decided_by_auth_user_id is null
    or not exists(select 1 from jsonb_array_elements_text(p.profile_data->'competencies') t where t=target->>'originalTerm')
    or coalesce(length(btrim(target->>'sourceText')),0)=0 or strpos(target->>'originalTerm',target->>'sourceText')=0 then
    raise exception 'CURATION_APPROVAL_TARGET_INVALID' using errcode='23514';
  end if;
  insert into public.profile_competency_curation_decisions
    (organization_id,person_id,profile_id,original_term,source_text,normalized_label,concept_id,proposal_id,
     decided_by_auth_user_id,decided_at,origin)
  values(p.organization_id,p.person_id,p.id,target->>'originalTerm',target->>'sourceText',c.canonical_label,c.id,new.id,
    new.decided_by_auth_user_id,coalesce(new.decided_at,now()),'curation')
  on conflict(organization_id,profile_id,original_term,source_text) do nothing;
  if exists(select 1 from public.profile_competency_curation_decisions where organization_id=p.organization_id
    and profile_id=p.id and original_term=target->>'originalTerm' and source_text=target->>'sourceText' and concept_id<>c.id) then
    raise exception 'CURATION_HUMAN_DECISION_CONFLICT' using errcode='23505';
  end if;
  return new;
end $$;
revoke all on function private.persist_approved_competency_fragment() from public,anon,authenticated;
create trigger persist_approved_competency_fragment after update of status,published_concept_id on public.knowledge_proposals
  for each row execute function private.persist_approved_competency_fragment();

-- M7.4: contextual curation reuses Knowledge decisions; no profile mutation or model call.
-- V1/V2 remain intact for old clients. Same evidence shape; human method is explicitly versioned.
create or replace function public.load_person_professional_evidence_map_v3(p_organization_id uuid,p_person_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  v_base jsonb; v_item jsonb; v_items jsonb:='[]'; v_extra jsonb:='[]'; v_term public.knowledge_terms;
  v_concept public.knowledge_concepts; v_resolution jsonb; v_ordinal integer:=0; v_associations jsonb;
  v_profile public.professional_profiles; v_decision record; v_stable public.profile_competency_curation_decisions; v_global bigint; v_org bigint;
begin
  -- Existing RPC is the read authorization boundary, including active user and tenant checks.
  v_base:=public.load_person_professional_evidence_map_v2(p_organization_id,p_person_id);
  select * into v_profile from public.professional_profiles where id=(v_base#>>'{profile,id}')::uuid and organization_id=p_organization_id;
  select coalesce(max(version) filter(where scope='global'),0),coalesce(max(version) filter(where scope='organization' and organization_id=p_organization_id),0)
    into v_global,v_org from public.knowledge_change_sets;
  for v_item in select value from jsonb_array_elements(v_base#>'{normalization,items}') loop
    v_ordinal:=v_ordinal+1;
    select * into v_stable from private.find_competency_curation_decision(p_organization_id,p_person_id,v_profile.id,
      v_item->>'originalTerm',v_item->>'sourceText');
    if v_stable.id is not null then
      select * into v_concept from public.knowledge_concepts where id=v_stable.concept_id
        and status='approved' and concept_type not in ('occupation','certification')
        and (scope='global' or organization_id=p_organization_id);
      if v_concept.id is null then
        v_items:=v_items||jsonb_build_array(v_item||jsonb_build_object('state','source_unavailable','conceptId',null,
          'reason','Decisão humana preservada; o conceito associado está indisponível neste alcance.'));
        continue;
      end if;
      v_resolution:=jsonb_build_object('state','human_preserved','conceptId',v_concept.id,'conceptVersion',v_concept.version,
        'sourceName',null,'sourceVersion',null,'reason','Associação humana preservada para a declaração e o trecho originais.');
      select v_stable.decided_at created_at,'Decisão estável de curadoria registrada.' reason into v_decision;
    else
    -- A reviewed raw-profile decision already represented by V1 always wins.
    if v_item->>'state'='human_preserved' then v_items:=v_items||jsonb_build_array(v_item);continue;end if;
    select term.* into v_term from public.knowledge_terms term
      join public.knowledge_concepts concept on concept.id=term.concept_id
      where term.normalized_term=private.normalize_knowledge_term(v_item->>'normalizedTerm')
        and term.status='approved' and term.term_type='alias' and term.approved_by_auth_user_id is not null and not term.ambiguous
        and (term.scope='global' or term.organization_id=p_organization_id)
        and concept.status='approved' and concept.concept_type<>'occupation'
        and (concept.scope='global' or concept.organization_id=p_organization_id)
      order by case when term.scope='organization' then 0 else 1 end,term.version desc,term.id limit 1;
    if v_term.id is null then v_items:=v_items||jsonb_build_array(v_item);continue;end if;
    v_resolution:=private.resolve_normalized_competency(p_organization_id,v_item->>'normalizedTerm',jsonb_build_array(v_item->>'normalizedTerm'));
    if v_resolution->>'state'<>'resolved' or (v_resolution->>'conceptId')::uuid<>v_term.concept_id then
      v_items:=v_items||jsonb_build_array(v_item);continue;
    end if;
    select * into v_concept from public.knowledge_concepts where id=v_term.concept_id;
    select changes.created_at,entity->>'reason' reason into v_decision
      from public.knowledge_change_sets changes cross join lateral jsonb_array_elements(changes.changed_entities) entity
      where changes.scope=v_term.scope and changes.organization_id is not distinct from v_term.organization_id
        and changes.version=v_term.version and entity->>'operation'='approve_alias'
        and entity->>'concept_id'=v_term.concept_id::text and entity->>'normalized_term'=v_term.normalized_term
      order by changes.created_at desc limit 1;
    end if;
    v_items:=v_items||jsonb_build_array(v_item||v_resolution);
    -- Replace only the automatic evidence for this atom, never contextual/demonstrated evidence.
    select coalesce(jsonb_agg(a),'[]') into v_associations from jsonb_array_elements(v_base->'associations') a
      where not (a->>'id' like 'normalized:%' and split_part(a->>'id',':',3)=v_ordinal::text);
    v_base:=jsonb_set(v_base,'{associations}',v_associations);
    v_extra:=v_extra||jsonb_build_array(jsonb_build_object(
      'id','curated:'||v_profile.id::text||':'||v_ordinal,'nature','declared',
      'concept',jsonb_build_object('id',v_concept.id,'label',v_concept.canonical_label,'type',v_concept.concept_type,'scope',v_concept.scope,'version',v_concept.version),
      'observedTerm',v_item->>'originalTerm',
      'evidence',jsonb_build_object('id','curated:'||v_profile.id::text||':'||v_ordinal,'title',v_item->>'normalizedTerm',
        'fact','Competência declarada associada por decisão humana; sem atribuir proficiência.','quote',v_item->>'sourceText',
        'recordedAt',coalesce(v_decision.created_at,v_profile.approved_at,v_profile.created_at),
        'source',jsonb_build_object('kind','published_profile','label','Perfil publicado v'||v_profile.profile_version,
          'documentId',v_profile.source_document_id,'filename',null,'pageNumber',null,'fieldPath','competencies','reviewId',v_profile.review_id,'evidenceLinkId',null,'spatialRegionId',null)),
      'explanation',jsonb_build_object('method',case when v_stable.id is null then 'Alias aprovado por curadoria humana na Knowledge; declaração original preservada.' else 'Declaração e trecho associados por decisão humana estável, com proveniência preservada.' end,
        'methodVersion',case when v_stable.id is null then 'profile-competency-curation-1.0.0' else v_stable.method_version end,'taxonomyVersion','position-taxonomy-1.0.0',
        'knowledgeGlobalVersion',v_global,'knowledgeOrganizationVersion',v_org,'sourceName',v_resolution->>'sourceName','sourceVersion',v_resolution->>'sourceVersion',
        'humanDecision',case when v_stable.id is not null then 'Associação confirmada por operador autorizado; decisão '||v_stable.id::text else concat('Alias ',case when v_term.scope='global' then 'Global' else 'da empresa' end,' aprovado. ',coalesce(v_decision.reason,'Decisão registrada na Knowledge.')) end),
      'verification',null));
  end loop;
  v_base:=jsonb_set(v_base,'{normalization,items}',v_items);
  v_base:=jsonb_set(v_base,'{associations}',(v_base->'associations')||v_extra);
  -- Preserve unrelated legacy issues when no normalized items are available.
  if jsonb_array_length(v_items)>0 then
    v_base:=jsonb_set(v_base,'{issues}',coalesce((select jsonb_agg(jsonb_build_object('code',item->>'state','observedTerm',item->>'normalizedTerm','explanation',item->>'reason'))
      from jsonb_array_elements(v_items) item where item->>'state' not in ('resolved','human_preserved')),'[]'));
  end if;
  return v_base;
end $$;
revoke all on function public.load_person_professional_evidence_map_v3(uuid,uuid) from public,anon;
grant execute on function public.load_person_professional_evidence_map_v3(uuid,uuid) to authenticated;


create or replace function private.m76_curate_profile_competency(
  p_organization_id uuid, p_person_id uuid, p_profile_id uuid, p_original_index integer, p_source_text text, p_normalized_term text,
  p_scope public.knowledge_scope, p_action text, p_concept_id uuid, p_proposal_label text, p_proposal_description text,
  p_proposal_type public.knowledge_concept_type
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_profile public.professional_profiles; v_base jsonb; v_item jsonb; v_inbox public.knowledge_inbox; v_proposal uuid; v_result record; v_target uuid; v_term_id uuid; v_actor uuid;
begin
  v_actor:=private.require_knowledge_admin(p_organization_id);
  if p_organization_id is null or p_scope is null or p_action is null or p_action not in ('alias', 'proposal') then raise exception 'CURATION_INPUT_INVALID' using errcode = '22023'; end if;
  if p_scope = 'global' then perform private.require_knowledge_admin(null); end if;
  if p_proposal_description is not null and length(p_proposal_description) > 2000 then raise exception 'CURATION_DESCRIPTION_INVALID' using errcode = '22023'; end if;
  select * into v_profile from public.professional_profiles where id = p_profile_id and organization_id = p_organization_id and person_id = p_person_id
    and review_status = 'approved' and superseded_at is null for update;
  if not found then raise exception 'CURATION_PROFILE_CHANGED' using errcode = '40001'; end if;
  v_base := public.load_person_professional_evidence_map_v5(p_organization_id, p_person_id);
  if v_base#>>'{profile,id}' <> p_profile_id::text then raise exception 'CURATION_PROFILE_CHANGED' using errcode = '40001'; end if;
  select item into v_item from jsonb_array_elements(v_base#>'{normalization,items}') item
    where (item->>'originalIndex')::integer = p_original_index and item->>'sourceText' = p_source_text
      and item->>'normalizedTerm' = p_normalized_term and item->>'state' in ('unresolved', 'ambiguous', 'source_unavailable') limit 1;
  if v_item is null then raise exception 'CURATION_ITEM_CHANGED' using errcode = '40001'; end if;
  if p_action = 'alias' and not exists(select 1 from public.knowledge_concepts where id = p_concept_id and status = 'approved' and concept_type <> 'occupation'
    and (scope = 'global' or (scope = 'organization' and organization_id = p_organization_id)) and (p_scope <> 'global' or scope = 'global')) then
    raise exception 'CURATION_CONCEPT_DENIED' using errcode = '42501'; end if;
  if p_action = 'proposal' and (p_proposal_type is null or p_proposal_type = 'occupation' or coalesce(length(btrim(p_proposal_label)), 0) not between 1 and 240) then
    raise exception 'CURATION_PROPOSAL_INVALID' using errcode = '22023'; end if;
  insert into public.knowledge_inbox(scope, organization_id, fingerprint, original_term, normalized_search_term, language, status)
    values('organization', p_organization_id, encode(extensions.digest(concat_ws('|', 'organization', p_organization_id::text, 'pt-BR', private.normalize_knowledge_term(p_normalized_term)), 'sha256'), 'hex'),
      p_normalized_term, private.normalize_knowledge_term(p_normalized_term), 'pt-BR', 'unresolved') on conflict(scope, organization_id, fingerprint) do nothing;
  select * into v_inbox from public.knowledge_inbox where scope = 'organization' and organization_id = p_organization_id
    and fingerprint = encode(extensions.digest(concat_ws('|', 'organization', p_organization_id::text, 'pt-BR', private.normalize_knowledge_term(p_normalized_term)), 'sha256'), 'hex') for update;
  perform pg_advisory_xact_lock(hashtextextended(concat_ws('|', p_scope::text, case when p_scope = 'organization' then p_organization_id::text else 'global' end), 0));
  if p_action = 'alias' then
    if exists(select 1 from public.knowledge_observations where id = any(v_inbox.observation_ids) and resolved_by_auth_user_id is not null and concept_id is distinct from p_concept_id) then
      raise exception 'CURATION_HUMAN_DECISION_CONFLICT' using errcode = '23505'; end if;
    select * into v_result from private.m76_resolve_knowledge_inbox_alias(v_inbox.id, p_concept_id, p_scope);
  else
    select id into v_proposal from public.knowledge_proposals where inbox_id = v_inbox.id and scope = p_scope and status not in ('rejected', 'approved') order by created_at desc limit 1;
    if v_proposal is not null then raise exception 'CURATION_PROPOSAL_ALREADY_PENDING' using errcode = '23505'; end if;
    v_proposal := private.m76_propose_knowledge_concept_from_inbox(v_inbox.id, p_scope, p_proposal_label, p_proposal_type, p_proposal_description);
  end if;
  -- Persist the target fragment, not a mutable normalized display label or compound observation.
  if p_action='proposal' and p_scope='global' then
    update public.knowledge_proposals set original_proposal=original_proposal||jsonb_build_object('curated_profile_fragment',
      jsonb_build_object('organizationId',p_organization_id,'personId',p_person_id,'profileId',p_profile_id,
        'originalTerm',v_item->>'originalTerm','sourceText',p_source_text)) where id=v_proposal;
  end if;
  v_target:=case when p_action='alias' then p_concept_id else
    (select published_concept_id from public.knowledge_proposals where id=v_proposal and status='approved'
      and scope='organization' and organization_id=p_organization_id) end;
  if v_target is not null then
    select id into v_term_id from public.knowledge_terms where concept_id=v_target and status='approved'
      and approved_by_auth_user_id is not null and normalized_term=private.normalize_knowledge_term(p_normalized_term)
      and (scope='global' or organization_id=p_organization_id)
      order by (scope='organization') desc,created_at desc,id limit 1;
    insert into public.profile_competency_curation_decisions
      (organization_id,person_id,profile_id,original_term,source_text,normalized_label,concept_id,
       knowledge_term_id,proposal_id,decided_by_auth_user_id,origin)
    values(p_organization_id,p_person_id,p_profile_id,v_item->>'originalTerm',p_source_text,p_normalized_term,
      v_target,v_term_id,v_proposal,v_actor,'curation')
    on conflict(organization_id,profile_id,original_term,source_text) do nothing;
    if exists(select 1 from public.profile_competency_curation_decisions where organization_id=p_organization_id
      and profile_id=p_profile_id and original_term=v_item->>'originalTerm' and source_text=p_source_text
      and concept_id<>v_target) then raise exception 'CURATION_HUMAN_DECISION_CONFLICT' using errcode='23505'; end if;
  end if;
  v_base := public.load_person_professional_evidence_map_v5(p_organization_id, p_person_id);
  if v_target is not null and not exists(select 1 from jsonb_array_elements(v_base#>'{normalization,items}') item where
    (item->>'originalIndex')::integer = p_original_index and item->>'sourceText' = p_source_text and item->>'normalizedTerm' = p_normalized_term and item->>'state' in ('resolved', 'human_preserved') and item->>'conceptId'=v_target::text) then
    raise exception 'CURATION_NOT_RESOLVED' using errcode = '40001'; end if;
  return jsonb_build_object('outcome', p_action, 'projection', v_base, 'proposalId', v_proposal);
end;
$$;
revoke all on function private.m76_curate_profile_competency(uuid, uuid, uuid, integer, text, text, public.knowledge_scope, text, uuid, text, text, public.knowledge_concept_type) from public, anon, authenticated;


create or replace function public.complete_profile_competency_normalization(p_run_id uuid,p_lease uuid,p_items jsonb,p_error text default null,p_model text default null,p_input_tokens integer default null,p_output_tokens integer default null) returns void
language plpgsql security definer set search_path='' as $$
declare v_run public.profile_competency_normalization_runs; v_item jsonb; v_result jsonb:='[]'; v_original text; v_resolution jsonb; v_index integer; v_human record; v_stable public.profile_competency_curation_decisions; v_person uuid;
begin
  select * into v_run from public.profile_competency_normalization_runs where id=p_run_id for update;
  if not found or v_run.status<>'processing' or v_run.lease is distinct from p_lease then raise exception 'COMPETENCY_LEASE_INVALID' using errcode='40001'; end if;
  select person_id into v_person from public.professional_profiles where id=v_run.profile_id and organization_id=v_run.organization_id;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>400 then raise exception 'COMPETENCY_ITEMS_INVALID'; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_index:=(v_item->>'originalIndex')::integer;
    v_original:=v_run.original_terms->>v_index;
    if v_index is null or v_index<0 or v_original is null or coalesce(jsonb_typeof(v_item->'sourceText'),'null')<>'string' or length(btrim(v_item->>'sourceText'))=0
      or strpos(v_original,v_item->>'sourceText')=0 or coalesce(length(btrim(v_item->>'normalizedTerm')),0) not between 1 and 240
      or coalesce(jsonb_typeof(v_item->'searchTerms'),'null')<>'array' or jsonb_array_length(v_item->'searchTerms')>4
      or coalesce(v_item->>'method','') not in ('deterministic','semantic_normalization')
      or coalesce(jsonb_typeof(v_item->'ambiguous'),'null')<>'boolean' then raise exception 'COMPETENCY_ITEMS_UNGROUNDED'; end if;
    if exists(select 1 from jsonb_array_elements(v_item->'searchTerms') t where jsonb_typeof(t)<>'string' or length(btrim(t#>>'{}')) not between 1 and 240) then raise exception 'COMPETENCY_SEARCH_INVALID'; end if;
    select * into v_stable from private.find_competency_curation_decision(v_run.organization_id,v_person,v_run.profile_id,
      v_original,v_item->>'sourceText');
    select observation.concept_id,observation.resolution_state into v_human from public.knowledge_observations observation
      where observation.organization_id=v_run.organization_id and observation.profile_id=v_run.profile_id
        and observation.original_term=v_original and observation.resolved_by_auth_user_id is not null limit 1;
    if v_stable.id is not null then
      -- Keep the durable choice even when the model changes label/search terms/ambiguity.
      -- The read projection independently verifies concept availability and tenant scope.
      v_resolution:=jsonb_build_object('state','human_preserved','conceptId',v_stable.concept_id,
        'reason','Decisão humana existente preservada para este trecho.');
    elsif found then
      -- Human observations remain the authority; the V1 projection already renders their provenance.
      v_resolution:=jsonb_build_object('state','human_preserved','conceptId',v_human.concept_id,'reason','Decisão humana existente preservada.');
    elsif (v_item->>'ambiguous')::boolean then
      v_resolution:=jsonb_build_object('state','ambiguous','conceptId',null,'reason','A interpretação da declaração exige revisão humana.');
    else
      v_resolution:=private.resolve_normalized_competency(v_run.organization_id,v_item->>'sourceText',v_item->'searchTerms');
    end if;
    v_result:=v_result||jsonb_build_array(jsonb_build_object('originalIndex',v_index,'originalTerm',v_original,'sourceText',v_item->>'sourceText',
      'normalizedTerm',v_item->>'normalizedTerm','searchTerms',v_item->'searchTerms','method',v_item->>'method')||v_resolution);
    if v_resolution->>'state' in ('unresolved','ambiguous') then
      -- Reuse human curatorship without attaching a compound raw observation to one atom.
      insert into public.knowledge_inbox(scope,organization_id,fingerprint,original_term,normalized_search_term,language,status)
        values('organization',v_run.organization_id,
          encode(extensions.digest(concat_ws('|','organization',v_run.organization_id::text,'pt-BR',private.normalize_knowledge_term(v_item->>'normalizedTerm')),'sha256'),'hex'),
          v_item->>'normalizedTerm',private.normalize_knowledge_term(v_item->>'normalizedTerm'),'pt-BR',
          case when v_resolution->>'state'='ambiguous' then 'ambiguous'::public.knowledge_inbox_status else 'unresolved'::public.knowledge_inbox_status end)
        on conflict(scope,organization_id,fingerprint) do update set last_seen_at=now();
    end if;
  end loop;
  if (p_error is null or jsonb_array_length(p_items)>0) and exists(select 1 from jsonb_array_elements_text(v_run.original_terms) with ordinality term(value,ordinal)
    where btrim(value)<>'' and not exists(select 1 from jsonb_array_elements(v_result) item where (item->>'originalIndex')::bigint=term.ordinal-1)) then raise exception 'COMPETENCY_ITEMS_INCOMPLETE'; end if;
  update public.profile_competency_normalization_runs set result=v_result,status=case when p_error is null then 'complete' else 'failed' end,
    error_code=case when p_error in ('PROVIDER_UNAVAILABLE','BUDGET_LIMITED','RESPONSE_INVALID','INPUT_LIMIT','AI_DISABLED') then p_error when p_error is not null then 'PROCESSING_FAILED' end,
    completed_at=now(),available_at=now()+interval '15 minutes',model=p_model,input_tokens=p_input_tokens,output_tokens=p_output_tokens
    where id=v_run.id;
end $$;
revoke all on function public.complete_profile_competency_normalization(uuid,uuid,jsonb,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.complete_profile_competency_normalization(uuid,uuid,jsonb,text,text,integer,integer) to service_role;
