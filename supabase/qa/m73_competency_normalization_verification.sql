-- Synthetic QA only. Runner wraps both migration and this fixture in a rolled-back transaction.
create function public.m73_id(text) returns uuid language sql immutable as $$select md5('m73-'||$1)::uuid$$;
create function public.m73_assert(boolean,text) returns void language plpgsql as $$begin
  if $1 is distinct from true then raise exception 'M73 FAIL: %',$2; end if; raise notice 'PASS: %',$2; end$$;
create function public.m73_reject(text,text) returns void language plpgsql as $$begin
  begin execute $1; exception when others then if $2 is null or sqlstate=$2 then raise notice 'PASS: denied (%)',sqlstate;return;end if;raise;end;
  raise exception 'M73 FAIL expected denial';end$$;
insert into public.organization_groups(id,name,slug) values(m73_id('group'),'M73 synthetic','m73-synthetic');
insert into public.organizations(id,name,group_id) values(m73_id('a'),'M73 A',m73_id('group')),(m73_id('b'),'M73 B',m73_id('group'));
insert into auth.users(id,email) select m73_id(u),u||'@example.invalid' from unnest(array['owner','member','outsider','inactive']) u;
insert into public.platform_users(id,auth_user_id,full_name,username,email,access_profile,group_id,status)
select m73_id('platform-'||u),m73_id(u),'Synthetic '||u,'m73-'||u,u||'@example.invalid',
  (case when u in ('inactive','outsider') then 'member' else u end)::public.membership_role,m73_id('group'),
  (case when u='inactive' then 'inactive' else 'active' end)::public.platform_user_status
from unnest(array['owner','member','outsider','inactive']) u;
insert into public.organization_memberships(organization_id,user_id,role) values
 (m73_id('a'),m73_id('owner'),'owner'),(m73_id('a'),m73_id('member'),'member'),(m73_id('a'),m73_id('inactive'),'member'),(m73_id('b'),m73_id('outsider'),'member') on conflict do nothing;
insert into public.people(id,organization_id,full_name) values(m73_id('person'),m73_id('a'),'Pessoa sintética');
insert into public.professional_profiles(id,organization_id,person_id,profile_data,extraction_version,inference_version,embedding_version,prompt_version,model_version,profile_version,review_status,approved_at,superseded_at)
 values(m73_id('old'),m73_id('a'),m73_id('person'),'{"competencies":["Legado"]}','fixture','none','none','fixture','fixture',1,'approved',now()-interval '1 day',now()),
 (m73_id('current'),m73_id('a'),m73_id('person'),'{"competencies":["Excel e Word","PMO","negociação","Termo desconhecido"]}','fixture','none','none','fixture','fixture',2,'approved',now(),null);
insert into public.knowledge_concepts(id,scope,organization_id,concept_type,canonical_label,status,provenance) values
 (m73_id('excel'),'global',null,'technology','Microsoft Excel','approved','{}'),
 (m73_id('word-b'),'organization',m73_id('b'),'technology','Microsoft Word','approved','{}'),
 (m73_id('negotiation'),'global',null,'skill','Negotiation','approved','{}'),
 (m73_id('pmo'),'global',null,'occupation','Responsável pelo apoio a projetos','approved','{}');
insert into public.knowledge_terms(concept_id,scope,organization_id,term,normalized_term,status) values
 (m73_id('excel'),'global',null,'Microsoft Excel','microsoft excel','approved'),
 (m73_id('word-b'),'organization',m73_id('b'),'Microsoft Word','microsoft word','approved'),
 (m73_id('negotiation'),'global',null,'Negotiation','negotiation','approved'),
 (m73_id('pmo'),'global',null,'PMO','pmo','approved');
select m73_assert((select count(*)=1 from profile_competency_normalization_runs),'only current profile enqueued by publication trigger');
select private.enqueue_profile_competency_normalization(m73_id('current'));
select m73_assert((select count(*)=1 from profile_competency_normalization_runs),'enqueue idempotency');
select m73_assert(private.resolve_normalized_competency(m73_id('a'),'Excel','["Microsoft Excel"]')->>'state'='resolved','vendor normalization resolves approved concept');
select m73_assert(private.resolve_normalized_competency(m73_id('a'),'Word','["Microsoft Word"]')->>'state'='unresolved','foreign organization concept cannot resolve');
select m73_assert(private.resolve_normalized_competency(m73_id('a'),'PMO','["PMO"]')->>'state'='unresolved','occupation is not a declared competence');
select m73_assert(private.resolve_normalized_competency(m73_id('a'),'negociação','["Negotiation"]')->>'state'='resolved','translated equivalent uses real concept');
insert into public.knowledge_concepts(id,scope,concept_type,canonical_label,status,provenance) values
 (m73_id('word'),'global','technology','Microsoft Word','approved','{}'),
 (m73_id('ambiguous-a'),'global','knowledge','Arquitetura A','approved','{}'),
 (m73_id('ambiguous-b'),'global','knowledge','Arquitetura B','approved','{}');
insert into public.knowledge_terms(concept_id,scope,term,normalized_term,status) values
 (m73_id('word'),'global','Microsoft Word','microsoft word','approved'),
 (m73_id('ambiguous-a'),'global','Arquitetura','arquitetura','approved'),
 (m73_id('ambiguous-b'),'global','Arquitetura','arquitetura','approved');
select m73_assert(private.resolve_normalized_competency(m73_id('a'),'Arquitetura','["Microsoft Excel"]')->>'state'='ambiguous','semantic suggestion cannot override ambiguous original alias');

set local role service_role;
do $$declare job jsonb; items jsonb;begin
 job:=public.claim_profile_competency_normalization();
 perform public.m73_assert(job is not null,'server claims queued job');
 perform public.m73_assert(public.claim_profile_competency_normalization() is null,'same job cannot be claimed concurrently');
 items:='[{"originalIndex":0,"sourceText":"Excel","normalizedTerm":"Microsoft Excel","searchTerms":["Microsoft Excel"],"ambiguous":false,"method":"deterministic"},{"originalIndex":0,"sourceText":"Word","normalizedTerm":"Microsoft Word","searchTerms":["Microsoft Word"],"ambiguous":false,"method":"deterministic"},{"originalIndex":1,"sourceText":"PMO","normalizedTerm":"PMO","searchTerms":["PMO"],"ambiguous":false,"method":"deterministic"},{"originalIndex":2,"sourceText":"negociação","normalizedTerm":"Negociação","searchTerms":["Negotiation"],"ambiguous":false,"method":"semantic_normalization"},{"originalIndex":3,"sourceText":"Termo desconhecido","normalizedTerm":"Termo desconhecido","searchTerms":["Termo desconhecido"],"ambiguous":false,"method":"deterministic"}]';
 perform public.m73_reject(format('select public.complete_profile_competency_normalization(%L,%L,%L)',job->>'id',public.m73_id('bad-lease'),'[]'),'40001');
 perform public.m73_reject(format('select public.complete_profile_competency_normalization(%L,%L,%L)',job->>'id',job->>'lease','[]'),null);
 perform public.m73_reject(format('select public.complete_profile_competency_normalization(%L,%L,%L)',job->>'id',job->>'lease',jsonb_set(items,'{0,sourceText}','"Inventado"')),null);
 perform public.m73_reject(format('select public.complete_profile_competency_normalization(%L,%L,%L)',job->>'id',job->>'lease',(items->0)-'normalizedTerm'),null);
 perform public.m73_assert(not public.reserve_competency_normalization_call((job->>'id')::uuid,(job->>'lease')::uuid,0,0),'disabled budget blocks call');
 perform public.m73_assert(public.reserve_competency_normalization_call((job->>'id')::uuid,(job->>'lease')::uuid,1,1),'one bounded call reserved');
 perform public.m73_assert(not public.reserve_competency_normalization_call((job->>'id')::uuid,(job->>'lease')::uuid,1,1),'budget cannot be bypassed by repetition');
 perform public.complete_profile_competency_normalization((job->>'id')::uuid,(job->>'lease')::uuid,items);
 perform public.m73_reject(format('select public.complete_profile_competency_normalization(%L,%L,%L)',job->>'id',job->>'lease',items),'40001');
end$$;
reset role;
select m73_assert((select profile_data='{ "competencies":["Excel e Word","PMO","negociação","Termo desconhecido"]}'::jsonb from professional_profiles where id=m73_id('current')),'published declaration untouched');
select m73_assert((select profile_data='{"competencies":["Legado"]}'::jsonb from professional_profiles where id=m73_id('old')),'historical profile untouched');
set local role authenticated;
select set_config('request.jwt.claim.sub',m73_id('member')::text,true);
do $$declare projection jsonb;begin
 projection:=public.load_person_professional_evidence_map_v2(public.m73_id('a'),public.m73_id('person'));
 perform public.m73_assert(projection->>'contractVersion'='person-professional-evidence-2.0.0','versioned projection');
 perform public.m73_assert(projection#>>'{normalization,declaredCount}'='4','all declarations counted independently');
 perform public.m73_assert(jsonb_array_length(projection->'associations')=3,'Excel and Word separated plus equivalent Negotiation');
 perform public.m73_assert(jsonb_array_length(projection->'issues')=2,'two unmatched atomic items visible');
 perform public.m73_assert(not exists(select 1 from jsonb_array_elements(projection->'associations') a where a->>'nature'<>'declared' or a->'verification'<>'null'::jsonb),'normalization never becomes demonstration or inference');
end$$;
select m73_reject('select public.claim_profile_competency_normalization()','42501');
select m73_reject('select * from public.profile_competency_normalization_runs','42501');
select m73_reject(format('select public.request_profile_competency_normalization(%L,%L)',m73_id('a'),m73_id('person')),'42501');
select set_config('request.jwt.claim.sub',m73_id('outsider')::text,true);
select m73_reject(format('select public.load_person_professional_evidence_map_v2(%L,%L)',m73_id('a'),m73_id('person')),'42501');
select set_config('request.jwt.claim.sub',m73_id('inactive')::text,true);
select m73_reject(format('select public.load_person_professional_evidence_map_v2(%L,%L)',m73_id('a'),m73_id('person')),'42501');
select set_config('request.jwt.claim.sub',m73_id('owner')::text,true);
select public.request_profile_competency_normalization(m73_id('a'),m73_id('person'));
reset role;
select m73_assert((select count(*)=2 from public.profile_competency_normalization_runs),'explicit reprocessing creates revision without erasing result');
set local role service_role;
do $$declare job jsonb;begin
 job:=public.claim_profile_competency_normalization();
 perform public.complete_profile_competency_normalization((job->>'id')::uuid,(job->>'lease')::uuid,'[]','INPUT_LIMIT');
end$$;
reset role;
select set_config('request.jwt.claim.sub',m73_id('owner')::text,true);
select m73_assert(public.load_person_professional_evidence_map_v2(m73_id('a'),m73_id('person'))#>>'{normalization,status}'='failed','processing failure visible');
select m73_assert(jsonb_array_length(public.load_person_professional_evidence_map_v2(m73_id('a'),m73_id('person'))#>'{normalization,items}')=4,'every raw declaration visible after processing failure');
-- A human decision recorded after automatic normalization must immediately suppress its automatic equivalent.
update public.profile_competency_normalization_runs set result=(select result from public.profile_competency_normalization_runs where revision=1 limit 1),status='complete' where revision=2;
insert into public.knowledge_observations(organization_id,person_id,profile_id,original_term,normalized_term,resolution_state,normalization_method,resolution_method_version,concept_id,knowledge_global_version,source_snapshot,resolved_at,resolved_by_auth_user_id)
 values(m73_id('a'),m73_id('person'),m73_id('current'),'Excel e Word','excel e word','resolved','organization_exact','knowledge-normalization-2.0.0',m73_id('excel'),1,'{}',now(),m73_id('owner'));
do $$declare projection jsonb;begin
 projection:=public.load_person_professional_evidence_map_v2(public.m73_id('a'),public.m73_id('person'));
 perform public.m73_assert((select count(*)=1 from jsonb_array_elements(projection->'associations') a where a->>'observedTerm'='Excel e Word'),'late human decision replaces automatic atoms without duplication');
 perform public.m73_assert((select count(*)=1 from jsonb_array_elements(projection->'associations') a where a#>>'{explanation,humanDecision}' is not null),'human decision provenance preserved');
end$$;
set local role anon;
select m73_reject(format('select public.load_person_professional_evidence_map_v2(%L,%L)',m73_id('a'),m73_id('person')),'42501');
reset role;
