reset role;
set local role service_role;select set_config('request.jwt.claims','{"role":"service_role"}',true);
select public.position_assessment_public('events',repeat('c',64),jsonb_build_object('events',jsonb_build_array((select jsonb_set(jsonb_set(e,'{eventId}',to_jsonb(m83_id('cs-clipped')::text)),'{method}','"position-assessment-content-signals-1.1.0"') from cs_events where e->>'kind'='copy_action_observed'))));
reset role;
select m83_assert((select count(*)=1 from public.position_assessment_events where event_id=m83_id('cs-clipped') and method='position-assessment-content-signals-1.1.0'),'clipped collector method persists question-only metadata');
select m83_assert((select count(*)=3 from public.position_assessment_events where method='position-assessment-content-signals-1.0.0'),'collector1.0 remains intact');
