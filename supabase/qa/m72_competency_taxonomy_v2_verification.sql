-- Runs after the synthetic M73/M74 fixture, inside one outer transaction with rollback.
reset role;
select public.m73_assert('competency'=any(enum_range(null::public.knowledge_concept_type)::text[]),'competency is an explicit typed identity');
select public.m73_assert(exists(select 1 from public.professional_taxonomy_releases where domain='occupation' and contract_version='position-taxonomy-1.0.0'),'M7.1 release preserved');
select public.m73_assert(exists(select 1 from public.professional_taxonomy_releases where domain='competency' and contract_version='competency-taxonomy-1.0.0'),'competency release published independently');

insert into public.knowledge_concepts(id,scope,concept_type,canonical_label,status,provenance) values
 (m73_id('short-r'),'global','skill','R','approved','{}'),
 (m73_id('prioritization'),'global','skill','Priorização','approved','{}'),
 (m73_id('listening'),'global','skill','Active Listening','approved','{}');
insert into public.knowledge_terms(concept_id,scope,term,normalized_term,term_type,status) values
 (m73_id('short-r'),'global','R','r','canonical','approved'),
 (m73_id('prioritization'),'global','Priorização','priorizacao','canonical','approved'),
 (m73_id('listening'),'global','Active Listening','active listening','canonical','approved');
insert into public.knowledge_concepts(id,scope,organization_id,concept_type,canonical_label,status,provenance) values
 (m73_id('private-b'),'organization',m73_id('b'),'skill','Confidential Skill','approved','{}');
insert into public.knowledge_terms(concept_id,scope,organization_id,term,normalized_term,term_type,status) values
 (m73_id('private-b'),'organization',m73_id('b'),'Confidential Skill','confidential skill','canonical','approved');

set local role authenticated;
select set_config('request.jwt.claim.sub',m73_id('member')::text,true);
do $$declare result jsonb; projection jsonb;begin
  result:=public.search_competency_taxonomy(public.m73_id('a'),'R',8);
  perform public.m73_assert(result->>'state'='exact' and jsonb_array_length(result->'items')=1 and result#>>'{items,0,canonicalLabel}'='R','one-letter query matches only an exact short term');
  result:=public.search_competency_taxonomy(public.m73_id('a'),'prior',8);
  perform public.m73_assert(result->>'state'='relevant_partial' and result#>>'{items,0,canonicalLabel}'='Priorização','token prefix is a human candidate only');
  result:=public.search_competency_taxonomy(public.m73_id('a'),'a',8);
  perform public.m73_assert(result->>'state'='no_equivalent' and jsonb_array_length(result->'items')=0,'one-letter substring search is refused');
  result:=public.search_competency_taxonomy(public.m73_id('a'),'Arquitetura',8);
  perform public.m73_assert(result->>'state'='ambiguous','multiple exact concepts remain ambiguous');
  result:=public.search_competency_taxonomy(public.m73_id('a'),'PMO',8);
  perform public.m73_assert(result->>'state'='no_equivalent','occupation is excluded on the server before limiting');
  result:=public.search_competency_taxonomy(public.m73_id('a'),'Confidential Skill',8);
  perform public.m73_assert(result->>'state'='no_equivalent','other tenant concept is not visible');
  projection:=public.load_person_professional_evidence_map_v4(public.m73_id('a'),public.m73_id('person'));
  perform public.m73_assert(projection->>'contractVersion'='person-professional-evidence-3.0.0','V4 returns new Person projection contract');
  perform public.m73_assert(projection#>>'{taxonomyVersions,occupation}'='position-taxonomy-1.0.0' and projection#>>'{taxonomyVersions,competency}'='competency-taxonomy-1.0.0','Person projection exposes independent taxonomy versions');
  perform public.m73_assert(not exists(select 1 from jsonb_array_elements(projection->'associations') item where item#>>'{concept,type}'='occupation'),'occupation never appears as personal competency evidence');
  perform public.m73_assert(not exists(select 1 from jsonb_array_elements(projection->'associations') item where item#>>'{explanation,taxonomyVersion}'<>'competency-taxonomy-1.0.0'),'every competency association uses competency taxonomy version');
end$$;
select set_config('request.jwt.claim.sub',m73_id('outsider')::text,true);
select public.m73_reject(format('select public.search_competency_taxonomy(%L,%L,8)',m73_id('a'),'R'),'42501');
reset role;

create temp table m72v2_requirement_probe(
  organization_id uuid not null,
  concept_id uuid,
  competency_taxonomy_version text
);
create trigger m72v2_requirement_probe_guard before insert or update of concept_id on m72v2_requirement_probe
  for each row execute function private.enforce_vacancy_requirement_competency_taxonomy();
insert into m72v2_requirement_probe(organization_id,concept_id) values(m73_id('a'),m73_id('negotiation'));
select public.m73_assert((select competency_taxonomy_version='competency-taxonomy-1.0.0' from m72v2_requirement_probe),'new Position requirement records competency taxonomy version');
select public.m73_reject(format('insert into m72v2_requirement_probe(organization_id,concept_id) values(%L,%L)',m73_id('a'),m73_id('pmo')),'42501');
select public.m73_reject(format('insert into m72v2_requirement_probe(organization_id,concept_id) values(%L,%L)',m73_id('a'),m73_id('private-b')),'42501');

insert into public.knowledge_sources(id,name,domain,source_class,publisher,method,status)
  values(m73_id('source-onet'),'O*NET','qa.synthetic.onet','official_occupational_taxonomy','Synthetic QA','dataset','approved');
insert into public.knowledge_source_versions(id,source_id,external_version,format,import_status,is_current,published_at)
  values(m73_id('source-onet-v'),m73_id('source-onet'),'31.0-fixture','fixture','published',true,now());
do $$declare v_source uuid:=m73_id('source-onet');v_version uuid:=m73_id('source-onet-v');result jsonb;begin
  insert into public.knowledge_relations(source_concept_id,target_concept_id,relation_type,scope,source_id,source_version_id,status,relation_attributes,provenance)
    values(m73_id('pmo'),m73_id('negotiation'),'requires','global',v_source,v_version,'approved','{"sourceRelationCode":"synthetic_qa"}','{"fixture":true}');
  set local role authenticated;
  perform set_config('request.jwt.claim.sub',m73_id('member')::text,true);
  result:=public.load_occupation_competency_relations(m73_id('a'),m73_id('pmo'));
  perform public.m73_assert(jsonb_array_length(result->'items')=1 and result#>>'{items,0,createsPersonalEvidence}'='false','cross-domain relation is provenanced and explicitly not personal evidence');
end$$;
reset role;

select public.m73_assert((select profile_data='{"competencies":["Excel e Word","PMO","negociação","Termo desconhecido"]}'::jsonb from public.professional_profiles where id=m73_id('current')),'taxonomy projection preserves published profile facts byte-for-byte');
select public.m73_assert((select profile_data='{"competencies":["Legado"]}'::jsonb from public.professional_profiles where id=m73_id('old')),'taxonomy projection preserves historical profile facts');
