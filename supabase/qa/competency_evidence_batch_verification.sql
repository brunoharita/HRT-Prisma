-- Runner uses LOCAL import_evidence_v202 only and wraps migration + fixture in ROLLBACK.
do $$ begin if current_database()<>'import_evidence_v202' or inet_server_port()<>55479 then raise exception 'Disposable LOCAL database required'; end if; end $$;
create function pg_temp.eid(text) returns uuid language sql immutable as $$ select md5('v209-evidence-'||$1)::uuid $$;
create function pg_temp.check_ok(boolean,text) returns void language plpgsql as $$ begin if $1 is distinct from true then raise exception 'FAIL: %',$2; end if; raise notice 'PASS: %',$2; end $$;
create function pg_temp.reject_sql(text,text) returns void language plpgsql as $$ begin begin execute $1; exception when others then if sqlstate=$2 then raise notice 'PASS: denied %',sqlstate; return; end if; raise; end; raise exception 'Expected denial'; end $$;
insert into public.organization_groups(id,name,slug) values(pg_temp.eid('group'),'Evidence synthetic','evidence-v209');
insert into public.organizations(id,name,group_id) values(pg_temp.eid('a'),'Evidence A',pg_temp.eid('group')),(pg_temp.eid('b'),'Evidence B',pg_temp.eid('group'));
insert into auth.users(id,email) select pg_temp.eid(x),x||'-v209@example.invalid' from unnest(array['owner','member']) x;
insert into public.platform_users(id,auth_user_id,full_name,username,email,access_profile,group_id,status)
select pg_temp.eid('platform-'||x),pg_temp.eid(x),'Synthetic '||x,'v209-'||x,x||'-v209@example.invalid',x::public.membership_role,pg_temp.eid('group'),'active' from unnest(array['owner','member']) x;
insert into public.organization_memberships(organization_id,user_id,role) values(pg_temp.eid('a'),pg_temp.eid('owner'),'owner'),(pg_temp.eid('a'),pg_temp.eid('member'),'member') on conflict do nothing;
insert into public.people(id,organization_id,full_name) values(pg_temp.eid('person'),pg_temp.eid('a'),'Pessoa sintética v209');
insert into public.professional_profiles(id,organization_id,person_id,profile_data,extraction_version,inference_version,embedding_version,prompt_version,model_version,review_status,approved_at)
values(pg_temp.eid('profile'),pg_temp.eid('a'),pg_temp.eid('person'),'{"experiences":[{"description":"Coordenação de projetos e processos operacionais."},{"description":"Gestão de entregas e integração de sistemas."},{"description":"Planejamento e acompanhamento das operações."}],"certifications":["Certificação sintética"],"competencies":[]}', 'fixture','none','none','fixture','fixture','approved',now());
insert into public.knowledge_concepts(id,scope,organization_id,concept_type,canonical_label,status) values
(pg_temp.eid('concept'),'global',null,'skill','Synthetic evidence v209','approved'),(pg_temp.eid('foreign'),'organization',pg_temp.eid('b'),'skill','Foreign evidence v209','approved');
create function pg_temp.batch(jsonb,uuid default pg_temp.eid('a'),uuid default pg_temp.eid('concept')) returns uuid[] language sql as $$ select public.link_person_competency_evidence_batch_v2($2,pg_temp.eid('person'),pg_temp.eid('profile'),$3,$1) $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.eid('owner')::text,true);
select pg_temp.check_ok(cardinality(pg_temp.batch('[{"nature":"contextual","sourceIndex":0,"sourceQuote":"Coordenação de projetos e processos operacionais.","credentialName":null,"credentialIssuer":null}]'))=1,'one selection saved without client rationale');
select pg_temp.check_ok(cardinality(pg_temp.batch('[{"nature":"contextual","sourceIndex":0,"sourceQuote":"Coordenação de projetos e processos operacionais.","credentialName":null,"credentialIssuer":null},{"nature":"contextual","sourceIndex":1,"sourceQuote":"Gestão de entregas e integração de sistemas."}]'))=2,'two separate links and compatible replay');
select pg_temp.check_ok((select count(*)=2 from public.person_competency_evidence_links where profile_id=pg_temp.eid('profile')),'no duplicate rows');
select pg_temp.reject_sql($q$select pg_temp.batch('[{"nature":"contextual","sourceIndex":2,"sourceQuote":"Planejamento e acompanhamento das operações."},{"nature":"contextual","sourceIndex":99,"sourceQuote":"Fonte inválida ausente no Perfil."}]')$q$,'22023');
select pg_temp.check_ok((select count(*)=2 from public.person_competency_evidence_links where profile_id=pg_temp.eid('profile')),'invalid second selection rolled back the first');
select pg_temp.check_ok(cardinality(pg_temp.batch('[{"nature":"certified","sourceIndex":0,"sourceQuote":"Certificação sintética","credentialName":"Credencial sintética","credentialIssuer":"Emissor sintético"}]'))=1,'certification remains supported');
select pg_temp.reject_sql($q$select pg_temp.batch('[]')$q$,'22023');
select pg_temp.reject_sql($q$select pg_temp.batch('[{"nature":"certified","sourceIndex":0,"sourceQuote":"Certificação sintética","credentialName":{},"credentialIssuer":"Emissor sintético"}]')$q$,'22023');
select pg_temp.reject_sql($q$select pg_temp.batch('[{"nature":"contextual","sourceIndex":0,"sourceQuote":"Texto que não existe no documento."}]')$q$,'22023');
select pg_temp.reject_sql($q$select pg_temp.batch('[{"nature":"contextual","sourceIndex":0,"sourceQuote":"Coordenação de projetos e processos operacionais."}]',pg_temp.eid('b'))$q$,'40001');
select pg_temp.reject_sql($q$select pg_temp.batch('[{"nature":"contextual","sourceIndex":0,"sourceQuote":"Coordenação de projetos e processos operacionais."}]',pg_temp.eid('a'),pg_temp.eid('foreign'))$q$,'42501');
select set_config('request.jwt.claim.sub',pg_temp.eid('member')::text,true);
select pg_temp.reject_sql($q$select pg_temp.batch('[]')$q$,'42501');
reset role;
update public.person_competency_evidence_links set decision_reason='Justificativa humana antiga preservada.' where nature='contextual' and source_index=0 and profile_id=pg_temp.eid('profile');
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.eid('owner')::text,true);
select pg_temp.batch('[{"nature":"contextual","sourceIndex":0,"sourceQuote":"Coordenação de projetos e processos operacionais."}]');
select pg_temp.check_ok((select decision_reason='Justificativa humana antiga preservada.' from public.person_competency_evidence_links where profile_id=pg_temp.eid('profile') and nature='contextual' and source_index=0),'replay preserves historical human rationale');
reset role;
select pg_temp.check_ok(not has_function_privilege('anon','public.link_person_competency_evidence_batch_v2(uuid,uuid,uuid,uuid,jsonb)','execute'),'anonymous execution denied');
select pg_temp.check_ok(not has_table_privilege('authenticated','public.person_competency_evidence_links','insert'),'direct sensitive insert remains denied');
