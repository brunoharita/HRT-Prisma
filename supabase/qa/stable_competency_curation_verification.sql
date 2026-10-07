-- Synthetic fixture, LOCAL transaction only. Baseline fails the acceptance before correction.
create function pg_temp.cid(text) returns uuid language sql immutable as $$select md5('curation-persistence-'||$1)::uuid$$;
create function pg_temp.ok(boolean,text) returns void language plpgsql as $$begin if $1 is distinct from true then raise exception 'FAIL: %',$2; end if; raise notice 'PASS: %',$2; end$$;
create function pg_temp.no(text,text) returns void language plpgsql as $$begin begin execute $1; exception when others then if sqlstate=$2 then raise notice 'PASS: denied %',$2; return; end if; raise; end; raise exception 'Expected denial'; end$$;
insert into public.people(id,organization_id,full_name) values(pg_temp.cid('person'),m81_id('org-a'),'Pessoa sintética curadoria');
insert into public.professional_profiles(id,organization_id,person_id,profile_data,extraction_version,inference_version,embedding_version,prompt_version,model_version,review_status,approved_at)
values(pg_temp.cid('profile'),m81_id('org-a'),pg_temp.cid('person'),'{"competencies":["BPM/BPMN","Termo novo","Alias teste","Excelência operacional","Global pendente"]}', 'fixture','none','none','fixture','fixture','approved',now());
create function pg_temp.items(boolean default false) returns jsonb language sql as $$select jsonb_build_array(
 jsonb_build_object('originalIndex',0,'sourceText','BPM','normalizedTerm',case when $1 then 'Outro nome sem correspondência' else 'Business Process Management (BPM)' end,'searchTerms','[]'::jsonb,'ambiguous',$1,'method','semantic_normalization'),
 jsonb_build_object('originalIndex',0,'sourceText','BPMN','normalizedTerm','Notação pendente','searchTerms','[]'::jsonb,'ambiguous',false,'method','semantic_normalization'),
 jsonb_build_object('originalIndex',1,'sourceText','Termo novo','normalizedTerm',case when $1 then 'Nome alterado criação' else 'Termo novo' end,'searchTerms','[]'::jsonb,'ambiguous',$1,'method','semantic_normalization'),
 jsonb_build_object('originalIndex',2,'sourceText','Alias teste','normalizedTerm',case when $1 then 'Nome alterado alias' else 'Alias teste' end,'searchTerms','[]'::jsonb,'ambiguous',$1,'method','semantic_normalization'),
 jsonb_build_object('originalIndex',3,'sourceText','Excelência operacional','normalizedTerm','Excelência operacional','searchTerms','[]'::jsonb,'ambiguous',false,'method','semantic_normalization'),
 jsonb_build_object('originalIndex',4,'sourceText','Global pendente','normalizedTerm','Global pendente','searchTerms','[]'::jsonb,'ambiguous',false,'method','semantic_normalization'))$$;
set local role service_role;
do $$declare j jsonb;begin j:=public.claim_profile_competency_normalization(); perform public.complete_profile_competency_normalization((j->>'id')::uuid,(j->>'lease')::uuid,pg_temp.items()); end$$;
reset role;
create function pg_temp.view_profile(uuid default pg_temp.cid('person')) returns jsonb language sql as $$select public.load_person_professional_evidence_map_v6(public.m81_id('org-a'),$1)$$;
create function pg_temp.curate(integer,text,text,text,uuid default null,text default 'organization') returns jsonb language sql as $$
select public.curate_profile_competency_v5(public.m81_id('org-a'),pg_temp.cid('person'),pg_temp.cid('profile'),$1,$2,$3,$6::public.knowledge_scope,$4,$5,$3,'Descrição sintética',case when $4='proposal' then (select id from public.competency_subgroups where code='H1') else null end)$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',m81_id('owner-a')::text,true);
select pg_temp.curate(0,'BPM','Business Process Management (BPM)','proposal');
select pg_temp.ok(exists(select 1 from jsonb_array_elements(pg_temp.view_profile()#>'{normalization,items}') i where i->>'sourceText'='BPM' and i->>'state'='unresolved'),'BASELINE BUG reproduced: local creation returned success but BPM remained pending');
reset role;
-- APPLY CORRECTION HERE
set local role authenticated;
select set_config('request.jwt.claim.sub',m81_id('owner-a')::text,true);
select pg_temp.ok(exists(select 1 from jsonb_array_elements(pg_temp.view_profile()#>'{normalization,items}') i where i->>'sourceText'='BPM' and i->>'state'='human_preserved'),'existing approved BPM recovered immediately');
select pg_temp.ok(exists(select 1 from jsonb_array_elements(pg_temp.view_profile()#>'{normalization,items}') i where i->>'sourceText'='BPMN' and i->>'state'='unresolved'),'BPMN sibling remains pending');
select pg_temp.ok((select count(*)=1 from jsonb_array_elements(pg_temp.view_profile()->'associations') a where a#>>'{evidence,quote}'='BPM'),'BPM declaration visible once with source fragment');
select pg_temp.curate(1,'Termo novo','Termo novo','proposal');
select pg_temp.ok(exists(select 1 from jsonb_array_elements(pg_temp.view_profile()#>'{normalization,items}') i where i->>'sourceText'='Termo novo' and i->>'state'='human_preserved'),'new local creation resolves selected item atomically');
select pg_temp.curate(2,'Alias teste','Alias teste','alias',m81_id('management'));
select pg_temp.ok(exists(select 1 from jsonb_array_elements(pg_temp.view_profile()#>'{normalization,items}') i where i->>'sourceText'='Alias teste' and i->>'state'='human_preserved'),'alias persists a stable target');
select pg_temp.ok(pg_temp.view_profile()=pg_temp.view_profile(),'repeat refresh is stable and creates no rows');
select pg_temp.no('select * from public.profile_competency_curation_decisions','42501');
select pg_temp.no($q$select private.find_competency_curation_decision(null,null,null,'','')$q$,'42501');
select pg_temp.no($q$select pg_temp.curate(2,'Alias teste','Alias teste','alias',public.m81_id('excel'))$q$,'40001');
select pg_temp.no($q$select pg_temp.curate(3,'Fonte forjada','Excelência operacional','proposal')$q$,'40001');
select pg_temp.no($q$select pg_temp.curate(3,'Excelência operacional','Excelência operacional','alias',public.m81_id('org-b-concept'))$q$,'42501');
select pg_temp.no($q$select pg_temp.curate(3,'Excelência operacional','Excelência operacional','alias',public.m81_id('occupation'))$q$,'42501');
select pg_temp.no($q$select pg_temp.curate(3,'Excelência operacional','Excelência operacional','proposal',null,'global')$q$,'42501');
select set_config('request.jwt.claim.sub',m81_id('member-a')::text,true);
select pg_temp.no($q$select pg_temp.curate(3,'Excelência operacional','Excelência operacional','proposal')$q$,'42501');
select set_config('request.jwt.claim.sub',m81_id('owner-b')::text,true);
select pg_temp.no('select pg_temp.view_profile()','42501');
select set_config('request.jwt.claim.sub',m81_id('super')::text,true);
select pg_temp.curate(4,'Global pendente','Global pendente','proposal',null,'global');
select pg_temp.ok(exists(select 1 from jsonb_array_elements(pg_temp.view_profile()#>'{normalization,items}') i where i->>'sourceText'='Global pendente' and i->>'state'='unresolved'),'unapproved global proposal is not treated as completed association');
select pg_temp.no($q$select pg_temp.curate(4,'Global pendente','Global pendente','proposal',null,'global')$q$,'23505');
select set_config('request.jwt.claim.sub',m81_id('owner-a')::text,true);
select public.request_profile_competency_normalization(m81_id('org-a'),pg_temp.cid('person'));
set local role service_role;
do $$declare j jsonb;begin j:=public.claim_profile_competency_normalization(); perform public.complete_profile_competency_normalization((j->>'id')::uuid,(j->>'lease')::uuid,pg_temp.items(true)); end$$;
reset role;
select pg_temp.ok((select count(*)=3 from public.profile_competency_curation_decisions where profile_id=pg_temp.cid('profile')),'only three completed human associations persisted');
select pg_temp.ok((select count(*)=3 from public.profile_competency_normalization_runs r cross join lateral jsonb_array_elements(result) i where profile_id=pg_temp.cid('profile') and sequence=(select max(sequence) from public.profile_competency_normalization_runs where profile_id=pg_temp.cid('profile')) and i->>'state'='human_preserved'),'new run preserves human decisions despite new names and AI ambiguity');
select pg_temp.ok((select result->0->>'state'='unresolved' from public.profile_competency_normalization_runs where profile_id=pg_temp.cid('profile') order by sequence limit 1),'old normalization snapshot remains unchanged');
select pg_temp.ok((select sum(request_count)=0 from public.profile_competency_normalization_runs),'no AI request was reserved');
set local role authenticated;
select set_config('request.jwt.claim.sub',m81_id('owner-a')::text,true);
select pg_temp.ok((select count(*)=3 from jsonb_array_elements(pg_temp.view_profile()#>'{normalization,items}') i where i->>'state'='human_preserved'),'projection remains resolved after new normalization');
select pg_temp.ok(exists(select 1 from jsonb_array_elements(pg_temp.view_profile()#>'{normalization,items}') i where i->>'sourceText'='Excelência operacional' and i->>'state'='unresolved'),'unreviewed Excellence remains pending');
select pg_temp.ok(not exists(select 1 from jsonb_array_elements(pg_temp.view_profile()->'associations') a where a->>'nature'<>'declared'),'no contextual, demonstrated or verified evidence fabricated');
reset role;
-- Failure injection verifies that a local creation cannot commit success without its item decision.
create function pg_temp.skip_decision() returns trigger language plpgsql as $$begin return null; end$$;
create trigger synthetic_skip_decision before insert on public.profile_competency_curation_decisions for each row execute function pg_temp.skip_decision();
set local role authenticated;
select pg_temp.no($q$select pg_temp.curate(3,'Excelência operacional','Excelência operacional','proposal')$q$,'40001');
reset role;
select pg_temp.ok(not exists(select 1 from public.knowledge_concepts where canonical_label='Excelência operacional'),'failed resolution rolls back concept, proposal and alias atomically');
drop trigger synthetic_skip_decision on public.profile_competency_curation_decisions;
savepoint unavailable_concept;
update public.knowledge_concepts set status='deprecated' where id=(select concept_id from public.profile_competency_curation_decisions where source_text='BPM');
set local role authenticated;
select pg_temp.ok(exists(select 1 from jsonb_array_elements(pg_temp.view_profile()#>'{normalization,items}') i where i->>'sourceText'='BPM' and i->>'state'='source_unavailable'),'real concept unavailability is explicit, not silently replaced');
reset role;
rollback to unavailable_concept;
-- A later profile of the same Person may inherit only the exact original declaration and fragment.
update public.professional_profiles set superseded_at=now() where id=pg_temp.cid('profile');
insert into public.professional_profiles(id,organization_id,person_id,profile_version,profile_data,extraction_version,inference_version,embedding_version,prompt_version,model_version,review_status,approved_at)
select pg_temp.cid('next'),organization_id,person_id,2,profile_data,extraction_version,inference_version,embedding_version,prompt_version,model_version,'approved',now() from public.professional_profiles where id=pg_temp.cid('profile');
set local role service_role;
do $$declare j jsonb;begin j:=public.claim_profile_competency_normalization(); perform public.complete_profile_competency_normalization((j->>'id')::uuid,(j->>'lease')::uuid,pg_temp.items(true)); end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',m81_id('owner-a')::text,true);
select pg_temp.ok((select count(*)=3 from jsonb_array_elements(pg_temp.view_profile()#>'{normalization,items}') i where i->>'state'='human_preserved'),'later profile with unchanged declarations preserves three decisions');
select pg_temp.no($q$select pg_temp.curate(3,'Excelência operacional','Excelência operacional','proposal')$q$,'40001');
reset role;
insert into public.people(id,organization_id,full_name) values(pg_temp.cid('other'),m81_id('org-a'),'Outra Pessoa sintética');
insert into public.professional_profiles(id,organization_id,person_id,profile_data,extraction_version,inference_version,embedding_version,prompt_version,model_version,review_status,approved_at)
values(pg_temp.cid('other-profile'),m81_id('org-a'),pg_temp.cid('other'),'{"competencies":["BPM/BPMN","Termo novo","Alias teste","Excelência operacional","Global pendente"]}','fixture','none','none','fixture','fixture','approved',now());
set local role service_role;
do $$declare j jsonb;begin j:=public.claim_profile_competency_normalization(); perform public.complete_profile_competency_normalization((j->>'id')::uuid,(j->>'lease')::uuid,pg_temp.items(true)); end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',m81_id('owner-a')::text,true);
select pg_temp.ok(not exists(select 1 from jsonb_array_elements(pg_temp.view_profile(pg_temp.cid('other'))#>'{normalization,items}') i where i->>'state'='human_preserved'),'stable Person decisions do not leak to another Person');
set local role anon;
select pg_temp.no('select pg_temp.view_profile()','42501');
reset role;
select pg_temp.ok((select count(*)=3 from public.profile_competency_curation_decisions),'refresh, rejection and later version never duplicate or replace decisions');
set local role authenticated;
select set_config('request.jwt.claim.sub',m81_id('super')::text,true);
select * from public.approve_knowledge_proposal((select id from public.knowledge_proposals where scope='global' and original_proposal->>'observed_term'='Global pendente'),null,'Aprovação humana sintética da proposta global.');
select pg_temp.ok(exists(select 1 from jsonb_array_elements(pg_temp.view_profile()#>'{normalization,items}') i where i->>'sourceText'='Global pendente' and i->>'state'='human_preserved'),'global proposal becomes stable only after actual authorized approval');
reset role;
select pg_temp.ok((select count(*)=4 from public.profile_competency_curation_decisions),'global approval adds exactly its own fragment decision');
