-- Synthetic fixture. Run only inside a transaction on a disposable local database.
create function public.m81_id(text) returns uuid language sql immutable as $$select md5('m81-synthetic-'||$1)::uuid$$;
create function public.m81_assert(boolean,text) returns void language plpgsql as $$
begin if $1 is distinct from true then raise exception 'M81 FAIL: %',$2; end if; raise notice 'PASS: %',$2; end$$;
create function public.m81_reject(text,text) returns void language plpgsql as $$
begin
  begin execute $1; exception when others then
    if sqlstate=$2 then raise notice 'PASS: denied (%)',sqlstate; return; end if;
    raise exception 'M81 unexpected denial %: %',sqlstate,sqlerrm;
  end;
  raise exception 'M81 FAIL: expected denial for %',$1;
end$$;
insert into public.organization_groups(id,name,slug) values
  (m81_id('group-a'),'M81 synthetic A','m81-synthetic-a'),
  (m81_id('group-b'),'M81 synthetic B','m81-synthetic-b');
insert into public.organizations(id,name,group_id) values
  (m81_id('org-a'),'M81 A',m81_id('group-a')),(m81_id('org-b'),'M81 B',m81_id('group-b'));
insert into auth.users(id,email) select m81_id(u),u||'@example.invalid'
  from unnest(array['owner-a','owner-b','super','member-a']) u;
insert into public.platform_users(id,auth_user_id,full_name,username,email,access_profile,group_id,status)
select m81_id('platform-'||u),m81_id(u),'Synthetic '||u,'m81-'||u,u||'@example.invalid',
  (case when u='super' then 'super_admin' when u='member-a' then 'member' else 'owner' end)::public.membership_role,
  case when u='super' then null when u='owner-b' then m81_id('group-b') else m81_id('group-a') end,'active'::public.platform_user_status
from unnest(array['owner-a','owner-b','super','member-a']) u;
insert into public.organization_memberships(organization_id,user_id,role) values
  (m81_id('org-a'),m81_id('owner-a'),'owner'),(m81_id('org-b'),m81_id('owner-b'),'owner'),
  (m81_id('org-a'),m81_id('member-a'),'member') on conflict do nothing;
insert into public.knowledge_sources(id,name,domain,source_class,publisher,method,status)
values(m81_id('source-onet'),'O*NET','m81.synthetic.onet','official_occupational_taxonomy','Synthetic QA','dataset','approved');
insert into public.knowledge_source_versions(id,source_id,external_version,format,import_status,is_current,published_at)
values(m81_id('source-onet-v'),m81_id('source-onet'),'synthetic-1','fixture','published',true,now());
insert into public.knowledge_concepts(id,scope,organization_id,concept_type,canonical_label,status) values
  (m81_id('excel'),'global',null,'technology','Excel QA','approved'),
  (m81_id('management'),'global',null,'knowledge','Gestão de Projetos QA','approved'),
  (m81_id('certificate'),'global',null,'certification','Certificação QA','approved'),
  (m81_id('occupation'),'global',null,'occupation','Ocupação QA','approved'),
  (m81_id('org-a-concept'),'organization',m81_id('org-a'),'knowledge','Processo A QA','approved'),
  (m81_id('org-b-concept'),'organization',m81_id('org-b'),'knowledge','Processo B QA','approved');
insert into public.knowledge_terms(concept_id,scope,organization_id,term,normalized_term,term_type,status)
select id,scope,organization_id,canonical_label,private.normalize_knowledge_term(canonical_label),'canonical','approved'
  from public.knowledge_concepts where id in (m81_id('excel'),m81_id('management'),m81_id('certificate'),m81_id('occupation'),m81_id('org-a-concept'),m81_id('org-b-concept'));
insert into public.knowledge_external_mappings(concept_id,source_id,source_version_id,external_id,mapping_type)
values(m81_id('excel'),m81_id('source-onet'),m81_id('source-onet-v'),'m81:excel','exact');
