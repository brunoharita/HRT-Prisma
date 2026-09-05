create table public.vacancy_advisor_research_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_auth_user_id uuid not null references auth.users(id) on delete restrict,
  request_fingerprint text not null check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  subject_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(subject_metadata) = 'object'),
  response_data jsonb check (response_data is null or jsonb_typeof(response_data) = 'object'),
  provider text not null,
  model text not null,
  prompt_version text not null,
  output_schema_version text not null,
  source_policy_version text not null,
  status text not null check (status in ('researching', 'completed', 'failed', 'budget_limited')),
  request_count integer not null default 0 check (request_count >= 0),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  estimated_cost_usd numeric(12,8),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index vacancy_advisor_research_runs_org_created_idx
  on public.vacancy_advisor_research_runs (organization_id, created_at desc);
create index vacancy_advisor_research_runs_fingerprint_idx
  on public.vacancy_advisor_research_runs (organization_id, request_fingerprint, created_at desc);

alter table public.vacancy_advisor_research_runs enable row level security;

create policy vacancy_advisor_research_runs_read
on public.vacancy_advisor_research_runs
for select to authenticated
using ((select private.has_org_role(
  organization_id,
  array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[]
)));

revoke all on table public.vacancy_advisor_research_runs from public, anon, authenticated;
grant select on table public.vacancy_advisor_research_runs to authenticated;

insert into public.knowledge_sources (
  name, domain, source_class, publisher, method, status, license,
  attribution_requirements, last_verified_at
)
values
  ('O*NET Online', 'onetonline.org', 'official_occupational_taxonomy', 'U.S. Department of Labor / National Center for O*NET Development', 'web', 'approved', 'CC BY 4.0 with documented exceptions', 'Citar URL e publisher.', '2026-09-04'),
  ('U.S. Bureau of Labor Statistics', 'bls.gov', 'official_government_or_public_body', 'U.S. Bureau of Labor Statistics', 'web', 'approved', null, 'Citar URL e publisher.', '2026-09-04'),
  ('CNCF', 'cncf.io', 'recognized_nonprofit_foundation', 'Cloud Native Computing Foundation', 'web', 'approved', null, 'Citar URL e publisher.', '2026-09-04'),
  ('GitHub Octoverse', 'github.blog', 'secondary_recognized_source', 'GitHub', 'web', 'approved', null, 'Citar URL, publisher e ano da pesquisa.', '2026-09-04'),
  ('Stack Overflow Developer Survey', 'survey.stackoverflow.co', 'secondary_recognized_source', 'Stack Overflow', 'web', 'approved', null, 'Citar URL, publisher e ano da pesquisa.', '2026-09-04')
on conflict (domain) do update set
  name = excluded.name,
  source_class = excluded.source_class,
  publisher = excluded.publisher,
  method = excluded.method,
  status = excluded.status,
  license = excluded.license,
  attribution_requirements = excluded.attribution_requirements,
  last_verified_at = excluded.last_verified_at,
  updated_at = now();

comment on table public.vacancy_advisor_research_runs is
  'M5.4: ledger tenant-scoped das pesquisas Web do Assistente Prisma, sem armazenar pergunta, perfil ou PII no subject_metadata.';
