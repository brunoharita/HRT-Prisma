reset role;
savepoint contextual_references;
-- Mixed retrieval pool, but only one supported interpretation. Synthetic fixtures only.
update public.knowledge_concepts set scope='organization',organization_id=rag_id('a') where id in(rag_id('stock'),rag_id('sales'));
update public.knowledge_proposals set original_proposal=jsonb_set(jsonb_set(original_proposal,'{candidate_concepts}',
 (select jsonb_agg(jsonb_build_object('id',id,'label',canonical_label,'description',description,'scope',scope,'version',version,'aliases','[]'::jsonb,'sources','[]'::jsonb)) from public.knowledge_concepts where id in(rag_id('sales'),rag_id('stock'),rag_id('foreign')))),
 '{rag,target_id}',to_jsonb(rag_id('stock')::text)) where status='awaiting_human_review';
insert into rag_state select 'projection_original',original_proposal from public.knowledge_proposals where status='awaiting_human_review';
set local role authenticated;
select set_config('request.jwt.claim.sub',rag_id('recruiter')::text,true);
select rag_assert(public.load_position_occupational_rag(rag_id('a'),(select (v#>>'{}')::uuid from rag_state where k='inbox'))#>'{candidates,0,id}'=to_jsonb(rag_id('stock')::text),'only contextual target is offered from mixed retrieval');
select rag_assert(jsonb_array_length(public.load_position_occupational_rag(rag_id('a'),(select (v#>>'{}')::uuid from rag_state where k='inbox'))->'candidates')=1,'non-target and foreign candidates are excluded');
select rag_assert(public.load_position_occupational_rag(rag_id('a'),(select (v#>>'{}')::uuid from rag_state where k='inbox'))#>'{review,proposal,original}'=(select v from rag_state where k='projection_original'),'original retrieval pool preserved byte-for-byte in review history');
select set_config('request.jwt.claim.sub',rag_id('outsider')::text,true);
select rag_reject(format('select public.load_position_occupational_rag(%L,%L)',rag_id('a'),(select v#>>'{}' from rag_state where k='inbox')),'42501');
reset role;
do $$declare d text;begin
 foreach d in array array['new_concept','ambiguous','insufficient'] loop
 update public.knowledge_proposals set original_proposal=jsonb_set(original_proposal,'{rag,decision}',to_jsonb(d)) where status='awaiting_human_review';
 perform set_config('request.jwt.claim.sub',rag_id('recruiter')::text,true);
 perform rag_assert(jsonb_array_length(public.load_position_occupational_rag(rag_id('a'),(select (v#>>'{}')::uuid from rag_state where k='inbox'))->'candidates')=0,'no correspondence manufactured for '||d);
 end loop;
end$$;
update public.knowledge_proposals set original_proposal=(select v from rag_state where k='projection_original') where status='awaiting_human_review';
savepoint missing_evidence;
update public.knowledge_proposals set original_proposal=jsonb_set(original_proposal,'{rag,evidence}','[]') where status='awaiting_human_review';
select rag_assert(jsonb_array_length(public.load_position_occupational_rag(rag_id('a'),(select (v#>>'{}')::uuid from rag_state where k='inbox'))->'candidates')=0,'unsupported target without evidence is withheld');
rollback to missing_evidence;
savepoint withdrawn;
update public.knowledge_concepts set status='rejected' where id=rag_id('stock');
select rag_assert(jsonb_array_length(public.load_position_occupational_rag(rag_id('a'),(select (v#>>'{}')::uuid from rag_state where k='inbox'))->'candidates')=0,'withdrawn target cannot be selected');
rollback to withdrawn;
-- A human may choose another eligible target. The AI may never hide/replace that decision.
update public.knowledge_proposals set status='approved',published_concept_id=rag_id('sales'),human_edited_proposal=original_proposal||jsonb_build_object('approved_target_id',rag_id('sales')) where status='awaiting_human_review';
select rag_assert(public.load_position_occupational_rag(rag_id('a'),(select (v#>>'{}')::uuid from rag_state where k='inbox'))#>>'{candidates,0,id}'=rag_id('sales')::text,'human-approved target prevails over automatic target');
select rag_assert(jsonb_array_length(public.load_position_occupational_rag(rag_id('a'),(select (v#>>'{}')::uuid from rag_state where k='inbox'))->'candidates')=1,'approval does not reintroduce discarded pool');
insert into public.knowledge_concepts(id,canonical_label,concept_type,scope,organization_id,description,status,approved_by_auth_user_id) values(rag_id('new-published'),'Função aprovada pela empresa','occupation','organization',rag_id('a'),'Definição humana.','approved',rag_id('recruiter'));
update public.knowledge_proposals set published_concept_id=rag_id('new-published'),human_edited_proposal=human_edited_proposal||'{"approved_target_id":null}' where status='approved';
select rag_assert(public.load_position_occupational_rag(rag_id('a'),(select (v#>>'{}')::uuid from rag_state where k='inbox'))#>>'{candidates,0,id}'=rag_id('new-published')::text,'new human-published concept outside original pool remains available');
select rag_assert((select count(*)=0 from public.knowledge_approvals),'projection never manufactures approvals');
rollback to contextual_references;
