-- Forward-only correction for the residue-verifier output-column ambiguity found in QA.
do $migration$
declare original_definition text; patched_definition text;
begin
  original_definition := pg_get_functiondef(
    'public.finalize_person_definitive_deletion(uuid,uuid)'::regprocedure
  );
  patched_definition := replace(
    original_definition,
    'union all select id::text from public.person_deletion_storage_items where operation_id = p_operation_id and status <> ''removed''',
    'union all select storage.id::text from public.person_deletion_storage_items storage where storage.operation_id = p_operation_id and storage.status <> ''removed'''
  );
  if patched_definition = original_definition then
    raise exception 'person deletion residue Storage clause was not found';
  end if;
  execute patched_definition;
end
$migration$;
