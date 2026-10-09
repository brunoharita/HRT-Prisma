-- Contextual assessment v1; preserves legacy M5.1 and matching contracts.
create table private.position_assessment_key (
 id boolean primary key default true check(id), value text not null
);
insert into private.position_assessment_key(value) values(encode(extensions.gen_random_bytes(32),'hex'));
revoke all on private.position_assessment_key from public,anon,authenticated,service_role;

create table public.position_assessments (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 person_id uuid not null, vacancy_id uuid not null, position_version_id uuid not null,
 contract_version text not null default 'position-assessment-1.0.0' check(contract_version='position-assessment-1.0.0'),
 revision integer not null default 1, status text not null default 'draft' check(status in ('draft','ready','issued','cancelled')),
 requirements jsonb not null, config jsonb not null, questions jsonb not null default '[]',
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,id),
 foreign key(organization_id,person_id) references public.people(organization_id,id) on delete cascade,
 foreign key(organization_id,vacancy_id) references public.vacancies(organization_id,id) on delete cascade,
 foreign key(organization_id,position_version_id) references public.vacancy_versions(organization_id,id)
);
create index position_assessments_context_idx on public.position_assessments(organization_id,vacancy_id,person_id,created_at desc);
create table public.position_assessment_attempts (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, assessment_id uuid not null,
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'), expires_at timestamptz not null,
 status text not null default 'invited' check(status in ('invited','started','submitted','cancelled')),
 started_at timestamptz, submitted_at timestamptz, revision integer not null default 0,
 answers jsonb not null default '{}', marked jsonb not null default '[]', result jsonb,
 created_at timestamptz not null default now(), unique(organization_id,id),
 foreign key(organization_id,assessment_id) references public.position_assessments(organization_id,id) on delete cascade,
 check((status='submitted' and result is not null and submitted_at is not null) or (status<>'submitted' and result is null))
);
create index position_assessment_attempts_parent_idx on public.position_assessment_attempts(organization_id,assessment_id);
create table public.position_assessment_events (
 id bigint generated always as identity primary key, organization_id uuid not null, attempt_id uuid not null,
 event_id uuid not null, question_id uuid not null, question_version text not null,
 kind text not null check(kind in ('focus_episode','mouse_idle_before_first_choice','zoom_observed','capture_shortcut_observed','observation_gap','question_reopened','answer_changed')),
 client_at_ms numeric not null check(client_at_ms>=0 and client_at_ms<'Infinity'::numeric),
 sequence bigint not null check(sequence>=0), method text not null, payload jsonb not null,
 received_at timestamptz not null default clock_timestamp(),
 unique(attempt_id,event_id), foreign key(organization_id,attempt_id) references public.position_assessment_attempts(organization_id,id) on delete cascade
);
create index position_assessment_events_attempt_idx on public.position_assessment_events(organization_id,attempt_id,question_id,sequence);
create table public.position_assessment_deliveries (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, attempt_id uuid not null,
 request_key uuid not null, requested_by uuid not null references auth.users(id),
 recipient text not null, subject text not null, message text not null, token_cipher bytea not null,
 state text not null default 'queued' check(state in ('queued','sending','sent','failed','reconciliation_required','cancelled')),
 first_attempt_at timestamptz, lease_until timestamptz, lease_id uuid,
 provider_email_id uuid, error_category text, tries integer not null default 0, created_at timestamptz not null default now(),
 unique(organization_id,request_key), foreign key(organization_id,attempt_id) references public.position_assessment_attempts(organization_id,id) on delete cascade
);
create index position_assessment_delivery_queue_idx on public.position_assessment_deliveries(state,lease_until) where state in ('queued','sending');
create table public.position_assessment_generation (
 id uuid primary key, organization_id uuid not null, assessment_id uuid not null, actor_id uuid not null references auth.users(id),
 revision integer not null, distribution jsonb not null, requirements jsonb not null,
 status text not null default 'reserved' check(status in ('reserved','running','succeeded','failed')),
 reserved_usd numeric(12,8) not null default 0.25, actual_usd numeric(12,8),
 created_at timestamptz not null default now(), finished_at timestamptz,
 foreign key(organization_id,assessment_id) references public.position_assessments(organization_id,id) on delete cascade
);
create index position_assessment_generation_budget_idx on public.position_assessment_generation(organization_id,created_at);

-- Participants have no platform account. Audit their capability without inventing a human actor.
create table public.position_assessment_audit (
 id bigint generated always as identity primary key, organization_id uuid not null, attempt_id uuid not null,
 actor_kind text not null check(actor_kind in ('participant','backend')), action text not null, payload jsonb not null,
 created_at timestamptz not null default clock_timestamp(),
 foreign key(organization_id,attempt_id) references public.position_assessment_attempts(organization_id,id) on delete cascade
);
create index position_assessment_audit_attempt_idx on public.position_assessment_audit(organization_id,attempt_id,created_at);

-- RPC-only tables: RLS on, no client/direct privileged DML grants.
do $$ declare t text; begin
 foreach t in array array['position_assessments','position_assessment_attempts','position_assessment_events','position_assessment_deliveries','position_assessment_generation','position_assessment_audit'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
 end loop;
end $$;
revoke all on sequence public.position_assessment_events_id_seq from public,anon,authenticated,service_role;
revoke all on sequence public.position_assessment_audit_id_seq from public,anon,authenticated,service_role;

create function private.pa_distribution(p_quantity integer,p_level integer) returns jsonb
language plpgsql immutable set search_path='' as $$
#variable_conflict use_column
declare ratios integer[]; begin
 if p_quantity is null or p_quantity<10 or p_quantity%10<>0 or p_level is null or p_level not between 1 and 5 then
  raise exception 'PA_CONFIG_INVALID' using errcode='22023'; end if;
 ratios:=case p_level when 1 then array[60,30,10] when 2 then array[40,40,20] when 3 then array[30,40,30] when 4 then array[20,40,40] else array[10,30,60] end;
 return jsonb_build_object('version','position-assessment-distribution-1.0.0','quantity',p_quantity,'level',p_level,
 'percentages',jsonb_build_object('easy',ratios[1],'medium',ratios[2],'hard',ratios[3]),
 'counts',jsonb_build_object('easy',p_quantity*ratios[1]/100,'medium',p_quantity*ratios[2]/100,'hard',p_quantity*ratios[3]/100));
end $$;

create function private.pa_validate_question(q jsonb,p_org uuid,p_requirements jsonb) returns void
language plpgsql set search_path='' as $$
begin
 if jsonb_typeof(q) is distinct from 'object' or jsonb_typeof(q->'options') is distinct from 'array' then raise exception 'PA_QUESTION_INVALID' using errcode='22023'; end if;
 if jsonb_array_length(q->'options')<>5 or (q->>'organizationId') is distinct from p_org::text
 or coalesce(q->>'stem','')='' or length(q->>'stem')>6000 or coalesce(q->>'explanation','')='' or length(q->>'explanation')>6000
 or coalesce(q->>'version','')='' or q->>'difficulty' not in ('easy','medium','hard') or coalesce(q->>'difficulty','')=''
 or exists(select 1 from jsonb_object_keys(q) k where k not in ('organizationId','id','version','requirementId','competencyKey','difficulty','language','stem','options','correctOptionId','explanation','source','review','provenance','approvedBy','approvedAt'))
 or q->>'source' not in ('bank','ai') or coalesce(q->>'source','')='' or q->>'language' is distinct from 'pt-BR'
 or not exists(select 1 from jsonb_array_elements(p_requirements) r where r->>'id'=q->>'requirementId' and r->>'competencyKey'=q->>'competencyKey')
 or (select count(distinct o->>'id') from jsonb_array_elements(q->'options') o)<>5
 or (select count(distinct lower(trim(normalize(o->>'label',NFKC)))) from jsonb_array_elements(q->'options') o)<>5
 or exists(select 1 from jsonb_array_elements(q->'options') o where coalesce(o->>'id','')='' or coalesce(trim(o->>'label'),'')='' or length(o->>'label')>3000)
 or (select count(*) from jsonb_array_elements(q->'options') o where o->>'id'=q->>'correctOptionId')<>1
 or coalesce(q#>>'{provenance,method}','')='' or coalesce(q#>>'{provenance,version}','')='' then raise exception 'PA_QUESTION_INVALID' using errcode='22023'; end if;
 perform (q->>'id')::uuid;
end $$;

create function private.pa_ready(a public.position_assessments) returns boolean
language plpgsql set search_path='' as $$
#variable_conflict use_column
declare q jsonb; d text; begin
 if jsonb_array_length(a.questions)<>(a.config->>'quantity')::integer then return false; end if;
 for q in select value from jsonb_array_elements(a.questions) loop
  perform private.pa_validate_question(q,a.organization_id,a.requirements);
  if q->>'review' is distinct from 'approved' or coalesce(q->>'approvedBy','')='' then return false; end if;
 end loop;
 foreach d in array array['easy','medium','hard'] loop
  if (select count(*) from jsonb_array_elements(a.questions) q where q->>'difficulty'=d)<>(a.config#>>array['distribution','counts',d])::integer then return false; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(a.requirements) r where not exists(select 1 from jsonb_array_elements(a.questions) q where q->>'requirementId'=r->>'id')) then return false; end if;
 return true;
end $$;

create function public.position_assessment_workspace(p_organization_id uuid,p_vacancy_id uuid,p_person_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare result jsonb; begin
 perform private.authorize_position_follow_up(p_organization_id);
 insert into public.verification_audit_events(organization_id,actor_auth_user_id,action,result,payload) values(p_organization_id,auth.uid(),'position_assessment_consulted','success',jsonb_build_object('personId',p_person_id,'vacancyId',p_vacancy_id));
 if not exists(select 1 from public.position_evaluation_entries e join public.position_evaluation_processes p on p.id=e.process_id and p.organization_id=e.organization_id
 where e.organization_id=p_organization_id and e.person_id=p_person_id and p.vacancy_id=p_vacancy_id) then raise exception 'PA_CONTEXT_INVALID' using errcode='42501'; end if;
 select jsonb_build_object('contract','position-assessment-1.0.0','organizationId',p_organization_id,'personId',p.id,'personName',p.full_name,
 'vacancyId',v.id,'positionVersionId',v.current_version_id,'positionTitle',v.title,'email',pd.email,
 'requirements',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'label',r.label,'competencyKey',coalesce(r.concept_id::text,r.competency_id::text,r.label)) order by r.created_at),'[]') from public.vacancy_requirements r where r.organization_id=p_organization_id and r.vacancy_version_id=v.current_version_id),
 'assessments',(select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('generationPending',exists(select 1 from public.position_assessment_generation g where g.assessment_id=a.id and g.status='reserved')) order by a.created_at desc),'[]') from public.position_assessments a where a.organization_id=p_organization_id and a.person_id=p.id and a.vacancy_id=v.id),
 'attempts',(select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'assessmentId',a.id,'status',t.status,'expiresAt',t.expires_at,'startedAt',t.started_at,'submittedAt',t.submitted_at,'answers',t.answers,'result',t.result,
 'deliveries',(select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'state',d.state,'recipient',d.recipient,'subject',d.subject,'message',d.message,'providerEmailId',d.provider_email_id,'errorCategory',d.error_category,'requestedAt',d.created_at)),'[]') from public.position_assessment_deliveries d where d.attempt_id=t.id),
 'events',(select coalesce(jsonb_agg(to_jsonb(ev) order by ev.sequence,ev.received_at),'[]') from public.position_assessment_events ev where ev.attempt_id=t.id)) order by t.created_at desc),'[]')
 from public.position_assessment_attempts t join public.position_assessments a on a.organization_id=t.organization_id and a.id=t.assessment_id where a.organization_id=p_organization_id and a.person_id=p.id and a.vacancy_id=v.id)) into result
 from public.people p join public.vacancies v on v.organization_id=p.organization_id left join public.person_private_data pd on pd.organization_id=p.organization_id and pd.person_id=p.id
 where p.organization_id=p_organization_id and p.id=p_person_id and v.id=p_vacancy_id;
 if result is null then raise exception 'PA_CONTEXT_INVALID' using errcode='42501'; end if;
 return result;
end $$;

create function public.position_assessment_mutate(p_organization_id uuid,p_vacancy_id uuid,p_person_id uuid,p_action text,p_assessment_id uuid default null,p_revision integer default null,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare actor uuid; a public.position_assessments; conf jsonb; reqs jsonb; qs jsonb; q jsonb; oldq jsonb; newqs jsonb:='[]'; ids uuid[]; v uuid; bank public.assessment_items; keyhash text; family uuid;
begin
 actor:=private.authorize_position_follow_up(p_organization_id);
 if not exists(select 1 from public.position_evaluation_entries e join public.position_evaluation_processes p on p.id=e.process_id and p.organization_id=e.organization_id
 where e.organization_id=p_organization_id and e.person_id=p_person_id and p.vacancy_id=p_vacancy_id and p.status='active' and e.stage<>'closed') then raise exception 'PA_CONTEXT_CLOSED' using errcode='42501'; end if;
 if p_action not in ('configure','questions','approve','ready','cancel') or p_action is null then raise exception 'PA_ACTION_INVALID' using errcode='22023'; end if;
 if p_assessment_id is not null then
  select * into a from public.position_assessments where id=p_assessment_id and organization_id=p_organization_id and person_id=p_person_id and vacancy_id=p_vacancy_id for update;
  if not found then raise exception 'PA_NOT_FOUND' using errcode='42501'; end if;
  if a.revision is distinct from p_revision then raise exception 'PA_CONFLICT' using errcode='40001'; end if;
  if a.status in ('issued','cancelled') and p_action<>'cancel' then raise exception 'PA_IMMUTABLE' using errcode='22023'; end if;
 elsif p_action<>'configure' then raise exception 'PA_NOT_FOUND' using errcode='42501'; end if;
 if p_action='configure' then
  conf:=p_payload->'config';
  if conf->>'mode' is null or conf->>'mode' not in ('bank','ai','mixed') or (conf->>'durationMinutes')::integer not between 1 and 240 or conf->>'durationMinutes' is null then raise exception 'PA_CONFIG_INVALID' using errcode='22023'; end if;
  conf:=jsonb_build_object('quantity',(conf->>'quantity')::integer,'level',(conf->>'level')::integer,'durationMinutes',(conf->>'durationMinutes')::integer,'mode',conf->>'mode',
  'distribution',private.pa_distribution((conf->>'quantity')::integer,(conf->>'level')::integer));
  if jsonb_typeof(p_payload->'requirementIds') is distinct from 'array' then raise exception 'PA_REQUIREMENTS_INVALID' using errcode='22023'; end if;
  select array_agg(value::uuid) into ids from jsonb_array_elements_text(p_payload->'requirementIds');
  if ids is null or cardinality(ids)=0 or (select count(distinct x) from unnest(ids) x)<>cardinality(ids) then raise exception 'PA_REQUIREMENTS_INVALID' using errcode='22023'; end if;
  select current_version_id into v from public.vacancies where id=p_vacancy_id and organization_id=p_organization_id;
  select jsonb_agg(jsonb_build_object('id',r.id,'label',r.label,'competencyKey',coalesce(r.concept_id::text,r.competency_id::text,r.label)) order by r.created_at) into reqs
  from public.vacancy_requirements r where r.organization_id=p_organization_id and r.vacancy_version_id=v and r.id=any(ids);
  if jsonb_array_length(reqs) is distinct from cardinality(ids) or cardinality(ids)>(conf->>'quantity')::integer then raise exception 'PA_REQUIREMENTS_INVALID' using errcode='22023'; end if;
  if a.id is null then insert into public.position_assessments(organization_id,person_id,vacancy_id,position_version_id,requirements,config,created_by)
   values(p_organization_id,p_person_id,p_vacancy_id,v,reqs,conf,actor) returning * into a;
  else update public.position_assessments set config=conf,requirements=reqs,position_version_id=v,questions='[]',status='draft',revision=revision+1,updated_at=now() where id=a.id returning * into a; end if;
 elsif p_action='questions' then
  qs:=p_payload->'questions';
  if jsonb_typeof(qs) is distinct from 'array' or jsonb_array_length(qs)>(a.config->>'quantity')::integer then raise exception 'PA_QUESTION_INVALID' using errcode='22023'; end if;
  if (select count(distinct q->>'id') from jsonb_array_elements(qs) q)<>jsonb_array_length(qs) then raise exception 'PA_DUPLICATE' using errcode='22023'; end if;
  for q in select value from jsonb_array_elements(qs) loop
   perform private.pa_validate_question(q,p_organization_id,a.requirements);
   if (a.config->>'mode'='bank' and q->>'source'<>'bank') or (a.config->>'mode'='ai' and q->>'source'<>'ai') then raise exception 'PA_MODE_INVALID' using errcode='22023'; end if;
   if q->>'source'='bank' then
    select value into oldq from jsonb_array_elements(a.questions) where value->>'id'=q->>'id';
    if oldq->'provenance'->>'method'='human-edited-bank' then
     if q->'provenance' is distinct from oldq->'provenance' or q->>'version' is distinct from oldq->>'version' or q->>'competencyKey' is distinct from oldq->>'competencyKey' or q->>'requirementId' is distinct from oldq->>'requirementId' or q->>'difficulty' is distinct from oldq->>'difficulty' then raise exception 'PA_PROVENANCE_INVALID' using errcode='42501'; end if;
    else
     select * into bank from public.assessment_items where id=(q->>'id')::uuid and (organization_id=p_organization_id or organization_id is null) and state in ('approved','active') and human_approved_at is not null;
     if not found or bank.version is distinct from q->>'version' or bank.competency_key is distinct from q->>'competencyKey'
     or (case bank.defined_difficulty when 'low' then 'easy' when 'high' then 'hard' else 'medium' end) is distinct from q->>'difficulty' then raise exception 'PA_BANK_INVALID' using errcode='42501'; end if;
     if bank.stem is distinct from q->>'stem' or bank.options is distinct from q->'options' or bank.answer_key->>'correctOptionId' is distinct from q->>'correctOptionId' or bank.explanation is distinct from q->>'explanation' then
      q:=q||jsonb_build_object('id',gen_random_uuid(),'version','position-assessment-edited-bank-1.0.0','provenance',jsonb_build_object('method','human-edited-bank','version','position-assessment-edited-bank-1.0.0','baseItemId',bank.id,'baseVersion',bank.version,'authorId',actor));
     else q:=q||jsonb_build_object('provenance',jsonb_build_object('method','approved-item-bank','version',bank.version,'authorId',bank.human_approved_by_auth_user_id)); end if;
    end if;
   end if;
   -- Client cannot claim human approval. An edit resets review.
   q:=q-'approvedBy'-'approvedAt'-'review';
   select value into oldq from jsonb_array_elements(a.questions) where value->>'id'=q->>'id';
   if q->>'source'='ai' and (oldq is null or oldq->>'source'<>'ai' or oldq->>'version' is distinct from q->>'version' or oldq->'provenance' is distinct from q->'provenance' or oldq->>'requirementId' is distinct from q->>'requirementId' or oldq->>'competencyKey' is distinct from q->>'competencyKey' or oldq->>'difficulty' is distinct from q->>'difficulty') then raise exception 'PA_PROVENANCE_INVALID' using errcode='42501'; end if;
   if oldq-'approvedBy'-'approvedAt'-'review'=q then q:=oldq; else q:=q||jsonb_build_object('review','pending');
    if oldq is not null then q:=q||jsonb_build_object('provenance',q->'provenance'||jsonb_build_object('editedBy',actor,'editRevision',a.revision+1)); end if;
   end if;
   newqs:=newqs||jsonb_build_array(q);
  end loop;
  update public.position_assessments set questions=newqs,status='draft',revision=revision+1,updated_at=now() where id=a.id returning * into a;
 elsif p_action='approve' then
  if not exists(select 1 from jsonb_array_elements(a.questions) where value->>'id'=p_payload->>'questionId') then raise exception 'PA_QUESTION_INVALID' using errcode='22023'; end if;
  for q in select value from jsonb_array_elements(a.questions) loop
   if q->>'id'=p_payload->>'questionId' then
    perform private.pa_validate_question(q,p_organization_id,a.requirements);
    q:=q||jsonb_build_object('review','approved','approvedBy',actor,'approvedAt',now());
    if p_payload->>'saveToBank'='true' and (q->>'source'='ai' or q->'provenance'->>'method'='human-edited-bank') then
     keyhash:=encode(extensions.digest(jsonb_build_object('stem',lower(trim(q->>'stem')),'options',q->'options','correctOptionId',q->>'correctOptionId','explanation',q->>'explanation','competencyKey',q->>'competencyKey','difficulty',q->>'difficulty','language',q->>'language')::text,'sha256'),'hex');
     select id into bank.id from public.assessment_items where organization_id=p_organization_id and content_fingerprint=keyhash and state in ('approved','active') limit 1;
     if bank.id is null then
      insert into public.assessment_item_families(organization_id,family_key,competency_key,target_level,dimension) values(p_organization_id,'pa-'||keyhash,q->>'competencyKey','intermediate','contextual') on conflict(organization_id,family_key) do update set family_key=excluded.family_key returning id into family;
      insert into public.assessment_items(organization_id,family_id,item_key,version,competency_key,target_level,dimension,state,source,language,stem,options,answer_key,explanation,defined_difficulty,content_fingerprint,provenance,human_approved_by_auth_user_id,human_approved_at)
      values(p_organization_id,family,'pa-'||keyhash,'position-assessment-item-1.0.0',q->>'competencyKey','intermediate','contextual','approved','organization','pt-BR',q->>'stem',q->'options',jsonb_build_object('correctOptionId',q->>'correctOptionId'),q->>'explanation',case q->>'difficulty' when 'easy' then 'low' when 'hard' then 'high' else 'medium' end,keyhash,q->'provenance',actor,now());
     end if;
    end if;
   end if;
   newqs:=newqs||jsonb_build_array(q);
  end loop;
  update public.position_assessments set questions=newqs,revision=revision+1,updated_at=now() where id=a.id returning * into a;
 elsif p_action='ready' then
  if not private.pa_ready(a) then raise exception 'PA_REVIEW_REQUIRED' using errcode='22023'; end if;
  update public.position_assessments set status='ready',revision=revision+1,updated_at=now() where id=a.id returning * into a;
 elsif p_action='cancel' then
  update public.position_assessments set status='cancelled',revision=revision+1,updated_at=now() where id=a.id returning * into a;
  update public.position_assessment_attempts set status='cancelled' where assessment_id=a.id and status<>'submitted';
  update public.position_assessment_deliveries d set state='cancelled' where d.attempt_id in (select id from public.position_assessment_attempts where assessment_id=a.id) and state<>'sent';
 end if;
 insert into public.verification_audit_events(organization_id,actor_auth_user_id,action,result,payload)
 values(p_organization_id,actor,'position_assessment_'||p_action,'success',jsonb_build_object('assessmentId',a.id,'revision',a.revision,'contract',a.contract_version));
 return to_jsonb(a);
end $$;

create function public.position_assessment_bank(p_organization_id uuid,p_assessment_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare a public.position_assessments; begin
 perform private.authorize_position_follow_up(p_organization_id);
 select * into a from public.position_assessments where id=p_assessment_id and organization_id=p_organization_id;
 if not found then raise exception 'PA_NOT_FOUND' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('organizationId',p_organization_id,'id',i.id,'version',i.version,'requirementId',r->>'id','competencyKey',i.competency_key,
 'difficulty',case i.defined_difficulty when 'low' then 'easy' when 'high' then 'hard' else 'medium' end,'language',i.language,'stem',i.stem,'options',i.options,
 'correctOptionId',i.answer_key->>'correctOptionId','explanation',i.explanation,'source','bank','review','pending','provenance',jsonb_build_object('method','approved-item-bank','version',i.version,'authorId',i.human_approved_by_auth_user_id)))
 from public.assessment_items i join lateral jsonb_array_elements(a.requirements) r on r->>'competencyKey'=i.competency_key
 where (i.organization_id=p_organization_id or i.organization_id is null) and i.state in ('approved','active') and i.human_approved_at is not null and i.language='pt-BR' and jsonb_array_length(i.options)=5),'[]');
end $$;

create function public.position_assessment_invite(p_organization_id uuid,p_assessment_id uuid,p_request_key uuid,p_recipient text,p_subject text,p_message text,p_expires_at timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare a public.position_assessments; d public.position_assessment_deliveries; actor uuid; token text; t uuid; begin
 actor:=private.authorize_position_follow_up(p_organization_id);
 select * into a from public.position_assessments where id=p_assessment_id and organization_id=p_organization_id for update;
 if not found then raise exception 'PA_NOT_FOUND' using errcode='42501'; end if;
 select * into d from public.position_assessment_deliveries where organization_id=p_organization_id and request_key=p_request_key;
 if found then
  if d.recipient is distinct from p_recipient or d.subject is distinct from p_subject or d.message is distinct from p_message or not exists(select 1 from public.position_assessment_attempts where id=d.attempt_id and assessment_id=a.id and expires_at=p_expires_at) then raise exception 'PA_INVITE_CONFLICT' using errcode='40001'; end if;
  return jsonb_build_object('deliveryId',d.id,'attemptId',d.attempt_id,'state',d.state);
 end if;
 if a.status<>'ready' or not private.pa_ready(a) then raise exception 'PA_REVIEW_REQUIRED' using errcode='22023'; end if;
 if p_request_key is null or p_recipient is null or p_recipient !~ '^[^[:space:]<>@,;]+@[^[:space:]<>@,;]+\.[^[:space:]<>@,;]+$' or length(p_recipient)>254
 or coalesce(trim(p_subject),'')='' or length(p_subject)>200 or p_subject ~ '[\r\n]' or coalesce(trim(p_message),'')='' or length(p_message)>4000
 or p_expires_at is null or p_expires_at<=now() or p_expires_at>now()+interval '90 days' then raise exception 'PA_INVITE_INVALID' using errcode='22023'; end if;
 token:=encode(extensions.gen_random_bytes(32),'hex');
 insert into public.position_assessment_attempts(organization_id,assessment_id,token_hash,expires_at) values(p_organization_id,a.id,encode(extensions.digest(token,'sha256'),'hex'),p_expires_at) returning id into t;
 insert into public.position_assessment_deliveries(organization_id,attempt_id,request_key,requested_by,recipient,subject,message,token_cipher)
 values(p_organization_id,t,p_request_key,actor,p_recipient,p_subject,p_message,extensions.pgp_sym_encrypt(token,(select value from private.position_assessment_key),'cipher-algo=aes256')) returning * into d;
 update public.position_assessments set status='issued',revision=revision+1,updated_at=now() where id=a.id;
 insert into public.verification_audit_events(organization_id,actor_auth_user_id,action,result,payload) values(p_organization_id,actor,'position_assessment_invite_requested','success',jsonb_build_object('assessmentId',a.id,'deliveryId',d.id,'attemptId',t,'recipientOverridden',p_recipient is distinct from (select pd.email from public.person_private_data pd where pd.organization_id=p_organization_id and pd.person_id=a.person_id)));
 return jsonb_build_object('deliveryId',d.id,'attemptId',t,'state',d.state);
end $$;

create function public.position_assessment_public(p_action text,p_token_hash text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
<<pa_access>>
declare t public.position_assessment_attempts; a public.position_assessments; q jsonb; answers jsonb; marked jsonb; answer text; result jsonb; correct integer:=0; event jsonb; kind text; eid uuid; ev public.position_assessment_events; limit_at timestamptz; allowed text[];
begin
 if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' or p_action not in ('load','start','save','submit','events') or p_action is null then raise exception 'PA_TOKEN_INVALID' using errcode='42501'; end if;
 select * into t from public.position_assessment_attempts where token_hash=p_token_hash for update;
 if not found or t.status='cancelled' then raise exception 'PA_TOKEN_INVALID' using errcode='42501'; end if;
 select * into a from public.position_assessments where organization_id=t.organization_id and id=t.assessment_id;
 if a.status<>'issued' then raise exception 'PA_TOKEN_INVALID' using errcode='42501'; end if;
 limit_at:=least(t.expires_at,coalesce(t.started_at+make_interval(mins=>(a.config->>'durationMinutes')::integer),t.expires_at));
 if t.status<>'submitted' and now()>=limit_at then raise exception 'PA_EXPIRED' using errcode='22023'; end if;
 if p_action='start' then
  if t.status='invited' then update public.position_assessment_attempts set status='started',started_at=now(),revision=revision+1 where id=t.id returning * into t;
   insert into public.position_assessment_audit(organization_id,attempt_id,actor_kind,action,payload) values(t.organization_id,t.id,'participant','started','{}');
  end if;
 elsif p_action in ('save','submit') then
  if t.status='submitted' and p_action='submit' then return jsonb_build_object('contract',a.contract_version,'status','submitted','submittedAt',t.submitted_at,'receiptId',t.id); end if;
  if t.status<>'started' then raise exception 'PA_ATTEMPT_STATE' using errcode='22023'; end if;
  if (p_payload->>'revision')::integer is distinct from t.revision then
   if p_action='save' and (p_payload->>'revision')::integer=t.revision-1 and p_payload->'answers'=t.answers and p_payload->'marked'=t.marked then
    p_action:='load';
   else raise exception 'PA_ANSWER_CONFLICT' using errcode='40001'; end if;
  end if;
  answers:=p_payload->'answers'; marked:=p_payload->'marked';
  if jsonb_typeof(answers) is distinct from 'object' or jsonb_typeof(marked) is distinct from 'array' then raise exception 'PA_ANSWERS_INVALID' using errcode='22023'; end if;
  if exists(select 1 from jsonb_object_keys(answers) k where not exists(select 1 from jsonb_array_elements(a.questions) q where q->>'id'=k))
   or exists(select 1 from jsonb_array_elements_text(marked) k where not exists(select 1 from jsonb_array_elements(a.questions) q where q->>'id'=k)) then raise exception 'PA_ANSWERS_INVALID' using errcode='22023'; end if;
  for q in select value from jsonb_array_elements(a.questions) loop
   answer:=answers->>(q->>'id');
   if answer is not null and not exists(select 1 from jsonb_array_elements(q->'options') o where o->>'id'=answer) then raise exception 'PA_ANSWERS_INVALID' using errcode='22023'; end if;
   if p_action='submit' and answer is null then raise exception 'PA_ANSWERS_INCOMPLETE' using errcode='22023'; end if;
   if answer=q->>'correctOptionId' then correct:=correct+1; end if;
  end loop;
  if p_action<>'load' then update public.position_assessment_attempts set answers=pa_access.answers,marked=pa_access.marked,revision=revision+1 where id=t.id returning * into t; end if;
  if p_action='submit' then
   result:=jsonb_build_object('correct',correct,'total',jsonb_array_length(a.questions),'method','position-assessment-objective-1.0.0',
   'requirements',(select jsonb_agg(jsonb_build_object('id',r->>'id','label',r->>'label','correct',(select count(*) from jsonb_array_elements(a.questions) q where q->>'requirementId'=r->>'id' and answers->>(q->>'id')=q->>'correctOptionId'),'total',(select count(*) from jsonb_array_elements(a.questions) q where q->>'requirementId'=r->>'id'))) from jsonb_array_elements(a.requirements) r));
   update public.position_assessment_attempts set status='submitted',result=pa_access.result,submitted_at=now() where id=t.id returning * into t;
   insert into public.position_assessment_audit(organization_id,attempt_id,actor_kind,action,payload) values(t.organization_id,t.id,'participant','submitted',jsonb_build_object('method','position-assessment-objective-1.0.0'));
  end if;
 elsif p_action='events' then
  if t.status not in ('started','submitted') or jsonb_typeof(p_payload->'events') is distinct from 'array' or jsonb_array_length(p_payload->'events')>100 then raise exception 'PA_EVENTS_INVALID' using errcode='22023'; end if;
  for event in select value from jsonb_array_elements(p_payload->'events') loop
   kind:=event->>'kind'; eid:=(event->>'eventId')::uuid;
   if kind is null or kind not in ('focus_episode','mouse_idle_before_first_choice','zoom_observed','capture_shortcut_observed','observation_gap','question_reopened','answer_changed')
    or exists(select 1 from jsonb_object_keys(event) k where k not in ('eventId','kind','questionInstanceId','questionVersion','clientAtMs','sequence','method','values'))
    or not exists(select 1 from jsonb_array_elements(a.questions) q where q->>'id'=event->>'questionInstanceId' and q->>'version'=event->>'questionVersion')
    or jsonb_typeof(event->'values') is distinct from 'object' or length((event->'values')::text)>2000 or event->>'method' not in ('position-assessment-focus-1.0.0','position-assessment-mouse-samples-1.0.0','position-assessment-browser-signals-1.0.0') or event->>'method' is null then raise exception 'PA_EVENTS_INVALID' using errcode='22023'; end if;
   allowed:=case kind when 'focus_episode' then array['durationMs','startedAtClientMs','endedAtClientMs','closedBy','limitation'] when 'mouse_idle_before_first_choice' then array['totalIdleMs','longestIdleMs','observedActiveMs','unobservedActiveMs','support','resolutionMs','closedBy','limitation'] when 'zoom_observed' then array['previousScale','scale','support','limitation'] when 'capture_shortcut_observed' then array['shortcut','support','limitation'] else array['support','limitation'] end;
   if exists(select 1 from jsonb_object_keys(event->'values') k where not(k=any(allowed))) then raise exception 'PA_EVENTS_INVALID' using errcode='22023'; end if;
   -- No arbitrary text, coordinates, keys, clipboard or image. Codes/numbers only.
   if exists(select 1 from jsonb_each(event->'values') x where jsonb_typeof(x.value) not in ('number','string','null') or (jsonb_typeof(x.value)='string' and x.value#>>'{}' !~ '^[a-zA-Z0-9_:+.-]{1,100}$') or (jsonb_typeof(x.value)='number' and not ((x.value#>>'{}')::numeric>=0 and (x.value#>>'{}')::numeric<'Infinity'::numeric))) then raise exception 'PA_EVENTS_INVALID' using errcode='22023'; end if;
   select * into ev from public.position_assessment_events where attempt_id=t.id and event_id=eid;
   if found then
    if ev.payload is distinct from event->'values' or ev.kind is distinct from kind or ev.question_id::text is distinct from event->>'questionInstanceId' or ev.question_version is distinct from event->>'questionVersion' or ev.sequence is distinct from (event->>'sequence')::bigint or ev.client_at_ms is distinct from (event->>'clientAtMs')::numeric or ev.method is distinct from event->>'method' then raise exception 'PA_EVENT_CONFLICT' using errcode='40001'; end if;
   else insert into public.position_assessment_events(organization_id,attempt_id,event_id,question_id,question_version,kind,client_at_ms,sequence,method,payload)
    values(t.organization_id,t.id,eid,(event->>'questionInstanceId')::uuid,event->>'questionVersion',kind,(event->>'clientAtMs')::numeric,(event->>'sequence')::bigint,event->>'method',event->'values'); end if;
  end loop;
 end if;
 if t.status='submitted' then return jsonb_build_object('contract',a.contract_version,'status','submitted','submittedAt',t.submitted_at,'receiptId',t.id); end if;
 return jsonb_build_object('contract',a.contract_version,'organizationId',t.organization_id,'attemptId',t.id,'revision',t.revision,'status',t.status,'expiresAt',t.expires_at,'startedAt',t.started_at,
 'deadline',least(t.expires_at,coalesce(t.started_at+make_interval(mins=>(a.config->>'durationMinutes')::integer),t.expires_at)),
 'durationMinutes',a.config->'durationMinutes','positionTitle',(select title from public.vacancy_versions where id=a.position_version_id),'personName',(select full_name from public.people where id=a.person_id and organization_id=t.organization_id),
 'questions',case when t.status='started' then (select jsonb_agg(q-'correctOptionId'-'explanation'-'approvedBy'-'provenance'-'approvedAt'-'review') from jsonb_array_elements(a.questions) q) else '[]'::jsonb end,'answers',t.answers,'marked',t.marked);
end $$;

create function public.position_assessment_delivery(p_action text,p_delivery_id uuid,p_organization_id uuid,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare d public.position_assessment_deliveries; t public.position_assessment_attempts; lease uuid; begin
 select * into d from public.position_assessment_deliveries where id=p_delivery_id and organization_id=p_organization_id for update;
 if not found then raise exception 'PA_NOT_FOUND' using errcode='42501'; end if;
 select * into t from public.position_assessment_attempts where id=d.attempt_id and organization_id=d.organization_id;
 if p_action='claim' then
  if d.state in ('sent','cancelled','reconciliation_required') or (d.lease_until>now()) then return jsonb_build_object('acquired',false,'state',d.state); end if;
  if t.status='cancelled' or t.expires_at<=now() then update public.position_assessment_deliveries set state='cancelled' where id=d.id; return jsonb_build_object('acquired',false,'state','cancelled'); end if;
  if d.first_attempt_at is not null and now()-d.first_attempt_at>=interval '23 hours 59 minutes' then update public.position_assessment_deliveries set state='reconciliation_required',error_category='RECEIPT_UNKNOWN' where id=d.id; return jsonb_build_object('acquired',false,'state','reconciliation_required'); end if;
  lease:=gen_random_uuid();
  update public.position_assessment_deliveries set first_attempt_at=coalesce(first_attempt_at,now()),state='sending',lease_id=lease,lease_until=now()+interval '90 seconds',tries=tries+1 where id=d.id returning * into d;
  return jsonb_build_object('acquired',true,'leaseId',lease,'id',d.id,'organizationId',d.organization_id,'firstAttemptAtMs',floor(extract(epoch from d.first_attempt_at)*1000),'expiresAtMs',floor(extract(epoch from t.expires_at)*1000),
  'recipient',d.recipient,'subject',d.subject,'message',d.message,'token',extensions.pgp_sym_decrypt(d.token_cipher,(select value from private.position_assessment_key)));
 elsif p_action='complete' then
  if d.lease_id is distinct from (p_payload->>'leaseId')::uuid then raise exception 'PA_LEASE_CONFLICT' using errcode='40001'; end if;
  if p_payload->>'state' is null or p_payload->>'state' not in ('sent','queued','failed','reconciliation_required') then raise exception 'PA_DELIVERY_INVALID' using errcode='22023'; end if;
  if p_payload->>'state'='sent' and p_payload->>'providerEmailId' is null then raise exception 'PA_DELIVERY_INVALID' using errcode='22023'; end if;
  if d.state='sent' then return jsonb_build_object('state','sent'); end if;
  update public.position_assessment_deliveries set state=case when d.state='cancelled' then 'cancelled' else p_payload->>'state' end,provider_email_id=(p_payload->>'providerEmailId')::uuid,error_category=p_payload->>'errorCategory',lease_until=null where id=d.id returning * into d;
  insert into public.position_assessment_audit(organization_id,attempt_id,actor_kind,action,payload) values(d.organization_id,t.id,'backend','email_'||d.state,jsonb_build_object('deliveryId',d.id,'providerEmailId',d.provider_email_id));
  return jsonb_build_object('state',d.state);
 end if;
 raise exception 'PA_ACTION_INVALID' using errcode='22023';
end $$;

-- Explicit generation reservation serializes the monthly ceiling per organization.
create function public.position_assessment_generation_request(p_organization_id uuid,p_assessment_id uuid,p_request_id uuid,p_distribution jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare a public.position_assessments; g public.position_assessment_generation; actor uuid; total integer; d text; req jsonb; begin
 actor:=private.authorize_position_follow_up(p_organization_id);
 perform 1 from public.organizations where id=p_organization_id for update;
 select * into a from public.position_assessments where id=p_assessment_id and organization_id=p_organization_id for update;
 if not found or a.status<>'draft' or a.config->>'mode' not in ('ai','mixed') then raise exception 'PA_GENERATION_INVALID' using errcode='22023'; end if;
 select * into g from public.position_assessment_generation where id=p_request_id;
 if found then if g.organization_id<>p_organization_id or g.assessment_id<>a.id or g.distribution is distinct from p_distribution then raise exception 'PA_GENERATION_CONFLICT' using errcode='40001'; end if; return to_jsonb(g); end if;
 if exists(select 1 from public.position_assessment_generation where assessment_id=a.id and status='reserved') then raise exception 'PA_GENERATION_PENDING' using errcode='40001'; end if;
 if jsonb_typeof(p_distribution) is distinct from 'array' or (select count(distinct ((r->>'requirementId')||':'||(r->>'difficulty'))) from jsonb_array_elements(p_distribution) r)<>jsonb_array_length(p_distribution) then raise exception 'PA_GENERATION_INVALID' using errcode='22023'; end if;
 total:=0;
 for req in select value from jsonb_array_elements(p_distribution) loop
  if not exists(select 1 from jsonb_array_elements(a.requirements) r where r->>'id'=req->>'requirementId') or req->>'difficulty' is null or req->>'difficulty' not in ('easy','medium','hard') or (req->>'quantity')::integer is null or (req->>'quantity')::integer<1 then raise exception 'PA_GENERATION_INVALID' using errcode='22023'; end if;
  total:=total+(req->>'quantity')::integer;
 end loop;
 if total not between 1 and 20 then raise exception 'PA_GENERATION_INVALID' using errcode='22023'; end if;
 foreach d in array array['easy','medium','hard'] loop
  if (select coalesce(sum((r->>'quantity')::integer),0) from jsonb_array_elements(p_distribution) r where r->>'difficulty'=d)+(select count(*) from jsonb_array_elements(a.questions) q where q->>'difficulty'=d)>(a.config#>>array['distribution','counts',d])::integer then raise exception 'PA_GENERATION_DEFICIT_INVALID' using errcode='22023'; end if;
 end loop;
 if (select coalesce(sum(coalesce(actual_usd,reserved_usd)),0) from public.position_assessment_generation where organization_id=p_organization_id and created_at>=date_trunc('month',now()))+0.25>10 then raise exception 'PA_MONTHLY_BUDGET_EXCEEDED' using errcode='22023'; end if;
 insert into public.position_assessment_generation(id,organization_id,assessment_id,actor_id,revision,distribution,requirements) values(p_request_id,p_organization_id,a.id,actor,a.revision,p_distribution,a.requirements) returning * into g;
 insert into public.verification_audit_events(organization_id,actor_auth_user_id,action,result,payload) values(p_organization_id,actor,'position_assessment_generation_requested','success',jsonb_build_object('requestId',g.id,'assessmentId',a.id,'reservedUsd',0.25,'quantity',total));
 return to_jsonb(g);
end $$;

create function public.position_assessment_generation_finish(p_request_id uuid,p_organization_id uuid,p_questions jsonb,p_actual_usd numeric,p_success boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare g public.position_assessment_generation; a public.position_assessments; q jsonb; n integer; r jsonb; begin
 select * into g from public.position_assessment_generation where id=p_request_id and organization_id=p_organization_id for update;
 if not found then raise exception 'PA_NOT_FOUND' using errcode='42501'; end if;
 if g.status in ('succeeded','failed') then return jsonb_build_object('status',g.status); end if;
 if p_actual_usd is not null and not(p_actual_usd>=0 and p_actual_usd<=0.25) then raise exception 'PA_COST_INVALID' using errcode='22023'; end if;
 select * into a from public.position_assessments where id=g.assessment_id and organization_id=g.organization_id for update;
 if p_success then
  if a.status<>'draft' or a.revision<>g.revision then raise exception 'PA_GENERATION_STALE' using errcode='40001'; end if;
  if jsonb_typeof(p_questions) is distinct from 'array' or jsonb_array_length(p_questions)<>(select sum((r->>'quantity')::integer) from jsonb_array_elements(g.distribution) r) then raise exception 'PA_GENERATION_INVALID' using errcode='22023'; end if;
  for q in select value from jsonb_array_elements(p_questions) loop
   perform private.pa_validate_question(q,g.organization_id,g.requirements);
   if q->>'source'<>'ai' or q->>'review'<>'pending' or q ? 'approvedBy' then raise exception 'PA_GENERATION_INVALID' using errcode='22023'; end if;
  end loop;
  for r in select value from jsonb_array_elements(g.distribution) loop
   if (select count(*) from jsonb_array_elements(p_questions) q where q->>'requirementId'=r->>'requirementId' and q->>'difficulty'=r->>'difficulty')<>(r->>'quantity')::integer then raise exception 'PA_GENERATION_INVALID' using errcode='22023'; end if;
  end loop;
  if (select count(distinct q->>'id') from jsonb_array_elements(a.questions||p_questions) q)<>jsonb_array_length(a.questions||p_questions) then raise exception 'PA_DUPLICATE' using errcode='22023'; end if;
  update public.position_assessments set questions=questions||p_questions,revision=revision+1,updated_at=now() where id=a.id;
 end if;
 update public.position_assessment_generation set status=case when p_success then 'succeeded' else 'failed' end,actual_usd=p_actual_usd,finished_at=now() where id=g.id;
 insert into public.verification_audit_events(organization_id,actor_auth_user_id,action,result,payload) values(g.organization_id,g.actor_id,'position_assessment_generation_completed',case when p_success then 'success' else 'failure' end,jsonb_build_object('requestId',g.id,'assessmentId',a.id,'costKnown',p_actual_usd is not null));
 return jsonb_build_object('status',case when p_success then 'succeeded' else 'failed' end);
end $$;

revoke all on function private.pa_distribution(integer,integer),private.pa_validate_question(jsonb,uuid,jsonb),private.pa_ready(public.position_assessments) from public,anon,authenticated,service_role;
revoke all on function public.position_assessment_workspace(uuid,uuid,uuid),public.position_assessment_mutate(uuid,uuid,uuid,text,uuid,integer,jsonb),public.position_assessment_bank(uuid,uuid),public.position_assessment_invite(uuid,uuid,uuid,text,text,text,timestamptz),public.position_assessment_generation_request(uuid,uuid,uuid,jsonb) from public,anon,service_role;
grant execute on function public.position_assessment_workspace(uuid,uuid,uuid),public.position_assessment_mutate(uuid,uuid,uuid,text,uuid,integer,jsonb),public.position_assessment_bank(uuid,uuid),public.position_assessment_invite(uuid,uuid,uuid,text,text,text,timestamptz),public.position_assessment_generation_request(uuid,uuid,uuid,jsonb) to authenticated;
revoke all on function public.position_assessment_public(text,text,jsonb),public.position_assessment_delivery(text,uuid,uuid,jsonb),public.position_assessment_generation_finish(uuid,uuid,jsonb,numeric,boolean) from public,anon,authenticated;
grant execute on function public.position_assessment_public(text,text,jsonb),public.position_assessment_delivery(text,uuid,uuid,jsonb),public.position_assessment_generation_finish(uuid,uuid,jsonb,numeric,boolean) to service_role;
