-- Repair the M5.4.6 wrapper on already-migrated QA databases without changing its signature or grants.
do $$
declare definition_sql text;
begin
  select pg_get_functiondef('public.save_vacancy_definition(uuid,uuid,text,text,text,text,text,public.position_status,uuid,text,jsonb,jsonb,jsonb,jsonb,text,uuid,uuid,uuid,boolean,text)'::regprocedure)
    into definition_sql;
  definition_sql := replace(definition_sql,
    'on conflict (organization_id, vacancy_version_id, requirement_stable_id) do nothing;',
    'on conflict do nothing;');
  execute definition_sql;
end;
$$;
