-- PostgreSQL resolves OUT parameter names inside ON CONFLICT targets.
-- Removing the redundant target preserves idempotent DO NOTHING semantics.
begin;

do $$
declare
  original_definition text;
  corrected_definition text;
begin
  select pg_catalog.pg_get_functiondef(
    'public.publish_profile_review(uuid,uuid,integer,text,jsonb,text)'::regprocedure
  ) into original_definition;
  corrected_definition := replace(
    original_definition,
    'on conflict (organization_id, review_id, field_path) do nothing',
    'on conflict do nothing'
  );
  if corrected_definition = original_definition then
    raise exception 'publish_profile_review conflict target was not found';
  end if;
  execute corrected_definition;
end;
$$;

commit;
