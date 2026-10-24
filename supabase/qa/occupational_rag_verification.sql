-- Synthetic, transactional fixtures. Invoker helpers exercise actual role/RLS.
create function public.rag_id(text) returns uuid language sql immutable as $$select md5('rag320-'||$1)::uuid$$;
create function public.rag_assert(boolean,text) returns void language plpgsql as $$begin if $1 is distinct from true then raise exception 'FAIL: %',$2;end if;raise notice 'PASS: %',$2;end$$;
create function public.rag_reject(text,text) returns void language plpgsql as $$begin begin execute $1;exception when others then if sqlstate=$2 then raise notice 'PASS: denied (%)',$2;return;end if;raise;end;raise exception 'FAIL: expected denial: %',$1;end$$;
insert into public.organization_groups(id,name,slug) values(rag_id('group'),'Synthetic RAG','rag320');
insert into public.organizations(id,name,group_id) values(rag_id('a'),'Empresa sintética A',rag_id('group')),(rag_id('b'),'Empresa sintética B',rag_id('group'));
insert into auth.users(id,email) select rag_id(u),u||'@example.invalid' from unnest(array['recruiter','member','outsider','inactive','super']) u;
insert into public.platform_users(id,auth_user_id,full_name,username,email,access_profile,group_id,status)
 select rag_id('platform-'||u),rag_id(u),'Synthetic '||u,'rag320-'||u,u||'@example.invalid',
 (case when u='super' then 'super_admin' when u='inactive' then 'recruiter' when u='outsider' then 'recruiter' else u end)::public.membership_role,
 case when u<>'super' then rag_id('group') end,(case when u='inactive' then 'inactive' else 'active' end)::public.platform_user_status
 from unnest(array['recruiter','member','outsider','inactive','super']) u;
insert into public.organization_memberships(organization_id,user_id,role) values(rag_id('a'),rag_id('recruiter'),'recruiter'),(rag_id('a'),rag_id('member'),'member'),(rag_id('a'),rag_id('inactive'),'recruiter'),(rag_id('b'),rag_id('outsider'),'recruiter');
insert into private.profile_synthesis_worker_config(singleton,token_hash) values(true,encode(extensions.digest(repeat('s',48),'sha256'),'hex')) on conflict(singleton) do update set token_hash=excluded.token_hash;
insert into private.ai_history_worker_config(id,token_hash) values(true,encode(extensions.digest(repeat('h',48),'sha256'),'hex')) on conflict(id) do update set token_hash=excluded.token_hash;
insert into public.knowledge_concepts(id,canonical_label,concept_type,scope,organization_id,description,status,approved_by_auth_user_id) values
 (rag_id('sales'),'Sales Representative','occupation','global',null,'Prospecta clientes e negocia a venda de produtos e serviços.','approved',rag_id('super')),
 (rag_id('stock'),'Gestor de Estoque','occupation','global',null,'Controla armazenagem, inventário, recebimento e expedição.','approved',rag_id('super')),
 (rag_id('foreign'),'Cargo privado B','occupation','organization',rag_id('b'),'Definição secreta de outro tenant.','approved',rag_id('outsider'));
insert into public.knowledge_terms(concept_id,scope,organization_id,term,normalized_term,language,term_type,status,approved_by_auth_user_id) values(rag_id('sales'),'global',null,'Sales Representative','sales representative','en','canonical','approved',rag_id('super'));
create temp table rag_state(k text primary key,v jsonb);grant all on rag_state to anon,authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub',rag_id('recruiter')::text,true);
insert into rag_state values('inbox',to_jsonb(public.request_occupational_rag(rag_id('a'),'Vendedor','Prospecta clientes e negocia a venda de produtos e serviços.')));
select rag_assert(public.request_occupational_rag(rag_id('a'),'Vendedor','Prospecta clientes e negocia a venda de produtos e serviços.')=(select (v#>>'{}')::uuid from rag_state where k='inbox'),'idempotent input reuses original Inbox');
select rag_assert(public.request_occupational_rag(rag_id('a'),'Sales Representative','') is null,'approved exact match avoids a new proposal');
select rag_reject(format('select public.request_occupational_rag(%L,''X'',''context'')',rag_id('b')),'42501');
select rag_assert(jsonb_array_length(public.load_occupational_rag_reviews(rag_id('a')))=1,'own company reviews visible');
select set_config('request.jwt.claim.sub',rag_id('outsider')::text,true);
select rag_reject(format('select public.load_occupational_rag_reviews(%L)',rag_id('a')),'42501');
select rag_assert((select count(*)=0 from public.knowledge_inbox where organization_id=rag_id('a')),'RLS hides other company');
select set_config('request.jwt.claim.sub',rag_id('inactive')::text,true);
select rag_reject(format('select public.request_occupational_rag(%L,''X'',''context'')',rag_id('a')),'42501');
select set_config('request.jwt.claim.sub',rag_id('member')::text,true);
select rag_reject(format('select public.request_occupational_rag(%L,''X'',''context'')',rag_id('a')),'42501');
reset role;

set local role anon;
select rag_reject('select public.claim_occupational_rag(''wrong'')','42501');
select rag_reject(format('select public.load_occupational_rag_reviews(%L)',rag_id('a')),'42501');
insert into rag_state values('job',public.claim_occupational_rag(repeat('s',48)));
select rag_assert(public.claim_occupational_rag(repeat('s',48)) is null,'lease prevents duplicate acquisition');
insert into rag_state select 'candidates',public.search_occupational_rag_candidates(repeat('s',48),(v->>'id')::uuid,(v->>'lease')::uuid,array['sales','clientes']) from rag_state where k='job';
select rag_assert((select jsonb_array_length(v)=1 and v->0->>'id'=rag_id('sales')::text from rag_state where k='candidates'),'bounded retrieval finds approved Sales without foreign tenant');
insert into rag_state select 'payload',jsonb_build_object('contract','occupational-rag-1.0.0','input_hash',v->>'inputHash','proposed_concept',jsonb_build_object('canonical_label','Vendedor','concept_type','occupation','description','Prospecta clientes e negocia vendas.'),'aliases',jsonb_build_array('Sales Rep'),'unresolved_questions','[]'::jsonb,'rationale','Atividades comerciais correspondentes.','candidate_concepts',(select v from rag_state where k='candidates'),'rag',jsonb_build_object('decision','alias','target_id',rag_id('sales'),'related_ids','[]'::jsonb,'evidence',jsonb_build_array(jsonb_build_object('source_id','context','quote','Prospecta clientes e negocia a venda de produtos e serviços.')))) from rag_state where k='job';
do $$declare j jsonb; p jsonb;begin select v into j from rag_state where k='job';select v into p from rag_state where k='payload';
 perform rag_reject(format('select public.complete_occupational_rag(%L,%L,%L,%L,%L,1)',repeat('s',48),j->>'id',rag_id('wrong'),p,'qwen3:4b-instruct-2507-q4_K_M'),'42501');
 perform rag_reject(format('select public.complete_occupational_rag(%L,%L,%L,%L,%L,1)',repeat('s',48),j->>'id',j->>'lease',jsonb_set(p,'{rag,target_id}',to_jsonb(rag_id('foreign')::text)),'qwen3:4b-instruct-2507-q4_K_M'),'22023');
 perform rag_reject(format('select public.complete_occupational_rag(%L,%L,%L,%L,%L,1)',repeat('s',48),j->>'id',j->>'lease',jsonb_set(p,'{rag,evidence,0,quote}','"Invented responsibility"'),'qwen3:4b-instruct-2507-q4_K_M'),'22023');
 perform public.complete_occupational_rag(repeat('s',48),(j->>'id')::uuid,(j->>'lease')::uuid,p,'qwen3:4b-instruct-2507-q4_K_M',100);
end$$;
reset role;
select rag_assert((select count(*)=3 from public.knowledge_concepts),'AI creates no approved concept');
insert into rag_state select 'proposal',to_jsonb(id) from public.knowledge_proposals where scope='organization' and inbox_id=(select (v#>>'{}')::uuid from rag_state where k='inbox');
set local role authenticated;
select set_config('request.jwt.claim.sub',rag_id('recruiter')::text,true);
select rag_assert((select count(*)=1 from public.knowledge_proposals where scope='organization'),'own RAG proposal visible through RLS');
select rag_reject(format('select public.approve_knowledge_proposal(%L)',(select v#>>'{}' from rag_state where k='proposal')),'22023');
select rag_reject(format('select public.review_occupational_rag_proposal(%L,%L,%L,%L)',(select v#>>'{}' from rag_state where k='proposal'),(select v->>'inputHash' from rag_state where k='job'),'{"canonical_label":"Vendedor","description":"Comercial","aliases":[],"related_ids":[],"target_version":99}',rag_id('sales')),'40001');
select public.review_occupational_rag_proposal((select (v#>>'{}')::uuid from rag_state where k='proposal'),(select v->>'inputHash' from rag_state where k='job'),'{"canonical_label":"Vendedor","description":"Responsabilidades comerciais revisadas pelo recrutador.","aliases":[],"related_ids":[],"target_version":1}',rag_id('sales'),null);
select rag_assert(public.review_occupational_rag_proposal((select (v#>>'{}')::uuid from rag_state where k='proposal'),(select v->>'inputHash' from rag_state where k='job'),'{}',null,null)->>'reused'='true','company approval replay safe');
reset role;
select rag_assert((select count(*)=3 from public.knowledge_concepts),'alias approval does not clone concept');
select rag_assert((select count(*)=1 from public.knowledge_terms where term='Vendedor' and scope='organization' and concept_id=rag_id('sales')),'alias published only in company');
select rag_assert((select count(*)=1 from public.knowledge_proposals where scope='global' and origin_term_id is not null and status='awaiting_human_review'),'automatic pending global alias contribution');
select rag_assert((select original_proposal#>>'{proposed_concept,description}'='Prospecta clientes e negocia vendas.' and human_edited_proposal#>>'{proposed_concept,description}'='Responsabilidades comerciais revisadas pelo recrutador.' from public.knowledge_proposals where scope='organization'),'AI original and human edit preserved');
insert into rag_state select 'global',to_jsonb(id) from public.knowledge_proposals where scope='global';
set local role authenticated;
select set_config('request.jwt.claim.sub',rag_id('recruiter')::text,true);
select rag_assert((select count(*)=0 from public.knowledge_proposals where scope='global'),'company cannot see pending global proposals');
select rag_reject(format('select public.approve_occupational_global_alias(%L)',(select v#>>'{}' from rag_state where k='global')),'42501');
select set_config('request.jwt.claim.sub',rag_id('super')::text,true);
select rag_assert(public.load_occupational_rag_origin((select (v#>>'{}')::uuid from rag_state where k='global'))->>'active'='true','Super Admin sees local origin');
select public.approve_occupational_global_alias((select (v#>>'{}')::uuid from rag_state where k='global'));
select rag_assert(public.approve_occupational_global_alias((select (v#>>'{}')::uuid from rag_state where k='global'))->>'reused'='true','global replay safe');
reset role;
select rag_assert((select count(*)=1 from public.knowledge_terms where term='Vendedor' and scope='global' and concept_id=rag_id('sales')),'global approval adds alias to existing concept');
select rag_assert((select count(*)=1 from public.knowledge_terms where term='Vendedor' and scope='organization'),'global approval preserves local term');
select rag_assert((select count(*)=3 from public.knowledge_concepts),'global alias approval avoids clone');
select rag_assert((select count(*)=2 from public.knowledge_approvals),'human approvals audited');
-- New concept + explicit related_to, automatic global sanitization, keep local.
set local role authenticated;select set_config('request.jwt.claim.sub',rag_id('recruiter')::text,true);
insert into rag_state values('newInbox',to_jsonb(public.request_occupational_rag(rag_id('a'),'Arquiteto de Revenue','Integra processos comerciais entre marketing, vendas e atendimento ao cliente.')));
reset role;set local role anon;
insert into rag_state values('newJob',public.claim_occupational_rag(repeat('s',48)));
do $$declare j jsonb; p jsonb;begin select v into j from rag_state where k='newJob';select v into p from rag_state where k='payload';
 p:=jsonb_set(jsonb_set(jsonb_set(p,'{input_hash}',to_jsonb(j->>'inputHash')),'{rag,decision}','"new_concept"'),'{rag,target_id}','""');
 p:=jsonb_set(p,'{rag,evidence}',jsonb_build_array(jsonb_build_object('source_id','context','quote','Integra processos comerciais entre marketing, vendas e atendimento ao cliente.')));
 perform public.complete_occupational_rag(repeat('s',48),(j->>'id')::uuid,(j->>'lease')::uuid,p,'qwen3:4b-instruct-2507-q4_K_M',100);
end$$;
reset role;
insert into rag_state select 'newProposal',to_jsonb(id) from public.knowledge_proposals where inbox_id=(select (v#>>'{}')::uuid from rag_state where k='newInbox') and scope='organization';
set local role authenticated;select set_config('request.jwt.claim.sub',rag_id('recruiter')::text,true);
select public.review_occupational_rag_proposal((select (v#>>'{}')::uuid from rag_state where k='newProposal'),(select v->>'inputHash' from rag_state where k='newJob'),jsonb_build_object('canonical_label','Arquiteto de Revenue','description','Integra processos de receita entre marketing, vendas e atendimento.','aliases',jsonb_build_array('Revenue Architect'),'related_ids',jsonb_build_array(rag_id('sales'))));
reset role;
select rag_assert((select count(*)=1 from public.knowledge_relations where scope='organization' and relation_type='related_to'),'human-approved relationship stored in original relations');
select rag_assert((select count(*)=1 from public.knowledge_proposals where scope='global' and origin_concept_id is not null and original_proposal->>'origin_workflow'='occupational-rag-1.0.0' and not(original_proposal?'rag') and not(original_proposal?'input_hash')),'global contribution sanitizes private context/model evidence');
set local role authenticated;select set_config('request.jwt.claim.sub',rag_id('super')::text,true);
savepoint rag_global_create;
select public.approve_occupational_global_alias(id) from public.knowledge_proposals where origin_concept_id is not null and scope='global';
select rag_assert((select count(*)=1 from public.knowledge_concepts where scope='global' and canonical_label='Arquiteto de Revenue' and status='approved'),'global new concept reuses existing human publisher');
rollback to savepoint rag_global_create;
select public.decide_knowledge_global_contribution(id,'deferred',null) from public.knowledge_proposals where origin_concept_id is not null and scope='global';
reset role;
select rag_assert((select count(*)=1 from public.knowledge_concepts where scope='organization' and status='approved' and canonical_label='Arquiteto de Revenue'),'keep global local preserves company approval');
-- New title-only request records no invented definition and model failure remains retryable.
set local role authenticated;select set_config('request.jwt.claim.sub',rag_id('recruiter')::text,true);
insert into rag_state values('failInbox',to_jsonb(public.request_occupational_rag(rag_id('a'),'SDR','')));
reset role;set local role anon;
insert into rag_state values('failJob',public.claim_occupational_rag(repeat('s',48)));
select public.complete_occupational_rag(repeat('s',48),(v->>'id')::uuid,(v->>'lease')::uuid,null,'none',1,'RAG_PROVIDER_UNAVAILABLE') from rag_state where k='failJob';
reset role;
select rag_assert((select status='queued' and attempts=1 and jsonb_array_length(attempt_history)=1 from public.knowledge_research_runs where inbox_id=(select (v#>>'{}')::uuid from rag_state where k='failInbox')),'failure preserves attempt history and bounded retry');
set local role anon;
select rag_reject('select public.record_ai_worker_history_v1(''bad'',''open_request'',''{}'')','42501');
select rag_reject(format('select public.record_ai_worker_history_v1(%L,''open_request'',%L)',repeat('h',48),jsonb_build_object('scope','platform','functionName','occupational_rag','organizationId',rag_id('a'))),'42501');
reset role;

-- Explicit manual takeover preserves pending review and invalidates any worker lease.
set local role authenticated;select set_config('request.jwt.claim.sub',rag_id('recruiter')::text,true);
select public.prepare_occupational_manual_review((select (v#>>'{}')::uuid from rag_state where k='failInbox'));
select rag_assert(exists(select 1 from jsonb_array_elements(public.load_occupational_rag_reviews(rag_id('a'))) r where r->>'title'='SDR' and r->>'status'='awaiting_human_review' and r#>>'{proposal,original,proposed_concept,description}'=''),'manual recovery creates a blank human review, not an invented definition');
reset role;
-- Existing source writers retain their payloads and authoritative state.
insert into public.job_roles(id,organization_id,name) values(rag_id('role'),rag_id('a'),'Gestor sintético');
insert into public.vacancies(id,organization_id,job_role_id,title,status) values(rag_id('vacancy'),rag_id('a'),rag_id('role'),'Gerente de Logística sintético','open');
insert into public.vacancy_versions(id,organization_id,vacancy_id,version,title,mission,responsibilities,source_kind,created_by_auth_user_id)
 values(rag_id('version'),rag_id('a'),rag_id('vacancy'),1,'Gerente de Logística sintético','Planejar transportes e rotas de entrega.','["Negociar fretes e acompanhar as entregas."]','manual',rag_id('recruiter'));
select rag_assert(exists(select 1 from public.knowledge_inbox where occupation_context#>>'{origin,version_id}'=rag_id('version')::text and occupation_context->>'responsibilities' like '%fretes%'),'Position save enqueues its original version and responsibilities');
insert into public.people(id,organization_id,full_name) values(rag_id('person'),rag_id('a'),'Pessoa sintética');
insert into public.professional_profiles(id,organization_id,person_id,profile_data,extraction_version,inference_version,embedding_version,prompt_version,model_version,profile_version,review_status,approved_at,approved_by_auth_user_id)
 select rag_id('profile'),rag_id('a'),rag_id('person'),jsonb_build_object('professionalTitle','Papel sintético principal','summary','Planeja processos e acompanha a execução das atividades.','experiences',(select jsonb_agg(jsonb_build_object('role','Papel sintético '||n,'description','Organiza processos e acompanha atividades operacionais.')) from generate_series(1,200) n)),'fixture','none','none','fixture','fixture',1,'approved',now(),rag_id('recruiter');
insert into rag_state select 'profileOriginal',profile_data from public.professional_profiles where id=rag_id('profile');
select rag_assert((select occupation_rag_cursor is null from public.professional_profiles where id=rag_id('profile')),'no historical backfill on rollout or row insert');
insert into public.person_ingestion_events(organization_id,person_id,actor_auth_user_id,event_type,result,metadata)
 values(rag_id('a'),rag_id('person'),rag_id('recruiter'),'profile_published_merge','success',jsonb_build_object('profile_id',rag_id('profile')));
select rag_assert((select occupation_rag_cursor=-1 from public.professional_profiles where id=rag_id('profile')),'publication marks resumable original profile cursor');
select private.reconcile_occupational_profile_roles();
select rag_assert((select occupation_rag_cursor=4 from public.professional_profiles where id=rag_id('profile')),'profile processing bounded to five roles per pass');
insert into public.people(id,organization_id,full_name) select rag_id('person-'||p),rag_id('a'),'Pessoa sintética '||p from generate_series(2,6) p;
insert into public.professional_profiles(id,organization_id,person_id,profile_data,extraction_version,inference_version,embedding_version,prompt_version,model_version,profile_version,review_status,approved_at,approved_by_auth_user_id,occupation_rag_cursor)
 select rag_id('profile-'||p),rag_id('a'),rag_id('person-'||p),jsonb_build_object('professionalTitle','Papel sintético principal '||p,'summary','Planeja processos e acompanha a execução das atividades.','experiences',(select jsonb_agg(jsonb_build_object('role','Papel sintético '||p||'-'||n,'description','Organiza processos e acompanha atividades operacionais.')) from generate_series(1,200) n)),'fixture','none','none','fixture','fixture',p,'approved',now(),rag_id('recruiter'),-1 from generate_series(2,6) p;
do $$begin for n in 1..250 loop perform private.reconcile_occupational_profile_roles();end loop;end$$;
select rag_assert((select occupation_rag_cursor is null and profile_data=(select v from rag_state where k='profileOriginal') and review_status='approved' and profile_version=1 from public.professional_profiles where id=rag_id('profile')),'1200 roles across six profiles complete resumably without rewriting profile data/history');
select rag_assert((select count(*)=1206 from public.knowledge_inbox where occupation_context#>>'{origin,kind}'='profile'),'all profile roles and primary title queued once');
select private.reconcile_occupational_profile_roles();
select rag_assert((select count(*)=1206 from public.knowledge_inbox where occupation_context#>>'{origin,kind}'='profile'),'completed cursor does not duplicate queues');
set local role anon;
insert into rag_state select 'history',public.record_ai_worker_history_v1(repeat('h',48),'open_request',jsonb_build_object('scope','organization','organizationId',rag_id('a'),'functionName','occupational_rag','operationId',rag_id('operation'),'actorId',null,'sourceVersion','occupational-rag-1.0.0','inputFingerprint',repeat('a',64),'idempotencyKey',repeat('b',64)));
select rag_assert((select v#>>'{request,functionName}'='occupational_rag' or v#>>'{request,function_name}'='occupational_rag' from rag_state where k='history'),'existing AI history boundary accepts only authorized new purpose');
reset role;
