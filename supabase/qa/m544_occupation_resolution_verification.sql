-- Run in Prisma-QA with a reviewer JWT. This script is intentionally read-only
-- outside its transaction and contains no Person/Profile data.
begin;

-- A: organization and Global hits are resolved before the Agent.
-- B/C: an unseen title returns pending_agent and reuses its v2 idempotency key.
-- D: Agent no-safe decision becomes needs_human_review.
-- E: human selection becomes human_reconciliation and a tenant concept.
-- F/G: only a declared absence permits a manual organization concept.
-- Security: authenticated does not execute the Agent-only completion RPC.
select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema='public' and routine_name in ('complete_occupation_resolution_agent','resolve_occupation_on_demand_v2','select_official_occupation_reference','create_manual_organization_occupation')
order by routine_name, grantee;

select relname, relrowsecurity
from pg_class where relname='occupation_resolution_attempts';

select not pg_catalog.has_function_privilege('authenticated', 'public.complete_occupation_resolution_agent(uuid,text,boolean,text)', 'EXECUTE') as authenticated_agent_completion_denied,
       pg_catalog.has_function_privilege('service_role', 'public.complete_occupation_resolution_agent(uuid,text,boolean,text)', 'EXECUTE') as service_agent_completion_allowed;

select position('professional_profiles' in pg_get_functiondef('public.resolve_occupation_on_demand_v2(uuid,text,uuid,text)'::regprocedure)) = 0 as no_profile_input,
       position('person_id' in pg_get_functiondef('public.resolve_occupation_on_demand_v2(uuid,text,uuid,text)'::regprocedure)) = 0 as no_person_input,
       position('knowledge_relations' in pg_get_functiondef('public.resolve_occupation_on_demand_v2(uuid,text,uuid,text)'::regprocedure)) = 0 as no_skill_relation_input;
rollback;
