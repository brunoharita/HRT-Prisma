-- v2.0.5: optional advisory analysis; published facts/approval remain authoritative.
create table public.profile_syntheses (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, person_id uuid not null, profile_id uuid not null,
 basis_hash text not null check (basis_hash ~ '^[a-f0-9]{64}$'),
 contract_version text not null default 'profile-synthesis-1.0.0', prompt_version text not null default 'profile-synthesis-prompt-1.0.0',
 model_config text not null default 'gpt-5.6-luna', model text not null,
 sources jsonb not null, result jsonb not null, generated_at timestamptz not null default now(),
 foreign key (organization_id,person_id) references public.people(organization_id,id) on delete cascade,
 foreign key (organization_id,profile_id) references public.professional_profiles(organization_id,id) on delete cascade,
 unique(organization_id,profile_id,basis_hash,contract_version,prompt_version,model_config),
 check(jsonb_typeof(sources)='array' and jsonb_typeof(result)='object')
);
create table public.profile_synthesis_jobs (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, person_id uuid not null, profile_id uuid not null,
 basis_hash text not null check(basis_hash ~ '^[a-f0-9]{64}$'),
 contract_version text not null default 'profile-synthesis-1.0.0', prompt_version text not null default 'profile-synthesis-prompt-1.0.0', model_config text not null default 'gpt-5.6-luna',
 state text not null default 'queued' check(state in ('queued','processing','complete','failed','insufficient','obsolete')),
 attempts integer not null default 0 check(attempts between 0 and 3), lease uuid, lease_until timestamptz,
 available_at timestamptz not null default now(), created_at timestamptz not null default now(), error_code text,
 foreign key (organization_id,person_id) references public.people(organization_id,id) on delete cascade,
 foreign key (organization_id,profile_id) references public.professional_profiles(organization_id,id) on delete cascade,
 unique(organization_id,profile_id,basis_hash,contract_version,prompt_version,model_config)
);
create table public.profile_synthesis_attempts (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, person_id uuid not null,
 job_id uuid not null references public.profile_synthesis_jobs(id) on delete cascade, attempt integer not null,
 started_at timestamptz not null default now(), completed_at timestamptz, duration_ms integer, input_tokens integer, output_tokens integer,
 model text, error_code text,
 foreign key (organization_id,person_id) references public.people(organization_id,id) on delete cascade,
 unique(job_id,attempt)
);
create index profile_syntheses_read_idx on public.profile_syntheses(organization_id,person_id,profile_id,generated_at desc);
create index profile_synthesis_queue_idx on public.profile_synthesis_jobs(available_at,created_at) where state in ('queued','processing');
create index profile_synthesis_jobs_person_idx on public.profile_synthesis_jobs(organization_id,person_id,profile_id);
create index profile_synthesis_attempts_person_idx on public.profile_synthesis_attempts(organization_id,person_id);
alter table public.profile_syntheses enable row level security;
alter table public.profile_synthesis_jobs enable row level security;
alter table public.profile_synthesis_attempts enable row level security;
revoke all on public.profile_syntheses,public.profile_synthesis_jobs,public.profile_synthesis_attempts from public,anon,authenticated;
grant all on public.profile_syntheses,public.profile_synthesis_jobs,public.profile_synthesis_attempts to service_role;
-- Backend-only worker capabilities, never a service-role credential on the VPS.
create table private.profile_synthesis_worker_config(singleton boolean primary key default true check(singleton), token_hash text not null check(token_hash ~ '^[a-f0-9]{64}$'));
revoke all on private.profile_synthesis_worker_config from public,anon,authenticated;
create function private.require_synthesis_worker(p_secret text) returns void language plpgsql security definer set search_path='' as $$
begin
 if char_length(coalesce(p_secret,''))<40 or not exists(select 1 from private.profile_synthesis_worker_config c
   where c.token_hash=encode(extensions.digest(p_secret,'sha256'),'hex')) then
   raise exception 'SYNTHESIS_WORKER_DENIED' using errcode='42501';
 end if;
end $$;
revoke all on function private.require_synthesis_worker(text) from public,anon,authenticated;

create function private.profile_synthesis_sources(p_profile_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p public.professional_profiles; sources jsonb:='[]'::jsonb; root text; f text; value jsonb; item jsonb; n integer; path text; txt text; sid text; extra record;
begin
 select * into p from public.professional_profiles where id=p_profile_id and review_status='approved';
 if p.id is null then raise exception 'SYNTHESIS_PROFILE_INVALID'; end if;
 foreach root in array array['professionalTitle','summary','professionalObjective','areasOfExpertise','keyResults','experiences','education','competencies','certifications','languages','toolsAndTechnologies','professionalContexts','customSections'] loop
  value:=p.profile_data->root;
  if value is null or value='null'::jsonb then continue; end if;
  if jsonb_typeof(value)='string' then
   sources:=sources||jsonb_build_array(jsonb_build_object('id',root,'fieldPath',root,'text',value#>>'{}','label',case root when 'summary' then 'Resumo profissional publicado' when 'professionalObjective' then 'Objetivo declarado' else 'Título profissional publicado' end,'nature','published_fact','documentId',p.source_document_id,'reviewId',p.review_id,'pageNumber',null));
  elsif jsonb_typeof(value)='array' then
   n:=0;
   for item in select x from jsonb_array_elements(value) x loop
    path:=root||'.'||coalesce(nullif(item->>'id',''),n::text);
    if jsonb_typeof(item)='string' then
     txt:=item#>>'{}';
     sources:=sources||jsonb_build_array(jsonb_build_object('id',path,'fieldPath',path,'text',txt,'label',root,'nature','published_fact','documentId',p.source_document_id,'reviewId',p.review_id,'pageNumber',null));
    elsif jsonb_typeof(item)='object' and root in ('experiences','education','keyResults') then
     foreach f in array case root when 'experiences' then array['role','organization','period','description'] when 'education' then array['course','institution','period','description','status','level','qualification'] else array['value'] end loop
      txt:=nullif(btrim(item->>f),''); if txt is null then continue; end if;
      if f in ('status','level','qualification') then
       if txt='unknown' then continue; end if;
       txt:=case txt when 'in_progress' then 'Em andamento' when 'completed' then 'Concluído' when 'incomplete' then 'Incompleto' when 'undergraduate' then 'Graduação' when 'secondary' then 'Ensino médio' when 'bachelor' then 'Bacharelado' when 'technologist' then 'Tecnólogo' when 'technical' then 'Técnico' when 'complementary' then 'Formação complementar' else txt end;
      end if;
      sid:=path||'.'||f;
      sources:=sources||jsonb_build_array(jsonb_build_object('id',sid,'fieldPath',sid,'text',txt,'label',case root when 'experiences' then 'Experiência profissional' when 'education' then 'Formação informada' else 'Resultado declarado' end,'nature','published_fact','documentId',p.source_document_id,'reviewId',p.review_id,'pageNumber',case when item->>'page' ~ '^[1-9][0-9]*$' then (item->>'page')::integer else null end));
     end loop;
    elsif jsonb_typeof(item)='object' and root='customSections' then
     if coalesce(item->>'name','') !~* '(projeto|publicaç|pesquisa|voluntari|produção|portf[oó]lio|premiaç|realizaç|profission)' then continue; end if;
     for extra in select x,ordinal from jsonb_array_elements(coalesce(item->'items','[]'::jsonb)) with ordinality rows(x,ordinal) loop
      txt:=nullif(btrim(extra.x->>'value'),''); if txt is null then continue; end if;
      sid:=path||'.items.'||coalesce(extra.x->>'id',(extra.ordinal-1)::text)||'.value';
      sources:=sources||jsonb_build_array(jsonb_build_object('id',sid,'fieldPath',sid,'text',txt,'label',coalesce(item->>'name','Informação adicional'),'nature','published_fact','documentId',p.source_document_id,'reviewId',p.review_id,'pageNumber',null));
     end loop;
    end if;
    n:=n+1;
   end loop;
  end if;
 end loop;
 -- Approved contextual/certified evidence remains a published claim, never a verification by association.
 if to_regclass('public.person_competency_evidence_links') is not null then
 for extra in execute 'select l.id,l.source_quote,l.nature,k.canonical_label from public.person_competency_evidence_links l join public.knowledge_concepts k on k.id=l.concept_id and k.status=''approved'' where l.organization_id=$1 and l.person_id=$2 and l.profile_id=$3 and (k.scope=''global'' or k.organization_id=$1) order by l.id' using p.organization_id,p.person_id,p.id loop
  sources:=sources||jsonb_build_array(jsonb_build_object('id','linked:'||extra.id,'fieldPath','competencies','text',extra.canonical_label||': '||extra.source_quote,'label',case extra.nature when 'contextual' then 'Evidência contextual associada' else 'Certificação associada' end,'nature','published_fact','documentId',p.source_document_id,'reviewId',p.review_id,'pageNumber',null));
 end loop;
 end if;
 -- Reuse the active Assessment contract; no score, raw responses or personal identifiers.
 for extra in select e.id,n.competency_label,e.verified_at,e.valid_until,e.evaluation_version,e.integrity_rule_version
 from public.competency_demonstrated_evidence e join public.verification_needs n on n.id=e.verification_need_id and n.organization_id=e.organization_id
 where e.organization_id=p.organization_id and e.person_id=p.person_id and e.status='active'
 and (e.valid_until is null or e.valid_until>now()) and e.demonstrated_level in ('basic','intermediate','advanced') order by e.id loop
 sources:=sources||jsonb_build_array(jsonb_build_object('id','assessment:'||extra.id,'fieldPath','assessments','text',extra.competency_label||': conhecimento verificado no instrumento. Verificado em '||extra.verified_at::text||'. Validade: '||coalesce(extra.valid_until::text,'sem prazo declarado')||'. Método '||extra.evaluation_version||' / integridade '||extra.integrity_rule_version,'label','Verificação de conhecimento por Assessment','nature','verified_assessment','documentId',null,'reviewId',null,'pageNumber',null));
 end loop;
 select coalesce(jsonb_agg(x order by x->>'id'),'[]'::jsonb) into sources from jsonb_array_elements(sources) x where nullif(btrim(x->>'text'),'') is not null;
 return sources;
end $$;
revoke all on function private.profile_synthesis_sources(uuid) from public,anon,authenticated;

create function private.enqueue_profile_synthesis(p_profile_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare p public.professional_profiles; s jsonb; h text; job_id uuid;
begin
 select * into p from public.professional_profiles where id=p_profile_id and review_status='approved';
 if p.id is null or not exists(select 1 from public.people where id=p.person_id and organization_id=p.organization_id and operational_status not in ('deleting','merged')) then return null; end if;
 s:=private.profile_synthesis_sources(p.id); h:=encode(extensions.digest(s::text,'sha256'),'hex');
 insert into public.profile_synthesis_jobs(organization_id,person_id,profile_id,basis_hash,state)
 values(p.organization_id,p.person_id,p.id,h,case when jsonb_array_length(s)=0 then 'insufficient' else 'queued' end)
 on conflict(organization_id,profile_id,basis_hash,contract_version,prompt_version,model_config) do nothing returning id into job_id;
 if job_id is null then select j.id into job_id from public.profile_synthesis_jobs j where j.organization_id=p.organization_id and j.profile_id=p.id and j.basis_hash=h and j.contract_version='profile-synthesis-1.0.0' and j.prompt_version='profile-synthesis-prompt-1.0.0' and j.model_config='gpt-5.6-luna'; end if;
 update public.profile_synthesis_jobs set state=case when attempts<3 then 'queued' else 'failed' end,available_at=now() where id=job_id and state='obsolete';
 return job_id;
end $$;
revoke all on function private.enqueue_profile_synthesis(uuid) from public,anon,authenticated;

-- Use the existing transactional publication audit; optional analysis cannot block approval.
create function private.profile_synthesis_publication_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.event_type in ('profile_published_merge','profile_published_replace','profile_restored') and new.result='success' then
  if exists(select 1 from public.professional_profiles p where p.id=nullif(new.metadata->>'profile_id','')::uuid and p.organization_id=new.organization_id and p.person_id=new.person_id) then perform private.enqueue_profile_synthesis(nullif(new.metadata->>'profile_id','')::uuid);end if;
 end if;
 return new;
exception when others then return new; -- reconciliation recovers optional queue outages, audit is still written.
end $$;
revoke all on function private.profile_synthesis_publication_event() from public,anon,authenticated;
create trigger synthesis_after_publication after insert on public.person_ingestion_events for each row execute function private.profile_synthesis_publication_event();

create function private.profile_synthesis_evidence_changed() returns trigger language plpgsql security definer set search_path='' as $$
declare org uuid; person uuid; profile uuid;
begin
 if tg_op='DELETE' then org:=old.organization_id;person:=old.person_id;else org:=new.organization_id;person:=new.person_id;end if;
 if tg_table_name='person_competency_evidence_links' then
  if tg_op='DELETE' then profile:=old.profile_id;else profile:=new.profile_id;end if;
 else select p.id into profile from public.professional_profiles p where p.organization_id=org and p.person_id=person and p.review_status='approved' and p.superseded_at is null;end if;
 if profile is not null and exists(select 1 from public.profile_synthesis_jobs j where j.profile_id=profile) then perform private.enqueue_profile_synthesis(profile);end if;
 return null;
exception when others then return null;
end $$;
revoke all on function private.profile_synthesis_evidence_changed() from public,anon,authenticated;
create trigger synthesis_assessment_changed after insert or update or delete on public.competency_demonstrated_evidence for each row execute function private.profile_synthesis_evidence_changed();
do $$ begin if to_regclass('public.person_competency_evidence_links') is not null then execute 'create trigger synthesis_link_changed after insert or update or delete on public.person_competency_evidence_links for each row execute function private.profile_synthesis_evidence_changed()';end if;end $$;

create function public.load_profile_synthesis(p_organization_id uuid,p_person_id uuid,p_profile_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.professional_profiles; s jsonb; h text; j public.profile_synthesis_jobs; a public.profile_syntheses; prior public.profile_syntheses; prev jsonb:='null'::jsonb;
begin
 perform private.m72_require_profile_reader(p_organization_id);
 select * into p from public.professional_profiles where organization_id=p_organization_id and person_id=p_person_id and review_status='approved'
 and ((p_profile_id is null and superseded_at is null) or id=p_profile_id) order by profile_version desc limit 1;
 if p.id is null then raise exception 'SYNTHESIS_PROFILE_DENIED' using errcode='42501'; end if;
 s:=private.profile_synthesis_sources(p.id); h:=encode(extensions.digest(s::text,'sha256'),'hex');
 select * into j from public.profile_synthesis_jobs where organization_id=p_organization_id and profile_id=p.id and basis_hash=h and contract_version='profile-synthesis-1.0.0' and prompt_version='profile-synthesis-prompt-1.0.0' and model_config='gpt-5.6-luna';
 select * into a from public.profile_syntheses where organization_id=p_organization_id and profile_id=p.id and basis_hash=h and contract_version='profile-synthesis-1.0.0' and prompt_version='profile-synthesis-prompt-1.0.0' and model_config='gpt-5.6-luna';
 if a.id is null then
  select * into prior from public.profile_syntheses where organization_id=p_organization_id and profile_id=p.id and contract_version='profile-synthesis-1.0.0' order by generated_at desc limit 1;
  if prior.id is not null then prev:=jsonb_build_object('analysisId',prior.id,'profileVersion',p.profile_version,'generatedAt',prior.generated_at,'result',prior.result,'sources',(select jsonb_agg(x-'text') from jsonb_array_elements(prior.sources) x)); end if;
 end if;
 return jsonb_build_object('organizationId',p.organization_id,'personId',p.person_id,'profileId',p.id,'profileVersion',p.profile_version,'state',case when a.id is not null then 'complete' when j.state='obsolete' then 'not_requested' else coalesce(j.state,'not_requested') end,
 'analysisId',a.id,'generatedAt',a.generated_at,'model',a.model,'result',a.result,'previous',prev,'sources',(select coalesce(jsonb_agg(x-'text'),'[]'::jsonb) from jsonb_array_elements(s) x),'errorCode',j.error_code,'basisHash',h);
end $$;
revoke all on function public.load_profile_synthesis(uuid,uuid,uuid) from public,anon;
grant execute on function public.load_profile_synthesis(uuid,uuid,uuid) to authenticated;
create function public.request_profile_synthesis(p_organization_id uuid,p_person_id uuid,p_profile_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare p uuid;
begin
 perform private.m72_require_profile_reader(p_organization_id);
 select id into p from public.professional_profiles where organization_id=p_organization_id and person_id=p_person_id and review_status='approved'
 and ((p_profile_id is null and superseded_at is null) or id=p_profile_id) order by profile_version desc limit 1;
 if p is null then raise exception 'SYNTHESIS_PROFILE_DENIED' using errcode='42501'; end if;
 perform private.enqueue_profile_synthesis(p);
 return public.load_profile_synthesis(p_organization_id,p_person_id,p);
end $$;
revoke all on function public.request_profile_synthesis(uuid,uuid,uuid) from public,anon;
grant execute on function public.request_profile_synthesis(uuid,uuid,uuid) to authenticated;

create function public.load_profile_synthesis_source(p_organization_id uuid,p_person_id uuid,p_analysis_id uuid,p_source_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare source jsonb;
begin
 perform private.m72_require_profile_reader(p_organization_id);
 select x into source from public.profile_syntheses a cross join lateral jsonb_array_elements(a.sources) x
 where a.organization_id=p_organization_id and a.person_id=p_person_id and a.id=p_analysis_id and x->>'id'=p_source_id;
 if source is null then raise exception 'SYNTHESIS_SOURCE_DENIED' using errcode='42501'; end if;
 return source;
end $$;
revoke all on function public.load_profile_synthesis_source(uuid,uuid,uuid,text) from public,anon;
grant execute on function public.load_profile_synthesis_source(uuid,uuid,uuid,text) to authenticated;

create function public.claim_profile_synthesis(p_secret text) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.profile_synthesis_jobs; s jsonb; h text; p public.professional_profiles;
begin
 perform private.require_synthesis_worker(p_secret);
 update public.profile_synthesis_attempts a set completed_at=now(),error_code='REQUEST_INTERRUPTED'
 from public.profile_synthesis_jobs expired where a.job_id=expired.id and a.attempt=expired.attempts and a.completed_at is null and expired.state='processing' and expired.lease_until<now();
 update public.profile_synthesis_jobs set state='failed',error_code='REQUEST_INTERRUPTED',lease=null,lease_until=null where state='processing' and lease_until<now() and attempts>=3;
 -- Bounded reconciliation: only publications after this feature's install, never historical backfill.
 perform private.enqueue_profile_synthesis(p2.id) from public.professional_profiles p2 where p2.review_status='approved' and p2.superseded_at is null
 and p2.approved_at>=(select installed_at from private.profile_synthesis_installation)
 and not exists(select 1 from public.profile_synthesis_jobs j2 where j2.profile_id=p2.id) order by p2.approved_at limit 10;
 select * into j from public.profile_synthesis_jobs q where attempts<3 and available_at<=now() and (state='queued' or (state='processing' and lease_until<now()))
 order by coalesce((select max(a.started_at) from public.profile_synthesis_attempts a where a.organization_id=q.organization_id),'-infinity'::timestamptz),available_at,created_at limit 1 for update skip locked;
 if j.id is null then return null; end if;
 select * into p from public.professional_profiles where id=j.profile_id and organization_id=j.organization_id and person_id=j.person_id;
 if p.id is null then return null; end if;
 s:=private.profile_synthesis_sources(p.id); h:=encode(extensions.digest(s::text,'sha256'),'hex');
 if h<>j.basis_hash then update public.profile_synthesis_jobs set state='obsolete',lease=null,lease_until=null where id=j.id; perform private.enqueue_profile_synthesis(p.id); return null; end if;
 update public.profile_synthesis_jobs set state='processing',attempts=attempts+1,lease=gen_random_uuid(),lease_until=now()+interval '3 minutes',error_code=null where id=j.id returning * into j;
 insert into public.profile_synthesis_attempts(organization_id,person_id,job_id,attempt) values(j.organization_id,j.person_id,j.id,j.attempts);
 return jsonb_build_object('id',j.id,'organizationId',j.organization_id,'personId',j.person_id,'profileId',j.profile_id,'lease',j.lease,'sources',s,'basisHash',j.basis_hash,'model',j.model_config);
end $$;
create table private.profile_synthesis_installation(installed_at timestamptz not null default now());
insert into private.profile_synthesis_installation default values;
revoke all on private.profile_synthesis_installation from public,anon,authenticated;
revoke all on function public.claim_profile_synthesis(text) from public;
grant execute on function public.claim_profile_synthesis(text) to anon,authenticated;

create function private.valid_profile_synthesis_result(p_result jsonb,p_sources jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare a jsonb; st jsonb; ref jsonb; ids text[]:=array['trajectory','activities','contexts','competencies','results','education','objective','clarifications']; n integer:=0; total text;
begin
 if jsonb_typeof(p_result) is distinct from 'object' or p_result->>'contractVersion' is distinct from 'profile-synthesis-1.0.0'
 or (select count(*) from jsonb_object_keys(p_result))<>4 or jsonb_typeof(p_sources) is distinct from 'array'
 or jsonb_typeof(p_result->'overview') is distinct from 'array' or jsonb_array_length(p_result->'overview') not between 1 and 5
 or jsonb_typeof(p_result->'answers') is distinct from 'array' or jsonb_array_length(p_result->'answers')<>8
 or jsonb_typeof(p_result->'clarifications') is distinct from 'array' or jsonb_array_length(p_result->'clarifications')>3 or octet_length(p_result::text)>40000 then return false; end if;
 select string_agg(x->>'text',' ') into total from jsonb_array_elements(p_result->'overview') x;
 if cardinality(regexp_split_to_array(btrim(total),'\s+'))>120 then return false; end if;
 for a in select x from jsonb_array_elements(p_result->'answers') x loop
  n:=n+1;
  if jsonb_typeof(a) is distinct from 'object' or (select count(*) from jsonb_object_keys(a))<>4
  or a->>'questionId' is distinct from ids[n] or coalesce(a->>'status','') not in ('answered','partial','insufficient')
  or jsonb_typeof(a->'statements') is distinct from 'array' or jsonb_array_length(a->'statements')>4
  or jsonb_typeof(a->'missingInformation') is distinct from 'array' or jsonb_array_length(a->'missingInformation')>3 then return false; end if;
  if a->>'status'='insufficient' and (jsonb_array_length(a->'statements')<>0 or jsonb_array_length(a->'missingInformation')=0) then return false; end if;
  if a->>'status'<>'insufficient' and jsonb_array_length(a->'statements')=0 then return false; end if;
  if a->>'status'='partial' and jsonb_array_length(a->'missingInformation')=0 then return false; end if;
  for ref in select x from jsonb_array_elements(a->'missingInformation') x loop
   if jsonb_typeof(ref) is distinct from 'string' or char_length(btrim(ref#>>'{}')) not between 1 and 600 then return false; end if;
  end loop;
  select string_agg(x->>'text',' ') into total from jsonb_array_elements(a->'statements') x;
  if cardinality(regexp_split_to_array(btrim(total),'\s+'))>120 then return false; end if;
 end loop;
 for st in select x from jsonb_array_elements(p_result->'overview') x union all select x from jsonb_array_elements(p_result->'answers') answers_row cross join lateral jsonb_array_elements(answers_row->'statements') x loop
  if jsonb_typeof(st) is distinct from 'object' or (select count(*) from jsonb_object_keys(st))<>3
  or jsonb_typeof(st->'text') is distinct from 'string' or char_length(btrim(coalesce(st->>'text',''))) not between 1 and 1800
  or coalesce(st->>'nature','') not in ('published_fact','interpretation') or jsonb_typeof(st->'sourceIds') is distinct from 'array'
  or jsonb_array_length(st->'sourceIds') not between 1 and 5 or (select count(distinct x) from jsonb_array_elements(st->'sourceIds') x)<>jsonb_array_length(st->'sourceIds') then return false; end if;
  for ref in select x from jsonb_array_elements(st->'sourceIds') x loop
   if jsonb_typeof(ref) is distinct from 'string' or not exists(select 1 from jsonb_array_elements(p_sources) s where s->>'id'=ref#>>'{}') then return false; end if;
  end loop;
  if st->>'text' ~* '(conhecimento|competência) verificad[oa]|verificad[oa] por assessment' and not exists(select 1 from jsonb_array_elements(p_sources) s where s->>'nature'='verified_assessment' and st->'sourceIds' ? (s->>'id')) then return false;end if;
 end loop;
 for st in select x from jsonb_array_elements(p_result->'clarifications') x loop
  if jsonb_typeof(st) is distinct from 'object' or (select count(*) from jsonb_object_keys(st))<>3
  or not(coalesce(st->>'questionId','')=any(ids)) or jsonb_typeof(st->'text') is distinct from 'string' or char_length(btrim(coalesce(st->>'text',''))) not between 1 and 600
  or jsonb_typeof(st->'sourceIds') is distinct from 'array' or jsonb_array_length(st->'sourceIds') not between 1 and 5
  or (select count(distinct x) from jsonb_array_elements(st->'sourceIds') x)<>jsonb_array_length(st->'sourceIds') then return false; end if;
  for ref in select x from jsonb_array_elements(st->'sourceIds') x loop if jsonb_typeof(ref) is distinct from 'string' or not exists(select 1 from jsonb_array_elements(p_sources) s where s->>'id'=ref#>>'{}') then return false; end if; end loop;
 end loop;
 return true;
exception when others then return false;
end $$;
revoke all on function private.valid_profile_synthesis_result(jsonb,jsonb) from public,anon,authenticated;
create function public.complete_profile_synthesis(p_secret text,p_job_id uuid,p_lease uuid,p_result jsonb,p_model text,p_input_tokens integer,p_output_tokens integer,p_duration_ms integer,p_error text default null) returns void language plpgsql security definer set search_path='' as $$
declare j public.profile_synthesis_jobs; s jsonb; h text;
begin
 perform private.require_synthesis_worker(p_secret);
 select * into j from public.profile_synthesis_jobs where id=p_job_id for update;
 if j.id is null or j.state<>'processing' or j.lease is distinct from p_lease or j.lease_until<now() then raise exception 'SYNTHESIS_LEASE_INVALID' using errcode='40001'; end if;
 if p_model is distinct from j.model_config then raise exception 'SYNTHESIS_MODEL_INVALID' using errcode='22023';end if;
 if p_error is not null and p_error not in ('PROVIDER_UNAVAILABLE','RATE_LIMITED','RESPONSE_INVALID','INPUT_TOO_LARGE','CONFIGURATION_UNAVAILABLE','REQUEST_INTERRUPTED') then raise exception 'SYNTHESIS_ERROR_INVALID'; end if;
 s:=private.profile_synthesis_sources(j.profile_id); h:=encode(extensions.digest(s::text,'sha256'),'hex');
 if p_error is null and h=j.basis_hash then
  if not private.valid_profile_synthesis_result(p_result,s) then raise exception 'SYNTHESIS_RESPONSE_INVALID' using errcode='22023'; end if;
  insert into public.profile_syntheses(organization_id,person_id,profile_id,basis_hash,contract_version,prompt_version,model_config,model,sources,result)
  values(j.organization_id,j.person_id,j.profile_id,j.basis_hash,j.contract_version,j.prompt_version,j.model_config,p_model,s,p_result) on conflict do nothing;
 end if;
 update public.profile_synthesis_attempts set completed_at=now(),duration_ms=greatest(0,p_duration_ms),input_tokens=greatest(0,p_input_tokens),output_tokens=greatest(0,p_output_tokens),model=left(p_model,160),error_code=p_error where job_id=j.id and attempt=j.attempts;
 update public.profile_synthesis_jobs set state=case when h<>j.basis_hash then 'obsolete' when p_error is null then 'complete' when p_error in ('PROVIDER_UNAVAILABLE','RATE_LIMITED') and j.attempts<3 then 'queued' else 'failed' end,
 available_at=now()+make_interval(secs=>30*j.attempts*j.attempts),error_code=p_error,lease=null,lease_until=null where id=j.id;
 if h<>j.basis_hash then perform private.enqueue_profile_synthesis(j.profile_id); end if;
end $$;
revoke all on function public.complete_profile_synthesis(text,uuid,uuid,jsonb,text,integer,integer,integer,text) from public;
grant execute on function public.complete_profile_synthesis(text,uuid,uuid,jsonb,text,integer,integer,integer,text) to anon,authenticated;
