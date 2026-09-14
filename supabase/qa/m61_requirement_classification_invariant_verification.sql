begin;

create temporary table m61_context as
select membership.user_id as actor_id, membership.organization_id
from public.organization_memberships membership
where membership.role in ('owner', 'admin', 'recruiter')
order by membership.created_at
limit 1;

do $qa$
begin
  if (select count(*) from m61_context) <> 1 then
    raise exception 'M6.1 QA requires an authorized actor';
  end if;
end;
$qa$;

select set_config('request.jwt.claim.sub', (select actor_id::text from m61_context), true);

do $qa$
declare
  denied boolean := false;
begin
  begin
    perform * from public.save_vacancy_definition(
      (select organization_id from m61_context), null, 'Classificação pendente QA M6.1',
      'Tecnologia', null, 'remote', 'CLT', 'vacant', null,
      'Provar que uma posição não aceita requisito sem decisão.',
      '["Validar o contrato de classificação"]'::jsonb, '[]'::jsonb,
      jsonb_build_array(jsonb_build_object(
        'stableId', gen_random_uuid(), 'label', 'SQL', 'category', 'technology',
        'importance', 'unclassified', 'importanceConfirmed', false,
        'relationMode', 'direct', 'relatedSignals', '[]'::jsonb
      )),
      '[]'::jsonb, 'manual', null, null, null, false, 'material'
    );
  exception when raise_exception then
    if sqlerrm = 'VACANCY_REQUIREMENT_CLASSIFICATION_REQUIRED' then
      denied := true;
    else
      raise;
    end if;
  end;

  if not denied then
    raise exception 'unclassified vacancy requirement was accepted';
  end if;
end;
$qa$;

create temporary table m61_saved as
select * from public.save_vacancy_definition(
  (select organization_id from m61_context), null, 'Classificação confirmada QA M6.1',
  'Tecnologia', null, 'remote', 'CLT', 'vacant', null,
  'Provar que uma posição aceita somente requisitos classificados.',
  '["Validar o contrato de classificação"]'::jsonb, '[]'::jsonb,
  jsonb_build_array(
    jsonb_build_object(
      'stableId', gen_random_uuid(), 'label', 'SQL', 'category', 'technology',
      'importance', 'required', 'importanceConfirmed', true,
      'relationMode', 'direct', 'relatedSignals', '[]'::jsonb
    ),
    jsonb_build_object(
      'stableId', gen_random_uuid(), 'label', 'Documentação', 'category', 'knowledge',
      'importance', 'desired', 'importanceConfirmed', true,
      'relationMode', 'direct', 'relatedSignals', '[]'::jsonb
    )
  ),
  '[]'::jsonb, 'manual', null, null, null, false, 'material'
);

do $qa$
declare
  saved record;
begin
  select * into saved from m61_saved;

  if (select contract_version from public.vacancy_versions where id = saved.vacancy_version_id)
      <> 'vacancy-definition-1.2.0' then
    raise exception 'saved vacancy did not receive vacancy-definition-1.2.0';
  end if;

  if exists (
    select 1
    from public.vacancy_requirements requirement
    where requirement.vacancy_version_id = saved.vacancy_version_id
      and requirement.importance not in ('required', 'desired')
  ) then
    raise exception 'saved vacancy contains an invalid requirement classification';
  end if;
end;
$qa$;

select
  (select contract_version from public.vacancy_versions where id = (select vacancy_version_id from m61_saved)) as contract_version,
  (select count(*) from public.vacancy_requirements where vacancy_version_id = (select vacancy_version_id from m61_saved) and importance = 'required') as required_count,
  (select count(*) from public.vacancy_requirements where vacancy_version_id = (select vacancy_version_id from m61_saved) and importance = 'desired') as desired_count,
  not pg_catalog.has_function_privilege(
    'anon',
    'public.save_vacancy_definition(uuid,uuid,text,text,text,text,text,public.position_status,uuid,text,jsonb,jsonb,jsonb,jsonb,text,uuid,uuid,uuid,boolean,text)',
    'EXECUTE'
  ) as anonymous_save_denied,
  not pg_catalog.has_function_privilege(
    'authenticated',
    'public.save_vacancy_definition_m546(uuid,uuid,text,text,text,text,text,public.position_status,uuid,text,jsonb,jsonb,jsonb,jsonb,text,uuid,uuid,uuid,boolean,text)',
    'EXECUTE'
  ) as legacy_wrapper_denied;

rollback;
