-- Forward-only correction for the output-column ambiguity found by the rich QA fixture.
do $migration$
declare
  original_definition text;
  patched_definition text;
begin
  original_definition := pg_get_functiondef(
    'private.begin_person_definitive_deletion(uuid,uuid,text,uuid,text,text,uuid)'::regprocedure
  );
  patched_definition := replace(
    original_definition,
    'on conflict (operation_id, storage_bucket, storage_path) do nothing',
    'on conflict on constraint person_deletion_storage_items_operation_id_storage_bucket_s_key do nothing'
  );
  if patched_definition = original_definition then
    raise exception 'person deletion Storage conflict clause was not found';
  end if;
  execute patched_definition;
end
$migration$;
