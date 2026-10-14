begin; do $$ begin if current_database()<>'import_evidence_v202' or inet_server_port()<>55479 or exists(select 1 from public.people) or to_regclass('public.position_assessments') is not null then raise exception 'Empty disposable LOCAL baseline required'; end if; end $$;
truncate public.profile_synthesis_jobs cascade;
-- Stable lifecycle only. Rubric, Profile, Knowledge and human decisions are unchanged.
create table public.matching_score_states (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null,
  vacancy_id uuid not null,
  evaluation_id uuid references public.match_evaluations(id) on delete set null,
  dependencies jsonb,
  attempted_dependencies jsonb,
  lease uuid,
  lease_until timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  primary key(organization_id,person_id,vacancy_id),
  foreign key(organization_id,person_id) references public.people(organization_id,id) on delete cascade,
  foreign key(organization_id,vacancy_id) references public.vacancies(organization_id,id) on delete cascade
);
alter table public.matching_score_states enable row level security;
revoke all on public.matching_score_states from public,anon,authenticated,service_role;

-- Synthetic fixture; the harness wraps migration and verification in one rollback.
select set_config('m83_test.prompt_version',coalesce(nullif(current_setting('m83_test.prompt_version',true),''),'trajectory-evidence-1.2.0'),true);
create function public.m83_id(text) returns uuid language sql immutable as $$select md5('m83-'||$1)::uuid$$;
create function public.m83_assert(boolean,text) returns void language plpgsql as $$begin
  if $1 is distinct from true then raise exception 'M83 FAIL: %',$2; end if; raise notice 'PASS: %',$2; end$$;
create function public.m83_reject(text,text) returns void language plpgsql as $$begin
  begin execute $1; exception when others then if sqlstate=$2 then raise notice 'PASS: denied (%)',sqlstate;return;end if;raise;end;
  raise exception 'M83 FAIL expected denial';end$$;
insert into public.organization_groups(id,name,slug) values(m83_id('group'),'M83 synthetic','m83-synthetic');
insert into public.organizations(id,name,group_id) values(m83_id('a'),'M83 A',m83_id('group')),(m83_id('b'),'M83 B',m83_id('group'));
insert into auth.users(id,email) select m83_id(u),u||'@example.invalid' from unnest(array['recruiter','member','outsider','inactive']) u;
insert into public.platform_users(id,auth_user_id,full_name,username,email,access_profile,group_id,status)
select m83_id('platform-'||u),m83_id(u),'Synthetic '||u,'m83-'||u,u||'@example.invalid',
  (case when u='inactive' then 'recruiter' when u='outsider' then 'member' else u end)::public.membership_role,m83_id('group'),
  (case when u='inactive' then 'inactive' else 'active' end)::public.platform_user_status
from unnest(array['recruiter','member','outsider','inactive']) u;
insert into public.organization_memberships(organization_id,user_id,role) values
 (m83_id('a'),m83_id('recruiter'),'recruiter'),(m83_id('a'),m83_id('member'),'member'),
 (m83_id('a'),m83_id('inactive'),'recruiter'),(m83_id('b'),m83_id('outsider'),'member');
insert into public.people(id,organization_id,full_name) values(m83_id('person'),m83_id('a'),'Pessoa sintética');
insert into public.professional_profiles(id,organization_id,person_id,profile_data,extraction_version,inference_version,embedding_version,prompt_version,model_version,profile_version,review_status,approved_at,superseded_at)
 values(m83_id('old'),m83_id('a'),m83_id('person'),'{}','fixture','none','none','fixture','fixture',1,'approved',now(),now()),
 (m83_id('profile'),m83_id('a'),m83_id('person'),'{"experiences":[{"organization":"Employer secret","role":"Backend developer","description":"Built APIs"}]}','fixture','none','none','fixture','fixture',2,'approved',now(),null);
insert into public.job_roles(id,organization_id,name) values(m83_id('role'),m83_id('a'),'Backend developer');
insert into public.vacancies(id,organization_id,job_role_id,title,status) values(m83_id('vacancy'),m83_id('a'),m83_id('role'),'Backend developer','open');
insert into public.vacancy_versions(id,organization_id,vacancy_id,version,title,source_kind) values
 (m83_id('v1'),m83_id('a'),m83_id('vacancy'),1,'Backend developer','manual'),
 (m83_id('v2'),m83_id('a'),m83_id('vacancy'),2,'Backend developer','manual');
update public.vacancies set current_version_id=m83_id('v2'),definition_version=2 where id=m83_id('vacancy');
