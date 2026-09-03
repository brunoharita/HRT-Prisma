begin;

create temporary table m52_actor as
select auth_user_id
from public.platform_users
where access_profile = 'super_admin'
  and status = 'active'
  and auth_user_id is not null
order by created_at
limit 1;

do $$
begin
  if (select count(*) from m52_actor) <> 1 then
    raise exception 'M5.2 QA requires one active Super Admin with an Auth identity';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', (select auth_user_id::text from m52_actor), true);

insert into public.organization_groups (id, name, slug)
values ('52000000-0000-0000-0000-000000000001', 'Grupo QA M5.2', 'grupo-qa-m52');
insert into public.organizations (id, name, group_id) values
  ('52000000-0000-0000-0000-000000000010', 'Organização A QA M5.2', '52000000-0000-0000-0000-000000000001'),
  ('52000000-0000-0000-0000-000000000011', 'Organização B QA M5.2', '52000000-0000-0000-0000-000000000001');

insert into public.people (id, organization_id, full_name) values
  ('52000000-0000-0000-0000-000000000101', '52000000-0000-0000-0000-000000000010', 'Pessoa Administrador QA'),
  ('52000000-0000-0000-0000-000000000102', '52000000-0000-0000-0000-000000000010', 'Pessoa Administrador de Empresas QA');

insert into public.documents (
  id, organization_id, person_id, filename, media_type, checksum_sha256, status,
  extraction_version, source_type, original_filename, declared_mime_type, validated_mime_type,
  byte_size, page_count, is_legacy_unstored, review_state
) values
  ('52000000-0000-0000-0000-000000000201', '52000000-0000-0000-0000-000000000010', '52000000-0000-0000-0000-000000000101', 'm52-pessoa-a.txt', 'text/plain', repeat('a',64), 'approved', 'qa-m52', 'manual_text', 'm52-pessoa-a.txt', 'text/plain', 'text/plain', 20, 1, false, 'approved'),
  ('52000000-0000-0000-0000-000000000202', '52000000-0000-0000-0000-000000000010', '52000000-0000-0000-0000-000000000102', 'm52-pessoa-b.txt', 'text/plain', repeat('b',64), 'approved', 'qa-m52', 'manual_text', 'm52-pessoa-b.txt', 'text/plain', 'text/plain', 20, 1, false, 'approved');

insert into public.evidence (
  id, organization_id, person_id, document_id, kind, fact, source_page, source_block, quoted_text, extraction_version
) values
  ('52000000-0000-0000-0000-000000000301', '52000000-0000-0000-0000-000000000010', '52000000-0000-0000-0000-000000000101', '52000000-0000-0000-0000-000000000201', 'competency', 'Administrador', 1, 'competencies', 'Administrador', 'qa-m52'),
  ('52000000-0000-0000-0000-000000000302', '52000000-0000-0000-0000-000000000010', '52000000-0000-0000-0000-000000000102', '52000000-0000-0000-0000-000000000202', 'competency', 'Administrador de empresas', 1, 'competencies', 'Administrador de empresas', 'qa-m52'),
  ('52000000-0000-0000-0000-000000000303', '52000000-0000-0000-0000-000000000010', '52000000-0000-0000-0000-000000000101', '52000000-0000-0000-0000-000000000201', 'competency', 'Gestão Prisma QA 52', 1, 'competencies', 'Gestão Prisma QA 52', 'qa-m52');

insert into public.professional_profiles (
  id, organization_id, person_id, source_document_id, profile_data, extraction_version,
  inference_version, embedding_version, prompt_version, model_version, profile_version,
  review_status, approved_by_auth_user_id, approved_at
) values
  ('52000000-0000-0000-0000-000000000401', '52000000-0000-0000-0000-000000000010', '52000000-0000-0000-0000-000000000101', '52000000-0000-0000-0000-000000000201',
   '{"professionalTitle":null,"areasOfExpertise":[],"professionalObjective":null,"summary":null,"keyResults":[],"experiences":[],"education":[],"certifications":[],"languages":[],"competencies":["Administrador"],"customSections":[],"uncertainties":[],"notIdentified":[]}'::jsonb,
   'qa-m52', 'qa-m52', 'none', 'none', 'deterministic', 1, 'approved', (select auth_user_id from m52_actor), now()),
  ('52000000-0000-0000-0000-000000000402', '52000000-0000-0000-0000-000000000010', '52000000-0000-0000-0000-000000000102', '52000000-0000-0000-0000-000000000202',
   '{"professionalTitle":null,"areasOfExpertise":[],"professionalObjective":null,"summary":null,"keyResults":[],"experiences":[],"education":[],"certifications":[],"languages":[],"competencies":["Administrador de empresas"],"customSections":[],"uncertainties":[],"notIdentified":[]}'::jsonb,
   'qa-m52', 'qa-m52', 'none', 'none', 'deterministic', 1, 'approved', (select auth_user_id from m52_actor), now());

create temporary table m52_observations (observation_id uuid, inbox_id uuid, resolution_state text, concept_id uuid);
insert into m52_observations select * from public.enqueue_knowledge_observation(
  '52000000-0000-0000-0000-000000000010', '52000000-0000-0000-0000-000000000101',
  '52000000-0000-0000-0000-000000000301', 'Administrador', 'pt-BR');
insert into m52_observations select * from public.enqueue_knowledge_observation(
  '52000000-0000-0000-0000-000000000010', '52000000-0000-0000-0000-000000000102',
  '52000000-0000-0000-0000-000000000302', 'Administrador de empresas', 'pt-BR');
insert into m52_observations select * from public.enqueue_knowledge_observation(
  '52000000-0000-0000-0000-000000000010', '52000000-0000-0000-0000-000000000101',
  '52000000-0000-0000-0000-000000000303', 'Gestão Prisma QA 52', 'pt-BR');

update public.knowledge_observations observation
set profile_id = case observation.person_id
  when '52000000-0000-0000-0000-000000000101' then '52000000-0000-0000-0000-000000000401'::uuid
  else '52000000-0000-0000-0000-000000000402'::uuid end,
  source_field_path = 'competencies'
where observation.id in (select observation_id from m52_observations);

create temporary table m52_profile_hash_before as
select id, extensions.digest(profile_data::text, 'sha256') as profile_hash
from public.professional_profiles where id in ('52000000-0000-0000-0000-000000000401', '52000000-0000-0000-0000-000000000402');

grant select on table m52_observations to authenticated;

insert into public.knowledge_concepts (id, scope, organization_id, concept_type, canonical_label, status, version) values
  ('52000000-0000-0000-0000-000000000501', 'organization', '52000000-0000-0000-0000-000000000010', 'skill', 'Gestão Operacional QA', 'approved', 1),
  ('52000000-0000-0000-0000-000000000502', 'organization', '52000000-0000-0000-0000-000000000010', 'methodology', 'Gestão Metodológica QA', 'approved', 1);
insert into public.knowledge_terms (concept_id, scope, organization_id, term, normalized_term, language, term_type, status, ambiguous, version) values
  ('52000000-0000-0000-0000-000000000501', 'organization', '52000000-0000-0000-0000-000000000010', 'GQA ambíguo', private.normalize_knowledge_term('GQA ambíguo'), 'pt-BR', 'abbreviation', 'approved', true, 1),
  ('52000000-0000-0000-0000-000000000502', 'organization', '52000000-0000-0000-0000-000000000010', 'GQA ambíguo', private.normalize_knowledge_term('GQA ambíguo'), 'pt-BR', 'abbreviation', 'approved', true, 1);

set local role authenticated;

do $qa$
declare
  administrator_id uuid;
  unknown_inbox_id uuid;
  matched_people bigint;
  denied boolean := false;
begin
  select concept_id into administrator_id from public.resolve_knowledge_term_v2(
    '52000000-0000-0000-0000-000000000010', 'Administrador', 'pt-BR');
  if administrator_id is null then raise exception 'CBO exact alias did not resolve'; end if;
  if (select concept_id from public.resolve_knowledge_term_v2(
    '52000000-0000-0000-0000-000000000010', 'Administrador de empresas', 'pt-BR')) <> administrator_id
  then raise exception 'CBO synonyms did not converge to one concept'; end if;
  if (select resolution_state from public.resolve_knowledge_term_v2(
    '52000000-0000-0000-0000-000000000010', 'GQA ambíguo', 'pt-BR')) <> 'ambiguous'
  then raise exception 'ambiguous organization alias was silently resolved'; end if;
  if (select resolution_state from public.resolve_knowledge_term_v2(
    '52000000-0000-0000-0000-000000000010', 'Termo realmente inexistente QA 52', 'pt-BR')) <> 'unresolved'
  then raise exception 'unknown term was invented'; end if;

  select inbox_id into unknown_inbox_id from m52_observations where resolution_state = 'unresolved' limit 1;
  perform * from public.resolve_knowledge_inbox_alias(unknown_inbox_id, administrator_id, 'organization', 'Alias sintético aprovado no smoke M5.2');
  if (select concept_id from public.resolve_knowledge_term_v2(
    '52000000-0000-0000-0000-000000000010', 'Gestão Prisma QA 52', 'pt-BR')) <> administrator_id
  then raise exception 'approved organization alias did not resolve'; end if;
  if (select resolution_state from public.resolve_knowledge_term_v2(
    '52000000-0000-0000-0000-000000000011', 'Gestão Prisma QA 52', 'pt-BR')) <> 'unresolved'
  then raise exception 'organization alias crossed tenant boundary'; end if;

  select count(*) into matched_people from public.search_people_by_knowledge_concept(
    '52000000-0000-0000-0000-000000000010', 'Administrador');
  if matched_people <> 2 then raise exception 'canonical search expected two people, received %', matched_people; end if;

  begin
    insert into public.knowledge_source_stage_records (
      source_id, source_version_id, record_kind, external_id, concept_type, preferred_label,
      source_file, source_row, content_hash
    ) select source.id, version.id, 'concept', 'forbidden', 'skill', 'Forbidden', 'qa.csv', 1, repeat('f',64)
      from public.knowledge_sources source join public.knowledge_source_versions version on version.source_id = source.id
      where source.name = 'CBO' and version.is_current;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'authenticated obtained direct staging write'; end if;
end;
$qa$;

reset role;

do $qa$
begin
  if exists (
    select 1 from public.professional_profiles profile
    join m52_profile_hash_before before on before.id = profile.id
    where extensions.digest(profile.profile_data::text, 'sha256') <> before.profile_hash
  ) then raise exception 'approved Profile changed during Knowledge resolution'; end if;
  if not exists (
    select 1 from public.knowledge_change_sets change_set
    where change_set.scope = 'organization'
      and change_set.organization_id = '52000000-0000-0000-0000-000000000010'
      and change_set.changed_entities @> '[{"operation":"approve_alias"}]'::jsonb
  ) then raise exception 'human alias decision lacks audit trail'; end if;
end;
$qa$;

select
  (select count(*) from public.search_people_by_knowledge_concept('52000000-0000-0000-0000-000000000010', 'Administrador')) as canonical_people,
  (select resolution_state from public.resolve_knowledge_term_v2('52000000-0000-0000-0000-000000000010', 'GQA ambíguo', 'pt-BR')) as ambiguous_state,
  (select resolution_state from public.resolve_knowledge_term_v2('52000000-0000-0000-0000-000000000011', 'Gestão Prisma QA 52', 'pt-BR')) as cross_tenant_state,
  (select count(*) from public.knowledge_observations where profile_id is not null) as traced_observations,
  not pg_catalog.has_table_privilege('authenticated', 'public.knowledge_source_stage_records', 'INSERT') as direct_stage_insert_denied;

rollback;
