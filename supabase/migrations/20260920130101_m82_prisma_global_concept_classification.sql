-- M8.2: one approved Global Knowledge concept outside the published ESCO/O*NET mappings.
-- The existing human approval/identity is preserved; only its missing M8 classification is added.
do $m82$
declare v_concept_id uuid; v_knowledge_version bigint; v_subgroup uuid; v_count integer;
begin
  select count(*) into v_count
  from public.knowledge_concepts concept
  join public.knowledge_change_sets change_set on change_set.id=concept.change_set_id
  where concept.scope='global' and concept.status='approved' and concept.concept_type='knowledge'
    and concept.canonical_label='Transformação operacional' and concept.version=1
    and change_set.scope='global' and change_set.version=4
    and concept.description='Redesenho estrutural e integrado de processos, pessoas, dados e tecnologias de uma organização para eliminar ineficiências, reduzir desperdícios e elevar o desempenho de longo prazo';
  if v_count<>1 then raise exception 'M82_PRISMA_GLOBAL_CONCEPT_MISMATCH: %',v_count; end if;
  select concept.id,change_set.version into v_concept_id,v_knowledge_version
  from public.knowledge_concepts concept
  join public.knowledge_change_sets change_set on change_set.id=concept.change_set_id
  where concept.scope='global' and concept.status='approved' and concept.concept_type='knowledge'
    and concept.canonical_label='Transformação operacional' and concept.version=1
    and change_set.scope='global' and change_set.version=4;
  if exists(select 1 from public.knowledge_competency_classifications classification
    where classification.concept_id=v_concept_id and classification.is_current) then return; end if;
  select subgroup.id into v_subgroup from public.competency_subgroups subgroup
  where subgroup.code='H4' and subgroup.scope='global' and subgroup.status='active';
  if v_subgroup is null then raise exception 'M82_H4_SUBGROUP_MISSING'; end if;
  insert into public.knowledge_competency_classifications
    (concept_id,subgroup_id,version,taxonomy_version,method,provenance)
  values (v_concept_id,v_subgroup,
    coalesce((select max(history.version)+1 from public.knowledge_competency_classifications history
      where history.concept_id=v_concept_id),1),
    'competency-taxonomy-2.0.0','ai_assisted',
    jsonb_build_object('source','Prisma Knowledge','sourceVersion',v_knowledge_version::text,
      'classifierVersion','m82-agent-review-1.0.0',
      'reason','Redesenho integrado de processos, pessoas, dados e tecnologia para desempenho organizacional é gestão operacional estratégica.',
      'agreement','M8.2-1.0.0'));
end $m82$;
