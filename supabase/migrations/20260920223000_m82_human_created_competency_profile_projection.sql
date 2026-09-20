-- M8.2 correction: project a human-resolved declaration from the current published profile.
create or replace function public.load_person_professional_evidence_map_v6(
  p_organization_id uuid, p_person_id uuid
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_base jsonb; v_associations jsonb; v_linked jsonb; v_human jsonb; v_result jsonb;
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
  -- A human Knowledge decision on a declared term supersedes an older automatic
  -- association for that same term, but never removes other kinds of evidence.
  select coalesce(jsonb_agg(row.item order by row.ordinal),'[]'::jsonb) into v_associations
  from jsonb_array_elements(v_associations) with ordinality row(item,ordinal)
  where not (row.item->>'nature'='declared' and exists (
    select 1 from public.knowledge_observations observation
    join public.knowledge_concepts concept on concept.id=observation.concept_id
      and concept.status='approved' and concept.concept_type not in ('occupation','certification')
      and (concept.scope='global' or concept.organization_id=p_organization_id)
    where observation.organization_id=p_organization_id and observation.person_id=p_person_id
      and observation.profile_id=(v_base#>>'{profile,id}')::uuid
      and observation.source_field_path='competencies' and observation.resolution_state='resolved'
      and observation.resolved_by_auth_user_id is not null
      and observation.resolution_method_version is not null
      and observation.original_term=row.item->>'observedTerm'
      and observation.concept_id::text is distinct from row.item#>>'{concept,id}'
  ));
  -- M7's base projection admits only the old normalization method. Organization
  -- creation resolves the current profile observation with Knowledge governance;
  -- project that recorded declaration without creating any Person evidence row.
  select coalesce(jsonb_agg(jsonb_build_object(
    'id','human-observation:'||observation.id::text,'nature','declared',
    'concept',jsonb_build_object('id',concept.id,'label',concept.canonical_label,
      'type',concept.concept_type,'scope',concept.scope,'version',concept.version,
      'classificationState',case when subgroup.id is null then 'pending' else 'classified' end,
      'classification',case when subgroup.id is null then 'null'::jsonb else jsonb_build_object(
        'macroGroupCode',macro.code,'macroGroupLabel',macro.label,
        'subgroupId',subgroup.id,'subgroupCode',subgroup.code,'subgroupLabel',subgroup.label,
        'classificationVersion',classification.version,'taxonomyVersion',classification.taxonomy_version) end),
    'observedTerm',observation.original_term,
    'evidence',jsonb_build_object('id',observation.id,'title',observation.original_term,
      'fact','Competência declarada no Perfil publicado, associada por decisão humana; sem atribuir proficiência.',
      'quote',observation.original_term,'recordedAt',coalesce(observation.resolved_at,observation.created_at),
      'source',jsonb_build_object('kind','published_profile','label','Perfil publicado v'||profile.profile_version,
        'documentId',profile.source_document_id,'filename',null,'pageNumber',null,
        'fieldPath','competencies','reviewId',profile.review_id,'evidenceLinkId',null,'spatialRegionId',null)),
    'explanation',jsonb_build_object('method','Declaração associada por decisão humana na Knowledge.',
      'methodVersion',observation.resolution_method_version,'taxonomyVersion','competency-taxonomy-2.0.0',
      'knowledgeGlobalVersion',observation.knowledge_global_version,
      'knowledgeOrganizationVersion',observation.knowledge_organization_version,
      'sourceName',null,'sourceVersion',null,
      'humanDecision','Associação ao conceito confirmada por operador autorizado.'),
    'verification',null
  ) order by observation.resolved_at,observation.id),'[]'::jsonb) into v_human
  from public.knowledge_observations observation
  join public.professional_profiles profile on profile.id=observation.profile_id
    and profile.organization_id=observation.organization_id and profile.person_id=observation.person_id
    and profile.id=(v_base#>>'{profile,id}')::uuid
    and profile.review_status='approved' and profile.superseded_at is null
  join public.knowledge_concepts concept on concept.id=observation.concept_id and concept.status='approved'
    and concept.concept_type not in ('occupation','certification')
    and (concept.scope='global' or concept.organization_id=p_organization_id)
  left join public.knowledge_competency_classifications classification
    on classification.concept_id=concept.id and classification.is_current
  left join public.competency_subgroups subgroup on subgroup.id=classification.subgroup_id
  left join public.competency_macro_groups macro on macro.code=subgroup.macro_group_code
  where observation.organization_id=p_organization_id and observation.person_id=p_person_id
    and observation.source_field_path='competencies' and observation.resolution_state='resolved'
    and observation.resolved_by_auth_user_id is not null
    and observation.resolution_method_version is not null
    and not exists (select 1 from jsonb_array_elements(v_associations) association
      where association->>'nature'='declared'
        and association#>>'{concept,id}'=observation.concept_id::text
        and association->>'observedTerm'=observation.original_term);
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
  v_result := (v_base-'contractVersion'-'taxonomyVersions'-'associations') || jsonb_build_object(
    'contractVersion','person-professional-evidence-4.0.0',
    'taxonomyVersions',jsonb_build_object('occupation','position-taxonomy-1.0.0',
      'competency','competency-taxonomy-2.0.0'),
    'associations',v_associations||v_human||v_linked);
  return jsonb_set(v_result,'{normalization,coverage,uniqueConceptCount}',to_jsonb((
    select count(distinct association#>>'{concept,id}')
    from jsonb_array_elements(v_result->'associations') association
    where association->>'nature'='declared')),true);
end $$;
revoke all on function public.load_person_professional_evidence_map_v6(uuid,uuid) from public,anon;
grant execute on function public.load_person_professional_evidence_map_v6(uuid,uuid) to authenticated;
