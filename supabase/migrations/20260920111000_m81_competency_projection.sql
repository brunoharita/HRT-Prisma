-- M8.1: versioned reads and human classification. Existing RPC versions remain callable.

create function public.classify_knowledge_competency(
  p_concept_id uuid, p_subgroup_id uuid, p_reason text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_concept public.knowledge_concepts; v_subgroup public.competency_subgroups;
  v_actor uuid; v_version integer; v_id uuid;
begin
  if p_concept_id is null or p_subgroup_id is null or char_length(btrim(coalesce(p_reason, ''))) < 5 then
    raise exception 'COMPETENCY_CLASSIFICATION_INPUT_INVALID' using errcode = '22023';
  end if;
  select * into v_concept from public.knowledge_concepts where id = p_concept_id;
  if v_concept.id is null or v_concept.status <> 'approved' or v_concept.concept_type in ('occupation', 'certification') then
    raise exception 'COMPETENCY_CONCEPT_INVALID' using errcode = '22023';
  end if;
  v_actor := private.require_knowledge_admin(v_concept.organization_id);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_concept_id::text, 0));
  select * into v_subgroup from public.competency_subgroups where id = p_subgroup_id and status = 'active';
  if v_subgroup.id is null then
    raise exception 'COMPETENCY_SUBGROUP_INVALID' using errcode = '22023';
  end if;
  if (v_concept.scope = 'global' and v_subgroup.scope <> 'global')
    or (v_concept.scope = 'organization' and v_subgroup.scope = 'organization'
      and v_subgroup.organization_id is distinct from v_concept.organization_id) then
    raise exception 'COMPETENCY_CLASSIFICATION_SCOPE_MISMATCH' using errcode = '42501';
  end if;
  if exists (select 1 from public.knowledge_competency_classifications current_class
    where current_class.concept_id = p_concept_id and current_class.is_current and current_class.subgroup_id = p_subgroup_id) then
    return jsonb_build_object('taxonomyVersion', 'competency-taxonomy-2.0.0', 'conceptId', p_concept_id,
      'subgroupId', p_subgroup_id, 'reused', true);
  end if;
  select coalesce(max(version), 0) + 1 into v_version from public.knowledge_competency_classifications
    where concept_id = p_concept_id;
  update public.knowledge_competency_classifications set is_current = false
    where concept_id = p_concept_id and is_current;
  insert into public.knowledge_competency_classifications
    (concept_id, subgroup_id, version, taxonomy_version, method, provenance, decided_by_auth_user_id)
  values (p_concept_id, p_subgroup_id, v_version, 'competency-taxonomy-2.0.0', 'human_curated',
    jsonb_build_object('reason', btrim(p_reason)), v_actor) returning id into v_id;
  return jsonb_build_object('taxonomyVersion', 'competency-taxonomy-2.0.0', 'conceptId', p_concept_id,
    'subgroupId', p_subgroup_id, 'classificationId', v_id, 'version', v_version, 'reused', false);
end $$;
revoke all on function public.classify_knowledge_competency(uuid, uuid, text) from public, anon;
grant execute on function public.classify_knowledge_competency(uuid, uuid, text) to authenticated;

create function public.search_competency_taxonomy_v2(
  p_organization_id uuid, p_query text, p_limit integer default 8
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_base jsonb; v_items jsonb;
begin
  v_base := public.search_competency_taxonomy(p_organization_id, p_query, p_limit);
  select coalesce(jsonb_agg(item || jsonb_build_object(
    'classificationState', case when subgroup.id is null then 'pending' else 'classified' end,
    'classification', case when subgroup.id is null then 'null'::jsonb else jsonb_build_object(
      'macroGroupCode', macro.code, 'macroGroupLabel', macro.label,
      'subgroupId', subgroup.id, 'subgroupCode', subgroup.code, 'subgroupLabel', subgroup.label,
      'classificationVersion', classification.version, 'taxonomyVersion', classification.taxonomy_version) end
  ) order by ordinal), '[]'::jsonb) into v_items
  from jsonb_array_elements(v_base->'items') with ordinality rows(item, ordinal)
  left join public.knowledge_competency_classifications classification
    on classification.concept_id = (item->>'conceptId')::uuid and classification.is_current
  left join public.competency_subgroups subgroup on subgroup.id = classification.subgroup_id
  left join public.competency_macro_groups macro on macro.code = subgroup.macro_group_code
  where item->>'conceptType' <> 'certification';
  return (v_base - 'items' - 'contractVersion' - 'taxonomyVersion') || jsonb_build_object(
    'contractVersion', 'competency-taxonomy-search-2.0.0',
    'taxonomyVersion', 'competency-taxonomy-2.0.0',
    'state', case when jsonb_array_length(v_items) = 0 then 'no_equivalent' else v_base->>'state' end,
    'items', v_items);
end $$;
revoke all on function public.search_competency_taxonomy_v2(uuid, text, integer) from public, anon;
grant execute on function public.search_competency_taxonomy_v2(uuid, text, integer) to authenticated;

create function public.load_person_professional_evidence_map_v6(
  p_organization_id uuid, p_person_id uuid
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_base jsonb; v_associations jsonb;
begin
  v_base := public.load_person_professional_evidence_map_v5(p_organization_id, p_person_id);
  select coalesce(jsonb_agg(
    (item - 'nature' - 'concept' - 'explanation') || jsonb_build_object(
      'nature', case when item->>'nature' = 'demonstrated' then
        case when (item#>>'{verification,qualifiesAsVerified}')::boolean then 'verified_assessment'
          else 'assessment_result' end
        else item->>'nature' end,
      'concept', (item->'concept') || jsonb_build_object(
        'classificationState', case when subgroup.id is null then 'pending' else 'classified' end,
        'classification', case when subgroup.id is null then 'null'::jsonb else jsonb_build_object(
          'macroGroupCode', macro.code, 'macroGroupLabel', macro.label,
          'subgroupId', subgroup.id, 'subgroupCode', subgroup.code, 'subgroupLabel', subgroup.label,
          'classificationVersion', classification.version, 'taxonomyVersion', classification.taxonomy_version) end),
      'explanation', (item->'explanation') || jsonb_build_object('taxonomyVersion', 'competency-taxonomy-2.0.0')
    ) order by ordinal), '[]'::jsonb) into v_associations
  from jsonb_array_elements(v_base->'associations') with ordinality rows(item, ordinal)
  left join public.knowledge_competency_classifications classification
    on classification.concept_id = (item#>>'{concept,id}')::uuid and classification.is_current
  left join public.competency_subgroups subgroup on subgroup.id = classification.subgroup_id
  left join public.competency_macro_groups macro on macro.code = subgroup.macro_group_code
  where item#>>'{concept,type}' not in ('occupation', 'certification')
    and not (item->>'nature' = 'contextual' and item->>'id' like 'profile-competency:%');
  return (v_base - 'contractVersion' - 'taxonomyVersions' - 'associations') || jsonb_build_object(
    'contractVersion', 'person-professional-evidence-4.0.0',
    'taxonomyVersions', jsonb_build_object('occupation', 'position-taxonomy-1.0.0',
      'competency', 'competency-taxonomy-2.0.0'),
    'associations', v_associations);
end $$;
revoke all on function public.load_person_professional_evidence_map_v6(uuid, uuid) from public, anon;
grant execute on function public.load_person_professional_evidence_map_v6(uuid, uuid) to authenticated;

comment on function public.classify_knowledge_competency(uuid, uuid, text) is
  'M8.1 human classification with authorization, tenant scope, reason, version history and one current subgroup.';
comment on function public.load_person_professional_evidence_map_v6(uuid, uuid) is
  'M8.1 projection: canonical classification and separate assessment verification; unclassified concepts remain pending.';
