-- Synthetic QA only. Runner wraps the migration and fixture in a rollback transaction.
create function public.m76_curate(
  p_action text default 'proposal', p_scope public.knowledge_scope default 'organization', p_description text default ''
) returns jsonb language sql security invoker as $$
  select public.curate_profile_competency_v4(
    public.m73_id('a'), public.m73_id('person'), public.m73_id('current'), 3, 'Termo desconhecido', 'Termo desconhecido',
    p_scope, p_action, case when p_action = 'alias' then public.m73_id('negotiation') end,
    'Conceito proposto', p_description, 'skill'
  )
$$;
grant execute on function public.m76_curate(text, public.knowledge_scope, text) to authenticated, anon;

reset role;
update public.platform_users set access_profile = 'admin' where auth_user_id = public.m73_id('owner');
insert into public.organization_memberships(organization_id, user_id, role)
values(public.m73_id('a'), public.m73_id('owner'), 'admin')
on conflict(organization_id, user_id) do update set role = 'admin';
set local role authenticated;
select set_config('request.jwt.claim.sub', public.m73_id('owner')::text, true);

savepoint description_with_value;
do $$declare result jsonb; proposal_id uuid; original jsonb;begin
  result := public.m76_curate('proposal', 'organization', 'Descrição opcional do conceito sintético.');
  proposal_id := (result->>'proposalId')::uuid;
  select original_proposal into original from public.knowledge_proposals where id = proposal_id;
  perform public.m73_assert(result->>'workflowVersion' = 'profile-competency-curation-4.0.0','M76 workflow version is explicit');
  perform public.m73_assert(original#>>'{proposed_concept,description}' = 'Descrição opcional do conceito sintético.','proposal stores optional concept description');
  perform public.m73_assert(original->>'rationale' is null,'Profile proposal does not persist justification');
  perform public.m73_assert(not exists(select 1 from jsonb_object_keys(original) key where key = 'rationale'),'proposal has no retired rationale field');
end$$;
rollback to savepoint description_with_value;
release savepoint description_with_value;

select public.m73_reject(format('select public.m76_curate(%L,%L,%L)','proposal','global','Descrição global indevida'),'42501');

savepoint description_empty;
do $$declare result jsonb; proposal_id uuid; original jsonb;begin
  result := public.m76_curate('proposal', 'organization', '');
  proposal_id := (result->>'proposalId')::uuid;
  select original_proposal into original from public.knowledge_proposals where id = proposal_id;
  perform public.m73_assert(original#>>'{proposed_concept,description}' = '','empty concept description remains optional');
end$$;
rollback to savepoint description_empty;
release savepoint description_empty;

select public.m73_assert(not has_function_privilege('anon','public.curate_profile_competency_v4(uuid,uuid,uuid,integer,text,text,public.knowledge_scope,text,uuid,text,text,public.knowledge_concept_type)','execute'),'anon cannot curate with M76 RPC');
select public.m73_assert(has_function_privilege('authenticated','public.curate_profile_competency_v4(uuid,uuid,uuid,integer,text,text,public.knowledge_scope,text,uuid,text,text,public.knowledge_concept_type)','execute'),'authenticated can use guarded M76 RPC');

reset role;
select public.m73_assert(not exists(
  select 1 from public.knowledge_proposals proposal
  where proposal.prompt_version = 'human-proposal-2.0.0'
    and proposal.original_proposal ? 'rationale'
),'M76 proposal records contain no Profile-curation rationale');
