-- Runs after the three M8.1 migrations inside the same disposable transaction.
select m81_assert((select count(*)=2 from public.competency_macro_groups),'two global macro definitions');
select m81_assert((select count(*)=9 from public.competency_subgroups where scope='global'),'nine global subgroup definitions');
select m81_assert((select subgroup.code='H2' from public.knowledge_competency_classifications classification
  join public.competency_subgroups subgroup on subgroup.id=classification.subgroup_id
  where classification.concept_id=m81_id('excel') and classification.is_current),'structured O*NET technology backfills H2');
select m81_assert(not exists(select 1 from public.knowledge_competency_classifications
  where concept_id=m81_id('management')),'ambiguous Knowledge remains pending');
insert into public.competency_subgroups(id,code,macro_group_code,scope,organization_id,label,definition,sort_order) values
  (m81_id('subgroup-a1'),'A1','hard','organization',m81_id('org-a'),'Método A QA','Somente organização A',20),
  (m81_id('subgroup-b1'),'B1','soft','organization',m81_id('org-b'),'Método B QA','Somente organização B',20);
select m81_reject(format('insert into public.knowledge_competency_classifications(concept_id,subgroup_id,version,taxonomy_version,method)
  values(%L,(select id from public.competency_subgroups where code=%L),1,%L,%L)',
  m81_id('management'),'A1','competency-taxonomy-2.0.0','human_curated'),'42501');
select m81_reject(format('insert into public.knowledge_competency_classifications(concept_id,subgroup_id,version,taxonomy_version,method)
  values(%L,(select id from public.competency_subgroups where code=%L),1,%L,%L)',
  m81_id('org-a-concept'),'B1','competency-taxonomy-2.0.0','human_curated'),'42501');
select m81_reject(format('insert into public.knowledge_competency_classifications(concept_id,subgroup_id,version,taxonomy_version,method)
  values(%L,(select id from public.competency_subgroups where code=%L),1,%L,%L)',
  m81_id('certificate'),'H1','competency-taxonomy-2.0.0','human_curated'),'23514');
select m81_reject(format('insert into public.knowledge_competency_classifications(concept_id,subgroup_id,version,taxonomy_version,method)
  values(%L,(select id from public.competency_subgroups where code=%L),1,%L,%L)',
  m81_id('occupation'),'H1','competency-taxonomy-2.0.0','human_curated'),'23514');
set local role authenticated;
select set_config('request.jwt.claim.sub',m81_id('owner-a')::text,true);
select m81_reject(format('select public.classify_knowledge_competency(%L,(select id from public.competency_subgroups where code=%L),%L)',
  m81_id('management'),'H4','Human review QA'),'42501');
select m81_reject(format('select public.classify_knowledge_competency(%L,%L,%L)',
  m81_id('org-b-concept'),m81_id('subgroup-b1'),'Human review QA'),'42501');
select m81_reject(format('insert into public.knowledge_competency_classifications(concept_id,subgroup_id,version,taxonomy_version,method)
  values(%L,(select id from public.competency_subgroups where code=%L),1,%L,%L)',
  m81_id('org-a-concept'),'A1','competency-taxonomy-2.0.0','human_curated'),'42501');
select m81_assert((select count(*)=0 from public.competency_subgroups where scope='organization' and organization_id=m81_id('org-b')),
  'organization A cannot read organization B subgroup');
select m81_assert(public.classify_knowledge_competency(m81_id('org-a-concept'),
  (select id from public.competency_subgroups where code='A1'),'Human review QA')->>'reused'='false',
  'owner A classifies own concept in own subgroup');
select m81_assert(public.classify_knowledge_competency(m81_id('org-a-concept'),
  (select id from public.competency_subgroups where code='H3'),'Human correction QA')->>'version'='2',
  'classification changes keep version history');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub',m81_id('super')::text,true);
select m81_assert(public.classify_knowledge_competency(m81_id('management'),
  (select id from public.competency_subgroups where code='H4'),'Global human review QA')->>'version'='1',
  'Super Admin classifies global concept into global subgroup');
select m81_reject(format('select public.classify_knowledge_competency(%L,(select id from public.competency_subgroups where code=%L),%L)',
  m81_id('management'),'A1','Global wrong scope QA'),'42501');
reset role;
select m81_assert((select count(*)=2 from public.knowledge_competency_classifications where concept_id=m81_id('org-a-concept')),
  'one historical and one current classification retained');
select m81_assert((select count(*)=1 from public.knowledge_competency_classifications where concept_id=m81_id('org-a-concept') and is_current),
  'one current classification per concept');
select m81_assert((select organization_id=m81_id('org-a') from public.knowledge_competency_classifications
  where concept_id=m81_id('org-a-concept') and is_current),'tenant classification persists organization_id');
select m81_reject(format('insert into public.knowledge_competency_classifications(concept_id,organization_id,subgroup_id,version,taxonomy_version,method)
  values(%L,%L,%L,3,%L,%L)',m81_id('org-a-concept'),m81_id('org-b'),m81_id('subgroup-a1'),
  'competency-taxonomy-2.0.0','human_curated'),'42501');

insert into public.knowledge_inbox(id,scope,organization_id,fingerprint,original_term,normalized_search_term,language,status)
values(m81_id('inbox-communication'),'organization',m81_id('org-a'),repeat('a',64),
  'Comunicação QA','comunicacao qa','pt-BR','unresolved');
create temp table m81_state(key text primary key,value uuid);
grant all on m81_state to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub',m81_id('owner-a')::text,true);
select m81_reject(format('select public.propose_knowledge_concept_from_inbox(%L,%L,%L,%L,%L,%L)',
  m81_id('inbox-communication'),'organization','Comunicação QA','knowledge','','Human proposal QA'),'42501');
insert into m81_state(key,value) select 'local-proposal',public.propose_knowledge_concept_from_inbox_v2(
  m81_id('inbox-communication'),'organization','Comunicação QA',
  (select id from public.competency_subgroups where code='S1' and scope='global'),'',
  'Human proposal QA');
insert into m81_state(key,value) select 'position-complement',public.create_position_knowledge_complement_v2(
  m81_id('org-a'),'Método de revisão QA',
  (select id from public.competency_subgroups where code='H3' and scope='global'),'');
reset role;
select m81_assert((select proposal.status='approved' and proposal.published_concept_id is not null
  and classification.subgroup_id=(select id from public.competency_subgroups where code='S1')
  from m81_state state join public.knowledge_proposals proposal on proposal.id=state.value
  join public.knowledge_competency_classifications classification on classification.concept_id=proposal.published_concept_id and classification.is_current
  where state.key='local-proposal'),'organization approval atomically classifies the concept');
select m81_assert((select classification.subgroup_id=(select id from public.competency_subgroups where code='H3')
  from m81_state state join public.knowledge_competency_classifications classification on classification.concept_id=state.value and classification.is_current
  where state.key='position-complement'),'Position complement uses principal M8 subgroup');
select m81_assert((select count(*)=1 from public.knowledge_proposals global_proposal
  join public.knowledge_proposals local_proposal on local_proposal.published_concept_id=global_proposal.origin_concept_id
  join m81_state state on state.value=local_proposal.id and state.key='local-proposal'
  where global_proposal.scope='global' and global_proposal.status='awaiting_human_review'),
  'local creation keeps Global contribution pending');
insert into public.knowledge_inbox(id,scope,fingerprint,original_term,normalized_search_term,language,status)
values(m81_id('inbox-unclassified'),'global',repeat('b',64),'Termo sem classe QA','termo sem classe qa','pt-BR','unresolved');
set local role authenticated;
select set_config('request.jwt.claim.sub',m81_id('super')::text,true);
insert into m81_state(key,value) select 'unclassified-proposal',public.propose_knowledge_concept_from_inbox(
  m81_id('inbox-unclassified'),'global','Termo sem classe QA','knowledge','','Human proposal QA');
select m81_reject(format('select public.approve_knowledge_proposal(%L,null,%L)',
  (select value from m81_state where key='unclassified-proposal'),'Human approval QA'),'42501');
insert into m81_state(key,value)
select 'global-concept',approved.concept_id from public.approve_knowledge_proposal_v2(
  (select global_proposal.id from public.knowledge_proposals global_proposal
    join public.knowledge_proposals local_proposal on local_proposal.published_concept_id=global_proposal.origin_concept_id
    join m81_state state on state.value=local_proposal.id and state.key='local-proposal'
    where global_proposal.scope='global' limit 1),
  (select id from public.competency_subgroups where code='S1' and scope='global'),'Human approval QA') approved;
reset role;
select m81_assert((select classification.subgroup_id=(select id from public.competency_subgroups where code='S1')
  from m81_state state join public.knowledge_competency_classifications classification on classification.concept_id=state.value and classification.is_current
  where state.key='global-concept'),'Global approval atomically creates a global classification');

insert into public.people(id,organization_id,full_name) values(m81_id('person'),m81_id('org-a'),'Pessoa sintética M81');
insert into public.professional_profiles(id,organization_id,person_id,profile_data,extraction_version,inference_version,
  embedding_version,prompt_version,model_version,profile_version,review_status,approved_at,superseded_at)
values(m81_id('profile'),m81_id('org-a'),m81_id('person'),
  $fixture${"competencies":["Excel QA"],"experiences":[{"id":"experience_qatest01","role":"Analista","organization":"Empresa QA",
    "description":"Operou Excel QA no planejamento de estoque e documentou resultados do projeto.",
    "evidenceText":"Operou Excel QA no planejamento de estoque e documentou resultados do projeto."}],
    "certifications":["Excel QA Professional - Issuer QA"]}$fixture$::jsonb,
  'fixture','fixture','fixture','fixture','fixture',1,'approved',now(),null);
set local role authenticated;
select set_config('request.jwt.claim.sub',m81_id('member-a')::text,true);
select m81_reject(format('select public.link_person_competency_evidence(%L,%L,%L,%L,%L,%s,%L,null,null,%L)',
  m81_id('org-a'),m81_id('person'),m81_id('profile'),m81_id('excel'),'contextual',0,
  'Operou Excel QA no planejamento de estoque','Revisão humana da experiência'),'42501');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub',m81_id('owner-a')::text,true);
select m81_reject(format('select public.link_person_competency_evidence(%L,%L,%L,%L,%L,%s,%L,null,null,%L)',
  m81_id('org-a'),m81_id('person'),m81_id('profile'),m81_id('excel'),'contextual',0,
  'Trecho inexistente no currículo','Revisão humana da experiência'),'22023');
insert into m81_state(key,value) values('context-link',public.link_person_competency_evidence(
  m81_id('org-a'),m81_id('person'),m81_id('profile'),m81_id('excel'),'contextual',0,
  'Operou Excel QA no planejamento de estoque',null,null,'Revisão humana da experiência'));
insert into m81_state(key,value) values('certificate-link',public.link_person_competency_evidence(
  m81_id('org-a'),m81_id('person'),m81_id('profile'),m81_id('excel'),'certified',0,
  'Excel QA Professional - Issuer QA','Excel QA Professional','Issuer QA','Credencial individual confirmada no Perfil'));
select m81_assert((select value from m81_state where key='context-link')=public.link_person_competency_evidence(
  m81_id('org-a'),m81_id('person'),m81_id('profile'),m81_id('excel'),'contextual',0,
  'Operou Excel QA no planejamento de estoque',null,null,'Revisão humana da experiência'),
  'retry with identical factual decision is idempotent');
select m81_reject(format('select public.link_person_competency_evidence(%L,%L,%L,%L,%L,%s,%L,null,null,%L)',
  m81_id('org-a'),m81_id('person'),m81_id('profile'),m81_id('excel'),'contextual',0,
  'Operou Excel QA no planejamento de estoque','Outra justificativa para o mesmo vínculo'),'23505');
select m81_reject(format('insert into public.person_competency_evidence_links(organization_id,person_id,profile_id,concept_id,nature,source_index,source_quote,decision_reason,decided_by_auth_user_id)
  values(%L,%L,%L,%L,%L,%s,%L,%L,%L)',m81_id('org-a'),m81_id('person'),m81_id('profile'),m81_id('excel'),
  'contextual',0,'Operou Excel QA no planejamento de estoque','Revisão humana da experiência',m81_id('owner-a')),'42501');
select m81_assert((select count(*)=1 from jsonb_array_elements(public.load_person_professional_evidence_map_v6(m81_id('org-a'),m81_id('person'))->'associations') item
  where item->>'nature'='contextual'),'factual experience projects Contextualizado');
select m81_assert((select count(*)=1 from jsonb_array_elements(public.load_person_professional_evidence_map_v6(m81_id('org-a'),m81_id('person'))->'associations') item
  where item->>'nature'='certified'),'confirmed credential projects Certificado independently');
select m81_assert((select count(*)=0 from jsonb_array_elements(public.load_person_professional_evidence_map_v6(m81_id('org-a'),m81_id('person'))->'associations') item
  where item->>'nature' in ('verified_assessment','demonstrated_skill')),
  'resume and credential never manufacture Assessment or practical evidence');
reset role;
select m81_assert((select count(*)=2 from public.person_competency_evidence_links where profile_id=m81_id('profile')),
  'new curated evidence accumulates without replacing previous evidence');
