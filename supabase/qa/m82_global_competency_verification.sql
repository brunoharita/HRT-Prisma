-- Run after M8.2 migrations. Read-only assertions except one rejected insert inside a PL/pgSQL subtransaction.
do $m82_qa$
declare
  v_eligible integer;
  v_classified integer;
  v_communication uuid;
  v_code text;
begin
  select count(*), count(*) filter (where classification.id is not null)
    into v_eligible, v_classified
  from (
    select distinct concept.id
    from public.knowledge_external_mappings mapping
    join public.knowledge_sources source on source.id=mapping.source_id and source.name in ('ESCO','O*NET')
    join public.knowledge_source_versions source_version on source_version.id=mapping.source_version_id
      and source_version.import_status='published'
    join public.knowledge_concepts concept on concept.id=mapping.concept_id
      and concept.scope='global' and concept.status='approved'
      and concept.concept_type not in ('occupation','certification')
  ) eligible
  left join public.knowledge_competency_classifications classification
    on classification.concept_id=eligible.id and classification.is_current;
  if v_eligible=0 or v_classified * 100 < v_eligible * 99 then
    raise exception 'M82_COVERAGE_BELOW_99: % / %',v_classified,v_eligible;
  end if;

  select concept.id, subgroup.code into v_communication,v_code
  from public.knowledge_external_mappings mapping
  join public.knowledge_sources source on source.id=mapping.source_id and source.name='ESCO'
  join public.knowledge_concepts concept on concept.id=mapping.concept_id
  join public.knowledge_competency_classifications classification on classification.concept_id=concept.id and classification.is_current
  join public.competency_subgroups subgroup on subgroup.id=classification.subgroup_id
  where mapping.external_uri='http://data.europa.eu/esco/skill/15d76317-c71a-4fa2-aadc-2ecc34e627b7';
  if v_communication is null or v_code <> 'S1' then raise exception 'M82_COMMUNICATION_NOT_S1'; end if;
  if not exists (
    select 1 from public.knowledge_concepts concept
    join public.knowledge_competency_classifications classification on classification.concept_id=concept.id and classification.is_current
    join public.competency_subgroups subgroup on subgroup.id=classification.subgroup_id and subgroup.code='H4'
    where concept.scope='global' and concept.status='approved' and concept.canonical_label='Transformação operacional'
  ) then raise exception 'M82_PRISMA_GLOBAL_CONCEPT_NOT_H4'; end if;

  if exists (
    select 1 from public.knowledge_competency_classifications classification
    join public.knowledge_concepts concept on concept.id=classification.concept_id
    join public.competency_subgroups subgroup on subgroup.id=classification.subgroup_id
    where classification.method='ai_assisted'
      and (concept.scope<>'global' or concept.concept_type in ('occupation','certification')
        or subgroup.scope<>'global' or classification.organization_id is not null
        or classification.decided_by_auth_user_id is not null)
  ) then raise exception 'M82_AI_SCOPE_INVALID'; end if;
  if exists (
    select 1 from public.knowledge_competency_classifications classification
    where classification.method='ai_assisted' and classification.is_current
      and exists (select 1 from public.knowledge_competency_classifications human
        where human.concept_id=classification.concept_id and human.method='human_curated'
          and human.version<classification.version)
  ) then raise exception 'M82_HUMAN_CLASSIFICATION_OVERWRITTEN'; end if;
  if exists (
    select concept_id from public.knowledge_competency_classifications
    where is_current group by concept_id having count(*)>1
  ) then raise exception 'M82_DUPLICATE_CURRENT_CLASSIFICATION'; end if;

  begin
    insert into public.knowledge_competency_classifications
      (concept_id,subgroup_id,version,taxonomy_version,method,provenance,is_current)
    select v_communication, subgroup.id,
      (select max(version)+1 from public.knowledge_competency_classifications where concept_id=v_communication),
      'competency-taxonomy-2.0.0','ai_assisted','{}'::jsonb,false
    from public.competency_subgroups subgroup where subgroup.scope='global' and subgroup.code='S1';
    raise exception 'M82_MISSING_PROVENANCE_WAS_ACCEPTED';
  exception when check_violation then null;
  end;
  raise notice 'M8.2: % / % eligible concepts classified; Communication=S1; AI scope, history and provenance valid',
    v_classified,v_eligible;
end $m82_qa$;
