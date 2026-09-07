begin;

create temporary table m546_context as
select membership.user_id as actor_id, membership.organization_id
from public.organization_memberships membership
where membership.role in ('owner', 'admin', 'recruiter')
order by membership.created_at
limit 1;

do $qa$
begin
  if (select count(*) from m546_context) <> 1 then raise exception 'M5.4.6 QA requires an authorized actor'; end if;
end;
$qa$;

select set_config('request.jwt.claim.sub', (select actor_id::text from m546_context), true);

create temporary table m546_saved as
select * from public.save_vacancy_definition(
  (select organization_id from m546_context), null, 'Desenvolvedor Backend QA M5.4.6',
  'Tecnologia', 'Bauru, SP', 'hybrid', 'CLT', 'vacant', null,
  'Atuar em soluções backend escaláveis.',
  '["Desenvolver e manter aplicações backend"]'::jsonb,
  '[]'::jsonb,
  jsonb_build_array(jsonb_build_object(
    'stableId', '54600000-0000-4000-8000-000000000001', 'label', 'Node.js',
    'observedTerm', 'Node.js', 'category', 'technology', 'proposedCategory', 'knowledge',
    'categoryConfirmed', true, 'importance', 'unclassified', 'importanceConfirmed', false,
    'origin', 'description', 'relationMode', 'direct', 'relatedSignals', '[]'::jsonb
  )),
  '[]'::jsonb, 'manual', null, null, null, false, 'material'
);

do $qa$
declare saved record;
begin
  select * into saved from m546_saved;
  if not exists (
    select 1 from public.vacancy_requirements requirement
    where requirement.organization_id = (select organization_id from m546_context)
      and requirement.vacancy_version_id = saved.vacancy_version_id
      and requirement.importance = 'unclassified'
      and requirement.origin = 'description'
      and requirement.proposed_category = 'knowledge'
      and requirement.category = 'technology'
  ) then raise exception 'unclassified draft requirement or provenance was not preserved'; end if;
  if not exists (
    select 1 from public.vacancy_requirement_dimension_feedback feedback
    where feedback.organization_id = (select organization_id from m546_context)
      and feedback.vacancy_version_id = saved.vacancy_version_id
      and feedback.proposed_category = 'knowledge'
      and feedback.confirmed_category = 'technology'
  ) then raise exception 'organization-scoped dimension feedback was not recorded'; end if;
  if not exists (
    select 1 from public.knowledge_inbox inbox
    where inbox.organization_id = (select organization_id from m546_context)
      and inbox.scope = 'organization' and inbox.original_term = 'Node.js'
  ) then raise exception 'existing organization Knowledge Inbox was not fed'; end if;
  if exists (
    select 1 from public.knowledge_inbox inbox where inbox.scope = 'global' and inbox.original_term = 'Node.js'
  ) then raise exception 'dimension feedback altered global Knowledge'; end if;
end;
$qa$;

select
  (select importance from public.vacancy_requirements where vacancy_version_id = (select vacancy_version_id from m546_saved)) as preserved_importance,
  not pg_catalog.has_function_privilege('anon', 'public.save_vacancy_definition(uuid,uuid,text,text,text,text,text,public.position_status,uuid,text,jsonb,jsonb,jsonb,jsonb,text,uuid,uuid,uuid,boolean,text)', 'EXECUTE') as anonymous_save_denied,
  not pg_catalog.has_table_privilege('authenticated', 'public.vacancy_requirement_dimension_feedback', 'INSERT') as direct_feedback_insert_denied;

rollback;
