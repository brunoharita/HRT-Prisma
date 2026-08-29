-- Spatial evidence refinement 1.2.0.
-- Preserves the raw rectangular selection and records every same-record overlap
-- that the reviewer excluded or explicitly kept in the effective field evidence.

alter table public.spatial_evidence_regions
  add column raw_selected_text text
  check (raw_selected_text is null or char_length(raw_selected_text) <= 2000);

alter table public.spatial_evidence_regions
  drop constraint spatial_evidence_regions_contract_version_check;

alter table public.spatial_evidence_regions
  add constraint spatial_evidence_regions_contract_version_check
  check (contract_version in ('1.0.0', '1.1.0', '1.2.0'));

create table public.profile_review_evidence_refinements (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  review_id uuid not null,
  region_id uuid not null,
  mapped_link_id uuid not null,
  mapped_field_path text not null,
  decision text not null check (decision in ('excluded', 'included')),
  basis text not null check (basis = 'same-record-spatial-overlap'),
  actor_auth_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (organization_id, region_id, mapped_link_id),
  foreign key (organization_id, review_id)
    references public.profile_reviews(organization_id, id) on delete cascade,
  foreign key (organization_id, region_id)
    references public.spatial_evidence_regions(organization_id, id) on delete restrict,
  foreign key (organization_id, mapped_link_id)
    references public.profile_review_evidence_links(organization_id, id) on delete restrict
);

create index profile_review_evidence_refinements_review_idx
on public.profile_review_evidence_refinements (organization_id, review_id, created_at);

create index profile_review_evidence_refinements_mapped_link_idx
on public.profile_review_evidence_refinements (organization_id, mapped_link_id);

create index profile_review_evidence_refinements_actor_idx
on public.profile_review_evidence_refinements (actor_auth_user_id);

alter table public.profile_review_evidence_refinements enable row level security;

create policy profile_review_evidence_refinements_select
on public.profile_review_evidence_refinements
for select to authenticated
using ((select private.has_org_role(
  organization_id,
  array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[]
)));

revoke all on public.profile_review_evidence_refinements from public, anon, authenticated;
revoke all on sequence public.profile_review_evidence_refinements_id_seq from public, anon, authenticated;
grant select on public.profile_review_evidence_refinements to authenticated;

create trigger profile_review_evidence_refinements_immutable
before update or delete on public.profile_review_evidence_refinements
for each row execute function private.prevent_review_evidence_history_mutation();

create or replace function private.review_field_record_scope(p_field_path text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select case
    when p_field_path ~ '^experiences\.[0-9]+\.(role|organization|period|description)$'
      then substring(p_field_path from '^(experiences\.[0-9]+)\.')
    when p_field_path ~ '^education\.[0-9]+\.(course|institution|period|description)$'
      then substring(p_field_path from '^(education\.[0-9]+)\.')
    else null
  end;
$$;

revoke all on function private.review_field_record_scope(text) from public, anon, authenticated;

create function public.record_profile_review_evidence_refined(
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
  p_raw_selected_text text,
  p_selected_text text,
  p_extraction_method text,
  p_refinement_decisions jsonb,
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
  decision jsonb;
  mapped record;
  core_result record;
  refinement_payload jsonb;
  derived_idempotency_key text;
  target_scope text;
begin
  actor_id := private.require_document_reviewer(p_organization_id);

  select * into review
  from public.profile_reviews item
  where item.organization_id = p_organization_id and item.id = p_review_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'review not found in organization';
  end if;

  if p_raw_selected_text is not null and char_length(p_raw_selected_text) > 2000 then
    raise exception using errcode = '22023', message = 'raw selected evidence text is too long';
  end if;

  refinement_payload := coalesce(p_refinement_decisions, '[]'::jsonb);
  if jsonb_typeof(refinement_payload) <> 'array' or jsonb_array_length(refinement_payload) > 32 then
    raise exception using errcode = '22023', message = 'refinement decisions must be a bounded array';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(refinement_payload) item
    where jsonb_typeof(item) <> 'object'
      or item - array['linkId', 'decision']::text[] <> '{}'::jsonb
      or coalesce(item ->> 'linkId', '') !~ '^[0-9a-fA-F-]{36}$'
      or coalesce(item ->> 'decision', '') not in ('excluded', 'included')
  ) then
    raise exception using errcode = '22023', message = 'refinement decision has an invalid contract';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(refinement_payload) item
    group by item ->> 'linkId'
    having count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'refinement decisions contain duplicate links';
  end if;

  target_scope := private.review_field_record_scope(p_field_path);
  if jsonb_array_length(refinement_payload) > 0 and target_scope is null then
    raise exception using errcode = '22023', message = 'refinement is unsupported for this field scope';
  end if;

  for decision in select value from jsonb_array_elements(refinement_payload)
  loop
    select
      link.id as link_id,
      link.field_path,
      region.id as mapped_region_id
    into mapped
    from public.profile_review_evidence_links link
    join public.spatial_evidence_regions region
      on region.organization_id = link.organization_id
     and region.id = link.spatial_region_id
    where link.organization_id = p_organization_id
      and link.review_id = p_review_id
      and link.id = (decision ->> 'linkId')::uuid
      and link.state = 'active'
      and link.field_path <> p_field_path
      and private.review_field_record_scope(link.field_path) = target_scope
      and region.review_id = p_review_id
      and region.document_id = review.document_id
      and region.document_version = p_document_version
      and region.page_number = p_page_number
      and region.x < p_x + p_width
      and region.x + region.width > p_x
      and region.y < p_y + p_height
      and region.y + region.height > p_y;

    if not found then
      raise exception using errcode = '22023', message = 'refinement link is not an active overlapping sibling field';
    end if;
  end loop;

  derived_idempotency_key := left(coalesce(p_idempotency_key, ''), 72)
    || ':ref:'
    || substr(pg_catalog.encode(extensions.digest(concat_ws('|',
      coalesce(p_raw_selected_text, ''),
      coalesce(p_selected_text, ''),
      refinement_payload::text
    ), 'sha256'), 'hex'), 1, 24);

  select * into core_result
  from private.record_profile_review_evidence(
    p_organization_id,
    p_review_id,
    p_expected_lock_version,
    p_field_path,
    p_action,
    p_document_version,
    p_page_number,
    p_x,
    p_y,
    p_width,
    p_height,
    p_selected_text,
    p_extraction_method,
    p_reviewed_data,
    p_reason,
    p_replaces_link_id,
    derived_idempotency_key
  );

  update public.spatial_evidence_regions region
  set raw_selected_text = nullif(btrim(coalesce(p_raw_selected_text, '')), ''),
      contract_version = '1.2.0'
  where region.organization_id = p_organization_id
    and region.review_id = p_review_id
    and region.id = core_result.region_id;

  for decision in select value from jsonb_array_elements(refinement_payload)
  loop
    select link.field_path into mapped
    from public.profile_review_evidence_links link
    where link.organization_id = p_organization_id
      and link.review_id = p_review_id
      and link.id = (decision ->> 'linkId')::uuid;

    insert into public.profile_review_evidence_refinements (
      organization_id,
      review_id,
      region_id,
      mapped_link_id,
      mapped_field_path,
      decision,
      basis,
      actor_auth_user_id
    ) values (
      p_organization_id,
      p_review_id,
      core_result.region_id,
      (decision ->> 'linkId')::uuid,
      mapped.field_path,
      decision ->> 'decision',
      'same-record-spatial-overlap',
      actor_id
    ) on conflict (organization_id, region_id, mapped_link_id) do nothing;
  end loop;

  return query select
    core_result.review_id,
    core_result.lock_version,
    core_result.region_id,
    core_result.link_id,
    core_result.reused;
end;
$$;

revoke all on function public.record_profile_review_evidence_refined(
  uuid, uuid, integer, text, text, integer, integer,
  double precision, double precision, double precision, double precision,
  text, text, text, jsonb, jsonb, text, uuid, text
) from public, anon;

grant execute on function public.record_profile_review_evidence_refined(
  uuid, uuid, integer, text, text, integer, integer,
  double precision, double precision, double precision, double precision,
  text, text, text, jsonb, jsonb, text, uuid, text
) to authenticated;
