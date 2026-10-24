-- 3.2.0: extend the original Knowledge owners. No new table or automatic publication.
alter table public.knowledge_inbox add column occupation_context jsonb;
alter table public.knowledge_research_runs add column lease_id uuid, add column lease_until timestamptz,
  add column attempts integer not null default 0 check(attempts between 0 and 3),add column attempt_history jsonb not null default '[]'::jsonb;
alter table public.professional_profiles add column occupation_rag_cursor integer;
alter table public.knowledge_proposals add column origin_term_id uuid references public.knowledge_terms(id) on delete restrict;
create unique index knowledge_rag_global_term_origin_idx on public.knowledge_proposals(origin_term_id)
  where scope='global' and origin_term_id is not null;

create function private.rag_clean_text(p_text text,p_max integer default 3500) returns text
language sql immutable set search_path='' as $$
 select left(btrim(regexp_replace(regexp_replace(regexp_replace(coalesce(p_text,''),
  '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}','[contato omitido]','g'),
  '\m[0-9]{3}\.?[0-9]{3}\.?[0-9]{3}-?[0-9]{2}\M','[identificador omitido]','g'),
  '(\+?55[ -]*)?\(?[0-9]{2}\)?[ -]*[0-9]{4,5}[ -]?[0-9]{4}\M','[telefone omitido]','g')),p_max)
$$;
revoke all on function private.rag_clean_text(text,integer) from public,anon,authenticated;

create function private.enqueue_occupational_rag(p_organization uuid,p_title text,p_responsibilities text,p_origin jsonb,p_actor uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare title_value text:=private.rag_clean_text(p_title,240); body_value text:=private.rag_clean_text(p_responsibilities,3500);
 fingerprint_value text; v_inbox_id uuid; normalized text; exact_count integer; exact_safe boolean;
begin
 if title_value='' or not private.prisma_actor_has_org_role(p_actor,p_organization,array['owner','admin']::public.membership_role[]) then return null; end if;
 normalized:=private.normalize_knowledge_term(title_value);
 -- Keep explicit, approved normalization and existing human decisions authoritative.
 select count(distinct c.id),bool_and(not t.ambiguous) into exact_count,exact_safe
  from public.knowledge_terms t join public.knowledge_concepts c on c.id=t.concept_id where t.normalized_term=normalized
   and t.status='approved' and c.status='approved' and c.concept_type='occupation' and (c.scope='global' or c.organization_id=p_organization) and t.scope='organization' and t.organization_id=p_organization;
 if exact_count=1 and exact_safe then return null; end if;
 if exact_count=0 then
  select count(distinct c.id),bool_and(not t.ambiguous) into exact_count,exact_safe
   from public.knowledge_terms t join public.knowledge_concepts c on c.id=t.concept_id where t.normalized_term=normalized
    and t.status='approved' and c.status='approved' and c.concept_type='occupation' and t.scope='global';
  if exact_count=1 and exact_safe then return null; end if;
 end if;
 fingerprint_value:=encode(extensions.digest(jsonb_build_array('occupational-rag-1.0.0',p_organization,normalized,body_value)::text,'sha256'),'hex');
 insert into public.knowledge_inbox(scope,organization_id,fingerprint,original_term,normalized_search_term,language,status,created_by_auth_user_id,occupation_context)
 values('organization',p_organization,fingerprint_value,title_value,normalized,'pt-BR','research_queued',p_actor,
  jsonb_build_object('contract','occupational-rag-1.0.0','responsibilities',body_value,'origin',p_origin,'input_hash',fingerprint_value))
 on conflict(scope,organization_id,fingerprint) do update set last_seen_at=now(),occurrence_count=public.knowledge_inbox.occurrence_count+1
 returning id into v_inbox_id;
 if exists(select 1 from public.knowledge_inbox i where i.id=v_inbox_id and i.status in('approved','rejected','deferred'))
  or exists(select 1 from public.knowledge_research_runs r where r.inbox_id=v_inbox_id and r.provider='local_ollama') then return v_inbox_id; end if;
 insert into public.knowledge_research_runs(inbox_id,organization_id,request_fingerprint,provider,model,prompt_version,output_schema_version,source_policy_version,status,estimated_cost_usd)
 values(v_inbox_id,p_organization,fingerprint_value,'local_ollama','pending-validation','occupational-rag-1.0.0','occupational-rag-proposal-1.0.0','knowledge-grounded-1.0.0','queued',0);
 return v_inbox_id;
end $$;
revoke all on function private.enqueue_occupational_rag(uuid,text,text,jsonb,uuid) from public,anon,authenticated;

create function public.request_occupational_rag(p_organization_id uuid,p_title text,p_responsibilities text default '') returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid; result uuid;
begin
 actor:=private.require_knowledge_admin(p_organization_id);
 if p_organization_id is null or char_length(btrim(coalesce(p_title,''))) not between 1 and 240
  or char_length(coalesce(p_responsibilities,''))>3500 then raise exception 'RAG_INPUT_INVALID' using errcode='22023'; end if;
 result:=private.enqueue_occupational_rag(p_organization_id,p_title,p_responsibilities,jsonb_build_object('kind','manual'),actor);
 return result;
end $$;
revoke all on function public.request_occupational_rag(uuid,text,text) from public,anon;
grant execute on function public.request_occupational_rag(uuid,text,text) to authenticated;

create function private.occupation_rag_vacancy_saved() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform private.enqueue_occupational_rag(new.organization_id,new.title,
  concat_ws(E'\n',new.mission,(select string_agg(case when jsonb_typeof(value)='string' then value#>>'{}' else coalesce(value->>'text',value->>'description','') end,E'\n') from jsonb_array_elements(new.responsibilities))),
  jsonb_build_object('kind','vacancy','version_id',new.id,'vacancy_id',new.vacancy_id),new.created_by_auth_user_id);
 return new;
exception when others then return new; -- optional guidance never rolls back the authoritative save.
end $$;
revoke all on function private.occupation_rag_vacancy_saved() from public,anon,authenticated;
create trigger occupation_rag_after_vacancy after insert on public.vacancy_versions for each row execute function private.occupation_rag_vacancy_saved();

create function private.occupation_rag_profile_published() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.event_type in('profile_published_merge','profile_published_replace','profile_restored') and new.result='success' then
  update public.professional_profiles set occupation_rag_cursor=-1 where id=nullif(new.metadata->>'profile_id','')::uuid
   and organization_id=new.organization_id and person_id=new.person_id and review_status='approved' and superseded_at is null;
 end if;
 return new;
exception when others then return new;
end $$;
revoke all on function private.occupation_rag_profile_published() from public,anon,authenticated;
create trigger occupation_rag_after_profile_publication after insert on public.person_ingestion_events for each row execute function private.occupation_rag_profile_published();

create function private.reconcile_occupational_profile_roles() returns void language plpgsql security definer set search_path='' as $$
declare profile public.professional_profiles; item jsonb; cursor_value integer; total integer; actor uuid; n integer;
begin
 -- Technical cursor on the original profile: resumable and bounded even above 1,000 roles. No historical backfill.
 select * into profile from public.professional_profiles p where p.occupation_rag_cursor is not null and p.review_status='approved' and p.superseded_at is null
 order by p.approved_at,p.id limit 1 for update skip locked;
 if profile.id is null then return; end if;
 actor:=profile.approved_by_auth_user_id;
 cursor_value:=profile.occupation_rag_cursor;
 total:=case when jsonb_typeof(profile.profile_data->'experiences')='array' then jsonb_array_length(profile.profile_data->'experiences') else 0 end;
 for n in 1..5 loop
  if cursor_value=-1 then
   perform private.enqueue_occupational_rag(profile.organization_id,profile.profile_data->>'professionalTitle',profile.profile_data->>'summary',
    jsonb_build_object('kind','profile','profile_id',profile.id,'field','professionalTitle'),actor);
  elsif cursor_value<total then
   item:=profile.profile_data->'experiences'->cursor_value;
   perform private.enqueue_occupational_rag(profile.organization_id,item->>'role',item->>'description',
    jsonb_build_object('kind','profile','profile_id',profile.id,'experience_index',cursor_value),actor);
  else exit; end if;
  cursor_value:=cursor_value+1;
 end loop;
 update public.professional_profiles set occupation_rag_cursor=case when cursor_value>=total then null else cursor_value end where id=profile.id;
end $$;
revoke all on function private.reconcile_occupational_profile_roles() from public,anon,authenticated;

create function public.claim_occupational_rag(p_secret text) returns jsonb language plpgsql security definer set search_path='' as $$
declare job public.knowledge_research_runs; inbox public.knowledge_inbox;
begin
 perform private.require_synthesis_worker(p_secret);
 perform private.reconcile_occupational_profile_roles();
 update public.knowledge_research_runs set status='failed',error_code='RAG_PROCESSING_INTERRUPTED',completed_at=now(),lease_id=null,lease_until=null
  where provider='local_ollama' and prompt_version='occupational-rag-1.0.0' and status='researching' and lease_until<now() and attempts>=3;
 select * into job from public.knowledge_research_runs r where r.provider='local_ollama' and r.prompt_version='occupational-rag-1.0.0'
  and r.attempts<3 and (r.status='queued' or (r.status='researching' and r.lease_until<now()))
  and exists(select 1 from public.knowledge_inbox i where i.id=r.inbox_id and (i.cooldown_until is null or i.cooldown_until<=now())) order by r.created_at limit 1 for update skip locked;
 if job.id is null then return null; end if;
 select * into inbox from public.knowledge_inbox where id=job.inbox_id for update;
 if inbox.status in('approved','rejected','deferred') or not private.prisma_actor_has_org_role(inbox.created_by_auth_user_id,inbox.organization_id,array['owner','admin']::public.membership_role[]) then
  update public.knowledge_research_runs set status='failed',error_code='RAG_AUTHORITY_OR_DECISION_CHANGED',completed_at=now(),lease_id=null,lease_until=null where id=job.id; return null;
 end if;
 update public.knowledge_research_runs set status='researching',attempts=attempts+1,lease_id=gen_random_uuid(),lease_until=now()+interval '8 minutes',error_code=null where id=job.id returning * into job;
 update public.knowledge_inbox set status='researching' where id=inbox.id;
 return jsonb_build_object('id',job.id,'lease',job.lease_id,'inboxId',inbox.id,'organizationId',inbox.organization_id,'inputHash',job.request_fingerprint,
  'context',jsonb_build_object('title',inbox.original_term,'responsibilities',inbox.occupation_context->>'responsibilities','language',inbox.language));
end $$;
revoke all on function public.claim_occupational_rag(text) from public;
grant execute on function public.claim_occupational_rag(text) to anon,authenticated;

create function public.search_occupational_rag_candidates(p_secret text,p_job_id uuid,p_lease uuid,p_terms text[]) returns jsonb
language plpgsql security definer set search_path='' as $$
declare job public.knowledge_research_runs; query_value tsquery; result jsonb;
begin
 perform private.require_synthesis_worker(p_secret);
 select * into job from public.knowledge_research_runs where id=p_job_id and lease_id=p_lease and lease_until>now() and status='researching' and provider='local_ollama';
 if job.id is null or cardinality(p_terms) not between 1 and 9 or exists(select 1 from unnest(p_terms) t where char_length(t)>240) then raise exception 'RAG_LEASE_OR_QUERY_INVALID' using errcode='42501'; end if;
 query_value:=websearch_to_tsquery('simple',(select string_agg(private.normalize_knowledge_term(t),' OR ') from unnest(p_terms) t));
 with visible as materialized (
  select c.*, coalesce((select string_agg(t.term,' ') from public.knowledge_terms t where t.concept_id=c.id and t.status='approved' and (t.scope='global' or t.organization_id=job.organization_id)),'') aliases_text
  from public.knowledge_concepts c where c.status='approved' and c.concept_type='occupation' and (c.scope='global' or c.organization_id=job.organization_id)
   and (c.scope='organization' or not exists(select 1 from public.knowledge_external_mappings m where m.concept_id=c.id)
    or exists(select 1 from public.knowledge_external_mappings m join public.knowledge_source_versions v on v.id=m.source_version_id where m.concept_id=c.id and v.import_status='published' and v.is_current))
 ), ranked as (
  select c.*,ts_rank(to_tsvector('simple',private.normalize_knowledge_term(c.canonical_label||' '||c.aliases_text||' '||c.description)),query_value) rank
  from visible c where to_tsvector('simple',private.normalize_knowledge_term(c.canonical_label||' '||c.aliases_text||' '||c.description))@@query_value
  order by case when c.scope='organization' then 0 else 1 end,rank desc,c.id limit 40
 ) select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'label',c.canonical_label,'description',left(c.description,900),'scope',c.scope,'version',c.version,
  'aliases',coalesce((select jsonb_agg(t.term) from public.knowledge_terms t where t.concept_id=c.id and t.status='approved' and (t.scope='global' or t.organization_id=job.organization_id)),'[]'::jsonb),
  'sources',coalesce((select jsonb_agg(jsonb_build_object('name',s.name,'version',v.external_version,'externalId',m.external_id,'uri',m.external_uri))
   from public.knowledge_external_mappings m join public.knowledge_sources s on s.id=m.source_id join public.knowledge_source_versions v on v.id=m.source_version_id
   where m.concept_id=c.id and v.import_status='published' and v.is_current),'[]'::jsonb)) order by case when c.scope='organization' then 0 else 1 end,c.rank desc),'[]'::jsonb) into result from ranked c;
 return result;
end $$;
revoke all on function public.search_occupational_rag_candidates(text,uuid,uuid,text[]) from public;
grant execute on function public.search_occupational_rag_candidates(text,uuid,uuid,text[]) to anon,authenticated;

create function public.complete_occupational_rag(p_secret text,p_job_id uuid,p_lease uuid,p_result jsonb,p_model text,p_duration_ms integer,p_error text default null,p_usage jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare job public.knowledge_research_runs; inbox public.knowledge_inbox; candidate jsonb; payload jsonb; target uuid;
begin
 perform private.require_synthesis_worker(p_secret);
 select * into job from public.knowledge_research_runs where id=p_job_id and lease_id=p_lease and status='researching' and provider='local_ollama' for update;
 if job.id is null or job.lease_until<now() then raise exception 'RAG_LEASE_INVALID' using errcode='42501'; end if;
 select * into inbox from public.knowledge_inbox where id=job.inbox_id for update;
 if inbox.status in('approved','rejected','deferred') or not private.prisma_actor_has_org_role(inbox.created_by_auth_user_id,inbox.organization_id,array['owner','admin']::public.membership_role[]) then raise exception 'RAG_AUTHORITY_OR_DECISION_CHANGED' using errcode='42501'; end if;
 if coalesce((p_usage->>'requests')::integer,0) not between 0 and 12 then raise exception 'RAG_USAGE_INVALID' using errcode='22023'; end if;
 update public.knowledge_research_runs set request_count=request_count+coalesce((p_usage->>'requests')::integer,0),
  input_tokens=case when coalesce((p_usage->>'complete')::boolean,false) then coalesce((p_usage->>'input_tokens')::integer,0) end,
  output_tokens=case when coalesce((p_usage->>'complete')::boolean,false) then coalesce((p_usage->>'output_tokens')::integer,0) end where id=job.id;
 if p_error is not null then
  update public.knowledge_research_runs set status=case when p_error='RAG_PROVIDER_UNAVAILABLE' and attempts<3 then 'queued' else 'failed' end,
   error_code=case when p_error ~ '^RAG_[A-Z_]{1,60}$' then p_error else 'RAG_UNAVAILABLE' end,
   attempt_history=attempt_history||jsonb_build_array(jsonb_build_object('at',now(),'error',case when p_error ~ '^RAG_[A-Z_]{1,60}$' then p_error else 'RAG_UNAVAILABLE' end,'duration_ms',greatest(0,least(p_duration_ms,600000)))),
   duration_ms=greatest(0,least(p_duration_ms,600000)),completed_at=now(),lease_id=null,lease_until=null where id=job.id;
  update public.knowledge_inbox set status=case when p_error='RAG_PROVIDER_UNAVAILABLE' and job.attempts<3 then 'research_queued'::public.knowledge_inbox_status else 'failed'::public.knowledge_inbox_status end,
   cooldown_until=case when p_error='RAG_PROVIDER_UNAVAILABLE' and job.attempts<3 then now()+interval '1 minute' end where id=inbox.id; return;
 end if;
 if p_model not in('none','qwen3:1.7b-q4_K_M','qwen3:4b-instruct-2507-q4_K_M') or (p_model='none' and p_result#>>'{rag,decision}' is distinct from 'insufficient') or p_result->>'contract' is distinct from 'occupational-rag-1.0.0'
  or p_result->>'input_hash' is distinct from job.request_fingerprint or p_result#>>'{proposed_concept,concept_type}' is distinct from 'occupation'
  or jsonb_typeof(p_result->'candidate_concepts') is distinct from 'array' then raise exception 'RAG_RESULT_INVALID' using errcode='22023'; end if;
 if p_result#>>'{rag,decision}' not in('alias','new_concept','ambiguous','insufficient')
  or char_length(coalesce(p_result#>>'{proposed_concept,canonical_label}','')) not between 1 and 240
  or char_length(coalesce(p_result#>>'{proposed_concept,description}',''))>1600
  or jsonb_array_length(p_result->'candidate_concepts')>5
  or jsonb_typeof(p_result#>'{rag,evidence}') is distinct from 'array'
  or jsonb_typeof(p_result#>'{rag,related_ids}') is distinct from 'array'
  or jsonb_typeof(p_result->'aliases') is distinct from 'array'
  or jsonb_typeof(p_result->'unresolved_questions') is distinct from 'array' then raise exception 'RAG_RESULT_INVALID' using errcode='22023'; end if;
 if p_result#>>'{rag,decision}'='alias' and not exists(select 1 from jsonb_array_elements(p_result->'candidate_concepts') c where c->>'id'=p_result#>>'{rag,target_id}')
  or p_result#>>'{rag,decision}'<>'alias' and coalesce(p_result#>>'{rag,target_id}','')<>''
  or exists(select 1 from jsonb_array_elements_text(p_result#>'{rag,related_ids}') r where not exists(select 1 from jsonb_array_elements(p_result->'candidate_concepts') c where c->>'id'=r))
  then raise exception 'RAG_REFERENCE_INVALID' using errcode='22023'; end if;
 if p_result#>>'{rag,decision}' in('alias','new_concept') and (nullif(btrim(p_result#>>'{proposed_concept,description}'),'') is null
  or not exists(select 1 from jsonb_array_elements(p_result#>'{rag,evidence}') e where e->>'source_id'='context')) then raise exception 'RAG_EVIDENCE_REQUIRED' using errcode='22023'; end if;
 for candidate in select value from jsonb_array_elements(coalesce(p_result#>'{rag,evidence}','[]'::jsonb)) loop
  if char_length(coalesce(candidate->>'quote',''))<8 or (candidate->>'source_id'='context' and position(candidate->>'quote' in inbox.occupation_context->>'responsibilities')=0)
   or (candidate->>'source_id'<>'context' and not exists(select 1 from jsonb_array_elements(p_result->'candidate_concepts') c where c->>'id'=candidate->>'source_id' and position(candidate->>'quote' in c->>'description')>0)) then raise exception 'RAG_EVIDENCE_INVALID' using errcode='22023'; end if;
 end loop;
 for candidate in select value from jsonb_array_elements(p_result->'candidate_concepts') loop
  if not exists(select 1 from public.knowledge_concepts c where c.id=(candidate->>'id')::uuid and c.status='approved' and c.concept_type='occupation'
   and c.version=(candidate->>'version')::integer and c.canonical_label=candidate->>'label' and left(c.description,900)=candidate->>'description'
   and c.scope::text=candidate->>'scope' and (c.scope='global' or c.organization_id=inbox.organization_id)) then raise exception 'RAG_CANDIDATE_CHANGED' using errcode='40001'; end if;
 end loop;
 payload:=p_result||jsonb_build_object('observed_term',inbox.original_term,'sources','[]'::jsonb);
 insert into public.knowledge_proposals(inbox_id,research_run_id,scope,organization_id,proposal_type,original_proposal,status,provider,model,prompt_version,output_schema_version,source_policy_version)
 values(inbox.id,job.id,'organization',inbox.organization_id,'create',payload,'awaiting_human_review','local_ollama',p_model,'occupational-rag-1.0.0','occupational-rag-proposal-1.0.0','knowledge-grounded-1.0.0');
 update public.knowledge_research_runs set status='proposal_ready',model=p_model,duration_ms=greatest(0,least(p_duration_ms,600000)),completed_at=now(),lease_id=null,lease_until=null,
  attempt_history=attempt_history||jsonb_build_array(jsonb_build_object('at',now(),'result','proposal_ready','model',p_model,'duration_ms',greatest(0,least(p_duration_ms,600000)))) where id=job.id;
 update public.knowledge_inbox set status='awaiting_human_review',candidate_concept_ids=coalesce((select array_agg((x->>'id')::uuid) from jsonb_array_elements(p_result->'candidate_concepts') x),'{}') where id=inbox.id;
end $$;
revoke all on function public.complete_occupational_rag(text,uuid,uuid,jsonb,text,integer,text,jsonb) from public;
grant execute on function public.complete_occupational_rag(text,uuid,uuid,jsonb,text,integer,text,jsonb) to anon,authenticated;

create function public.retry_occupational_rag(p_inbox_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare inbox public.knowledge_inbox;
begin
 select * into inbox from public.knowledge_inbox where id=p_inbox_id for update;
 if inbox.id is null or inbox.scope<>'organization' or inbox.occupation_context->>'contract' is distinct from 'occupational-rag-1.0.0' then raise exception 'RAG_INBOX_INVALID' using errcode='42501'; end if;
 perform private.require_knowledge_admin(inbox.organization_id);
 if inbox.status not in('failed','researching') then raise exception 'RAG_RETRY_NOT_AVAILABLE' using errcode='55000'; end if;
 if exists(select 1 from public.knowledge_research_runs r where r.inbox_id=inbox.id and r.lease_until>now()) then raise exception 'RAG_PROCESSING_ACTIVE' using errcode='55000'; end if;
 update public.knowledge_research_runs set status='queued',attempts=0,lease_id=null,lease_until=null where inbox_id=inbox.id and provider='local_ollama' and status in('failed','researching');
 update public.knowledge_inbox set status='research_queued',cooldown_until=null where id=inbox.id;
end $$;
revoke all on function public.retry_occupational_rag(uuid) from public,anon;
grant execute on function public.retry_occupational_rag(uuid) to authenticated;

create policy knowledge_rag_company_proposals_read on public.knowledge_proposals for select to authenticated using(
 scope='organization' and prompt_version='occupational-rag-1.0.0' and private.has_org_role(organization_id,array['owner','admin']::public.membership_role[]));

-- Keep the current publication owner and guard old clients from bypassing the new alias contribution flow.
alter function public.approve_knowledge_proposal(uuid,jsonb,text) rename to approve_knowledge_proposal_before_rag_v320;
revoke all on function public.approve_knowledge_proposal_before_rag_v320(uuid,jsonb,text) from public,anon,authenticated;
create function public.approve_knowledge_proposal(p_proposal_id uuid,p_human_edited_proposal jsonb default null,p_decision_reason text default null)
returns table(proposal_id uuid,concept_id uuid,knowledge_version bigint,reused boolean) language plpgsql security definer set search_path='' as $$
declare proposal public.knowledge_proposals;
begin
 select * into proposal from public.knowledge_proposals where id=p_proposal_id for update;
 if proposal.origin_term_id is not null then raise exception 'RAG_ALIAS_REVIEW_REQUIRED' using errcode='22023'; end if;
 if proposal.scope='global' and proposal.original_proposal->>'origin_workflow'='occupational-rag-1.0.0' then raise exception 'RAG_GLOBAL_REVIEW_REQUIRED' using errcode='22023'; end if;
 if proposal.scope='organization' and proposal.prompt_version='occupational-rag-1.0.0' then raise exception 'RAG_COMPANY_REVIEW_REQUIRED' using errcode='22023'; end if;
 if proposal.prompt_version='occupational-rag-1.0.0' and nullif(btrim(coalesce(p_human_edited_proposal,proposal.original_proposal)#>>'{proposed_concept,description}'),'') is null then raise exception 'RAG_DESCRIPTION_REQUIRED' using errcode='22023'; end if;
 return query select * from public.approve_knowledge_proposal_before_rag_v320(p_proposal_id,p_human_edited_proposal,p_decision_reason);
end $$;
revoke all on function public.approve_knowledge_proposal(uuid,jsonb,text) from public,anon;
grant execute on function public.approve_knowledge_proposal(uuid,jsonb,text) to authenticated;

create function private.occupation_rag_local_approved() returns trigger language plpgsql security definer set search_path='' as $$
declare inbox public.knowledge_inbox; payload jsonb; ignored uuid;
begin
 if new.scope='organization' and new.proposal_type='create' and new.prompt_version='occupational-rag-1.0.0' and new.status='approved' and old.status is distinct from 'approved' then
  select * into inbox from public.knowledge_inbox where id=new.inbox_id;
  payload:=coalesce(new.human_edited_proposal,new.original_proposal);
  ignored:=private.m77_enqueue_global_contribution(inbox,new.published_concept_id,payload,new.decided_by_auth_user_id);
 end if; return new;
end $$;
revoke all on function private.occupation_rag_local_approved() from public,anon,authenticated;
create trigger occupational_rag_local_approved after update of status on public.knowledge_proposals for each row execute function private.occupation_rag_local_approved();

create function public.review_occupational_rag_proposal(p_proposal_id uuid,p_input_hash text,p_edited jsonb,p_target_id uuid default null,p_reason text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare proposal public.knowledge_proposals; inbox public.knowledge_inbox; actor uuid; payload jsonb; result record; target public.knowledge_concepts; term_id uuid; local_id uuid; related_id uuid;
begin
 select * into proposal from public.knowledge_proposals where id=p_proposal_id for update;
 if proposal.id is null or proposal.scope<>'organization' or proposal.prompt_version<>'occupational-rag-1.0.0' then raise exception 'RAG_PROPOSAL_INVALID' using errcode='42501'; end if;
 actor:=private.require_knowledge_admin(proposal.organization_id);
 if proposal.original_proposal->>'input_hash' is distinct from p_input_hash then raise exception 'RAG_SOURCE_CHANGED' using errcode='40001'; end if;
 if proposal.status='approved' then return jsonb_build_object('conceptId',proposal.published_concept_id,'reused',true); end if;
 if proposal.status<>'awaiting_human_review' or jsonb_typeof(p_edited) is distinct from 'object' then raise exception 'RAG_REVIEW_INVALID' using errcode='22023'; end if;
 if char_length(coalesce(p_edited->>'canonical_label',''))>240 or char_length(coalesce(p_edited->>'description',''))>1600
  or private.rag_clean_text(p_edited->>'canonical_label',240) is distinct from btrim(p_edited->>'canonical_label')
  or private.rag_clean_text(p_edited->>'description',1600) is distinct from btrim(p_edited->>'description') then raise exception 'RAG_EDIT_INVALID' using errcode='22023'; end if;
 payload:=proposal.original_proposal||jsonb_build_object('proposed_concept',jsonb_build_object('canonical_label',left(btrim(p_edited->>'canonical_label'),240),'concept_type','occupation','description',left(btrim(p_edited->>'description'),1600)),
  'aliases',coalesce(p_edited->'aliases','[]'::jsonb),'approved_related_ids',coalesce(p_edited->'related_ids','[]'::jsonb),'approved_target_id',p_target_id);
 if nullif(payload#>>'{proposed_concept,canonical_label}','') is null or nullif(payload#>>'{proposed_concept,description}','') is null
  or jsonb_typeof(payload->'aliases')<>'array' or jsonb_array_length(payload->'aliases')>6 then raise exception 'RAG_DESCRIPTION_REQUIRED' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements(payload->'aliases') a where jsonb_typeof(a)<>'string' or char_length(btrim(a#>>'{}')) not between 1 and 240 or private.rag_clean_text(a#>>'{}',240) is distinct from btrim(a#>>'{}')) then raise exception 'RAG_ALIAS_INVALID' using errcode='22023'; end if;
 select * into inbox from public.knowledge_inbox where id=proposal.inbox_id for update;
 if jsonb_typeof(payload->'approved_related_ids') is distinct from 'array' or jsonb_array_length(payload->'approved_related_ids')>5 then raise exception 'RAG_RELATIONS_INVALID' using errcode='22023'; end if;
 if p_target_id is not null and jsonb_array_length(payload->'approved_related_ids')>0 then raise exception 'RAG_ALIAS_RELATIONS_INVALID' using errcode='22023'; end if;
 for related_id in select value::uuid from jsonb_array_elements_text(payload->'approved_related_ids') loop
  if not exists(select 1 from public.knowledge_concepts c join jsonb_array_elements(proposal.original_proposal->'candidate_concepts') snapshot on snapshot->>'id'=c.id::text
   where c.id=related_id and c.status='approved' and c.concept_type='occupation' and c.version=(snapshot->>'version')::integer and (c.scope='global' or c.organization_id=proposal.organization_id)) then raise exception 'RAG_RELATION_CHANGED' using errcode='40001'; end if;
 end loop;
 if p_target_id is null then
  select * into result from public.approve_knowledge_proposal_before_rag_v320(proposal.id,payload,nullif(btrim(p_reason),''));
  local_id:=result.concept_id;
  insert into public.knowledge_relations(source_concept_id,target_concept_id,relation_type,scope,organization_id,provenance,status,approved_by_auth_user_id)
   select local_id,value::uuid,'related_to','organization',proposal.organization_id,jsonb_build_object('contract','occupational-rag-1.0.0','proposal_id',proposal.id,'method','human_curated'),'approved',actor
   from (select distinct value from jsonb_array_elements_text(payload->'approved_related_ids')) ids;
 else
  select * into target from public.knowledge_concepts where id=p_target_id and status='approved' and concept_type='occupation' and (scope='global' or organization_id=proposal.organization_id) for share;
  if target.id is null then raise exception 'RAG_TARGET_INVALID' using errcode='42501'; end if;
  if target.version is distinct from (p_edited->>'target_version')::integer then raise exception 'RAG_TARGET_CHANGED' using errcode='40001'; end if;
  select * into result from public.resolve_knowledge_inbox_alias(inbox.id,target.id,'organization',coalesce(nullif(btrim(p_reason),''),'Associação confirmada pelo responsável na revisão do cargo.'));
  select id into term_id from public.knowledge_terms where concept_id=target.id and organization_id=proposal.organization_id and scope='organization' and normalized_term=inbox.normalized_search_term and status='approved' order by created_at desc limit 1;
  local_id:=target.id;
  update public.knowledge_proposals set proposal_type='update',target_concept_id=target.id,status='approved',human_edited_proposal=payload,published_concept_id=local_id,decided_at=now(),decided_by_auth_user_id=actor,decision_reason=nullif(btrim(p_reason),'') where id=proposal.id;
  insert into public.knowledge_approvals(proposal_id,action,original_proposal,decided_proposal,actor_auth_user_id,reason) values(proposal.id,'edited_and_approved',proposal.original_proposal,payload,actor,nullif(btrim(p_reason),''));
  -- A local alias contributes an alias, not a duplicate local/global concept.
  insert into public.knowledge_proposals(inbox_id,scope,organization_id,origin_organization_id,origin_concept_id,origin_term_id,target_concept_id,proposal_type,original_proposal,status,prompt_version,output_schema_version,source_policy_version)
  values(inbox.id,'global',null,proposal.organization_id,null,term_id,case when target.scope='global' then target.id end,'update',
   jsonb_build_object('observed_term',inbox.original_term,'proposed_concept',jsonb_build_object('canonical_label',target.canonical_label,'concept_type','occupation','description',target.description),'aliases',jsonb_build_array(inbox.original_term),'sources','[]'::jsonb,'unresolved_questions','[]'::jsonb),
   'awaiting_human_review','occupational-rag-alias-contribution-1.0.0','knowledge-proposal-1.0.0','trusted-sources-1.0.0') on conflict(origin_term_id) where scope='global' and origin_term_id is not null do nothing;
 end if;
 return jsonb_build_object('conceptId',local_id,'reused',false);
end $$;
revoke all on function public.review_occupational_rag_proposal(uuid,text,jsonb,uuid,text) from public,anon;
grant execute on function public.review_occupational_rag_proposal(uuid,text,jsonb,uuid,text) to authenticated;

create function public.approve_occupational_global_alias(p_proposal_id uuid,p_target_id uuid default null,p_reason text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare proposal public.knowledge_proposals; actor uuid; target public.knowledge_concepts; target_id uuid; next_version bigint; change_id uuid; alias_value text; result record;
begin
 actor:=private.require_knowledge_admin(null);
 select * into proposal from public.knowledge_proposals where id=p_proposal_id and scope='global' and
  (origin_term_id is not null or original_proposal->>'origin_workflow'='occupational-rag-1.0.0') for update;
 if proposal.id is null then raise exception 'RAG_CONTRIBUTION_INVALID' using errcode='42501'; end if;
 if proposal.status='approved' then return jsonb_build_object('conceptId',proposal.published_concept_id,'reused',true); end if;
 if proposal.status<>'awaiting_human_review' then raise exception 'RAG_CONTRIBUTION_NOT_PENDING' using errcode='22023'; end if;
 if not exists(select 1 from public.knowledge_concepts c where c.status='approved' and (c.id=proposal.origin_concept_id or c.id=(select t.concept_id from public.knowledge_terms t where t.id=proposal.origin_term_id and t.organization_id=proposal.origin_organization_id and t.status='approved')))
  then raise exception 'RAG_ORIGIN_CHANGED' using errcode='40001'; end if;
 perform pg_advisory_xact_lock(hashtextextended('global|global',0));
 target_id:=coalesce(p_target_id,proposal.target_concept_id,(select q.published_concept_id from public.knowledge_proposals q where q.scope='global' and q.origin_concept_id=(select t.concept_id from public.knowledge_terms t where t.id=proposal.origin_term_id) and q.status='approved' order by q.decided_at desc limit 1));
 if target_id is null then
  select * into result from public.approve_knowledge_proposal_before_rag_v320(proposal.id,null,nullif(btrim(p_reason),''));
  return jsonb_build_object('conceptId',result.concept_id,'reused',result.reused);
 end if;
 select * into target from public.knowledge_concepts where id=target_id and scope='global' and status='approved' and concept_type='occupation';
 if target.id is null then raise exception 'RAG_GLOBAL_TARGET_INVALID' using errcode='42501'; end if;
 alias_value:=proposal.original_proposal->>'observed_term';
 if exists(select 1 from public.knowledge_terms t where t.scope='global' and t.status='approved' and t.normalized_term=private.normalize_knowledge_term(alias_value) and t.concept_id<>target.id) then raise exception 'RAG_GLOBAL_ALIAS_AMBIGUOUS' using errcode='22023'; end if;
 select coalesce(max(version),0)+1 into next_version from public.knowledge_change_sets where scope='global';
 insert into public.knowledge_change_sets(scope,organization_id,version,summary,changed_entities,approved_by_auth_user_id)
 values('global',null,next_version,'Alias aprovado por curadoria global',jsonb_build_array(jsonb_build_object('concept_id',target.id,'term',alias_value)),actor) returning id into change_id;
 insert into public.knowledge_terms(concept_id,scope,organization_id,term,normalized_term,language,term_type,status,approved_by_auth_user_id)
 select target.id,'global',null,alias_value,private.normalize_knowledge_term(alias_value),'pt-BR','alias','approved',actor
 where not exists(select 1 from public.knowledge_terms t where t.concept_id=target.id and t.scope='global' and t.normalized_term=private.normalize_knowledge_term(alias_value) and t.status='approved');
 update public.knowledge_proposals set status='approved',published_concept_id=target.id,decided_at=now(),decided_by_auth_user_id=actor,decision_reason=nullif(btrim(p_reason),'') where id=proposal.id;
 insert into public.knowledge_approvals(proposal_id,action,original_proposal,decided_proposal,actor_auth_user_id,reason) values(proposal.id,'approved',proposal.original_proposal,proposal.original_proposal,actor,nullif(btrim(p_reason),''));
 return jsonb_build_object('conceptId',target.id,'reused',false);
end $$;
revoke all on function public.approve_occupational_global_alias(uuid,uuid,text) from public,anon;
grant execute on function public.approve_occupational_global_alias(uuid,uuid,text) to authenticated;

create or replace function private.m77_enqueue_global_contribution(p_inbox public.knowledge_inbox,p_origin_concept_id uuid,p_payload jsonb,p_actor_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare proposal_id uuid;
begin
 insert into public.knowledge_proposals(inbox_id,scope,organization_id,origin_organization_id,origin_concept_id,proposal_type,original_proposal,status,prompt_version,output_schema_version,source_policy_version)
 values(p_inbox.id,'global',null,p_inbox.organization_id,p_origin_concept_id,'create',
  jsonb_build_object('observed_term',p_inbox.original_term,'proposed_concept',p_payload->'proposed_concept','aliases',p_payload->'aliases','sources','[]'::jsonb,'unresolved_questions','[]'::jsonb,
   'origin',jsonb_build_object('organization_id',p_inbox.organization_id,'concept_id',p_origin_concept_id,'created_by_auth_user_id',p_actor_id))
   ||case when p_payload->>'contract'='occupational-rag-1.0.0' then jsonb_build_object('origin_workflow','occupational-rag-1.0.0') else '{}'::jsonb end,
  'awaiting_human_review','m77-company-contribution-1.0.0','knowledge-proposal-1.0.0','trusted-sources-1.0.0')
 on conflict(origin_concept_id) where scope='global' and origin_concept_id is not null do nothing returning id into proposal_id;
 return proposal_id;
end $$;
revoke all on function private.m77_enqueue_global_contribution(public.knowledge_inbox,uuid,jsonb,uuid) from public,anon,authenticated;

create function public.load_occupational_rag_reviews(p_organization_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if p_organization_id is null then raise exception 'RAG_ORGANIZATION_REQUIRED' using errcode='42501'; end if;
 perform private.require_knowledge_admin(p_organization_id);
 select coalesce(jsonb_agg(row_value order by seen desc),'[]'::jsonb) into result from(
  select i.last_seen_at seen,jsonb_build_object('id',i.id,'title',i.original_term,'context',i.occupation_context,
   'status',case when p.id is not null then p.status::text when run.status='failed' and i.status not in('approved','rejected','deferred') then 'failed' else i.status::text end,'errorCode',run.error_code,
   'proposal',case when p.id is not null then jsonb_build_object('id',p.id,'status',p.status,'original',p.original_proposal,'edited',p.human_edited_proposal,'model',p.model,'decidedAt',p.decided_at) end,
   'globalContribution',case when g.id is not null then jsonb_build_object('id',g.id,'status',g.status) end) row_value
  from public.knowledge_inbox i
  left join lateral(select r.status,r.error_code from public.knowledge_research_runs r where r.inbox_id=i.id and r.provider='local_ollama' order by r.created_at desc limit 1) run on true
  left join lateral(select q.* from public.knowledge_proposals q where q.inbox_id=i.id and q.scope='organization' and q.organization_id=i.organization_id and q.prompt_version='occupational-rag-1.0.0' order by q.created_at desc limit 1) p on true
  left join lateral(select q.id,q.status from public.knowledge_proposals q where q.inbox_id=i.id and q.scope='global' and q.origin_organization_id=i.organization_id order by q.created_at desc limit 1) g on true
  where i.organization_id=p_organization_id and i.occupation_context->>'contract'='occupational-rag-1.0.0'
  order by i.last_seen_at desc limit 50
 ) selected;
 return result;
end $$;
revoke all on function public.load_occupational_rag_reviews(uuid) from public,anon;
grant execute on function public.load_occupational_rag_reviews(uuid) to authenticated;

create function public.prepare_occupational_manual_review(p_inbox_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare inbox public.knowledge_inbox; job public.knowledge_research_runs;
begin
 -- Same lock order as worker; explicit manual takeover invalidates its lease.
 select * into job from public.knowledge_research_runs where inbox_id=p_inbox_id and provider='local_ollama' order by created_at desc limit 1 for update;
 select * into inbox from public.knowledge_inbox where id=p_inbox_id for update;
 if inbox.id is null or inbox.scope<>'organization' or inbox.occupation_context->>'contract' is distinct from 'occupational-rag-1.0.0' then raise exception 'RAG_INBOX_INVALID' using errcode='42501'; end if;
 perform private.require_knowledge_admin(inbox.organization_id);
 if exists(select 1 from public.knowledge_proposals where inbox_id=inbox.id and prompt_version='occupational-rag-1.0.0') then return; end if;
 if job.id is null or inbox.status in('approved','rejected','deferred') then raise exception 'RAG_MANUAL_NOT_AVAILABLE' using errcode='55000'; end if;
 update public.knowledge_research_runs set status='failed',error_code='RAG_MANUAL_REVIEW_STARTED',completed_at=now(),lease_id=null,lease_until=null,
  attempt_history=attempt_history||jsonb_build_array(jsonb_build_object('at',now(),'result','manual_takeover','actor',auth.uid())) where id=job.id;
 insert into public.knowledge_proposals(inbox_id,research_run_id,scope,organization_id,proposal_type,original_proposal,status,provider,model,prompt_version,output_schema_version,source_policy_version)
 values(inbox.id,job.id,'organization',inbox.organization_id,'create',jsonb_build_object('contract','occupational-rag-1.0.0','input_hash',job.request_fingerprint,'observed_term',inbox.original_term,
  'proposed_concept',jsonb_build_object('canonical_label',inbox.original_term,'concept_type','occupation','description',''),'aliases','[]'::jsonb,'sources','[]'::jsonb,'candidate_concepts','[]'::jsonb,
  'rationale','Revisão manual solicitada pelo responsável. Nenhuma definição foi gerada.','unresolved_questions',jsonb_build_array('Descreva as responsabilidades antes de aprovar.'),
  'rag',jsonb_build_object('decision','insufficient','target_id','','related_ids','[]'::jsonb,'evidence','[]'::jsonb,'method','human_manual_review','version','occupational-rag-1.0.0')),
  'awaiting_human_review','manual','none','occupational-rag-1.0.0','occupational-rag-proposal-1.0.0','knowledge-grounded-1.0.0');
 update public.knowledge_inbox set status='awaiting_human_review' where id=inbox.id;
end $$;
revoke all on function public.prepare_occupational_manual_review(uuid) from public,anon;
grant execute on function public.prepare_occupational_manual_review(uuid) to authenticated;

create function public.load_occupational_rag_origin(p_proposal_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare proposal public.knowledge_proposals; result jsonb;
begin
 perform private.require_knowledge_admin(null);
 select * into proposal from public.knowledge_proposals where id=p_proposal_id and scope='global' and
  (origin_term_id is not null or original_proposal->>'origin_workflow'='occupational-rag-1.0.0');
 if proposal.id is null then raise exception 'RAG_ORIGIN_DENIED' using errcode='42501'; end if;
 select jsonb_build_object('companyName',o.name,'label',coalesce(t.term,c.canonical_label),'version',c.version,
  'active',c.status='approved' and (proposal.origin_term_id is null or t.status='approved')) into result
 from public.organizations o join public.knowledge_concepts c on c.id=coalesce(proposal.origin_concept_id,(select x.concept_id from public.knowledge_terms x where x.id=proposal.origin_term_id))
 left join public.knowledge_terms t on t.id=proposal.origin_term_id and t.organization_id=proposal.origin_organization_id
 where o.id=proposal.origin_organization_id;
 if result is null then raise exception 'RAG_ORIGIN_CHANGED' using errcode='40001'; end if;
 return result;
end $$;
revoke all on function public.load_occupational_rag_origin(uuid) from public,anon;
grant execute on function public.load_occupational_rag_origin(uuid) to authenticated;

-- Same metadata writer and worker credential; only the new purpose is added.
create or replace function public.record_ai_worker_history_v1(p_secret text,p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare function_name text;
begin
 if length(coalesce(p_secret,''))<40 or not exists(select 1 from private.ai_history_worker_config where token_hash=encode(extensions.digest(p_secret,'sha256'),'hex')) then raise exception 'AI_HISTORY_WORKER_DENIED' using errcode='42501'; end if;
 if p_action='open_request' then
  function_name:=p_data->>'functionName';
  if p_data->>'scope' is distinct from 'organization' or p_data->>'organizationId' is null or p_data->>'actorId' is not null then raise exception 'AI_HISTORY_WORKER_SCOPE_DENIED' using errcode='42501'; end if;
 else select r.function_name into function_name from public.ai_requests r where r.id=(p_data->>'requestId')::uuid and r.organization_id=(p_data->>'organizationId')::uuid and r.scope='organization'; end if;
 if function_name is null or function_name not in('parser_ia','profile_synthesis','occupational_rag') then raise exception 'AI_HISTORY_WORKER_FUNCTION_DENIED' using errcode='42501'; end if;
 return private.record_ai_history_v1(p_action,p_data);
end $$;
revoke all on function public.record_ai_worker_history_v1(text,text,jsonb) from public;
grant execute on function public.record_ai_worker_history_v1(text,text,jsonb) to anon,authenticated;
