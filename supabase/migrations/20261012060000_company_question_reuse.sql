begin;

-- Project an existing, server-persisted human decision. Never accept question payloads here.
create function private.project_company_assessment_questions(p_organization_id uuid,p_assessment_id uuid) returns integer
language plpgsql security definer set search_path='' as $$
declare a public.position_assessments; q jsonb; keyhash text; family uuid; bank_id uuid; saved integer:=0; reviewer uuid; approved_at timestamptz;
begin
 if p_organization_id is null then raise exception 'PA_CONTEXT_INVALID' using errcode='42501';end if;
 select * into a from public.position_assessments where id=p_assessment_id and organization_id=p_organization_id for update;
 if not found then raise exception 'PA_NOT_FOUND' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('company-question-bank:'||p_organization_id::text,0));
 for q in select value from jsonb_array_elements(a.questions) loop
  if q->>'review' is distinct from 'approved' or nullif(q->>'approvedBy','') is null or nullif(q->>'approvedAt','') is null then continue;end if;
  if q->>'source' is distinct from 'ai' and q->'provenance'->>'method' is distinct from 'human-edited-bank' then continue;end if;
  perform private.pa_validate_question(q,p_organization_id,a.requirements);
  reviewer:=(q->>'approvedBy')::uuid;approved_at:=(q->>'approvedAt')::timestamptz;
  if not exists(select 1 from auth.users where id=reviewer) then raise exception 'PA_REVIEW_EVIDENCE_INVALID' using errcode='22023';end if;
  keyhash:=encode(extensions.digest(jsonb_build_object('stem',lower(trim(q->>'stem')),'options',q->'options','correctOptionId',q->>'correctOptionId','explanation',q->>'explanation','competencyKey',q->>'competencyKey','difficulty',q->>'difficulty','language',q->>'language')::text,'sha256'),'hex');
  -- Preserve any existing availability decision; do not reactivate inactive/compromised content.
  select id into bank_id from public.assessment_items where organization_id=p_organization_id and content_fingerprint=keyhash order by created_at,id limit 1;
  if bank_id is null then
   insert into public.assessment_item_families(organization_id,family_key,competency_key,target_level,dimension)
   values(p_organization_id,'pa-'||keyhash,q->>'competencyKey','intermediate','contextual')
   on conflict(organization_id,family_key) do update set family_key=excluded.family_key returning id into family;
   insert into public.assessment_items(organization_id,family_id,item_key,version,competency_key,target_level,dimension,state,source,language,stem,options,answer_key,explanation,defined_difficulty,content_fingerprint,provenance,human_approved_by_auth_user_id,human_approved_at)
   values(p_organization_id,family,'pa-'||keyhash,'position-assessment-item-1.0.0',q->>'competencyKey','intermediate','contextual','approved','organization',q->>'language',q->>'stem',q->'options',jsonb_build_object('correctOptionId',q->>'correctOptionId'),q->>'explanation',case q->>'difficulty' when 'easy' then 'low' when 'hard' then 'high' else 'medium' end,keyhash,
    q->'provenance'||jsonb_build_object('bankReuseVersion','company-question-reuse-1.0.0','assessmentId',a.id,'questionId',q->>'id','questionVersion',q->>'version','humanDecisionCreated',false),reviewer,approved_at)
   on conflict(organization_id,item_key,version) do nothing returning id into bank_id;
   if bank_id is not null then saved:=saved+1;end if;
   if bank_id is null then select id into bank_id from public.assessment_items where organization_id=p_organization_id and item_key='pa-'||keyhash and version='position-assessment-item-1.0.0';end if;
  end if;
  if bank_id is null then raise exception 'PA_BANK_PROJECTION_FAILED';end if;
  if not exists(select 1 from public.verification_audit_events where organization_id=p_organization_id and action='company_question_bank_projected' and payload->>'assessmentId'=a.id::text and payload->>'questionId'=q->>'id') then
   -- Same causal author as the original review, execution explicitly attributed to backend.
   insert into public.verification_audit_events(organization_id,actor_auth_user_id,action,result,payload)
   values(p_organization_id,reviewer,'company_question_bank_projected','success',jsonb_build_object('executionKind','backend-projection','humanDecisionCreated',false,'assessmentId',a.id,'questionId',q->>'id','questionVersion',q->>'version','bankItemId',bank_id,'originalApprovedAt',approved_at,'integrationVersion','company-question-reuse-1.0.0'));
  end if;
 end loop;
 return saved;
end $$;
revoke all on function private.project_company_assessment_questions(uuid,uuid) from public,anon,authenticated,service_role;

alter function public.position_assessment_mutate(uuid,uuid,uuid,text,uuid,integer,jsonb) set schema private;
alter function private.position_assessment_mutate(uuid,uuid,uuid,text,uuid,integer,jsonb) rename to company_question_mutate_before_v251;
revoke all on function private.company_question_mutate_before_v251(uuid,uuid,uuid,text,uuid,integer,jsonb) from public,anon,authenticated,service_role;
create function public.position_assessment_mutate(p_organization_id uuid,p_vacancy_id uuid,p_person_id uuid,p_action text,p_assessment_id uuid default null,p_revision integer default null,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare v jsonb;
begin
 perform private.authorize_position_follow_up(p_organization_id);
 -- Replace optional legacy saving with the approved automatic private projection.
 v:=private.company_question_mutate_before_v251(p_organization_id,p_vacancy_id,p_person_id,p_action,p_assessment_id,p_revision,coalesce(p_payload,'{}')-'saveToBank');
 if p_action='approve' then perform private.project_company_assessment_questions(p_organization_id,(v->>'id')::uuid);end if;
 return v;
end $$;
revoke all on function public.position_assessment_mutate(uuid,uuid,uuid,text,uuid,integer,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.position_assessment_mutate(uuid,uuid,uuid,text,uuid,integer,jsonb) to authenticated;

alter function public.process_assessment_issue(uuid,uuid,integer,uuid,jsonb,text,text,timestamptz) set schema private;
alter function private.process_assessment_issue(uuid,uuid,integer,uuid,jsonb,text,text,timestamptz) rename to company_question_issue_before_v251;
revoke all on function private.company_question_issue_before_v251(uuid,uuid,integer,uuid,jsonb,text,text,timestamptz) from public,anon,authenticated,service_role;
create function public.process_assessment_issue(p_organization_id uuid,p_assessment_id uuid,p_revision integer,p_request_id uuid,p_recipients jsonb,p_subject text,p_message text,p_expires_at timestamptz) returns jsonb
language plpgsql security definer set search_path='' set lock_timeout='5s' as $$
declare v jsonb;
begin
 perform private.authorize_position_follow_up(p_organization_id);
 v:=private.company_question_issue_before_v251(p_organization_id,p_assessment_id,p_revision,p_request_id,p_recipients,p_subject,p_message,p_expires_at);
 perform private.project_company_assessment_questions(p_organization_id,p_assessment_id);
 return v;
end $$;
revoke all on function public.process_assessment_issue(uuid,uuid,integer,uuid,jsonb,text,text,timestamptz) from public,anon,authenticated,service_role;
grant execute on function public.process_assessment_issue(uuid,uuid,integer,uuid,jsonb,text,text,timestamptz) to authenticated;

-- Company generation has only a private destination, including for privileged actors.
alter function public.request_m51c_item_generation(uuid,uuid,integer,text,integer,text,uuid) set schema private;
alter function private.request_m51c_item_generation(uuid,uuid,integer,text,integer,text,uuid) rename to company_question_request_before_v251;
revoke all on function private.company_question_request_before_v251(uuid,uuid,integer,text,integer,text,uuid) from public,anon,authenticated,service_role;
create function public.request_m51c_item_generation(p_organization_id uuid,p_generation_need_id uuid,p_quantity integer,p_target_scope text,p_estimated_cost_cents integer,p_idempotency_key text,p_token_quote_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform private.m51c_require_governance(p_organization_id,false);
 if p_target_scope is distinct from 'organization' then raise exception 'QB_COMPANY_PRIVATE_REQUIRED' using errcode='22023';end if;
 return private.company_question_request_before_v251(p_organization_id,p_generation_need_id,p_quantity,p_target_scope,p_estimated_cost_cents,p_idempotency_key,p_token_quote_id);
end $$;
revoke all on function public.request_m51c_item_generation(uuid,uuid,integer,text,integer,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.request_m51c_item_generation(uuid,uuid,integer,text,integer,text,uuid) to authenticated;

alter function public.create_m51c_fake_generation_request(uuid,uuid,text,integer,text,text) set schema private;
alter function private.create_m51c_fake_generation_request(uuid,uuid,text,integer,text,text) rename to company_question_fake_before_v251;
revoke all on function private.company_question_fake_before_v251(uuid,uuid,text,integer,text,text) from public,anon,authenticated,service_role;
create function public.create_m51c_fake_generation_request(p_organization_id uuid,p_blueprint_id uuid,p_dimension text,p_quantity integer,p_target_scope text,p_idempotency_key text) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform private.m51c_require_governance(p_organization_id,false);
 if p_target_scope is distinct from 'organization' then raise exception 'QB_COMPANY_PRIVATE_REQUIRED' using errcode='22023';end if;
 return private.company_question_fake_before_v251(p_organization_id,p_blueprint_id,p_dimension,p_quantity,p_target_scope,p_idempotency_key);
end $$;
revoke all on function public.create_m51c_fake_generation_request(uuid,uuid,text,integer,text,text) from public,anon,authenticated,service_role;
grant execute on function public.create_m51c_fake_generation_request(uuid,uuid,text,integer,text,text) to authenticated;

alter function public.publish_m51c_approved_proposals(uuid,uuid[]) set schema private;
alter function private.publish_m51c_approved_proposals(uuid,uuid[]) rename to company_question_publish_before_v251;
revoke all on function private.company_question_publish_before_v251(uuid,uuid[]) from public,anon,authenticated,service_role;
create function public.publish_m51c_approved_proposals(p_organization_id uuid,p_proposal_ids uuid[]) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform private.m51c_require_governance(p_organization_id,false);
 if exists(select 1 from public.assessment_item_generation_proposals p join public.assessment_item_generation_requests r on r.id=p.generation_request_id and r.organization_id=p.organization_id where p.organization_id=p_organization_id and p.id=any(p_proposal_ids) and p.status<>'published' and r.target_scope<>'organization') then raise exception 'QB_COMPANY_PRIVATE_REQUIRED' using errcode='22023';end if;
 return private.company_question_publish_before_v251(p_organization_id,p_proposal_ids);
end $$;
revoke all on function public.publish_m51c_approved_proposals(uuid,uuid[]) from public,anon,authenticated,service_role;
grant execute on function public.publish_m51c_approved_proposals(uuid,uuid[]) to authenticated;

alter function public.load_m51c_item_bank_workspace(uuid) set schema private;
alter function private.load_m51c_item_bank_workspace(uuid) rename to company_question_workspace_before_v251;
revoke all on function private.company_question_workspace_before_v251(uuid) from public,anon,authenticated,service_role;
create function public.load_m51c_item_bank_workspace(p_organization_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform private.m51c_require_governance(p_organization_id,false);
 return jsonb_set(private.company_question_workspace_before_v251(p_organization_id),'{permissions,canPublishGlobal}','false');
end $$;
revoke all on function public.load_m51c_item_bank_workspace(uuid) from public,anon,authenticated,service_role;
grant execute on function public.load_m51c_item_bank_workspace(uuid) to authenticated;

-- Recover only actual persisted approval; never edit emitted proofs or participant data.
do $$ declare a record; begin
 for a in select id,organization_id from public.position_assessments order by organization_id,id loop
  perform private.project_company_assessment_questions(a.organization_id,a.id);
 end loop;
end $$;
commit;
