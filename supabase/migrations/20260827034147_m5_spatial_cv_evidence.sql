-- M5: normalized spatial evidence and evidence-aware human review.
-- Backward compatible: legacy evidence remains valid without a spatial region.

alter table public.document_operations
  drop constraint if exists document_operations_operation_type_check;

alter table public.document_operations
  add constraint document_operations_operation_type_check check (operation_type in (
    'register_document',
    'persist_extraction',
    'retry_processing',
    'record_failure',
    'start_review',
    'save_review_draft',
    'approve_review',
    'invalidate_review',
    'record_review_evidence'
  ));

create unique index if not exists documents_org_id_version_unique_idx
on public.documents (organization_id, id, document_version);

create table public.spatial_evidence_regions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null,
  document_id uuid not null,
  document_version integer not null check (document_version > 0),
  review_id uuid not null,
  page_number integer not null check (page_number > 0),
  x double precision not null check (x between 0 and 1),
  y double precision not null check (y between 0 and 1),
  width double precision not null check (width > 0 and width <= 1),
  height double precision not null check (height > 0 and height <= 1),
  coordinate_system text not null default 'normalized-page-v1'
    check (coordinate_system = 'normalized-page-v1'),
  selected_text text check (selected_text is null or char_length(selected_text) <= 2000),
  extraction_method text not null check (extraction_method in (
    'pdfjs-text-layer-v1', 'tesseract-region-v1', 'manual-region-v1'
  )),
  source text not null check (source in ('system', 'human')),
  contract_version text not null default '1.0.0' check (contract_version = '1.0.0'),
  created_by_auth_user_id uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, person_id)
    references public.people(organization_id, id) on delete cascade,
  foreign key (organization_id, document_id, document_version)
    references public.documents(organization_id, id, document_version) on delete cascade,
  foreign key (organization_id, review_id)
    references public.profile_reviews(organization_id, id) on delete cascade,
  check (x + width <= 1 and y + height <= 1),
  check ((source = 'human' and created_by_auth_user_id is not null) or source = 'system')
);

create table public.profile_review_evidence_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  review_id uuid not null,
  field_path text not null check (
    field_path ~ '^(summary|certifications|languages|competencies|uncertainties|notIdentified|experiences\.[0-9]+(\.(role|organization|period|description))?|education\.[0-9]+(\.(course|institution|period|description))?)$'
  ),
  evidence_id uuid,
  spatial_region_id uuid,
  link_kind text not null check (link_kind in ('original', 'reviewer', 'complementary')),
  state text not null default 'active' check (state in ('active', 'superseded')),
  replaces_link_id uuid,
  superseded_by_link_id uuid,
  reason text check (reason is null or char_length(btrim(reason)) between 3 and 1000),
  created_by_auth_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  superseded_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, review_id)
    references public.profile_reviews(organization_id, id) on delete cascade,
  foreign key (organization_id, evidence_id)
    references public.evidence(organization_id, id) on delete restrict,
  foreign key (organization_id, spatial_region_id)
    references public.spatial_evidence_regions(organization_id, id) on delete restrict,
  foreign key (organization_id, replaces_link_id)
    references public.profile_review_evidence_links(organization_id, id) on delete restrict,
  foreign key (organization_id, superseded_by_link_id)
    references public.profile_review_evidence_links(organization_id, id) on delete restrict,
  check ((evidence_id is not null)::integer + (spatial_region_id is not null)::integer = 1),
  check ((link_kind = 'original' and evidence_id is not null) or (link_kind <> 'original' and spatial_region_id is not null)),
  check ((state = 'active' and superseded_at is null and superseded_by_link_id is null)
    or (state = 'superseded' and superseded_at is not null))
);

create table public.profile_review_evidence_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  review_id uuid not null,
  review_revision_id uuid not null,
  field_path text not null,
  event_type text not null check (event_type in (
    'human_region_added',
    'review_evidence_replaced',
    'complementary_evidence_added',
    'new_information_created'
  )),
  previous_link_id uuid,
  new_link_id uuid not null,
  reason text not null check (char_length(btrim(reason)) between 3 and 1000),
  actor_auth_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (organization_id, review_id)
    references public.profile_reviews(organization_id, id) on delete cascade,
  foreign key (organization_id, review_revision_id)
    references public.profile_review_revisions(organization_id, id) on delete cascade,
  foreign key (organization_id, previous_link_id)
    references public.profile_review_evidence_links(organization_id, id) on delete restrict,
  foreign key (organization_id, new_link_id)
    references public.profile_review_evidence_links(organization_id, id) on delete restrict
);

create index spatial_evidence_regions_review_page_idx
on public.spatial_evidence_regions (organization_id, review_id, page_number, created_at);

create index spatial_evidence_regions_document_idx
on public.spatial_evidence_regions (organization_id, document_id, document_version, page_number);

create index spatial_evidence_regions_person_idx
on public.spatial_evidence_regions (organization_id, person_id, created_at desc);

create index spatial_evidence_regions_creator_idx
on public.spatial_evidence_regions (created_by_auth_user_id);

create index profile_review_evidence_links_review_field_idx
on public.profile_review_evidence_links (organization_id, review_id, field_path, state, created_at);

create unique index profile_review_evidence_links_active_reviewer_idx
on public.profile_review_evidence_links (organization_id, review_id, field_path)
where state = 'active' and link_kind = 'reviewer';

create index profile_review_evidence_links_evidence_idx
on public.profile_review_evidence_links (organization_id, evidence_id)
where evidence_id is not null;

create index profile_review_evidence_links_region_idx
on public.profile_review_evidence_links (organization_id, spatial_region_id)
where spatial_region_id is not null;

create index profile_review_evidence_links_creator_idx
on public.profile_review_evidence_links (created_by_auth_user_id);

create index profile_review_evidence_events_review_idx
on public.profile_review_evidence_events (organization_id, review_id, created_at desc);

create index profile_review_evidence_events_revision_idx
on public.profile_review_evidence_events (organization_id, review_revision_id);

create index profile_review_evidence_events_previous_link_idx
on public.profile_review_evidence_events (organization_id, previous_link_id)
where previous_link_id is not null;

create index profile_review_evidence_events_new_link_idx
on public.profile_review_evidence_events (organization_id, new_link_id);

create index profile_review_evidence_events_actor_idx
on public.profile_review_evidence_events (actor_auth_user_id);

alter table public.spatial_evidence_regions enable row level security;
alter table public.profile_review_evidence_links enable row level security;
alter table public.profile_review_evidence_events enable row level security;

create policy spatial_evidence_regions_select on public.spatial_evidence_regions
for select to authenticated
using ((select private.has_org_role(
  organization_id,
  array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[]
)));

create policy profile_review_evidence_links_select on public.profile_review_evidence_links
for select to authenticated
using ((select private.has_org_role(
  organization_id,
  array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[]
)));

create policy profile_review_evidence_events_select on public.profile_review_evidence_events
for select to authenticated
using ((select private.has_org_role(
  organization_id,
  array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[]
)));

revoke all on public.spatial_evidence_regions from public, anon, authenticated;
revoke all on public.profile_review_evidence_links from public, anon, authenticated;
revoke all on public.profile_review_evidence_events from public, anon, authenticated;
revoke all on sequence public.profile_review_evidence_events_id_seq from public, anon, authenticated;

grant select on public.spatial_evidence_regions to authenticated;
grant select on public.profile_review_evidence_links to authenticated;
grant select on public.profile_review_evidence_events to authenticated;

create or replace function private.prevent_review_evidence_history_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = '55000', message = 'review evidence history is immutable';
end;
$$;

revoke all on function private.prevent_review_evidence_history_mutation() from public, anon, authenticated;

create trigger profile_review_evidence_events_immutable
before update or delete on public.profile_review_evidence_events
for each row execute function private.prevent_review_evidence_history_mutation();

create or replace function private.link_profile_review_original_evidence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile_review_evidence_links (
    organization_id,
    review_id,
    field_path,
    evidence_id,
    link_kind,
    created_by_auth_user_id
  )
  select
    new.organization_id,
    new.id,
    case ranked.kind
      when 'experience' then format('experiences.%s', ranked.item_index)
      when 'education' then format('education.%s', ranked.item_index)
    end,
    ranked.id,
    'original',
    new.started_by_auth_user_id
  from (
    select
      evidence.id,
      evidence.kind,
      row_number() over (
        partition by evidence.kind
        order by evidence.source_page nulls last, evidence.source_block, evidence.id
      ) - 1 as item_index
    from public.evidence evidence
    where evidence.organization_id = new.organization_id
      and evidence.person_id = new.person_id
      and evidence.document_id = new.document_id
      and evidence.processing_attempt_id = new.processing_attempt_id
      and evidence.kind in ('experience', 'education')
  ) ranked
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function private.link_profile_review_original_evidence() from public, anon, authenticated;

create trigger profile_reviews_link_original_evidence
after insert on public.profile_reviews
for each row execute function private.link_profile_review_original_evidence();

with ranked as (
  select
    review.organization_id,
    review.id as review_id,
    review.started_by_auth_user_id,
    evidence.id as evidence_id,
    evidence.kind,
    row_number() over (
      partition by review.organization_id, review.id, evidence.kind
      order by evidence.source_page nulls last, evidence.source_block, evidence.id
    ) - 1 as item_index
  from public.profile_reviews review
  join public.evidence evidence
    on evidence.organization_id = review.organization_id
   and evidence.person_id = review.person_id
   and evidence.document_id = review.document_id
   and evidence.processing_attempt_id = review.processing_attempt_id
  where evidence.kind in ('experience', 'education')
)
insert into public.profile_review_evidence_links (
  organization_id,
  review_id,
  field_path,
  evidence_id,
  link_kind,
  created_by_auth_user_id
)
select
  ranked.organization_id,
  ranked.review_id,
  case ranked.kind
    when 'experience' then format('experiences.%s', ranked.item_index)
    when 'education' then format('education.%s', ranked.item_index)
  end,
  ranked.evidence_id,
  'original',
  ranked.started_by_auth_user_id
from ranked
where not exists (
  select 1
  from public.profile_review_evidence_links link
  where link.organization_id = ranked.organization_id
    and link.review_id = ranked.review_id
    and link.evidence_id = ranked.evidence_id
);

create or replace function public.record_profile_review_evidence(
  p_organization_id uuid,
  p_review_id uuid,
  p_expected_lock_version integer,
  p_field_path text,
  p_action text,
  p_document_version integer,
  p_page_number integer,
  p_x double precision,
  p_y double precision,
  p_width double precision,
  p_height double precision,
  p_selected_text text,
  p_extraction_method text,
  p_reviewed_data jsonb,
  p_reason text,
  p_replaces_link_id uuid,
  p_idempotency_key text
)
returns table (
  review_id uuid,
  lock_version integer,
  region_id uuid,
  link_id uuid,
  reused boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  review public.profile_reviews;
  document public.documents;
  operation public.document_operations;
  previous_link public.profile_review_evidence_links;
  next_reviewed_data jsonb;
  next_revision integer;
  next_lock integer;
  revision_id uuid;
  new_region_id uuid;
  new_link_id uuid;
  resolved_reason text;
  field_name text;
  event_type text;
  link_kind text;
  fingerprint text;
begin
  actor_id := private.require_document_reviewer(p_organization_id);

  if p_field_path is null or p_field_path !~ '^(summary|certifications|languages|competencies|uncertainties|notIdentified|experiences\.[0-9]+(\.(role|organization|period|description))?|education\.[0-9]+(\.(course|institution|period|description))?)$' then
    raise exception using errcode = '22023', message = 'unsupported review field path';
  end if;
  if p_action not in ('correct_current_field', 'add_complementary', 'replace_review_evidence', 'create_new_information') then
    raise exception using errcode = '22023', message = 'unsupported evidence action';
  end if;
  if p_document_version is null or p_document_version < 1 or p_page_number is null or p_page_number < 1 then
    raise exception using errcode = '22023', message = 'document version and page are required';
  end if;
  if p_x is null or p_y is null or p_width is null or p_height is null
    or p_x < 0 or p_y < 0 or p_width <= 0 or p_height <= 0
    or p_x > 1 or p_y > 1 or p_width > 1 or p_height > 1
    or p_x + p_width > 1 or p_y + p_height > 1 then
    raise exception using errcode = '22023', message = 'normalized evidence coordinates are invalid';
  end if;
  if p_width * p_height < 0.000004 then
    raise exception using errcode = '22023', message = 'evidence region is too small';
  end if;
  if p_extraction_method not in ('pdfjs-text-layer-v1', 'tesseract-region-v1', 'manual-region-v1') then
    raise exception using errcode = '22023', message = 'unsupported region extraction method';
  end if;
  if p_selected_text is not null and char_length(p_selected_text) > 2000 then
    raise exception using errcode = '22023', message = 'selected evidence text is too long';
  end if;
  if p_reviewed_data is not null and jsonb_typeof(p_reviewed_data) <> 'object' then
    raise exception using errcode = '22023', message = 'reviewed data must be an object';
  end if;

  select * into review
  from public.profile_reviews item
  where item.organization_id = p_organization_id and item.id = p_review_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'review not found in organization';
  end if;

  select * into document
  from public.documents item
  where item.organization_id = p_organization_id
    and item.id = review.document_id
    and item.person_id = review.person_id
    and item.document_version = p_document_version
    and item.source_type = 'resume_pdf'
    and not item.is_legacy_unstored
  for share;
  if not found then
    raise exception using errcode = 'P0002', message = 'review document version not found';
  end if;
  if document.page_count is null or p_page_number > document.page_count then
    raise exception using errcode = '22023', message = 'evidence page is outside the document';
  end if;

  next_reviewed_data := coalesce(p_reviewed_data, review.reviewed_data);
  if p_action in ('correct_current_field', 'create_new_information')
    and next_reviewed_data is not distinct from review.reviewed_data then
    raise exception using errcode = '22023', message = 'this evidence action requires a reviewed value change';
  end if;

  resolved_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if resolved_reason is null then
    if p_action = 'correct_current_field' and nullif(btrim(coalesce(p_selected_text, '')), '') is null then
      raise exception using errcode = '22023', message = 'a manual reason is required when evidence has no extracted text';
    end if;
    resolved_reason := case p_action
      when 'correct_current_field' then format('Campo corrigido com região explícita da página %s.', p_page_number)
      when 'add_complementary' then format('Evidência complementar adicionada a partir da página %s.', p_page_number)
      when 'replace_review_evidence' then format('Evidência ativa substituída por região da página %s.', p_page_number)
      when 'create_new_information' then format('Nova informação criada com evidência explícita da página %s.', p_page_number)
    end;
  end if;
  if char_length(resolved_reason) not between 3 and 1000 then
    raise exception using errcode = '22023', message = 'review reason is invalid';
  end if;

  fingerprint := pg_catalog.encode(extensions.digest(concat_ws('|',
    p_review_id::text,
    p_expected_lock_version::text,
    p_field_path,
    p_action,
    p_document_version::text,
    p_page_number::text,
    p_x::text,
    p_y::text,
    p_width::text,
    p_height::text,
    pg_catalog.encode(extensions.digest(coalesce(p_selected_text, ''), 'sha256'), 'hex'),
    p_extraction_method,
    pg_catalog.encode(extensions.digest(next_reviewed_data::text, 'sha256'), 'hex'),
    resolved_reason,
    coalesce(p_replaces_link_id::text, '')
  ), 'sha256'), 'hex');

  operation := private.claim_document_operation(
    p_organization_id,
    review.person_id,
    review.document_id,
    'record_review_evidence',
    p_idempotency_key,
    fingerprint,
    actor_id
  );
  if operation.status = 'completed' and operation.review_id = p_review_id then
    return query select
      p_review_id,
      (operation.result ->> 'lock_version')::integer,
      (operation.result ->> 'region_id')::uuid,
      (operation.result ->> 'link_id')::uuid,
      true;
    return;
  end if;

  if review.state <> 'draft' then
    raise exception using errcode = '55000', message = 'review is no longer editable';
  end if;
  if review.lock_version <> p_expected_lock_version then
    raise exception using errcode = 'P0001', message = 'review_conflict';
  end if;

  if p_action = 'replace_review_evidence' then
    if p_replaces_link_id is null then
      raise exception using errcode = '22023', message = 'replacement target is required';
    end if;
    select * into previous_link
    from public.profile_review_evidence_links item
    where item.organization_id = p_organization_id
      and item.review_id = p_review_id
      and item.id = p_replaces_link_id
      and item.field_path = p_field_path
      and item.link_kind = 'reviewer'
      and item.state = 'active'
    for update;
    if not found then
      raise exception using errcode = 'P0002', message = 'active review evidence to replace was not found';
    end if;
  elsif p_action = 'correct_current_field' then
    select * into previous_link
    from public.profile_review_evidence_links item
    where item.organization_id = p_organization_id
      and item.review_id = p_review_id
      and item.field_path = p_field_path
      and item.link_kind = 'reviewer'
      and item.state = 'active'
    for update;
  end if;

  next_revision := review.lock_version + 1;
  next_lock := review.lock_version + 1;
  insert into public.profile_review_revisions (
    organization_id,
    review_id,
    revision_number,
    reviewed_data,
    change_reason,
    actor_auth_user_id
  ) values (
    p_organization_id,
    p_review_id,
    next_revision,
    next_reviewed_data,
    resolved_reason,
    actor_id
  ) returning id into revision_id;

  foreach field_name in array array[
    'summary', 'experiences', 'education', 'certifications',
    'languages', 'competencies', 'uncertainties', 'notIdentified'
  ]
  loop
    if coalesce(review.reviewed_data -> field_name, 'null'::jsonb)
      is distinct from coalesce(next_reviewed_data -> field_name, 'null'::jsonb) then
      insert into public.profile_review_changes (
        organization_id,
        review_id,
        review_revision_id,
        field_path,
        extracted_value,
        previous_value,
        reviewed_value,
        reason,
        actor_auth_user_id
      ) values (
        p_organization_id,
        p_review_id,
        revision_id,
        field_name,
        review.extracted_data -> field_name,
        review.reviewed_data -> field_name,
        next_reviewed_data -> field_name,
        resolved_reason,
        actor_id
      );
    end if;
  end loop;

  insert into public.spatial_evidence_regions (
    organization_id,
    person_id,
    document_id,
    document_version,
    review_id,
    page_number,
    x,
    y,
    width,
    height,
    selected_text,
    extraction_method,
    source,
    created_by_auth_user_id
  ) values (
    p_organization_id,
    review.person_id,
    review.document_id,
    p_document_version,
    p_review_id,
    p_page_number,
    p_x,
    p_y,
    p_width,
    p_height,
    nullif(btrim(coalesce(p_selected_text, '')), ''),
    p_extraction_method,
    'human',
    actor_id
  ) returning id into new_region_id;

  if previous_link.id is not null then
    update public.profile_review_evidence_links
    set state = 'superseded', superseded_at = now()
    where organization_id = p_organization_id and id = previous_link.id;
  end if;

  link_kind := case when p_action = 'add_complementary' then 'complementary' else 'reviewer' end;
  insert into public.profile_review_evidence_links (
    organization_id,
    review_id,
    field_path,
    spatial_region_id,
    link_kind,
    replaces_link_id,
    reason,
    created_by_auth_user_id
  ) values (
    p_organization_id,
    p_review_id,
    p_field_path,
    new_region_id,
    link_kind,
    previous_link.id,
    resolved_reason,
    actor_id
  ) returning id into new_link_id;

  if previous_link.id is not null then
    update public.profile_review_evidence_links
    set superseded_by_link_id = new_link_id
    where organization_id = p_organization_id and id = previous_link.id;
  end if;

  event_type := case p_action
    when 'correct_current_field' then 'human_region_added'
    when 'add_complementary' then 'complementary_evidence_added'
    when 'replace_review_evidence' then 'review_evidence_replaced'
    when 'create_new_information' then 'new_information_created'
  end;

  insert into public.profile_review_evidence_events (
    organization_id,
    review_id,
    review_revision_id,
    field_path,
    event_type,
    previous_link_id,
    new_link_id,
    reason,
    actor_auth_user_id
  ) values (
    p_organization_id,
    p_review_id,
    revision_id,
    p_field_path,
    event_type,
    previous_link.id,
    new_link_id,
    resolved_reason,
    actor_id
  );

  update public.profile_reviews
  set reviewed_data = next_reviewed_data,
      lock_version = next_lock,
      last_edited_by_auth_user_id = actor_id
  where organization_id = p_organization_id and id = p_review_id;

  update public.document_operations
  set review_id = p_review_id,
      status = 'completed',
      result = jsonb_build_object(
        'review_id', p_review_id,
        'lock_version', next_lock,
        'region_id', new_region_id,
        'link_id', new_link_id
      ),
      completed_at = now()
  where id = operation.id;

  insert into public.person_ingestion_events (
    organization_id,
    person_id,
    document_id,
    processing_attempt_id,
    actor_auth_user_id,
    event_type,
    result,
    metadata
  ) values (
    p_organization_id,
    review.person_id,
    review.document_id,
    review.processing_attempt_id,
    actor_id,
    event_type,
    'success',
    jsonb_build_object(
      'operation_id', operation.id,
      'review_id', p_review_id,
      'revision_number', next_revision,
      'field_path', p_field_path,
      'page_number', p_page_number,
      'region_id', new_region_id,
      'link_id', new_link_id,
      'coordinate_system', 'normalized-page-v1'
    )
  );

  return query select p_review_id, next_lock, new_region_id, new_link_id, false;
end;
$$;

revoke all on function public.record_profile_review_evidence(
  uuid, uuid, integer, text, text, integer, integer,
  double precision, double precision, double precision, double precision,
  text, text, jsonb, text, uuid, text
) from public, anon;

grant execute on function public.record_profile_review_evidence(
  uuid, uuid, integer, text, text, integer, integer,
  double precision, double precision, double precision, double precision,
  text, text, jsonb, text, uuid, text
) to authenticated;
