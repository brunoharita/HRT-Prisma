-- Completes M7.1 official-source/reconciliation fixtures in the same local transaction.
select m71_assert((select bool_and(private.m71_concept_allowed(m71_id('org-a'),id)=private.qa321_old_allowed(m71_id('org-a'),id)) from public.knowledge_concepts),'eligibility identical for published/superseded/foreign sources, reconciliation and company concepts');
select m71_assert((select private.m71_concept_allowed(m71_id('org-a'),m71_id('onet-occ'))),'approved reconciliation retains reference through the other current source');
select m71_assert(not private.m71_concept_allowed(m71_id('org-a'),m71_id('other-occ')),'foreign official source remains ineligible');
select m71_assert(not private.m71_concept_allowed(m71_id('org-a'),m71_id('other-org-occ')),'another company reference remains ineligible');
set local role authenticated;
select set_config('request.jwt.claim.sub',m71_id('owner')::text,true);
select m71_assert((public.search_position_taxonomy(m71_id('org-a'),'TÍTULO AMBÍGUO')->>'total')::int=2,'normalized accent search retains both approved alternatives');
select m71_assert((public.search_position_taxonomy(m71_id('org-a'),'x')->>'total')::int=0,'short search avoids enumeration');
reset role;
insert into m71_state values('rag321',to_jsonb(private.enqueue_occupational_rag(m71_id('org-a'),'Cargo contextual 321','Organizar processos e indicadores.',jsonb_build_object('kind','manual'),m71_id('owner'))));
insert into public.knowledge_proposals(inbox_id,scope,organization_id,proposal_type,original_proposal,status,prompt_version,output_schema_version,source_policy_version)
select (value#>>'{}')::uuid,'organization',m71_id('org-a'),'create',jsonb_build_object('contract','occupational-rag-1.0.0','input_hash',repeat('a',64),
 'proposed_concept',jsonb_build_object('canonical_label','Cargo contextual 321','concept_type','occupation','description','Proposta sintética para revisão.'),
 'aliases','[]'::jsonb,'rationale','Referência relacionada para decisão humana.','unresolved_questions','[]'::jsonb,
 'candidate_concepts',jsonb_build_array(jsonb_build_object('id',m71_id('onet-occ'),'label','Software Developers')),
 'rag',jsonb_build_object('decision','ambiguous','target_id','','related_ids','[]'::jsonb,'evidence','[]'::jsonb,'method','synthetic')),
 'awaiting_human_review','occupational-rag-1.0.0','occupational-rag-proposal-1.0.0','knowledge-grounded-1.0.0' from m71_state where key='rag321';
set local role authenticated;
select set_config('request.jwt.claim.sub',m71_id('owner')::text,true);
select m71_assert(jsonb_array_length(public.load_position_occupational_rag(m71_id('org-a'),(select (value#>>'{}')::uuid from m71_state where key='rag321'))->'candidates')=1,'RAG projection returns current eligible published candidate and sources');
select m71_assert(jsonb_array_length(public.load_position_occupational_rag(m71_id('org-a'),(select (value#>>'{}')::uuid from m71_state where key='rag321'))#>'{candidates,0,sources}')=1,'candidate source version reflects current publication');
reset role;
update public.knowledge_source_versions set is_current=false where id=m71_id('esco-v');
set local role authenticated;
select m71_assert(jsonb_array_length(public.load_position_occupational_rag(m71_id('org-a'),(select (value#>>'{}')::uuid from m71_state where key='rag321'))->'candidates')=0,'source no longer published removes suggestion eligibility without changing human decisions');
reset role;
update public.knowledge_source_versions set is_current=true where id=m71_id('esco-v');
-- Capture comparative execution cost on a bounded synthetic workload, no production data.
do $$declare started timestamptz; old_ms numeric; new_ms numeric; begin
 started:=clock_timestamp();for n in 1..100 loop perform private.qa321_old_allowed(m71_id('org-a'),id) from public.knowledge_concepts;end loop;
 old_ms:=extract(epoch from clock_timestamp()-started)*1000;
 started:=clock_timestamp();for n in 1..100 loop perform private.m71_concept_allowed(m71_id('org-a'),id) from public.knowledge_concepts;end loop;
 new_ms:=extract(epoch from clock_timestamp()-started)*1000;
 raise notice 'PERFORMANCE synthetic eligibility old_ms=% new_ms=%',old_ms,new_ms;
end $$;
