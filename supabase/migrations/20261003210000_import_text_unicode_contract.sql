begin;

-- JSONB rejects NUL/malformed surrogate escapes before a function can execute.
-- The client represents these explicitly in derived text, retaining the PDF/hash/cache.
-- Keep old tabs' diagnostics readable while adopting the corrective adapter.
do $$
declare definition text; original text;
begin
  definition := pg_get_functiondef('public.record_resume_import_failure(uuid,uuid,uuid,uuid,jsonb,text)'::regprocedure);
  original := definition;
  definition := replace(definition,
    'coalesce(p_diagnostic ->> ''contract'','''') <> ''import-evidence-1.0.0''',
    'coalesce(p_diagnostic ->> ''contract'','''') not in (''import-evidence-1.0.0'',''import-evidence-1.1.0'')');
  if definition=original then raise exception 'import diagnostic contract gate was not found'; end if;
  original := definition;
  definition := replace(definition,
    'coalesce(p_diagnostic ->> ''adapterVersion'','''') <> ''evidence-adapter-1.0.0''',
    '(p_diagnostic ->> ''contract'' = ''import-evidence-1.0.0'' and coalesce(p_diagnostic ->> ''adapterVersion'','''') <> ''evidence-adapter-1.0.0'') or (p_diagnostic ->> ''contract'' = ''import-evidence-1.1.0'' and coalesce(p_diagnostic ->> ''adapterVersion'','''') <> ''evidence-adapter-1.0.1'')');
  if definition=original then raise exception 'import diagnostic adapter gate was not found'; end if;
  original := definition;
  definition := replace(definition, '''pages_invalid'',''page_invalid''', '''unicode_invalid'',''pages_invalid'',''page_invalid''');
  if definition=original then raise exception 'import diagnostic reason gate was not found'; end if;
  execute definition;
  definition := pg_get_functiondef('public.persist_person_extraction(uuid,uuid,uuid,jsonb,jsonb,integer,integer,text,text,text,text,text,uuid)'::regprocedure);
  original := definition;
  definition := replace(definition, '''import-evidence-1.0.0''', '''import-evidence-1.1.0''');
  if definition=original then raise exception 'import persistence contract marker was not found'; end if;
  execute definition;
end;
$$;

revoke all on function public.persist_person_extraction(uuid,uuid,uuid,jsonb,jsonb,integer,integer,text,text,text,text,text,uuid), public.record_resume_import_failure(uuid,uuid,uuid,uuid,jsonb,text) from public,anon;
grant execute on function public.persist_person_extraction(uuid,uuid,uuid,jsonb,jsonb,integer,integer,text,text,text,text,text,uuid), public.record_resume_import_failure(uuid,uuid,uuid,uuid,jsonb,text) to authenticated;
comment on function public.persist_person_extraction(uuid,uuid,uuid,jsonb,jsonb,integer,integer,text,text,text,text,text,uuid) is 'import-evidence-1.1.0: Unicode-safe derived text, atomic authorized persistence; original PDF and human review remain authoritative.';
comment on function public.record_resume_import_failure(uuid,uuid,uuid,uuid,jsonb,text) is 'import-evidence-1.1.0: safe Unicode diagnostics; supports the exact old/new contract-adapter pairs, retains tenant and transactional gates.';

commit;
