-- M5.4.4: tenant-safe occupational resolution. Version 1 remains immutable;
-- version 2 closes the workflow before manual registration is permitted.
alter table public.occupation_resolution_attempts
  add column if not exists agent_output jsonb not null default '{}'::jsonb check (jsonb_typeof(agent_output) = 'object'),
  add column if not exists resolved_at timestamptz,
  add column if not exists no_official_reference_declared_at timestamptz,
  add column if not exists no_official_reference_declared_by uuid references auth.users(id) on delete restrict;

alter table public.occupation_resolution_attempts drop constraint if exists occupation_resolution_attempts_status_check;
alter table public.occupation_resolution_attempts add constraint occupation_resolution_attempts_status_check
  check (status in ('resolved','ambiguous','completed','service_unavailable','failed','pending_agent','needs_human_review','no_official_reference_declared','manual_allowed'));
alter table public.occupation_resolution_attempts drop constraint if exists occupation_resolution_attempts_decision_origin_check;
alter table public.occupation_resolution_attempts add constraint occupation_resolution_attempts_decision_origin_check
  check (decision_origin in ('existing_reconciliation','deterministic_official_resolution','agent_assisted_resolution','human_reconciliation','no_safe_decision','no_official_reference','manual_organization_concept'));
create index if not exists occupation_resolution_attempts_v2_idx on public.occupation_resolution_attempts (organization_id, normalized_term, resolver_version, created_at desc);

create or replace function public.resolve_occupation_on_demand_v2(
  p_organization_id uuid, p_observed_term text, p_vacancy_id uuid default null, p_language text default 'pt-BR'
) returns table (attempt_id uuid, resolution_status text, decision_origin text, canonical_concept_id uuid, canonical_label text, normalized_term text, candidates jsonb, ambiguity_reason text, reused boolean)
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_normalized text := private.normalize_knowledge_term(p_observed_term); v_key text;
  v_existing public.occupation_resolution_attempts; v_concept uuid; v_label text; v_candidates jsonb := '[]'::jsonb; v_attempt uuid;
begin
  if v_actor is null or not private.has_org_role(p_organization_id, array['owner','admin','recruiter']::public.membership_role[]) then raise exception 'OCCUPATION_RESOLUTION_UNAUTHORIZED'; end if;
  if v_normalized = '' or char_length(v_normalized) > 240 then raise exception 'OCCUPATION_RESOLUTION_TERM_INVALID'; end if;
  if p_vacancy_id is not null and not exists (select 1 from public.vacancies where id=p_vacancy_id and organization_id=p_organization_id) then raise exception 'OCCUPATION_RESOLUTION_VACANCY_INVALID'; end if;
  v_key := encode(extensions.digest(concat_ws('|',p_organization_id::text,coalesce(p_vacancy_id::text,''),v_normalized,p_language,'occupation-resolution-on-demand-2.0.0'),'sha256'),'hex');
  select * into v_existing from public.occupation_resolution_attempts where organization_id=p_organization_id and idempotency_key=v_key;
  if found then return query select v_existing.id,v_existing.status,v_existing.decision_origin,v_existing.canonical_occupation_concept_id,(select c.canonical_label from public.knowledge_concepts c where c.id=v_existing.canonical_occupation_concept_id),v_existing.normalized_term,v_existing.candidate_snapshot,v_existing.ambiguity_reason,true; return; end if;
  -- RF-01: organization exact term exclusively precedes global exact term.
  select c.id,c.canonical_label into v_concept,v_label from public.knowledge_terms t join public.knowledge_concepts c on c.id=t.concept_id
   where t.normalized_term=v_normalized and t.status='approved' and c.status='approved' and c.concept_type='occupation' and c.scope='organization' and c.organization_id=p_organization_id and not t.ambiguous limit 1;
  if found then
    insert into public.occupation_resolution_attempts(organization_id,vacancy_id,raw_term,normalized_term,language,resolver_version,idempotency_key,status,decision_origin,canonical_occupation_concept_id,evidence,candidate_snapshot,actor_auth_user_id,resolved_at)
    values(p_organization_id,p_vacancy_id,btrim(p_observed_term),v_normalized,p_language,'occupation-resolution-on-demand-2.0.0',v_key,'resolved','existing_reconciliation',v_concept,jsonb_build_object('contractVersion','occupation-resolution-on-demand-2.0.0','stage','organization_knowledge'),v_candidates,v_actor,now()) returning id into v_attempt;
    return query select v_attempt,'resolved','existing_reconciliation',v_concept,v_label,v_normalized,v_candidates,null,false; return;
  end if;
  -- RF-02: global exact term only after the company base misses.
  select c.id,c.canonical_label into v_concept,v_label from public.knowledge_terms t join public.knowledge_concepts c on c.id=t.concept_id
   where t.normalized_term=v_normalized and t.status='approved' and c.status='approved' and c.concept_type='occupation' and c.scope='global' and not t.ambiguous limit 1;
  if found then
    insert into public.occupation_resolution_attempts(organization_id,vacancy_id,raw_term,normalized_term,language,resolver_version,idempotency_key,status,decision_origin,canonical_occupation_concept_id,evidence,candidate_snapshot,actor_auth_user_id,resolved_at)
    values(p_organization_id,p_vacancy_id,btrim(p_observed_term),v_normalized,p_language,'occupation-resolution-on-demand-2.0.0',v_key,'resolved','deterministic_official_resolution',v_concept,jsonb_build_object('contractVersion','occupation-resolution-on-demand-2.0.0','stage','global_knowledge'),v_candidates,v_actor,now()) returning id into v_attempt;
    return query select v_attempt,'resolved','deterministic_official_resolution',v_concept,v_label,v_normalized,v_candidates,null,false; return;
  end if;
  -- Candidate snapshot is bounded and source/version identity is retained. No skills or people are read.
  select coalesce(jsonb_agg(x.candidate order by x.source_name,x.external_id),'[]'::jsonb) into v_candidates from (
    select s.name source_name, stage.external_id, jsonb_build_object('sourceName',s.name,'sourceVersion',sv.external_version,'externalId',stage.external_id,'externalUri',stage.external_uri,'label',stage.preferred_label,'description',stage.description,'reasonCode',case when private.normalize_knowledge_term(stage.preferred_label)=v_normalized then 'official_exact_label' else 'official_candidate' end) candidate
    from public.knowledge_source_stage_records stage join public.knowledge_source_versions sv on sv.id=stage.source_version_id join public.knowledge_sources s on s.id=stage.source_id
    where stage.record_kind='concept' and stage.concept_type='occupation' and stage.source_status='active' and s.name in ('ESCO','O*NET')
      and (private.normalize_knowledge_term(stage.preferred_label)=v_normalized or stage.preferred_label ilike '%' || replace(btrim(p_observed_term),'%','') || '%')
    order by s.name,stage.external_id limit 12
  ) x;
  insert into public.occupation_resolution_attempts(organization_id,vacancy_id,raw_term,normalized_term,language,resolver_version,idempotency_key,status,decision_origin,evidence,candidate_snapshot,ambiguity_reason,actor_auth_user_id)
  values(p_organization_id,p_vacancy_id,btrim(p_observed_term),v_normalized,p_language,'occupation-resolution-on-demand-2.0.0',v_key,'pending_agent','no_safe_decision',jsonb_build_object('contractVersion','occupation-resolution-on-demand-2.0.0','stage','official_snapshot'),'[]'::jsonb || v_candidates,case when jsonb_array_length(v_candidates)=0 then 'no_official_candidate' else 'agent_required' end,v_actor) returning id into v_attempt;
  return query select v_attempt,'pending_agent','no_safe_decision',null,null,v_normalized,v_candidates,'agent_required',false;
end; $$;

create or replace function public.complete_occupation_resolution_agent(p_attempt_id uuid,p_selected_external_id text default null,p_safe boolean default false,p_reason text default '') returns table (attempt_id uuid,resolution_status text,decision_origin text,canonical_concept_id uuid,canonical_label text,normalized_term text,candidates jsonb,ambiguity_reason text,reused boolean)
language plpgsql security definer set search_path='' as $$
declare a public.occupation_resolution_attempts; selected jsonb; v_concept uuid; v_label text;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'OCCUPATION_RESOLUTION_AGENT_ONLY'; end if;
  select * into a from public.occupation_resolution_attempts where id=p_attempt_id for update; if not found then raise exception 'OCCUPATION_RESOLUTION_ATTEMPT_NOT_FOUND'; end if;
  if a.status <> 'pending_agent' then return query select a.id,a.status,a.decision_origin,a.canonical_occupation_concept_id,(select c.canonical_label from public.knowledge_concepts c where c.id=a.canonical_occupation_concept_id),a.normalized_term,a.candidate_snapshot,a.ambiguity_reason,true; return; end if;
  select value into selected from jsonb_array_elements(a.candidate_snapshot) value where value->>'externalId'=p_selected_external_id limit 1;
  if p_safe and selected is not null then
    v_label := left(selected->>'label',240);
    select id into v_concept from public.knowledge_concepts where scope='organization' and organization_id=a.organization_id and concept_type='occupation' and lower(btrim(canonical_label))=lower(btrim(v_label)) and status='approved' limit 1;
    if v_concept is null then
      insert into public.knowledge_concepts(scope,organization_id,concept_type,canonical_label,description,language,status,version,provenance,created_by_auth_user_id,approved_by_auth_user_id)
      values('organization',a.organization_id,'occupation',v_label,'Referência oficial selecionada pelo fluxo de resolução ocupacional.',a.language,'approved',1,jsonb_build_object('resolutionContract','occupation-resolution-on-demand-2.0.0','source',selected),a.actor_auth_user_id,a.actor_auth_user_id) returning id into v_concept;
      insert into public.knowledge_terms(concept_id,scope,organization_id,term,normalized_term,language,term_type,status,ambiguous,version,approved_by_auth_user_id) values(v_concept,'organization',a.organization_id,a.raw_term,a.normalized_term,a.language,'canonical','approved',false,1,a.actor_auth_user_id);
    end if;
    update public.occupation_resolution_attempts set status='resolved',decision_origin='agent_assisted_resolution',canonical_occupation_concept_id=v_concept,agent_output=jsonb_build_object('safe',true,'selectedExternalId',p_selected_external_id,'reason',left(p_reason,500)),evidence=evidence || jsonb_build_object('agent','knowledge-agent-occupation-resolution-1.0.0'),resolved_at=now(),updated_at=now() where id=a.id;
    return query select a.id,'resolved','agent_assisted_resolution',v_concept,v_label,a.normalized_term,a.candidate_snapshot,null,false; return;
  end if;
  update public.occupation_resolution_attempts set status='needs_human_review',decision_origin='no_safe_decision',agent_output=jsonb_build_object('safe',false,'reason',left(p_reason,500)),ambiguity_reason='agent_no_safe_decision',updated_at=now() where id=a.id;
  return query select a.id,'needs_human_review','no_safe_decision',null,null,a.normalized_term,a.candidate_snapshot,'agent_no_safe_decision',false;
end; $$;

create or replace function public.search_official_occupation_references(p_organization_id uuid,p_attempt_id uuid,p_query text default '') returns table(source_name text,source_version text,external_id text,external_uri text,label text,description text)
language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null or not private.has_org_role(p_organization_id,array['owner','admin','recruiter']::public.membership_role[]) then raise exception 'OCCUPATION_RESOLUTION_UNAUTHORIZED'; end if;
 if not exists(select 1 from public.occupation_resolution_attempts where id=p_attempt_id and organization_id=p_organization_id and status in ('needs_human_review','pending_agent')) then raise exception 'OCCUPATION_EXPLORER_UNAVAILABLE'; end if;
 return query select x->>'sourceName',x->>'sourceVersion',x->>'externalId',x->>'externalUri',x->>'label',x->>'description' from public.occupation_resolution_attempts a cross join lateral jsonb_array_elements(a.candidate_snapshot) x where a.id=p_attempt_id and (p_query='' or x->>'label' ilike '%'||replace(p_query,'%','')||'%') limit 12;
end; $$;

create or replace function public.select_official_occupation_reference(p_organization_id uuid,p_attempt_id uuid,p_external_id text) returns uuid
language plpgsql security definer set search_path='' as $$ declare a public.occupation_resolution_attempts; picked jsonb; v_concept uuid; begin
 if auth.uid() is null or not private.has_org_role(p_organization_id,array['owner','admin','recruiter']::public.membership_role[]) then raise exception 'OCCUPATION_RESOLUTION_UNAUTHORIZED'; end if;
 select * into a from public.occupation_resolution_attempts where id=p_attempt_id and organization_id=p_organization_id for update; if not found or a.status not in ('needs_human_review','pending_agent') then raise exception 'OCCUPATION_EXPLORER_UNAVAILABLE'; end if;
 select value into picked from jsonb_array_elements(a.candidate_snapshot) value where value->>'externalId'=p_external_id limit 1; if picked is null then raise exception 'OCCUPATION_REFERENCE_INVALID'; end if;
 insert into public.knowledge_concepts(scope,organization_id,concept_type,canonical_label,description,language,status,version,provenance,created_by_auth_user_id,approved_by_auth_user_id) values('organization',p_organization_id,'occupation',left(picked->>'label',240),'Referência oficial selecionada por humano.',a.language,'approved',1,jsonb_build_object('resolutionContract','occupation-resolution-on-demand-2.0.0','source',picked),auth.uid(),auth.uid()) returning id into v_concept;
 insert into public.knowledge_terms(concept_id,scope,organization_id,term,normalized_term,language,term_type,status,ambiguous,version,approved_by_auth_user_id) values(v_concept,'organization',p_organization_id,a.raw_term,a.normalized_term,a.language,'alias','approved',false,1,auth.uid());
 update public.occupation_resolution_attempts set status='resolved',decision_origin='human_reconciliation',canonical_occupation_concept_id=v_concept,evidence=evidence||jsonb_build_object('humanSelection',picked),resolved_at=now(),updated_at=now() where id=a.id; return v_concept;
end; $$;

create or replace function public.declare_no_official_occupation_reference(p_organization_id uuid,p_attempt_id uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null or not private.has_org_role(p_organization_id,array['owner','admin','recruiter']::public.membership_role[]) then raise exception 'OCCUPATION_RESOLUTION_UNAUTHORIZED'; end if;
 update public.occupation_resolution_attempts set status='manual_allowed',decision_origin='no_official_reference',ambiguity_reason='human_declared_no_official_reference',evidence=evidence||jsonb_build_object('humanDeclaration',left(coalesce(p_reason,''),500)),no_official_reference_declared_at=now(),no_official_reference_declared_by=auth.uid(),updated_at=now() where id=p_attempt_id and organization_id=p_organization_id and status in ('needs_human_review','pending_agent');
 if not found then raise exception 'OCCUPATION_EXPLORER_UNAVAILABLE'; end if; end; $$;

create or replace function public.create_manual_organization_occupation(p_organization_id uuid,p_attempt_id uuid,p_label text) returns uuid language plpgsql security definer set search_path='' as $$ declare a public.occupation_resolution_attempts; v_concept uuid; begin
 if auth.uid() is null or not private.has_org_role(p_organization_id,array['owner','admin','recruiter']::public.membership_role[]) then raise exception 'OCCUPATION_RESOLUTION_UNAUTHORIZED'; end if;
 if char_length(btrim(p_label)) not between 1 and 240 then raise exception 'OCCUPATION_RESOLUTION_TERM_INVALID'; end if;
 select * into a from public.occupation_resolution_attempts where id=p_attempt_id and organization_id=p_organization_id for update; if not found or a.status <> 'manual_allowed' then raise exception 'OCCUPATION_MANUAL_NOT_ALLOWED'; end if;
 insert into public.knowledge_concepts(scope,organization_id,concept_type,canonical_label,description,language,status,version,provenance,created_by_auth_user_id,approved_by_auth_user_id) values('organization',p_organization_id,'occupation',btrim(p_label),'Conceito ocupacional interno da empresa.',a.language,'approved',1,jsonb_build_object('resolutionContract','occupation-resolution-on-demand-2.0.0','origin','manual_organization','officialReference',false),auth.uid(),auth.uid()) returning id into v_concept;
 insert into public.knowledge_terms(concept_id,scope,organization_id,term,normalized_term,language,term_type,status,ambiguous,version,approved_by_auth_user_id) values(v_concept,'organization',p_organization_id,btrim(p_label),private.normalize_knowledge_term(p_label),a.language,'canonical','approved',false,1,auth.uid());
 update public.occupation_resolution_attempts set status='resolved',decision_origin='manual_organization_concept',canonical_occupation_concept_id=v_concept,resolved_at=now(),updated_at=now() where id=a.id; return v_concept; end; $$;

revoke all on function public.resolve_occupation_on_demand_v2(uuid,text,uuid,text), public.search_official_occupation_references(uuid,uuid,text), public.select_official_occupation_reference(uuid,uuid,text), public.declare_no_official_occupation_reference(uuid,uuid,text), public.create_manual_organization_occupation(uuid,uuid,text), public.complete_occupation_resolution_agent(uuid,text,boolean,text) from public,anon,authenticated;
grant execute on function public.resolve_occupation_on_demand_v2(uuid,text,uuid,text), public.search_official_occupation_references(uuid,uuid,text), public.select_official_occupation_reference(uuid,uuid,text), public.declare_no_official_occupation_reference(uuid,uuid,text), public.create_manual_organization_occupation(uuid,uuid,text) to authenticated;
grant execute on function public.complete_occupation_resolution_agent(uuid,text,boolean,text) to service_role;
