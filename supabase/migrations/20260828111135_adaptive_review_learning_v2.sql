-- Immediate document learning and controlled organization-scoped extraction patterns.

create table public.profile_review_adaptation_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  review_id uuid not null,
  review_revision_id uuid not null,
  source_field_path text not null check (
    source_field_path ~ '^experiences\.[0-9]+\.(role|organization|period|description)$'
  ),
  pattern_key text not null check (
    char_length(pattern_key) between 10 and 240
    and pattern_key ~ '^experience:block-v2:[a-z0-9:-]+$'
  ),
  method_version text not null check (method_version = 'prisma-document-learning-v2'),
  accepted_suggestions jsonb not null check (
    jsonb_typeof(accepted_suggestions) = 'array'
    and jsonb_array_length(accepted_suggestions) between 1 and 100
  ),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 200),
  request_fingerprint text not null check (char_length(request_fingerprint) = 64),
  lock_version integer not null check (lock_version > 1),
  actor_auth_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (organization_id, review_id, idempotency_key),
  unique (organization_id, id),
  foreign key (organization_id, review_id)
    references public.profile_reviews(organization_id, id) on delete cascade,
  foreign key (organization_id, review_revision_id)
    references public.profile_review_revisions(organization_id, id) on delete cascade
);

create index profile_review_adaptation_events_review_idx
on public.profile_review_adaptation_events (organization_id, review_id, created_at desc);

alter table public.profile_review_adaptation_events enable row level security;
create policy profile_review_adaptation_events_select
on public.profile_review_adaptation_events
for select to authenticated
using ((select private.has_org_role(
  organization_id,
  array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[]
)));
revoke all on public.profile_review_adaptation_events from public, anon, authenticated;
grant select on public.profile_review_adaptation_events to authenticated;

create trigger profile_review_adaptation_events_immutable
before update or delete on public.profile_review_adaptation_events
for each row execute function private.prevent_review_evidence_history_mutation();

create table public.organization_extraction_patterns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pattern_key text not null check (
    char_length(pattern_key) between 10 and 240
    and pattern_key ~ '^experience:block-v2:[a-z0-9:-]+$'
  ),
  method_version text not null check (method_version = 'prisma-document-learning-v2'),
  status text not null default 'active' check (status in ('active', 'retired')),
  confirmation_count integer not null default 1 check (confirmation_count > 0),
  first_confirmed_at timestamptz not null default now(),
  last_confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, pattern_key, method_version),
  unique (organization_id, id)
);

create index organization_extraction_patterns_active_idx
on public.organization_extraction_patterns (organization_id, status, confirmation_count desc, last_confirmed_at desc);

alter table public.organization_extraction_patterns enable row level security;
create policy organization_extraction_patterns_select
on public.organization_extraction_patterns
for select to authenticated
using ((select private.has_org_role(
  organization_id,
  array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[]
)));
revoke all on public.organization_extraction_patterns from public, anon, authenticated;
grant select on public.organization_extraction_patterns to authenticated;

alter table public.extraction_learning_cases
  alter column evidence_event_id drop not null,
  add column adaptation_event_id uuid,
  add column pattern_key text,
  add column source_method_version text,
  add constraint extraction_learning_cases_adaptation_event_fk
    foreign key (organization_id, adaptation_event_id)
    references public.profile_review_adaptation_events(organization_id, id) on delete restrict,
  add constraint extraction_learning_cases_source_shape_check check (
    (evidence_event_id is not null and adaptation_event_id is null and pattern_key is null)
    or (
      evidence_event_id is null
      and adaptation_event_id is not null
      and pattern_key ~ '^experience:block-v2:[a-z0-9:-]+$'
      and source_method_version = 'prisma-document-learning-v2'
    )
  );

create unique index extraction_learning_cases_adaptation_field_idx
on public.extraction_learning_cases (organization_id, adaptation_event_id, field_path)
where adaptation_event_id is not null;

create or replace function public.apply_profile_review_adaptive_suggestions(
  p_organization_id uuid,
  p_review_id uuid,
  p_expected_lock_version integer,
  p_reviewed_data jsonb,
  p_source_field_path text,
  p_pattern_key text,
  p_method_version text,
  p_accepted_suggestions jsonb,
  p_reason text,
  p_idempotency_key text
)
returns table (review_id uuid, lock_version integer, adaptation_event_id uuid, reused boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  review public.profile_reviews;
  existing_event public.profile_review_adaptation_events;
  saved record;
  revision_id uuid;
  new_event_id uuid;
  fingerprint text;
  suggestion jsonb;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  if jsonb_typeof(p_reviewed_data) <> 'object' then
    raise exception using errcode = '22023', message = 'reviewed data must be an object';
  end if;
  if p_source_field_path !~ '^experiences\.[0-9]+\.(role|organization|period|description)$' then
    raise exception using errcode = '22023', message = 'adaptive source field path is invalid';
  end if;
  if p_pattern_key !~ '^experience:block-v2:[a-z0-9:-]+$'
    or char_length(p_pattern_key) not between 10 and 240 then
    raise exception using errcode = '22023', message = 'adaptive pattern key is invalid';
  end if;
  if p_method_version <> 'prisma-document-learning-v2' then
    raise exception using errcode = '22023', message = 'adaptive method version is unsupported';
  end if;
  if jsonb_typeof(p_accepted_suggestions) <> 'array'
    or jsonb_array_length(p_accepted_suggestions) not between 1 and 100 then
    raise exception using errcode = '22023', message = 'adaptive suggestions must be a bounded array';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 3 and 1000 then
    raise exception using errcode = '22023', message = 'adaptive review reason is required';
  end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 200 then
    raise exception using errcode = '22023', message = 'adaptive idempotency key is invalid';
  end if;
  for suggestion in select value from jsonb_array_elements(p_accepted_suggestions)
  loop
    if jsonb_typeof(suggestion) <> 'object'
      or suggestion - array['fieldPath', 'pageNumber', 'evidenceMethod', 'rationaleCode']::text[] <> '{}'::jsonb
      or coalesce(suggestion ->> 'fieldPath', '') !~ '^experiences\.[0-9]+\.(role|organization|period|description)$'
      or jsonb_typeof(suggestion -> 'pageNumber') <> 'number'
      or (suggestion ->> 'pageNumber')::integer not between 1 and 200
      or coalesce(suggestion ->> 'evidenceMethod', '') not in ('pdfjs-layout-v1', 'text-line-v1')
      or coalesce(suggestion ->> 'rationaleCode', '') <> 'same-document-block-pattern' then
      raise exception using errcode = '22023', message = 'adaptive suggestion metadata is invalid';
    end if;
  end loop;

  select * into review from public.profile_reviews item
  where item.organization_id = p_organization_id and item.id = p_review_id;
  if not found then raise exception using errcode = 'P0002', message = 'review not found in organization'; end if;

  fingerprint := pg_catalog.encode(extensions.digest(concat_ws('|',
    p_review_id::text,
    p_expected_lock_version::text,
    pg_catalog.encode(extensions.digest(p_reviewed_data::text, 'sha256'), 'hex'),
    p_source_field_path,
    p_pattern_key,
    p_method_version,
    p_accepted_suggestions::text,
    btrim(p_reason)
  ), 'sha256'), 'hex');

  select * into existing_event
  from public.profile_review_adaptation_events item
  where item.organization_id = p_organization_id
    and item.review_id = p_review_id
    and item.idempotency_key = p_idempotency_key;
  if found then
    if existing_event.request_fingerprint <> fingerprint then
      raise exception using errcode = '23505', message = 'adaptive idempotency key reused with another request';
    end if;
    return query select p_review_id, existing_event.lock_version, existing_event.id, true;
    return;
  end if;

  select * into saved from public.save_profile_review(
    p_organization_id,
    p_review_id,
    p_expected_lock_version,
    p_reviewed_data,
    btrim(p_reason),
    left('adaptive:' || p_idempotency_key, 200)
  );

  select item.id into revision_id
  from public.profile_review_revisions item
  where item.organization_id = p_organization_id
    and item.review_id = p_review_id
    and item.revision_number = saved.lock_version;
  if revision_id is null then
    raise exception using errcode = 'P0002', message = 'adaptive review revision was not found';
  end if;

  insert into public.profile_review_adaptation_events (
    organization_id, review_id, review_revision_id, source_field_path,
    pattern_key, method_version, accepted_suggestions, idempotency_key,
    request_fingerprint, lock_version, actor_auth_user_id
  ) values (
    p_organization_id, p_review_id, revision_id, p_source_field_path,
    p_pattern_key, p_method_version, p_accepted_suggestions, p_idempotency_key,
    fingerprint, saved.lock_version, actor_id
  ) returning id into new_event_id;

  insert into public.extraction_learning_cases (
    organization_id, review_id, evidence_event_id, adaptation_event_id,
    field_path, learning_scope, status, source_contract_version,
    reviewed_contract_version, pattern_key, source_method_version
  )
  select distinct
    p_organization_id, p_review_id, null::bigint, new_event_id,
    item.value ->> 'fieldPath', 'document_local', 'candidate', '2.0.0',
    '2.0.0', p_pattern_key, p_method_version
  from jsonb_array_elements(p_accepted_suggestions) item(value);

  insert into public.person_ingestion_events (
    organization_id, person_id, document_id, processing_attempt_id,
    actor_auth_user_id, event_type, result, metadata
  ) values (
    p_organization_id, review.person_id, review.document_id, review.processing_attempt_id,
    actor_id, 'adaptive_review_suggestions_applied', 'success',
    jsonb_build_object(
      'review_id', p_review_id,
      'adaptation_event_id', new_event_id,
      'pattern_key', p_pattern_key,
      'suggestion_count', jsonb_array_length(p_accepted_suggestions),
      'method_version', p_method_version
    )
  );

  return query select p_review_id, saved.lock_version, new_event_id, false;
end;
$$;

revoke all on function public.apply_profile_review_adaptive_suggestions(
  uuid, uuid, integer, jsonb, text, text, text, jsonb, text, text
) from public, anon;
grant execute on function public.apply_profile_review_adaptive_suggestions(
  uuid, uuid, integer, jsonb, text, text, text, jsonb, text, text
) to authenticated;

create or replace function private.approve_extraction_learning_cases()
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

    insert into public.organization_extraction_patterns (
      organization_id, pattern_key, method_version,
      status, confirmation_count, first_confirmed_at, last_confirmed_at
    )
    select
      learning.organization_id,
      learning.pattern_key,
      learning.source_method_version,
      'active', 1, now(), now()
    from public.extraction_learning_cases learning
    where learning.organization_id = new.organization_id
      and learning.review_id = new.id
      and learning.status = 'approved'
      and learning.adaptation_event_id is not null
    group by learning.organization_id, learning.pattern_key, learning.source_method_version
    on conflict (organization_id, pattern_key, method_version)
    do update set
      status = 'active',
      confirmation_count = public.organization_extraction_patterns.confirmation_count + 1,
      last_confirmed_at = now(),
      updated_at = now();
  end if;
  return new;
end;
$$;

revoke all on function private.approve_extraction_learning_cases() from public, anon, authenticated;
