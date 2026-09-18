-- Run only in a disposable local database, seeded from repo migrations.
-- Official occupation identifiers/version labels below were observed read-only.
-- Users, organizations, relations, values and approved crosswalk are SYNTHETIC.
-- No such crosswalk was present remotely; this fixture proves multi-source support.
begin;
create function public.m71_id(text) returns uuid language sql immutable as $$ select md5('m71-fixture-'||$1)::uuid $$;
create function public.m71_assert(boolean,text) returns void language plpgsql as $$
begin if $1 is distinct from true then raise exception 'M71 FAIL: %',$2; end if; raise notice 'PASS: %',$2; end $$;
create function public.m71_reject(text,text) returns void language plpgsql as $$
begin
  begin execute $1; exception when others then
    if $2 is null or sqlstate=$2 then raise notice 'PASS: denied (%)',sqlstate; return; end if;
    raise exception 'Unexpected denial %: %',sqlstate,sqlerrm;
  end;
  raise exception 'M71 FAIL: expected rejection for %',$1;
end $$;
create temp table m71_state(key text primary key,value jsonb);
grant all on m71_state to authenticated;
insert into public.organization_groups(id,name,slug) values(m71_id('group'),'M71 synthetic','m71-synthetic');
insert into public.organizations(id,name,group_id) values
(m71_id('org-a'),'M71 A',m71_id('group')),(m71_id('org-b'),'M71 B',m71_id('group'));
insert into auth.users(id,email) select m71_id(u),u||'@example.invalid' from unnest(array['owner','recruiter','member','outsider','super','inactive']) u;
insert into public.platform_users(id,auth_user_id,full_name,username,email,access_profile,group_id,status)
select m71_id('platform-'||u),m71_id(u),'Synthetic '||u,'m71-'||u,u||'@example.invalid',
(case when u='super' then 'super_admin' when u='outsider' then 'member' when u='inactive' then 'recruiter' else u end)::public.membership_role,
case when u='super' then null else m71_id('group') end,
(case when u='inactive' then 'inactive' else 'active' end)::public.platform_user_status
from unnest(array['owner','recruiter','member','outsider','super','inactive']) u;
insert into public.organization_memberships(organization_id,user_id,role)
select m71_id('org-a'),m71_id(u),(case when u='inactive' then 'recruiter' else u end)::public.membership_role
from unnest(array['owner','recruiter','member','inactive']) u on conflict do nothing;
insert into public.organization_memberships(organization_id,user_id,role) values(m71_id('org-b'),m71_id('outsider'),'member');
insert into public.knowledge_sources(id,name,domain,source_class,publisher,method,status)
values(m71_id('onet'),'O*NET','onet.fixture.invalid','official_occupational_taxonomy','Test fixture','dataset','approved'),
(m71_id('esco'),'ESCO','esco.fixture.invalid','official_occupational_taxonomy','Test fixture','dataset','approved'),
(m71_id('other'),'Not an allowed source','other.fixture.invalid','official_occupational_taxonomy','Test fixture','dataset','approved');
insert into public.knowledge_source_versions(id,source_id,external_version,format,import_status,is_current)
values(m71_id('onet-v'),m71_id('onet'),'31.0','tsv','published',true),
(m71_id('esco-v'),m71_id('esco'),'1.2.1','csv','published',true),
(m71_id('other-v'),m71_id('other'),'fixture','csv','published',true);
insert into public.knowledge_concepts(id,scope,organization_id,concept_type,canonical_label,status,provenance)
values(m71_id('onet-occ'),'global',null,'occupation','Software Developers','approved','{"fixture":true}'),
(m71_id('esco-occ'),'global',null,'occupation','Programador de software/Programadora de software','approved','{"fixture":true}'),
(m71_id('other-occ'),'global',null,'occupation','Synthetic foreign source','approved','{"fixture":true}'),
(m71_id('org-occ'),'organization',m71_id('org-a'),'occupation','Especialista interno sintético','approved','{"fixture":true}'),
(m71_id('other-org-occ'),'organization',m71_id('org-b'),'occupation','Ocupação reservada B','approved','{"fixture":true}'),
(m71_id('shared-item'),'global',null,'knowledge','Conhecimento sintético compartilhado','approved','{"fixture":true}'),
(m71_id('same-label'),'global',null,'skill','Conhecimento sintético compartilhado','approved','{"fixture":true}'),
(m71_id('private-item'),'organization',m71_id('org-b'),'knowledge','Complemento reservado B','approved','{"fixture":true}');
insert into public.knowledge_external_mappings(concept_id,source_id,source_version_id,external_id,mapping_type,provenance)
values(m71_id('onet-occ'),m71_id('onet'),m71_id('onet-v'),'O*NET:occupation:15-1252.00','exact',
'{"sourceFile":"Occupation Data.txt","sourceRow":124,"sha256":"efb9f5579d0c853aa67bd77c0d794b04657dcf21601d230eb82d3346317ff30a","fixture":true}'),
(m71_id('esco-occ'),m71_id('esco'),m71_id('esco-v'),'http://data.europa.eu/esco/occupation/f2b15a0e-e65a-438a-affb-29b9d50b77d1','exact',
'{"sourceFile":"occupations_pt.csv","sourceRow":2889,"sha256":"eb89fa3d5a2ba0ce1964aab5f4b92e212cd99df6f746136bc39be104a31b695e","fixture":true}'),
(m71_id('other-occ'),m71_id('other'),m71_id('other-v'),'synthetic-only','exact','{"fixture":true}');
insert into public.knowledge_terms(concept_id,scope,organization_id,term,normalized_term,status)
select id,scope,organization_id,canonical_label,private.normalize_knowledge_term(canonical_label),'approved' from public.knowledge_concepts;
insert into public.knowledge_terms(concept_id,scope,organization_id,term,normalized_term,status,ambiguous) values
(m71_id('onet-occ'),'global',null,'Desenvolvedor de software','desenvolvedor de software','approved',false),
(m71_id('onet-occ'),'global',null,'Título ambíguo','titulo ambiguo','approved',false),
(m71_id('esco-occ'),'global',null,'Título ambíguo','titulo ambiguo','approved',false),
(m71_id('onet-occ'),'global',null,'Alias sinalizado','alias sinalizado','approved',true);
insert into public.knowledge_terms(concept_id,scope,organization_id,term,normalized_term,status) values
(m71_id('onet-occ'),'global',null,'Alias local','alias local','approved'),
(m71_id('org-occ'),'organization',m71_id('org-a'),'Alias local','alias local','approved');
insert into public.knowledge_relations(source_concept_id,target_concept_id,relation_type,scope,source_id,source_version_id,status,relation_attributes,provenance)
values(m71_id('onet-occ'),m71_id('shared-item'),'requires','global',m71_id('onet'),m71_id('onet-v'),'approved',
'{"measurements":[{"scaleId":"IM","rawValue":4.5},{"scaleId":"LV","rawValue":5.1}],"fixture":true}','{"fixture":true}'),
(m71_id('onet-occ'),m71_id('same-label'),'requires','global',m71_id('onet'),m71_id('onet-v'),'approved','{}','{"fixture":true}'),
(m71_id('esco-occ'),m71_id('shared-item'),'requires','global',m71_id('esco'),m71_id('esco-v'),'approved',
'{"relevance":"essential","fixture":true}','{"fixture":true}');
set local role authenticated;
select set_config('request.jwt.claim.sub',m71_id('recruiter')::text,true);
do $$
declare s jsonb; d jsonb; saved record; v1 uuid; v2 uuid; pid uuid; v_count integer;
begin
  s:=public.preview_position_taxonomy(m71_id('org-a'),'  Desenvolvedor de software  ');
  perform m71_assert(s->>'state'='resolved' and s->>'originalTitle'='  Desenvolvedor de software  ','exact alias and raw title preserved');
  perform m71_assert(jsonb_array_length(s->'references')=1,'single official source is enough');
  perform m71_assert(jsonb_array_length(s->'items')=2,'same labels with different IDs are not merged');
  perform m71_assert(s->>'method'='approved_exact_alias' and s->>'actorId' is null,'deterministic method, no invented human approval');
  perform m71_assert(s#>>'{matchedTerms,0,term}'='Desenvolvedor de software','matched alias and its version are reconstructible');
  perform m71_assert(public.preview_position_taxonomy(m71_id('org-a'),'Alias local')#>>'{concept,id}'=m71_id('org-occ')::text,'organization term precedence stays explicit');
  perform m71_assert((public.preview_position_taxonomy(m71_id('org-a'),'Título ambíguo')->>'state')='ambiguous','ambiguous exact aliases never auto-selected');
  perform m71_assert((public.preview_position_taxonomy(m71_id('org-a'),'Alias sinalizado')->>'state')='ambiguous','flagged ambiguous alias never auto-selected');
  perform m71_assert((public.preview_position_taxonomy(m71_id('org-a'),'Software devel')->>'state')='unresolved','substring is discovery only, not normalization');
  perform m71_assert((public.preview_position_taxonomy(m71_id('org-a'),'Synthetic foreign source')->>'state')='unresolved','non-CBO/ESCO/ONET source excluded');
  perform m71_assert((public.search_position_taxonomy(m71_id('org-a'),'reservad')->>'total')::integer=0,'search does not leak another tenant');
  d:=jsonb_build_object('taxonomyContract','position-taxonomy-1.0.0','title','  Desenvolvedor de software  ',
    'occupancy','vacant','sourceKind','manual','changeKind','material','requirements','[]'::jsonb,'taxonomyDecision','automatic');
  select * into saved from public.save_position_taxonomy(m71_id('org-a'),d);
  pid:=saved.vacancy_id; v1:=saved.vacancy_version_id;
  perform m71_assert((select count(*)=0 from public.vacancy_requirements where vacancy_version_id=v1),'official suggestions never become automatic requirements');
  perform m71_assert((select title=d->>'title' from public.vacancies where id=pid),'stored business title unchanged');
  d:=d||jsonb_build_object('id',pid,'requirements',jsonb_build_array(jsonb_build_object('stableId',m71_id('req'),'label','Conhecimento sintético compartilhado',
    'category','knowledge','importance','desired','importanceConfirmed',true,'categoryConfirmed',true,'origin','human','conceptId',m71_id('shared-item'))));
  select * into saved from public.save_position_taxonomy(m71_id('org-a'),d,v1); v2:=saved.vacancy_version_id;
  perform m71_assert((select importance='desired' and taxonomy_origin#>>'{origins,0,reference,sourceVersion}'='31.0' from public.vacancy_requirements where vacancy_version_id=v2),'explicit desired requirement retains source version');
  perform m71_assert((select taxonomy_origin#>'{origins,0,attributes,measurements}'='[{"scaleId":"IM","rawValue":4.5},{"scaleId":"LV","rawValue":5.1}]'::jsonb from public.vacancy_requirements where vacancy_version_id=v2),'source metrics preserved, not converted');
  perform m71_reject(format('select * from public.save_position_taxonomy(%L,%L::jsonb,%L)',m71_id('org-a'),d,v1),'40001');
  d:=d||'{"taxonomyDecision":"cleared"}'::jsonb;
  select * into saved from public.save_position_taxonomy(m71_id('org-a'),d,v2);
  perform m71_assert((select reference_concept_id is null and taxonomy_snapshot->>'method'='human_removal' from public.vacancy_versions where id=saved.vacancy_version_id),'clear association saves explicit human removal');
  perform m71_assert((select taxonomy_origin is not null from public.vacancy_requirements where vacancy_version_id=saved.vacancy_version_id),'clearing association does not erase prior requirement provenance');
  perform m71_assert((select taxonomy_snapshot->>'state'='resolved' from public.vacancy_versions where id=v1),'old interpretation is not rewritten');
  perform m71_assert((select count(*)=3 from public.occupation_resolution_attempts where vacancy_id=pid),'each version has immutable resolution ledger');
  perform m71_assert((select count(*)>0 from public.knowledge_inbox where organization_id=m71_id('org-a')),'unresolved removal creates tenant Inbox feedback');
  insert into m71_state values('draft',d),('version',to_jsonb(saved.vacancy_version_id)),('position',to_jsonb(pid)),('first',to_jsonb(v1));
  perform m71_reject(format('select * from public.save_position_taxonomy(%L,%L::jsonb)',m71_id('org-a'),d||'{"id":null,"taxonomyContract":"unknown"}'),'22023');
  perform m71_reject(format('select public.preview_position_taxonomy(%L,%L,%L,%L)',m71_id('org-a'),'Any',m71_id('other-org-occ'),'human'),'22023');
  perform m71_reject(format('select public.preview_position_taxonomy(%L,%L,null,%L,array[%L]::uuid[])',m71_id('org-a'),'Any','automatic',m71_id('private-item')),'42501');
  perform m71_reject(format('select public.create_position_knowledge_complement(%L,%L,%L)',m71_id('org-a'),'Unauthorized','knowledge'),null);
  perform m71_reject(format('select * from private.m71_taxonomy(%L,%L)',m71_id('org-a'),m71_id('onet-occ')),'42501');
  d:=d||jsonb_build_object('id',null,'title','Posição assistida sintética','sourceKind','assisted_description',
    'structureSource',jsonb_build_object('originalDescription','Descrição original sintética','contractVersion','vacancy-structure-profile-aligned-2.1.0','items','[]'::jsonb));
  select * into saved from public.save_position_taxonomy(m71_id('org-a'),d);
  perform m71_assert((select contract_version='vacancy-definition-1.3.0' and structure_source->>'originalDescription'='Descrição original sintética'
    from public.vacancy_versions where id=saved.vacancy_version_id),'assisted description provenance stays atomic with M7.1 version');
  pid:=saved.vacancy_id;
  d:=d||jsonb_build_object('id',null,'sourceKind','previous_vacancy','sourceVacancyId',pid,'structureSource',null);
  select * into saved from public.save_position_taxonomy(m71_id('org-a'),d);
  perform m71_assert((select source_vacancy_id=pid and source_kind='previous_vacancy' from public.vacancy_versions where id=saved.vacancy_version_id),'copy preserves position lineage instead of pretending a new extraction');
  select count(*) into v_count from public.vacancies;
  d:=d||jsonb_build_object('sourceKind','assisted_description','structureSource','{}'::jsonb);
  perform m71_reject(format('select * from public.save_position_taxonomy(%L,%L::jsonb)',m71_id('org-a'),d),'P0001');
  perform m71_assert((select count(*)=v_count from public.vacancies),'provenance failure rolls back the entire position save');
end $$;
-- Tenant/RLS and missing/unknown authority, not frontend-only checks.
select set_config('request.jwt.claim.sub',m71_id('outsider')::text,true);
select m71_assert((select count(*)=0 from public.vacancies),'RLS hides A positions from B');
select m71_assert((select count(*)=0 from public.vacancy_versions),'RLS hides A snapshots from B');
select m71_reject(format('select public.preview_position_taxonomy(%L,%L)',m71_id('org-a'),'Any'),'42501');
select m71_reject(format('select * from public.save_position_taxonomy(%L,%L::jsonb,%L)',m71_id('org-b'),(select value from m71_state where key='draft'),(select value#>>'{}' from m71_state where key='version')),'42501');
select set_config('request.jwt.claim.sub',m71_id('member')::text,true);
select m71_reject(format('select public.preview_position_taxonomy(%L,%L)',m71_id('org-a'),'Any'),'42501');
select set_config('request.jwt.claim.sub',m71_id('inactive')::text,true);
select m71_reject(format('select public.preview_position_taxonomy(%L,%L)',m71_id('org-a'),'Any'),'42501');
select set_config('request.jwt.claim.sub','',true);
select m71_reject(format('select public.preview_position_taxonomy(%L,%L)',m71_id('org-a'),'Any'),'42501');
select set_config('request.jwt.claim.sub',m71_id('owner')::text,true);
do $$
declare c uuid; c2 uuid; s jsonb; d jsonb; saved record;
begin
  c:=public.create_position_knowledge_complement(m71_id('org-a'),'Prática sintética interna','knowledge','Contexto opcional');
  c2:=public.create_position_knowledge_complement(m71_id('org-a'),'Prática sintética interna','knowledge','');
  perform m71_assert(c=c2,'complement reuses approved tenant concept without duplication');
  perform m71_assert((select scope='organization' and organization_id=m71_id('org-a') and status='approved' from public.knowledge_concepts where id=c),'explicit admin creation stays in company Knowledge');
  s:=public.preview_position_taxonomy(m71_id('org-a'),'Outro título',m71_id('org-occ'),'human',array[c]);
  perform m71_assert(jsonb_array_length(s->'references')=0 and jsonb_array_length(s->'complements')=1,'organization concept can have no fabricated official reference');
  d:=(select value from m71_state where key='draft')||jsonb_build_object('id',null,'title','Novo título interno','requirements','[]'::jsonb,'referenceConceptId',m71_id('org-occ'),'taxonomyDecision','human','taxonomyComplementIds',jsonb_build_array(c));
  select * into saved from public.save_position_taxonomy(m71_id('org-a'),d);
  perform m71_assert((select count(*)=0 from public.vacancy_requirements where vacancy_version_id=saved.vacancy_version_id),'creating/associating complement is not requiring it');
  perform m71_assert((select taxonomy_snapshot->>'actorId'=m71_id('owner')::text from public.vacancy_versions where id=saved.vacancy_version_id),'human decision is attributable');
  perform m71_assert((select jsonb_array_length(original_proposal->'aliases')=1 and jsonb_array_length(decided_proposal->'aliases')=0
    from public.knowledge_approvals where decided_proposal#>>'{proposed_concept,canonical_label}'='Prática sintética interna'),'original proposal remains immutable; duplicate canonical alias omission audited');
  d:=d||jsonb_build_object('id',saved.vacancy_id);
  perform set_config('request.jwt.claim.sub',m71_id('recruiter')::text,true);
  select * into saved from public.save_position_taxonomy(m71_id('org-a'),d,saved.vacancy_version_id);
  perform m71_assert((select taxonomy_snapshot->>'actorId'=m71_id('owner')::text and taxonomy_snapshot->>'savedBy'=m71_id('recruiter')::text
    from public.vacancy_versions where id=saved.vacancy_version_id),'unchanged human decision keeps original actor separate from saver');
  perform set_config('request.jwt.claim.sub',m71_id('owner')::text,true);
  perform m71_reject(format('insert into public.knowledge_concepts(scope,concept_type,canonical_label) values(%L,%L,%L)','global','knowledge','Forbidden'),'42501');
  perform m71_reject(format('update public.vacancy_versions set taxonomy_snapshot=%L::jsonb','{}'),'42501');
end $$;
reset role;
insert into public.knowledge_occupation_reconciliations(canonical_occupation_concept_id,source_occupation_concept_id,status,method,rationale,evidence,decided_by_auth_user_id,decided_at)
values(m71_id('onet-occ'),m71_id('esco-occ'),'approved','human_review','Synthetic test only; not a real published equivalence.','{"fixture":true}',m71_id('super'),now());
set local role authenticated;
select set_config('request.jwt.claim.sub',m71_id('recruiter')::text,true);
do $$
declare s jsonb; i jsonb;
begin
 s:=public.preview_position_taxonomy(m71_id('org-a'),'Desenvolvedor de software');
 perform m71_assert(jsonb_array_length(s->'references')=2,'all approved cross-source references returned');
 perform m71_assert(jsonb_array_length(s->'items')=2,'merge stable identity only');
 select value into i from jsonb_array_elements(s->'items') where value->>'conceptId'=m71_id('shared-item')::text;
 perform m71_assert(jsonb_array_length(i->'origins')=2,'dedup keeps every relation and source');
 perform m71_assert(exists(select 1 from jsonb_array_elements(i->'origins') x where x#>>'{attributes,relevance}'='essential'),'ESCO source relevance retained');
 perform m71_assert((public.preview_position_taxonomy(m71_id('org-a'),'Título ambíguo')->>'state')='resolved','approved identity reconciliation resolves duplicate aliases');
 perform m71_assert((public.search_position_taxonomy(m71_id('org-a'),'software','occupation',999)->>'total')::integer=2,'search preserves total beyond final page');
end $$;
reset role;
update public.knowledge_source_versions set is_current=false where id=m71_id('onet-v');
set local role authenticated;
select set_config('request.jwt.claim.sub',m71_id('owner')::text,true);
select m71_assert(jsonb_array_length(public.preview_position_taxonomy(m71_id('org-a'),'Desenvolvedor de software')->'references')=1,'new interpretation excludes old publication');
select m71_assert((select taxonomy_snapshot#>>'{references,0,sourceVersion}'='31.0' from public.vacancy_versions where id=(select (value#>>'{}')::uuid from m71_state where key='first')),'old version keeps historical source after publication change');
reset role;
select m71_assert((select count(*)=0 from public.people),'taxonomy created no Person/evidence');
select m71_assert((select count(*)=5 from public.knowledge_concepts where scope='global'),'local corrections/complements created no Global concepts');
set local role anon;
select m71_reject(format('select public.preview_position_taxonomy(%L,%L)',m71_id('org-a'),'Any'),'42501');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub',m71_id('super')::text,true);
select m71_assert(public.preview_position_taxonomy(m71_id('org-a'),'Alias local')->>'state'='resolved','existing Super Admin authority preserved');
select m71_reject(format('select public.preview_position_taxonomy(%L,%L)',m71_id('missing-org'),'Any'),'42501');
reset role;
rollback;
