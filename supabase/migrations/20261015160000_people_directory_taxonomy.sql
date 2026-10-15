-- Derived navigation cache over Knowledge. No new concepts or changes to approved Profiles.
begin;
create table public.people_directory_contexts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  fingerprint text not null, input jsonb not null,
  global_version bigint not null, organization_version bigint not null,
  method_version text not null default 'people-directory-1.0.0',
  model text not null default 'gpt-5.6-luna',
  status text not null default 'queued' check(status in ('queued','processing','complete','failed')),
  attempts integer not null default 0, lease uuid,
  candidates jsonb not null default '[]', result jsonb not null default '{"areas":[],"function":null}',
  request_count integer not null default 0,
  error_code text, started_at timestamptz, completed_at timestamptz,
  available_at timestamptz not null default now(), created_at timestamptz not null default now(),
  unique(organization_id,fingerprint)
);
alter table public.people_directory_contexts enable row level security;
revoke all on public.people_directory_contexts from public,anon,authenticated;
grant select,insert,update on public.people_directory_contexts to service_role;
create index people_directory_queue on public.people_directory_contexts(available_at,created_at) where status<>'complete';

create function private.people_directory_input(p_experience jsonb,p_areas jsonb) returns jsonb
language sql immutable set search_path='' as $$
  select jsonb_build_object('role',left(coalesce(p_experience->>'role',''),240),
    'context',left(coalesce(p_experience->>'description',''),1400),
    'areas',coalesce((select jsonb_agg(left(value,160)) from jsonb_array_elements_text(
      case when jsonb_typeof(p_areas)='array' then p_areas else '[]'::jsonb end) a
      where length(value) between 2 and 160
        and private.normalize_knowledge_term(concat_ws(' ',p_experience->>'role',p_experience->>'description')) !~ '\m(nao|sem|nenhum|nenhuma|ausencia)\M'
        and strpos(' '||private.normalize_knowledge_term(concat_ws(' ',p_experience->>'role',p_experience->>'description'))||' ',
        ' '||private.normalize_knowledge_term(value)||' ')>0),'[]'::jsonb));
$$;
create function private.people_directory_key(p_org uuid,p_input jsonb) returns text
language sql stable security definer set search_path='' as $$
  select encode(extensions.digest(concat_ws('|','people-directory-1.0.0','gpt-5.6-luna',p_org::text,p_input::text,
    coalesce(max(version) filter(where scope='global'),0)::text,
    coalesce(max(version) filter(where scope='organization' and organization_id=p_org),0)::text),'sha256'),'hex') from public.knowledge_change_sets;
$$;
create function private.people_directory_level(p_role text) returns text
language sql immutable set search_path='' as $$
  select case
    when private.normalize_knowledge_term(p_role) ~ '\m(estagiari|intern|trainee)' then 'intern'
    when private.normalize_knowledge_term(p_role) ~ '\m(assistente|assistant|auxiliar)' then 'assistant'
    when private.normalize_knowledge_term(p_role) ~ '\m(coordenad|coordinat)' then 'coordinator'
    when private.normalize_knowledge_term(p_role) ~ '\m(supervisor)' then 'supervisor'
    when private.normalize_knowledge_term(p_role) ~ '\m(gerent|manager)' then 'manager'
    when private.normalize_knowledge_term(p_role) ~ '\m(diretor|director|chief|ceo|cio|cto|presidente)' then 'director'
    when private.normalize_knowledge_term(p_role) ~ '\m(analista|analyst)' then 'analyst'
    when private.normalize_knowledge_term(p_role) ~ '\m(especialista|specialist)' then 'specialist'
    else '' end;
$$;
create function private.people_directory_allowed(p_org uuid,p_id uuid,p_kind text) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.knowledge_concepts c where c.id=p_id and c.status='approved'
    and (c.scope='global' or c.organization_id=p_org)
    and (not exists(select 1 from public.knowledge_external_mappings m where m.concept_id=c.id)
      or exists(select 1 from public.knowledge_external_mappings m join public.knowledge_source_versions v on v.id=m.source_version_id
        where m.concept_id=c.id and v.is_current and v.import_status='published'))
    and ((p_kind='function' and c.concept_type='occupation') or (p_kind='area' and c.concept_type not in ('occupation','certification')
      and exists(select 1 from public.knowledge_competency_classifications cl join public.competency_subgroups s on s.id=cl.subgroup_id
        where cl.concept_id=c.id and cl.is_current and s.code='H1' and s.status='active'
          and (s.scope='global' or s.organization_id=p_org) and (cl.organization_id is null or cl.organization_id=p_org)))));
$$;
create function private.enqueue_people_directory(p_profile uuid) returns void
language plpgsql security definer set search_path='' as $$
declare p public.professional_profiles; e jsonb; i jsonb; g bigint; o bigint;
begin
  select * into p from public.professional_profiles where id=p_profile and review_status='approved' and superseded_at is null;
  if not found then return; end if;
  select coalesce(max(version) filter(where scope='global'),0),coalesce(max(version) filter(where scope='organization' and organization_id=p.organization_id),0)
    into g,o from public.knowledge_change_sets;
  for e in select value from jsonb_array_elements(case when jsonb_typeof(p.profile_data->'experiences')='array' then p.profile_data->'experiences' else '[]'::jsonb end) loop
    i:=private.people_directory_input(e,p.profile_data->'areasOfExpertise');
    insert into public.people_directory_contexts(organization_id,fingerprint,input,global_version,organization_version)
      values(p.organization_id,private.people_directory_key(p.organization_id,i),i,g,o) on conflict do nothing;
  end loop;
end $$;
create function private.capture_people_directory() returns trigger
language plpgsql security definer set search_path='' as $$begin perform private.enqueue_people_directory(new.id);return new;end $$;
create trigger capture_people_directory after insert or update of review_status,superseded_at on public.professional_profiles
  for each row execute function private.capture_people_directory();

-- Library publication invalidates the cache automatically, without a list-open write.
create function private.refresh_people_directory_knowledge() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  perform private.enqueue_people_directory(p.id) from public.professional_profiles p
    where p.review_status='approved' and p.superseded_at is null and (new.scope='global' or p.organization_id=new.organization_id);
  return new;
end $$;
create trigger refresh_people_directory_knowledge after insert on public.knowledge_change_sets
  for each row execute function private.refresh_people_directory_knowledge();

create function public.claim_people_directory() returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.people_directory_contexts; t text; resolved record; exact jsonb:='{"areas":[],"function":null}'; v_candidates jsonb; query tsquery;
begin
  select * into r from public.people_directory_contexts c where attempts<3 and
    ((status in ('queued','failed') and available_at<=now()) or (status='processing' and started_at<now()-interval '5 minutes'))
    and fingerprint=private.people_directory_key(organization_id,input)
    and exists(select 1 from public.professional_profiles p cross join lateral jsonb_array_elements(
      case when jsonb_typeof(p.profile_data->'experiences')='array' then p.profile_data->'experiences' else '[]'::jsonb end) e
      where p.organization_id=c.organization_id and p.review_status='approved' and p.superseded_at is null
        and private.people_directory_input(e,p.profile_data->'areasOfExpertise')=c.input)
    order by created_at limit 1 for update skip locked;
  if not found then return null; end if;
  for t in select r.input->>'role' union all select jsonb_array_elements_text(r.input->'areas') loop
    select * into resolved from public.resolve_knowledge_term_v2(r.organization_id,t,'pt-BR');
    if resolved.resolution_state='resolved' then
      if t=r.input->>'role' and private.people_directory_allowed(r.organization_id,resolved.concept_id,'function')
        and private.people_directory_level(t)=private.people_directory_level(resolved.concept_label) then
        exact:=jsonb_set(exact,'{function}',jsonb_build_object('id',resolved.concept_id,'method','approved_exact_alias'));
      elsif t<>r.input->>'role' and private.people_directory_allowed(r.organization_id,resolved.concept_id,'area') then
        exact:=jsonb_set(exact,'{areas}',exact->'areas'||jsonb_build_array(jsonb_build_object('id',resolved.concept_id,'method','approved_exact_alias')));
      end if;
    end if;
  end loop;
  select websearch_to_tsquery('portuguese',string_agg(token,' OR ')) into query from (
    select distinct token from regexp_split_to_table(private.normalize_knowledge_term(concat_ws(' ',r.input->>'role',r.input->>'context',r.input->'areas')),' +') token
    where length(token)>2 and token not in ('para','com','das','dos','uma','como','por','que','the','and','role','context','areas') limit 70) words;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'label',canonical_label,'kind',kind,'version',version)),'[]') into v_candidates from (
    (select c.id,c.canonical_label,c.version,'area' kind from public.knowledge_concepts c
      where private.people_directory_allowed(r.organization_id,c.id,'area')
        and to_tsvector('portuguese',c.canonical_label) @@ query
      order by ts_rank(to_tsvector('portuguese',c.canonical_label),query) desc,c.id limit 24)
    union all
    (select c.id,c.canonical_label,c.version,'function' kind from public.knowledge_concepts c
      where private.people_directory_allowed(r.organization_id,c.id,'function')
        and private.people_directory_level(r.input->>'role')=private.people_directory_level(c.canonical_label)
        and to_tsvector('portuguese',c.canonical_label) @@ query
      order by ts_rank(to_tsvector('portuguese',c.canonical_label),query) desc,c.id limit 24)
  ) selected;
  update public.people_directory_contexts set status='processing',lease=gen_random_uuid(),attempts=attempts+1,started_at=now(),
    candidates=coalesce(v_candidates,'[]'),result=exact,error_code=null where id=r.id returning * into r;
  return jsonb_build_object('id',r.id,'organizationId',r.organization_id,'lease',r.lease,'input',r.input,'candidates',r.candidates,
    'exact',r.result,'model',r.model,'fingerprint',r.fingerprint,
    'externalEnabled',coalesce((select allow_external_knowledge_enrichment from public.organization_knowledge_settings where organization_id=r.organization_id),false));
end $$;

create function public.reserve_people_directory_call(p_run_id uuid,p_lease uuid,p_daily_cap integer,p_monthly_cap integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare d bigint; m bigint;
begin
  perform pg_advisory_xact_lock(hashtext('prisma-competency-normalization-budget'));
  if not exists(select 1 from public.people_directory_contexts where id=p_run_id and lease=p_lease and status='processing' and request_count<attempts) then raise exception 'DIRECTORY_LEASE_INVALID';end if;
  select coalesce(sum(n) filter(where at>=date_trunc('day',now())),0),coalesce(sum(n),0) into d,m from (
    select request_count n,started_at at from public.profile_competency_normalization_runs where started_at>=date_trunc('month',now())
    union all select request_count,started_at from public.people_directory_contexts where started_at>=date_trunc('month',now())) usage;
  if p_daily_cap is null or p_monthly_cap is null or p_daily_cap<=0 or p_monthly_cap<=0 or d>=p_daily_cap or m>=p_monthly_cap then return false;end if;
  update public.people_directory_contexts set request_count=request_count+1 where id=p_run_id;
  return true;
end $$;
-- Same pool and lock; the original competency consumer keeps its existing caps.
create or replace function public.reserve_competency_normalization_call_v2(p_run_id uuid,p_lease uuid,p_daily_cap integer,p_monthly_cap integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare d bigint; m bigint;
begin
  perform pg_advisory_xact_lock(hashtext('prisma-competency-normalization-budget'));
  if not exists(select 1 from public.profile_competency_normalization_runs where id=p_run_id and lease=p_lease and status='processing') then raise exception 'COMPETENCY_LEASE_INVALID';end if;
  select coalesce(sum(n) filter(where at>=date_trunc('day',now())),0),coalesce(sum(n),0) into d,m from (
    select request_count n,started_at at from public.profile_competency_normalization_runs where started_at>=date_trunc('month',now())
    union all select request_count,started_at from public.people_directory_contexts where started_at>=date_trunc('month',now())) usage;
  if p_daily_cap is null or p_monthly_cap is null or p_daily_cap<=0 or p_monthly_cap<=0 or d>=p_daily_cap or m>=p_monthly_cap then return false;end if;
  update public.profile_competency_normalization_runs set request_count=request_count+1 where id=p_run_id;return true;
end $$;

create function public.complete_people_directory(p_run_id uuid,p_lease uuid,p_answer jsonb,p_error text default null) returns void
language plpgsql security definer set search_path='' as $$
declare r public.people_directory_contexts; i jsonb; c record; areas jsonb; f jsonb;
begin
  select * into r from public.people_directory_contexts where id=p_run_id for update;
  if not found or r.status<>'processing' or r.lease is distinct from p_lease then raise exception 'DIRECTORY_LEASE_INVALID';end if;
  areas:=r.result->'areas';f:=r.result->'function';
  if p_error is null then
    if jsonb_typeof(p_answer->'areaIds') is distinct from 'array' or jsonb_array_length(p_answer->'areaIds')>3 then raise exception 'DIRECTORY_ANSWER_INVALID';end if;
    for i in select value from jsonb_array_elements(p_answer->'areaIds') union all select p_answer->'functionId' where p_answer->>'functionId' is not null loop
      select * into c from jsonb_to_recordset(r.candidates) as x(id uuid,label text,kind text,version integer) where id=(i#>>'{}')::uuid;
      if not found or not private.people_directory_allowed(r.organization_id,c.id,c.kind)
        or not exists(select 1 from public.knowledge_concepts k where k.id=c.id and k.version=c.version)
        or (c.kind='function' and (p_answer->>'functionId' is distinct from c.id::text or private.people_directory_level(r.input->>'role')<>private.people_directory_level(c.label)))
        or (c.kind='area' and not (p_answer->'areaIds' @> jsonb_build_array(c.id::text))) then raise exception 'DIRECTORY_CANDIDATE_INVALID';end if;
      if c.kind='function' and f='null'::jsonb then f:=jsonb_build_object('id',c.id,'method','ai_grouping');
      elsif c.kind='area' and jsonb_array_length(r.result->'areas')=0 then areas:=areas||jsonb_build_array(jsonb_build_object('id',c.id,'method','ai_grouping'));end if;
    end loop;
  end if;
  update public.people_directory_contexts set result=jsonb_build_object('areas',areas,'function',f),
    status=case when p_error is null then 'complete' else 'failed' end,
    error_code=case when p_error is null then null when p_error in ('AI_DISABLED','BUDGET_LIMITED','INPUT_LIMIT','RESPONSE_INVALID','PROVIDER_UNAVAILABLE') then p_error else 'PROCESSING_FAILED' end,
    completed_at=now(),available_at=now()+interval '1 day' where id=r.id;
end $$;

create function public.get_people_directory(p_organization_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or p_organization_id is null or not private.has_org_role(p_organization_id,array['owner','admin','recruiter','member']::public.membership_role[]) then
    raise exception 'PEOPLE_DIRECTORY_UNAUTHORIZED' using errcode='42501';end if;
  return coalesce((select jsonb_agg(jsonb_build_object('personId',p.person_id,'profileId',p.id,'profileVersion',p.profile_version,
    'experienceIndex',e.ordinality-1,'originalRole',e.value->>'role','organization',e.value->>'organization','period',e.value->>'period',
    'status',coalesce(cache.status,'unavailable'),'methodVersion','people-directory-1.0.0','globalVersion',cache.global_version,'organizationVersion',cache.organization_version,
    'areas',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'label',c.canonical_label,'version',c.version,'method',a->>'method'))
      from jsonb_array_elements(cache.result->'areas') a join public.knowledge_concepts c on c.id=(a->>'id')::uuid
      where private.people_directory_allowed(p_organization_id,c.id,'area')),'[]'::jsonb),
    'function',(select jsonb_build_object('id',c.id,'label',c.canonical_label,'version',c.version,'method',cache.result->'function'->>'method') from public.knowledge_concepts c
      where c.id=(cache.result->'function'->>'id')::uuid and private.people_directory_allowed(p_organization_id,c.id,'function'))))
    from public.professional_profiles p
    cross join lateral jsonb_array_elements(case when jsonb_typeof(p.profile_data->'experiences')='array' then p.profile_data->'experiences' else '[]'::jsonb end) with ordinality e
    left join public.people_directory_contexts cache on cache.organization_id=p.organization_id
      and cache.fingerprint=private.people_directory_key(p.organization_id,private.people_directory_input(e.value,p.profile_data->'areasOfExpertise'))
    where p.organization_id=p_organization_id and p.review_status='approved' and p.superseded_at is null),'[]'::jsonb);
end $$;

revoke all on function private.people_directory_input(jsonb,jsonb),private.people_directory_key(uuid,jsonb),private.people_directory_level(text),
  private.people_directory_allowed(uuid,uuid,text),private.enqueue_people_directory(uuid),private.capture_people_directory(),private.refresh_people_directory_knowledge()
  from public,anon,authenticated;
revoke all on function public.claim_people_directory(),public.reserve_people_directory_call(uuid,uuid,integer,integer),public.complete_people_directory(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.claim_people_directory(),public.reserve_people_directory_call(uuid,uuid,integer,integer),public.complete_people_directory(uuid,uuid,jsonb,text) to service_role;
revoke all on function public.get_people_directory(uuid) from public,anon;
grant execute on function public.get_people_directory(uuid) to authenticated;

select private.enqueue_people_directory(id) from public.professional_profiles where review_status='approved' and superseded_at is null;
-- Reuse the established scheduler secret and operational budget. No browser-triggered AI.
select cron.schedule('prisma-people-directory','* * * * *',$cron$
  select net.http_post(
    url:=(select decrypted_secret from vault.decrypted_secrets where name='knowledge_source_monitor_project_url' order by created_at desc limit 1)||'/functions/v1/knowledge-agent',
    headers:=jsonb_build_object('Content-Type','application/json','x-prisma-monitor-secret',
      (select decrypted_secret from vault.decrypted_secrets where name='knowledge_source_monitor_secret' order by created_at desc limit 1),
      'Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='profile_competency_normalization_gateway_jwt' order by created_at desc limit 1)),
    body:='{"mode":"people_directory"}'::jsonb,timeout_milliseconds:=120000)
  where exists(select 1 from public.people_directory_contexts where attempts<3 and
    ((status in ('queued','failed') and available_at<=now()) or (status='processing' and started_at<now()-interval '5 minutes')));
$cron$);
commit;
