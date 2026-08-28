-- Adaptive resume extraction, field-level spatial provenance and auditable reviewer evidence retirement.

alter table public.document_page_extractions
  add column layout_blocks jsonb not null default '[]'::jsonb check (jsonb_typeof(layout_blocks) = 'array'),
  add column field_evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(field_evidence) = 'array');

alter table public.document_operations
  drop constraint if exists document_operations_operation_type_check;

alter table public.document_operations
  add constraint document_operations_operation_type_check check (operation_type in (
    'register_document', 'persist_extraction', 'retry_processing', 'record_failure',
    'start_review', 'save_review_draft', 'approve_review', 'invalidate_review',
    'record_review_evidence', 'retire_review_evidence'
  ));

alter table public.profile_review_evidence_events
  drop constraint if exists profile_review_evidence_events_event_type_check;
alter table public.profile_review_evidence_events
  alter column new_link_id drop not null,
  add constraint profile_review_evidence_events_event_type_check check (event_type in (
    'human_region_added', 'review_evidence_replaced', 'complementary_evidence_added',
    'new_information_created', 'review_evidence_removed'
  )),
  add constraint profile_review_evidence_events_link_shape_check check (
    (event_type = 'review_evidence_removed' and previous_link_id is not null and new_link_id is null)
    or (event_type <> 'review_evidence_removed' and new_link_id is not null)
  );

alter table public.profile_review_evidence_events
  add constraint profile_review_evidence_events_org_id_unique unique (organization_id, id);

do $$
declare constraint_name text;
begin
  select item.conname into constraint_name
  from pg_catalog.pg_constraint item
  where item.conrelid = 'public.profile_review_evidence_links'::regclass
    and item.contype = 'c'
    and pg_catalog.pg_get_constraintdef(item.oid) like '%link_kind = ''original''%';
  if constraint_name is not null then
    execute format('alter table public.profile_review_evidence_links drop constraint %I', constraint_name);
  end if;
end;
$$;

alter table public.profile_review_evidence_links
  add constraint profile_review_evidence_links_kind_source_check check (
    (link_kind = 'original' and (evidence_id is not null or spatial_region_id is not null))
    or (link_kind <> 'original' and spatial_region_id is not null)
  );

create table public.extraction_learning_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  review_id uuid not null,
  evidence_event_id bigint not null,
  field_path text not null,
  learning_scope text not null default 'document_local' check (learning_scope in ('document_local', 'evaluation_candidate')),
  status text not null default 'candidate' check (status in ('candidate', 'approved', 'rejected')),
  source_contract_version text not null default '2.0.0',
  reviewed_contract_version text not null default '1.2.0',
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, evidence_event_id),
  unique (organization_id, id),
  foreign key (organization_id, review_id) references public.profile_reviews(organization_id, id) on delete cascade,
  foreign key (organization_id, evidence_event_id) references public.profile_review_evidence_events(organization_id, id) on delete restrict,
  check ((status = 'approved' and approved_at is not null) or (status <> 'approved' and approved_at is null))
);

create index extraction_learning_cases_review_idx
on public.extraction_learning_cases (organization_id, review_id, status, created_at desc);

alter table public.extraction_learning_cases enable row level security;
create policy extraction_learning_cases_select on public.extraction_learning_cases
for select to authenticated
using ((select private.has_org_role(
  organization_id,
  array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[]
)));
revoke all on public.extraction_learning_cases from public, anon, authenticated;
grant select on public.extraction_learning_cases to authenticated;

create function private.capture_extraction_learning_case()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.event_type in ('human_region_added', 'review_evidence_replaced', 'new_information_created') then
    insert into public.extraction_learning_cases (
      organization_id, review_id, evidence_event_id, field_path
    ) values (
      new.organization_id, new.review_id, new.id, new.field_path
    ) on conflict do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private.capture_extraction_learning_case() from public, anon, authenticated;
create trigger profile_review_evidence_capture_learning_case
after insert on public.profile_review_evidence_events
for each row execute function private.capture_extraction_learning_case();

create function private.approve_extraction_learning_cases()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.state = 'draft' and new.state = 'approved' then
    update public.extraction_learning_cases
    set status = 'approved', learning_scope = 'evaluation_candidate', approved_at = now()
    where organization_id = new.organization_id and review_id = new.id and status = 'candidate';
  end if;
  return new;
end;
$$;

revoke all on function private.approve_extraction_learning_cases() from public, anon, authenticated;
create trigger profile_reviews_approve_learning_cases
after update of state on public.profile_reviews
for each row execute function private.approve_extraction_learning_cases();

create function private.link_profile_review_spatial_original_evidence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  page_record record;
  descriptor jsonb;
  new_region_id uuid;
begin
  for page_record in
    select page.page_number, page.field_evidence
    from public.document_page_extractions page
    where page.organization_id = new.organization_id
      and page.processing_attempt_id = new.processing_attempt_id
  loop
    for descriptor in select * from jsonb_array_elements(page_record.field_evidence)
    loop
      if descriptor ? 'fieldPath'
        and (descriptor ->> 'x') is not null
        and (descriptor ->> 'y') is not null
        and (descriptor ->> 'width') is not null
        and (descriptor ->> 'height') is not null then
        insert into public.spatial_evidence_regions (
          organization_id, person_id, document_id, document_version, review_id,
          page_number, x, y, width, height, selected_text, extraction_method,
          source, created_by_auth_user_id
        )
        select
          new.organization_id, new.person_id, new.document_id, document.document_version, new.id,
          page_record.page_number,
          (descriptor ->> 'x')::double precision,
          (descriptor ->> 'y')::double precision,
          (descriptor ->> 'width')::double precision,
          (descriptor ->> 'height')::double precision,
          left(nullif(btrim(descriptor ->> 'text'), ''), 2000),
          'pdfjs-text-layer-v1', 'system', null
        from public.documents document
        where document.organization_id = new.organization_id and document.id = new.document_id
        returning id into new_region_id;

        insert into public.profile_review_evidence_links (
          organization_id, review_id, field_path, spatial_region_id,
          link_kind, reason, created_by_auth_user_id
        ) values (
          new.organization_id, new.id, descriptor ->> 'fieldPath', new_region_id,
          'original', 'Região identificada pela extração visual adaptativa.', new.started_by_auth_user_id
        );
      end if;
    end loop;
  end loop;
  return new;
end;
$$;

revoke all on function private.link_profile_review_spatial_original_evidence() from public, anon, authenticated;
create trigger profile_reviews_link_spatial_original_evidence
after insert on public.profile_reviews
for each row execute function private.link_profile_review_spatial_original_evidence();

alter function public.persist_person_extraction(
  uuid, uuid, uuid, jsonb, jsonb, integer, integer,
  text, text, text, text, text, uuid
) set schema private;

revoke all on function private.persist_person_extraction(
  uuid, uuid, uuid, jsonb, jsonb, integer, integer,
  text, text, text, text, text, uuid
) from public, anon, authenticated;

create function public.persist_person_extraction(
  p_organization_id uuid,
  p_person_id uuid,
  p_document_id uuid,
  p_pages jsonb,
  p_draft jsonb,
  p_pages_native integer,
  p_pages_ocr integer,
  p_native_extraction_version text,
  p_ocr_version text,
  p_structuring_version text,
  p_draft_version text,
  p_idempotency_key text,
  p_retry_of_attempt_id uuid default null
)
returns table (processing_attempt_id uuid, structured boolean, attempt_number integer, reused boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare result record;
begin
  if exists (
    select 1 from jsonb_array_elements(p_pages) page(value)
    where jsonb_typeof(coalesce(page.value -> 'layout_blocks', '[]'::jsonb)) <> 'array'
       or jsonb_typeof(coalesce(page.value -> 'field_evidence', '[]'::jsonb)) <> 'array'
  ) then
    raise exception using errcode = '22023', message = 'layout blocks and field evidence must be arrays';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_pages) page(value)
    where jsonb_array_length(coalesce(page.value -> 'layout_blocks', '[]'::jsonb)) > 10000
       or jsonb_array_length(coalesce(page.value -> 'field_evidence', '[]'::jsonb)) > 1000
  ) then
    raise exception using errcode = '22023', message = 'adaptive extraction payload exceeds safe limits';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_pages) page(value)
    cross join lateral jsonb_array_elements(coalesce(page.value -> 'field_evidence', '[]'::jsonb)) descriptor(value)
    where (descriptor.value ->> 'fieldPath') is null
       or (descriptor.value ->> 'fieldPath') !~ '^(summary|certifications|languages|competencies|uncertainties|notIdentified|experiences\.[0-9]+(\.(role|organization|period|description))?|education\.[0-9]+(\.(course|institution|period|description))?)$'
       or ((descriptor.value ->> 'x') is not null and page.value ->> 'origin' <> 'native_pdf')
       or ((descriptor.value ->> 'x') is null) <> ((descriptor.value ->> 'y') is null)
       or ((descriptor.value ->> 'x') is null) <> ((descriptor.value ->> 'width') is null)
       or ((descriptor.value ->> 'x') is null) <> ((descriptor.value ->> 'height') is null)
       or ((descriptor.value ->> 'x') is not null and (
         jsonb_typeof(descriptor.value -> 'x') <> 'number'
         or jsonb_typeof(descriptor.value -> 'y') <> 'number'
         or jsonb_typeof(descriptor.value -> 'width') <> 'number'
         or jsonb_typeof(descriptor.value -> 'height') <> 'number'
         or (descriptor.value ->> 'x')::double precision < 0
         or (descriptor.value ->> 'y')::double precision < 0
         or (descriptor.value ->> 'width')::double precision <= 0
         or (descriptor.value ->> 'height')::double precision <= 0
         or (descriptor.value ->> 'x')::double precision + (descriptor.value ->> 'width')::double precision > 1
         or (descriptor.value ->> 'y')::double precision + (descriptor.value ->> 'height')::double precision > 1
       ))
  ) then
    raise exception using errcode = '22023', message = 'adaptive field evidence is invalid';
  end if;

  select * into result from private.persist_person_extraction(
    p_organization_id, p_person_id, p_document_id, p_pages, p_draft,
    p_pages_native, p_pages_ocr, p_native_extraction_version, p_ocr_version,
    p_structuring_version, p_draft_version, p_idempotency_key, p_retry_of_attempt_id
  );

  update public.document_page_extractions page
  set layout_blocks = coalesce(payload.value -> 'layout_blocks', '[]'::jsonb),
      field_evidence = coalesce(payload.value -> 'field_evidence', '[]'::jsonb)
  from jsonb_array_elements(p_pages) payload(value)
  where page.organization_id = p_organization_id
    and page.processing_attempt_id = result.processing_attempt_id
    and page.page_number = (payload.value ->> 'page_number')::integer;

  return query select result.processing_attempt_id, result.structured, result.attempt_number, result.reused;
end;
$$;

revoke all on function public.persist_person_extraction(
  uuid, uuid, uuid, jsonb, jsonb, integer, integer,
  text, text, text, text, text, uuid
) from public, anon;
grant execute on function public.persist_person_extraction(
  uuid, uuid, uuid, jsonb, jsonb, integer, integer,
  text, text, text, text, text, uuid
) to authenticated;

create function public.retire_profile_review_evidence(
  p_organization_id uuid,
  p_review_id uuid,
  p_expected_lock_version integer,
  p_link_id uuid,
  p_reason text,
  p_idempotency_key text
)
returns table (review_id uuid, lock_version integer, reused boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  review public.profile_reviews;
  link public.profile_review_evidence_links;
  operation public.document_operations;
  revision_id uuid;
  next_lock integer;
  resolved_reason text;
  fingerprint text;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  resolved_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if resolved_reason is null or char_length(resolved_reason) not between 3 and 1000 then
    raise exception using errcode = '22023', message = 'review evidence retirement reason is invalid';
  end if;

  select * into review from public.profile_reviews item
  where item.organization_id = p_organization_id and item.id = p_review_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'review not found in organization'; end if;

  fingerprint := pg_catalog.encode(extensions.digest(concat_ws('|',
    p_review_id::text, p_expected_lock_version::text, p_link_id::text, resolved_reason
  ), 'sha256'), 'hex');
  operation := private.claim_document_operation(
    p_organization_id, review.person_id, review.document_id, 'retire_review_evidence',
    p_idempotency_key, fingerprint, actor_id
  );
  if operation.status = 'completed' then
    return query select p_review_id, (operation.result ->> 'lock_version')::integer, true;
    return;
  end if;

  if review.state <> 'draft' then raise exception using errcode = '55000', message = 'review is no longer editable'; end if;
  if review.lock_version <> p_expected_lock_version then raise exception using errcode = 'P0001', message = 'review_conflict'; end if;

  select * into link from public.profile_review_evidence_links item
  where item.organization_id = p_organization_id and item.review_id = p_review_id
    and item.id = p_link_id and item.state = 'active' for update;
  if not found then raise exception using errcode = 'P0002', message = 'active review evidence was not found'; end if;
  if link.link_kind = 'original' then raise exception using errcode = '42501', message = 'original extraction evidence cannot be retired'; end if;

  next_lock := review.lock_version + 1;
  insert into public.profile_review_revisions (
    organization_id, review_id, revision_number, reviewed_data, change_reason, actor_auth_user_id
  ) values (
    p_organization_id, p_review_id, next_lock, review.reviewed_data, resolved_reason, actor_id
  ) returning id into revision_id;

  update public.profile_review_evidence_links
  set state = 'superseded', superseded_at = now()
  where organization_id = p_organization_id and id = p_link_id;

  update public.extraction_learning_cases learning
  set status = 'rejected'
  from public.profile_review_evidence_events event
  where learning.organization_id = p_organization_id
    and learning.review_id = p_review_id
    and learning.status = 'candidate'
    and event.organization_id = learning.organization_id
    and event.id = learning.evidence_event_id
    and event.new_link_id = p_link_id;

  insert into public.profile_review_evidence_events (
    organization_id, review_id, review_revision_id, field_path, event_type,
    previous_link_id, new_link_id, reason, actor_auth_user_id
  ) values (
    p_organization_id, p_review_id, revision_id, link.field_path, 'review_evidence_removed',
    link.id, null, resolved_reason, actor_id
  );

  update public.profile_reviews
  set lock_version = next_lock, last_edited_by_auth_user_id = actor_id
  where organization_id = p_organization_id and id = p_review_id;

  update public.document_operations
  set review_id = p_review_id, status = 'completed',
      result = jsonb_build_object('review_id', p_review_id, 'lock_version', next_lock, 'retired_link_id', p_link_id),
      completed_at = now()
  where id = operation.id;

  insert into public.person_ingestion_events (
    organization_id, person_id, document_id, processing_attempt_id,
    actor_auth_user_id, event_type, result, metadata
  ) values (
    p_organization_id, review.person_id, review.document_id, review.processing_attempt_id,
    actor_id, 'review_evidence_removed', 'success',
    jsonb_build_object('operation_id', operation.id, 'review_id', p_review_id, 'field_path', link.field_path, 'retired_link_id', p_link_id)
  );

  return query select p_review_id, next_lock, false;
end;
$$;

revoke all on function public.retire_profile_review_evidence(uuid, uuid, integer, uuid, text, text) from public, anon;
grant execute on function public.retire_profile_review_evidence(uuid, uuid, integer, uuid, text, text) to authenticated;
