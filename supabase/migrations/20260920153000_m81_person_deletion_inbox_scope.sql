-- Keep definitive Person deletion scoped to Inbox rows that actually lost
-- references to that Person. Existing empty Inbox rows may come from other
-- workflows and must not be removed by an unrelated deletion.
do $migration$
declare
  original_definition text;
  patched_definition text;
begin
  original_definition := pg_get_functiondef(
    'public.finalize_person_definitive_deletion(uuid,uuid)'::regprocedure
  );

  patched_definition := replace(
    original_definition,
    'shared_knowledge_count bigint; shared_item_count bigint; residual_count bigint;',
    'shared_knowledge_count bigint; shared_item_count bigint; residual_count bigint; affected_inbox_ids uuid[];'
  );
  if patched_definition = original_definition then
    raise exception 'person deletion Inbox scope declaration was not found';
  end if;

  original_definition := patched_definition;
  patched_definition := replace(
    original_definition,
    '  update public.knowledge_inbox inbox set',
    $replacement$
  select coalesce(array_agg(affected.id), '{}'::uuid[]) into affected_inbox_ids
  from (
    select inbox.id from public.knowledge_inbox inbox
    where inbox.organization_id = p_organization_id and (
      inbox.evidence_reference_ids && evidence_ids or inbox.observation_ids && coalesce((
        select array_agg(observation.id) from public.knowledge_observations observation
        where observation.organization_id = p_organization_id and observation.person_id = target_person_id
      ), '{}'::uuid[])
    )
    order by inbox.id for update
  ) affected;
  update public.knowledge_inbox inbox set$replacement$
  );
  if patched_definition = original_definition then
    raise exception 'person deletion Inbox update was not found';
  end if;

  original_definition := patched_definition;
  patched_definition := replace(
    original_definition,
    $old$  delete from public.knowledge_inbox inbox where inbox.organization_id = p_organization_id
    and inbox.status = 'unresolved' and cardinality(inbox.evidence_reference_ids) = 0 and cardinality(inbox.observation_ids) = 0;$old$,
    $new$  delete from public.knowledge_inbox inbox where inbox.organization_id = p_organization_id
    and inbox.id = any(affected_inbox_ids)
    and inbox.status = 'unresolved' and cardinality(inbox.evidence_reference_ids) = 0 and cardinality(inbox.observation_ids) = 0;$new$
  );
  if patched_definition = original_definition then
    raise exception 'person deletion broad Inbox delete was not found';
  end if;

  execute patched_definition;
end
$migration$;
