-- M5.6: tenant-scoped, PII-free document-intelligence telemetry and structural metadata.

create table public.document_intelligence_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null,
  document_id uuid not null,
  contract_version text not null check (contract_version = '1.0.0'),
  mode text not null check (mode in ('baseline', 'shadow', 'enabled')),
  selected_route text not null check (selected_route in ('native-fast', 'structure', 'vision', 'recovery')),
  effective_route text not null check (effective_route in ('native-fast', 'structure', 'vision', 'recovery')),
  provider text,
  provider_version text,
  model text,
  model_version text,
  fallback_used boolean not null,
  diagnostic_categories text[] not null default '{}',
  stage_metrics jsonb not null check (
    jsonb_typeof(stage_metrics) = 'array'
    and jsonb_array_length(stage_metrics) between 1 and 32
  ),
  actor_auth_user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, person_id) references public.people(organization_id, id) on delete cascade,
  foreign key (organization_id, document_id) references public.documents(organization_id, id) on delete cascade,
  check (diagnostic_categories <@ array[
    'document_ocr_failure', 'layout_reading_order_failure', 'structural_failure',
    'semantic_failure', 'unknown_pattern', 'real_ambiguity',
    'provider_unavailable', 'provider_timeout', 'provider_invalid_response',
    'page_incomplete', 'content_insufficient', 'fallback_used', 'unsupported_input'
  ]::text[]),
  check ((provider is null and provider_version is null and model is null and model_version is null)
    or (provider is not null and provider_version is not null and model is not null and model_version is not null))
);

create index document_intelligence_runs_document_idx
on public.document_intelligence_runs (organization_id, document_id, created_at desc);

alter table public.document_intelligence_runs enable row level security;

create policy document_intelligence_runs_select
on public.document_intelligence_runs
for select to authenticated
using ((select private.has_org_role(
  organization_id,
  array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[]
)));

create policy document_intelligence_runs_insert
on public.document_intelligence_runs
for insert to authenticated
with check (
  actor_auth_user_id = (select auth.uid())
  and (select private.has_org_role(
    organization_id,
    array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[]
  ))
);

revoke all on public.document_intelligence_runs from public, anon, authenticated;
grant select, insert on public.document_intelligence_runs to authenticated;

alter table public.organization_extraction_patterns
  add column structural_signature_version text not null default 'experience-block-signature-v3'
    check (char_length(structural_signature_version) between 8 and 120),
  add column provider_family text not null default 'provider-neutral'
    check (provider_family in ('provider-neutral', 'pdfjs', 'tesseract', 'paddleocr')),
  add column applicability jsonb not null default '{"documentKinds":["resume"],"coordinateSystem":"normalized-page-v1"}'::jsonb
    check (jsonb_typeof(applicability) = 'object'),
  add column invalidation_reason text,
  add column retired_at timestamptz;

update public.organization_extraction_patterns
set retired_at = coalesce(retired_at, updated_at, now()),
    invalidation_reason = coalesce(invalidation_reason, 'legacy_retirement')
where status = 'retired';

alter table public.organization_extraction_patterns
  add constraint organization_extraction_patterns_retirement_metadata_check check (
    (status = 'active' and retired_at is null and invalidation_reason is null)
    or (status = 'retired' and retired_at is not null and char_length(invalidation_reason) between 3 and 500)
  );

comment on table public.document_intelligence_runs is
  'PII-free routing, provider version and stage metrics for M5.6 document intelligence.';
comment on column public.organization_extraction_patterns.applicability is
  'Structural applicability metadata only; never stores copied resume values or occupational knowledge.';
