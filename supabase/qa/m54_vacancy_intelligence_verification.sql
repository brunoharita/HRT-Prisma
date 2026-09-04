begin;

create temporary table m54_context as
select membership.user_id as actor_id, membership.organization_id,
  (select person.id from public.people person
   where person.organization_id = membership.organization_id
     and person.operational_status = 'active'
   order by person.created_at limit 1) as occupant_person_id
from public.organization_memberships membership
where membership.role in ('owner', 'admin', 'recruiter')
order by membership.created_at
limit 1;

do $qa$
begin
  if (select count(*) from m54_context where occupant_person_id is not null) <> 1 then
    raise exception 'M5.4 QA requires an authorized actor and one active Person';
  end if;
end;
$qa$;

select set_config('request.jwt.claim.sub', (select actor_id::text from m54_context), true);

create temporary table m54_first_save as
select * from public.save_vacancy_definition(
  (select organization_id from m54_context), null, 'Gerente Comercial Enterprise QA M5.4',
  'Comercial', 'São Paulo, SP', 'hybrid', 'CLT', 'vacant', null,
  'Liderar a estratégia comercial enterprise com crescimento sustentável.',
  '["Gerenciar o pipeline", "Liderar o time comercial"]'::jsonb,
  '["Ampliar a previsibilidade de receita"]'::jsonb,
  jsonb_build_array(
    jsonb_build_object(
      'stableId', '54000000-0000-4000-8000-000000000001',
      'label', 'Vendas B2B enterprise', 'observedTerm', 'Vendas B2B enterprise',
      'category', 'experience', 'importance', 'required', 'relationMode', 'direct',
      'relatedSignals', '[]'::jsonb
    ),
    jsonb_build_object(
      'stableId', '54000000-0000-4000-8000-000000000002',
      'label', 'UX', 'observedTerm', 'UX', 'category', 'competency',
      'importance', 'desired', 'relationMode', 'direct',
      'relatedSignals', jsonb_build_array(jsonb_build_object(
        'label', 'Figma', 'conceptId', null, 'origin', 'operator'
      ))
    )
  ),
  '["B2B", "Enterprise"]'::jsonb, 'manual', null, null, null, false, 'material'
);

do $qa$
declare
  saved record;
  updated record;
begin
  select * into saved from m54_first_save;
  if not saved.created or saved.version <> 1 then raise exception 'first save did not create definition v1'; end if;
  if not exists (
    select 1 from public.vacancy_requirement_relations relation
    where relation.organization_id = (select organization_id from m54_context)
      and relation.vacancy_version_id = saved.vacancy_version_id
      and relation.related_label = 'Figma'
  ) then raise exception 'vacancy-specific related signal was not persisted'; end if;

  select * into updated from public.save_vacancy_definition(
    (select organization_id from m54_context), saved.vacancy_id, 'Gerente Comercial Enterprise QA M5.4',
    'Comercial', 'São Paulo, SP', 'hybrid', 'CLT', 'occupied',
    (select occupant_person_id from m54_context),
    'Liderar a estratégia comercial enterprise com crescimento sustentável.',
    '["Gerenciar o pipeline"]'::jsonb, '["Ampliar a previsibilidade de receita"]'::jsonb,
    jsonb_build_array(jsonb_build_object(
      'stableId', '54000000-0000-4000-8000-000000000001',
      'label', 'Vendas B2B enterprise', 'observedTerm', 'Vendas B2B enterprise',
      'category', 'experience', 'importance', 'required', 'relationMode', 'direct',
      'relatedSignals', '[]'::jsonb
    )),
    '["B2B", "Enterprise"]'::jsonb, 'manual', null, null, null, false, 'material'
  );
  if updated.created or updated.version <> 2 or updated.vacancy_version_id = saved.vacancy_version_id then
    raise exception 'material update did not create immutable definition v2';
  end if;
  if (select count(*) from public.vacancy_versions version where version.vacancy_id = saved.vacancy_id) <> 2 then
    raise exception 'version history was rewritten or duplicated';
  end if;
  if not exists (
    select 1 from public.positions position
    where position.id = (select vacancy.position_id from public.vacancies vacancy where vacancy.id = saved.vacancy_id)
      and position.status = 'occupied'
      and position.occupant_person_id = (select occupant_person_id from m54_context)
  ) then raise exception 'occupied position was not linked to the current Person'; end if;
end;
$qa$;

do $qa$
declare
  denied boolean := false;
begin
  begin
    perform * from public.save_vacancy_definition(
      (select organization_id from m54_context), null, 'Referência inválida QA M5.4',
      null, null, null, null, 'vacant', null, 'Teste negativo', '[]', '[]',
      jsonb_build_array(jsonb_build_object(
        'stableId', gen_random_uuid(), 'label', 'UX', 'category', 'competency',
        'importance', 'required', 'relationMode', 'direct',
        'relatedSignals', jsonb_build_array(jsonb_build_object(
          'label', 'Figma', 'conceptId', gen_random_uuid(), 'origin', 'operator'
        ))
      )), '[]', 'manual', null, null, null, false, 'material'
    );
  exception when raise_exception then
    if sqlerrm = 'VACANCY_RELATED_CONCEPT_INVALID' then denied := true; else raise; end if;
  end;
  if not denied then raise exception 'invalid related concept was not rejected'; end if;
end;
$qa$;

do $qa$
declare
  denied boolean := false;
begin
  begin
    perform * from public.save_vacancy_definition(
      (select organization_id from m54_context), null, 'Posição planejada inválida QA M5.4',
      null, null, null, null, 'planned', null, 'Teste negativo', '[]', '[]',
      jsonb_build_array(jsonb_build_object(
        'stableId', gen_random_uuid(), 'label', 'SQL', 'category', 'technology',
        'importance', 'required', 'relationMode', 'direct', 'relatedSignals', '[]'::jsonb
      )), '[]', 'manual', null, null, null, false, 'material'
    );
  exception when raise_exception then
    if sqlerrm = 'VACANCY_POSITION_STATUS_INVALID' then denied := true; else raise; end if;
  end;
  if not denied then raise exception 'planned position was accepted as a Vaga'; end if;
end;
$qa$;

select
  (select version from m54_first_save) as first_version,
  (select count(*) from public.vacancy_versions version
   where version.vacancy_id = (select vacancy_id from m54_first_save)) as preserved_versions,
  not pg_catalog.has_function_privilege(
    'anon',
    'public.save_vacancy_definition(uuid,uuid,text,text,text,text,text,public.position_status,uuid,text,jsonb,jsonb,jsonb,jsonb,text,uuid,uuid,uuid,boolean,text)',
    'EXECUTE'
  ) as anonymous_save_denied,
  not pg_catalog.has_table_privilege('authenticated', 'public.vacancy_versions', 'INSERT') as direct_version_insert_denied;

rollback;
