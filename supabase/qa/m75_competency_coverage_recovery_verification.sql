-- Runs after M73/M74/M72 fixtures inside the disposable transaction.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub',m73_id('owner')::text,true);
select public.request_profile_competency_normalization(m73_id('a'),m73_id('person'));
reset role;

set local role service_role;
do $$declare job jsonb;begin
  job:=public.claim_profile_competency_normalization();
  perform public.m73_assert(job is not null,'M75 retry is claimed without changing the published profile');
  perform public.m73_assert(not public.reserve_competency_normalization_call_v2((job->>'id')::uuid,(job->>'lease')::uuid,0,10),'dedicated zero cap fails closed');
  perform public.m73_assert(public.reserve_competency_normalization_call_v2((job->>'id')::uuid,(job->>'lease')::uuid,2,10),'dedicated normalization budget reserves independently');
  perform public.m73_assert(not public.reserve_competency_normalization_call_v2((job->>'id')::uuid,(job->>'lease')::uuid,2,10),'dedicated cap cannot be bypassed');
  perform public.complete_profile_competency_normalization((job->>'id')::uuid,(job->>'lease')::uuid,'[]','BUDGET_LIMITED');
end$$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub',m73_id('member')::text,true);
do $$declare projection jsonb;begin
  projection:=public.load_person_professional_evidence_map_v5(m73_id('a'),m73_id('person'));
  perform public.m73_assert(projection->>'contractVersion'='person-professional-evidence-3.1.0','M75 additive projection contract returned');
  perform public.m73_assert(projection#>>'{normalization,status}'='complete','failed retry does not replace the last complete basis');
  perform public.m73_assert(projection#>>'{normalization,latestAttempt,status}'='failed'
    and projection#>>'{normalization,latestAttempt,errorCode}'='BUDGET_LIMITED'
    and projection#>>'{normalization,latestAttempt,usedAsBasis}'='false','latest failed attempt remains explicit and separate');
  perform public.m73_assert((projection#>>'{normalization,coverage,totalItemCount}')::integer>0
    and (projection#>>'{normalization,coverage,associatedItemCount}')::integer>0
    and (projection#>>'{normalization,coverage,pendingItemCount}')::integer>0,'coverage counters describe the preserved complete result');
  perform public.m73_assert(not exists(select 1 from jsonb_array_elements(projection#>'{normalization,items}') item
    where jsonb_typeof(item->'searchTerms')<>'array'),'every pending atom exposes versioned search expressions');
  perform public.m73_assert(jsonb_array_length(projection->'associations')>0,'complete associations remain visible after failed retry');
end$$;
select set_config('request.jwt.claim.sub',m73_id('outsider')::text,true);
select public.m73_reject(format('select public.load_person_professional_evidence_map_v5(%L,%L)',m73_id('a'),m73_id('person')),'42501');
reset role;

select public.m73_assert(has_function_privilege('authenticated','public.load_person_professional_evidence_map_v5(uuid,uuid)','execute'),'authenticated can use guarded M75 read boundary');
select public.m73_assert(not has_function_privilege('anon','public.load_person_professional_evidence_map_v5(uuid,uuid)','execute'),'anon cannot read M75 projection');
select public.m73_assert(not has_function_privilege('authenticated','public.reserve_competency_normalization_call_v2(uuid,uuid,integer,integer)','execute'),'client cannot reserve provider budget');
select public.m73_assert(has_function_privilege('service_role','public.reserve_competency_normalization_call_v2(uuid,uuid,integer,integer)','execute'),'service role can reserve dedicated provider budget');
select public.m73_assert(not has_function_privilege('authenticated','public.request_current_profile_competency_normalizations()','execute'),'client cannot enqueue a cross-tenant batch');
set local role service_role;
do $$declare result jsonb;begin
  result:=public.request_current_profile_competency_normalizations();
  perform public.m73_assert((result->>'eligibleProfiles')::integer=1 and (result->>'queuedRuns')::integer=1,'service rollout queues every current profile once');
  result:=public.request_current_profile_competency_normalizations();
  perform public.m73_assert((result->>'eligibleProfiles')::integer=1 and (result->>'queuedRuns')::integer=1,'service rollout remains idempotent while queued');
end$$;
reset role;
select public.m73_assert((select profile_data='{"competencies":["Excel e Word","PMO","negociação","Termo desconhecido"]}'::jsonb from public.professional_profiles where id=m73_id('current')),'M75 never rewrites the published profile');
