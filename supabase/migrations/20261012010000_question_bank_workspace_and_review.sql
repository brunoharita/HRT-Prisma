begin;

-- Keep the established governance boundary; enrich only its authorized result.
alter function public.load_m51c_item_bank_workspace(uuid) set schema private;
alter function private.load_m51c_item_bank_workspace(uuid) rename to question_bank_workspace_before_v250;
revoke all on function private.question_bank_workspace_before_v250(uuid) from public,anon,authenticated,service_role;

create function public.load_m51c_item_bank_workspace(p_organization_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v jsonb; actor uuid; global_allowed boolean;
begin
 actor:=private.m51c_require_governance(p_organization_id,false);
 select exists(select 1 from public.platform_users where auth_user_id=actor and status::text='active' and access_profile::text='super_admin') into global_allowed;
 v:=private.question_bank_workspace_before_v250(p_organization_id);
 v:=v||jsonb_build_object('permissions',jsonb_build_object('canReview',true,'canPublishOrganization',true,'canPublishGlobal',global_allowed,'canAdminister',true));
 v:=jsonb_set(v,'{items}',coalesce((select jsonb_agg(old||jsonb_build_object(
  'familyId',i.family_id,'options',i.options,'correctOptionId',i.answer_key->>'correctOptionId','explanation',i.explanation,
  'competencyLabel',coalesce((select d.name from public.verification_definitions d where d.competency_key=i.competency_key and (d.organization_id=p_organization_id or d.organization_id is null) order by (d.organization_id is not null) desc,d.created_at desc limit 1),i.competency_key),
  'provenance',i.provenance,'approvedAt',i.human_approved_at,'approvedBy',i.human_approved_by_auth_user_id,'createdAt',i.created_at,'updatedAt',i.updated_at,
  'applicationCount',m.application_count,'excludedTechnicalIncidentCount',m.excluded_technical_incident_count,'analyticsAt',m.calculated_at,'analyticsVersion',m.analytics_version,
  'correctRate',m.correct_rate,'medianTimeSeconds',m.median_time_seconds,'p25TimeSeconds',m.p25_time_seconds,'p75TimeSeconds',m.p75_time_seconds,'omissionRate',m.omission_rate,'answerChangeRate',m.answer_change_rate,'observedDifficulty',m.observed_difficulty,'sampleKind',m.sample_kind,'analyticsReasonCodes',coalesce(m.reason_codes,'[]'::jsonb),'calibrationState',coalesce(m.calibration_state,i.calibration_state),
  'qualityFlags',coalesce((select jsonb_agg(jsonb_build_object('code',f.flag_code,'evidence',f.evidence,'createdAt',f.created_at) order by f.created_at desc) from public.assessment_item_quality_flags f where f.assessment_item_id=i.id and f.status='open' and (f.organization_id=p_organization_id or f.organization_id is null)),'[]'::jsonb)
 ) order by i.created_at desc,i.id) from jsonb_array_elements(v->'items') old join public.assessment_items i on i.id=(old->>'id')::uuid
 left join lateral(select * from public.assessment_item_calibration_snapshots s where s.assessment_item_id=i.id and s.organization_id=p_organization_id order by s.calculated_at desc,s.id desc limit 1) m on true),'[]'::jsonb));
 v:=jsonb_set(v,'{gaps}',coalesce((select jsonb_agg(old||jsonb_build_object('blueprintName',d.name,'competencyLabel',d.name,'compositionItems',greatest((old->>'requiredItems')::integer-2,0),'diversityReserve',2,'generationNeedId',
  (select n.id from public.assessment_item_generation_needs n where n.organization_id=p_organization_id and n.blueprint_id=b.id and n.dimension=old->>'dimension' and n.status in ('open','requested','failed') order by n.created_at desc limit 1))
  order by d.name,old->>'dimension') from jsonb_array_elements(v->'gaps') old join public.assessment_blueprints b on b.id=(old->>'blueprintId')::uuid join public.verification_definitions d on d.id=b.definition_id),'[]'::jsonb));
 v:=jsonb_set(v,'{requests}',coalesce((select jsonb_agg(old||jsonb_build_object('competencyKey',n.competency_key,'competencyLabel',d.name,'blueprintName',d.name,'producedQuantity',(select count(*) from public.assessment_item_generation_proposals p where p.organization_id=p_organization_id and p.generation_request_id=r.id),'errorClass',(select l.usage_metadata->>'errorClass' from public.assessment_ai_budget_ledger l where l.organization_id=p_organization_id and l.generation_request_id=r.id and l.usage_metadata ? 'errorClass' order by l.created_at desc,l.id desc limit 1)) order by r.created_at desc,r.id)
  from jsonb_array_elements(v->'requests') old join public.assessment_item_generation_requests r on r.id=(old->>'id')::uuid join public.assessment_item_generation_needs n on n.organization_id=p_organization_id and n.id=r.generation_need_id join public.assessment_blueprints b on b.id=n.blueprint_id join public.verification_definitions d on d.id=b.definition_id),'[]'::jsonb));
 v:=jsonb_set(v,'{proposals}',coalesce((select jsonb_agg(old||jsonb_build_object('targetScope',r.target_scope,'competencyLabel',d.name,'reviews',coalesce((select jsonb_agg(jsonb_build_object('decision',h.decision,'rationale',h.rationale,'actorId',h.reviewer_auth_user_id,'createdAt',h.created_at,'version',h.review_version) order by h.created_at desc,h.id desc) from public.assessment_item_generation_reviews h where h.proposal_id=p.id and h.organization_id=p_organization_id),'[]'::jsonb)) order by p.created_at desc,p.id)
  from jsonb_array_elements(v->'proposals') old join public.assessment_item_generation_proposals p on p.id=(old->>'id')::uuid join public.assessment_item_generation_requests r on r.organization_id=p_organization_id and r.id=p.generation_request_id join public.assessment_item_generation_needs n on n.organization_id=p_organization_id and n.id=r.generation_need_id join public.assessment_blueprints b on b.id=n.blueprint_id join public.verification_definitions d on d.id=b.definition_id),'[]'::jsonb));
 return v;
end $$;
revoke all on function public.load_m51c_item_bank_workspace(uuid) from public,anon,authenticated,service_role;
grant execute on function public.load_m51c_item_bank_workspace(uuid) to authenticated;

-- Historical M5.1C permits 2..6 choices; process-specific items retain their five-choice contract.
create function private.question_bank_valid_content(q jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare options jsonb;
begin
 options:=q->'options';
 if jsonb_typeof(options) is distinct from 'array' then return false;end if;
 return coalesce(jsonb_array_length(options) between 2 and 6 and length(trim(coalesce(q->>'stem','')))>0 and length(trim(coalesce(q->>'explanation','')))>0
  and (select count(distinct o->>'id')=jsonb_array_length(options) and count(*) filter(where length(trim(coalesce(o->>'label','')))>0 and length(trim(coalesce(o->>'id','')))>0)=jsonb_array_length(options) and bool_or(o->>'id'=q->>'correctOptionId') from jsonb_array_elements(options) o),false);
end $$;
revoke all on function private.question_bank_valid_content(jsonb) from public,anon,authenticated,service_role;

create or replace function public.review_m51c_item_proposal(p_proposal_id uuid,p_decision text,p_rationale text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid; p public.assessment_item_generation_proposals; r public.assessment_item_generation_requests; reason text:=trim(coalesce(p_rationale,'')); next_status text;
begin
 if p_decision is null or p_decision not in ('approve','reject','request_changes') then raise exception 'M51C_INVALID_REVIEW';end if;
 select * into p from public.assessment_item_generation_proposals where id=p_proposal_id for update;
 if not found then raise exception 'M51C_PROPOSAL_NOT_FOUND';end if;
 select * into r from public.assessment_item_generation_requests where organization_id=p.organization_id and id=p.generation_request_id;
 actor:=private.m51c_require_governance(p.organization_id,r.target_scope='global');
 if p.status in ('published','rejected','superseded') then raise exception 'M51C_PROPOSAL_LOCKED';end if;
 if p_decision<>'approve' and length(reason)<10 then raise exception 'M51C_REVIEW_REASON_REQUIRED';end if;
 if p_decision='approve' then
  if (p.validation_result->>'valid')::boolean is distinct from true or not private.question_bank_valid_content(p.proposed_item) then raise exception 'M51C_INVALID_PROPOSAL_CONTENT';end if;
  if (p.status='duplicate_candidate' or p.validation_result->'reasonCodes' ?| array['EXACT_DUPLICATE_REVIEW_REQUIRED','STRONG_SIMILARITY_REVIEW_REQUIRED']) and length(reason)<10 then raise exception 'M51C_EXCEPTION_REASON_REQUIRED';end if;
  if p.status='approved' then return jsonb_build_object('proposalId',p.id,'status','approved','replayed',true);end if;
 end if;
 next_status:=case p_decision when 'approve' then 'approved' when 'reject' then 'rejected' else 'in_review' end;
 insert into public.assessment_item_generation_reviews(organization_id,proposal_id,reviewer_auth_user_id,decision,rationale,reviewed_snapshot,review_version)
 values(p.organization_id,p.id,actor,p_decision,reason,p.proposed_item,'question-bank-human-review-2.0.0');
 update public.assessment_item_generation_proposals set status=next_status,updated_at=now() where id=p.id;
 insert into public.verification_audit_events(organization_id,actor_auth_user_id,action,result,payload) values(p.organization_id,actor,'m51c_item_proposal_reviewed','success',jsonb_build_object('proposal_id',p.id,'decision',p_decision,'reviewVersion','question-bank-human-review-2.0.0'));
 return jsonb_build_object('proposalId',p.id,'status',next_status,'replayed',false);
end $$;

alter function public.publish_m51c_approved_proposals(uuid,uuid[]) set schema private;
alter function private.publish_m51c_approved_proposals(uuid,uuid[]) rename to question_bank_publish_before_v250;
revoke all on function private.question_bank_publish_before_v250(uuid,uuid[]) from public,anon,authenticated,service_role;
create function public.publish_m51c_approved_proposals(p_organization_id uuid,p_proposal_ids uuid[]) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform private.m51c_require_governance(p_organization_id,false);
 if coalesce(cardinality(p_proposal_ids),0)=0 or cardinality(p_proposal_ids)<>(select count(distinct x) from unnest(p_proposal_ids) x) then raise exception 'M51C_NO_PROPOSALS_SELECTED';end if;
 perform 1 from public.assessment_item_generation_proposals where organization_id=p_organization_id and id=any(p_proposal_ids) order by id for update;
 if exists(select 1 from public.assessment_item_generation_proposals where organization_id=p_organization_id and id=any(p_proposal_ids) and status<>'published' and ((validation_result->>'valid')::boolean is distinct from true or not private.question_bank_valid_content(proposed_item))) then raise exception 'M51C_INVALID_PROPOSAL_CONTENT';end if;
 return private.question_bank_publish_before_v250(p_organization_id,p_proposal_ids);
end $$;
revoke all on function public.publish_m51c_approved_proposals(uuid,uuid[]) from public,anon,authenticated,service_role;
grant execute on function public.publish_m51c_approved_proposals(uuid,uuid[]) to authenticated;

create function public.approve_and_publish_question_bank_proposal(p_organization_id uuid,p_proposal_id uuid,p_rationale text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.assessment_item_generation_proposals;
begin
 perform private.m51c_require_governance(p_organization_id,false);
 select * into p from public.assessment_item_generation_proposals where id=p_proposal_id and organization_id=p_organization_id for update;
 if not found then raise exception 'M51C_PROPOSAL_SCOPE_MISMATCH';end if;
 if p.status<>'published' then perform public.review_m51c_item_proposal(p.id,'approve',p_rationale);end if;
 return public.publish_m51c_approved_proposals(p_organization_id,array[p.id]);
end $$;
revoke all on function public.approve_and_publish_question_bank_proposal(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.approve_and_publish_question_bank_proposal(uuid,uuid,text) to authenticated;

create function public.prepare_question_bank_generation(p_organization_id uuid,p_blueprint_id uuid,p_dimension text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare w jsonb; gap jsonb; need uuid;
begin
 perform private.m51c_require_governance(p_organization_id,false);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text||p_blueprint_id::text||p_dimension,0));
 w:=public.load_m51c_item_bank_workspace(p_organization_id);
 select x into gap from jsonb_array_elements(w->'gaps') x where x->>'blueprintId'=p_blueprint_id::text and x->>'dimension'=p_dimension;
 if gap is null or (gap->>'deficit')::integer<1 then raise exception 'M51C_GENERATION_NEED_NOT_AVAILABLE';end if;
 select id into need from public.assessment_item_generation_needs where organization_id=p_organization_id and blueprint_id=p_blueprint_id and dimension=p_dimension and status in ('open','requested','generating','generated','under_review','partially_approved','failed') order by (status<>'failed') desc,created_at desc limit 1 for update;
 if exists(select 1 from public.assessment_item_generation_needs where id=need and status in ('generating','generated','under_review','partially_approved')) then raise exception 'M51C_PENDING_PROPOSALS_REVIEW_REQUIRED';end if;
 if need is null then
  insert into public.assessment_item_generation_needs(organization_id,blueprint_id,competency_key,target_level,dimension,modality,language,required_items,eligible_items,deficit,reason_codes,created_by_auth_user_id)
  values(p_organization_id,p_blueprint_id,gap->>'competencyKey',gap->>'targetLevel',p_dimension,gap->>'modality',gap->>'language',(gap->>'requiredItems')::integer,(gap->>'eligibleItems')::integer,(gap->>'deficit')::integer,gap->'reasonCodes',auth.uid()) returning id into need;
 else
  update public.assessment_item_generation_needs set required_items=(gap->>'requiredItems')::integer,eligible_items=(gap->>'eligibleItems')::integer,deficit=(gap->>'deficit')::integer,updated_at=now() where id=need;
 end if;
 return jsonb_build_object('generationNeedId',need,'deficit',gap->'deficit');
end $$;
revoke all on function public.prepare_question_bank_generation(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.prepare_question_bank_generation(uuid,uuid,text) to authenticated;

-- Administrative synthetic generation reuses a concrete existing need; history stays intact.
create or replace function public.create_m51c_fake_generation_request(
  p_organization_id uuid,
  p_blueprint_id uuid,
  p_dimension text,
  p_quantity integer,
  p_target_scope text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  blueprint record;
  eligible_count integer;
  target_count integer;
  need public.assessment_item_generation_needs;
  request_record public.assessment_item_generation_requests;
  replay_proposal_count integer;
  sequence integer;
  item_payload jsonb;
  stem_value text;
begin
  if p_target_scope not in ('global', 'organization') or p_quantity not between 1 and 20
    or p_idempotency_key is null or trim(p_idempotency_key) = '' then
    raise exception 'M51C_INVALID_REQUEST';
  end if;
  actor_id := private.m51c_require_governance(p_organization_id, p_target_scope = 'global');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text || ':' || p_idempotency_key, 0));
  select * into request_record from public.assessment_item_generation_requests
  where organization_id = p_organization_id and idempotency_key = p_idempotency_key;
  if request_record.id is not null then
    if request_record.target_scope <> p_target_scope or request_record.requested_quantity <> p_quantity then
      raise exception 'M51C_IDEMPOTENCY_CONFLICT';
    end if;
    select count(*)::integer into replay_proposal_count from public.assessment_item_generation_proposals
    where organization_id = p_organization_id and generation_request_id = request_record.id;
    return jsonb_build_object('requestId', request_record.id, 'proposalCount', replay_proposal_count,
      'provider', request_record.provider, 'costCents', coalesce(request_record.actual_cost_cents, 0), 'replayed', true);
  end if;

  select bp.*, definition.competency_key, definition.target_level into blueprint
  from public.assessment_blueprints bp
  join public.verification_definitions definition on definition.id = bp.definition_id
  where bp.id = p_blueprint_id and bp.status = 'active'
    and (bp.organization_id is null or bp.organization_id = p_organization_id);
  if blueprint.id is null then raise exception 'M51C_BLUEPRINT_NOT_FOUND'; end if;
  select coalesce((value ->> 'count')::integer, 0) + 2 into target_count
  from jsonb_array_elements(blueprint.dimension_distribution)
  where value ->> 'dimension' = p_dimension;
  if target_count is null then raise exception 'M51C_DIMENSION_NOT_IN_BLUEPRINT'; end if;
  select count(*)::integer into eligible_count from public.assessment_items item
  where item.state = 'active' and item.competency_key = blueprint.competency_key
    and item.target_level = blueprint.target_level and item.dimension = p_dimension
    and item.modality = blueprint.modality and item.language = blueprint.language
    and (item.organization_id is null or item.organization_id = p_organization_id);
  if target_count - eligible_count <= 0 then raise exception 'M51C_NO_GAP_TO_GENERATE'; end if;
  if p_quantity > target_count - eligible_count then raise exception 'M51C_QUANTITY_EXCEEDS_GAP'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text || p_blueprint_id::text || p_dimension, 0));
  select * into need from public.assessment_item_generation_needs where organization_id=p_organization_id and blueprint_id=p_blueprint_id and dimension=p_dimension and status in ('open','requested','generating','generated','under_review','partially_approved') order by created_at desc limit 1 for update;
  if need.status='generating' then raise exception 'M51C_GENERATION_IN_PROGRESS'; end if;
  if need.id is null then
  insert into public.assessment_item_generation_needs (
    organization_id, blueprint_id, competency_key, target_level, dimension, modality, language,
    required_items, eligible_items, deficit, reason_codes, status, created_by_auth_user_id
  ) values (
    p_organization_id, blueprint.id, blueprint.competency_key, blueprint.target_level, p_dimension,
    blueprint.modality, blueprint.language, target_count, eligible_count, target_count - eligible_count,
    jsonb_build_array('ELIGIBLE_ITEM_COVERAGE_GAP', 'QA_FAKE_PROVIDER_ALLOWED'), 'requested', actor_id
  ) returning * into need;
  end if;
  insert into public.assessment_item_generation_requests (
    organization_id, generation_need_id, target_scope, requested_quantity, directives, provider,
    model, status, estimated_cost_cents, actual_cost_cents, prompt_version, idempotency_key,
    created_by_auth_user_id, completed_at
  ) values (
    p_organization_id, need.id, p_target_scope, p_quantity,
    jsonb_build_array('synthetic_qa_only', 'no_pii', 'no_web_search'), 'fake-deterministic',
    'not-applicable-no-llm', 'completed', 0, 0, 'm51c-fake-item-generation-1.0.0',
    p_idempotency_key, actor_id, now()
  ) returning * into request_record;

  for sequence in 1..p_quantity loop
    stem_value := '[QA sintético] Cenário ' || sequence || ' de ' || p_dimension
      || ': qual alternativa atende ao objetivo com maior consistência?';
    item_payload := jsonb_build_object(
      'key', 'M51C-' || upper(blueprint.competency_key) || '-' || upper(replace(p_dimension, ' ', '-')) || '-'
        || right(replace(request_record.id::text, '-', ''), 8) || '-' || sequence,
      'competencyKey', blueprint.competency_key,
      'targetLevel', blueprint.target_level,
      'dimension', p_dimension,
      'difficulty', case blueprint.target_level when 'advanced' then 'high' when 'intermediate' then 'medium' else 'low' end,
      'language', blueprint.language,
      'modality', blueprint.modality,
      'stem', stem_value,
      'options', jsonb_build_array(
        jsonb_build_object('id', 'A', 'label', '[QA] Alternativa A'),
        jsonb_build_object('id', 'B', 'label', '[QA] Alternativa B'),
        jsonb_build_object('id', 'C', 'label', '[QA] Alternativa C'),
        jsonb_build_object('id', 'D', 'label', '[QA] Alternativa D')
      ),
      'correctOptionId', 'B',
      'explanation', '[QA sintético] A alternativa B é a referência determinística.',
      'expectedTimeMinSeconds', 60,
      'expectedTimeTypicalSeconds', 120,
      'expectedTimeMaxSeconds', 240
    );
    insert into public.assessment_item_generation_proposals (
      organization_id, generation_request_id, proposal_sequence, proposed_item,
      content_fingerprint, validation_result, provider_provenance
    ) values (
      p_organization_id, request_record.id, sequence, item_payload,
      private.m51c_item_fingerprint(stem_value),
      jsonb_build_object('valid', true, 'reasonCodes', jsonb_build_array('SCHEMA_VALID')),
      jsonb_build_object(
        'provider', 'fake-deterministic', 'model', 'not-applicable-no-llm', 'synthetic', true,
        'promptVersion', 'm51c-fake-item-generation-1.0.0', 'schemaVersion', 'm51c-item-proposal-1.0.0'
      )
    );
  end loop;
  insert into public.verification_audit_events (organization_id, actor_auth_user_id, action, result, payload)
  values (
    p_organization_id, actor_id, 'm51c_fake_generation_completed', 'success',
    jsonb_build_object('request_id', request_record.id, 'quantity', p_quantity, 'cost_cents', 0)
  );
  return jsonb_build_object(
    'requestId', request_record.id, 'proposalCount', p_quantity,
    'provider', request_record.provider, 'costCents', 0, 'replayed', false
  );
end;
$$;


commit;
