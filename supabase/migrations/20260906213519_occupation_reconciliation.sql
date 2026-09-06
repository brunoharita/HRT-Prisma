-- One user-facing occupation may aggregate several official occupational
-- references. This is an explicit, auditable decision, never label-based.
create table public.knowledge_occupation_reconciliations (
  id uuid primary key default gen_random_uuid(),
  canonical_occupation_concept_id uuid not null references public.knowledge_concepts(id) on delete restrict,
  source_occupation_concept_id uuid not null references public.knowledge_concepts(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  method text not null check (method in ('human_review', 'official_crosswalk')),
  rationale text not null default '',
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  decided_by_auth_user_id uuid references auth.users(id) on delete restrict,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_occupation_concept_id),
  check (canonical_occupation_concept_id <> source_occupation_concept_id)
);

create index knowledge_occupation_reconciliations_canonical_idx
  on public.knowledge_occupation_reconciliations (canonical_occupation_concept_id, status);

alter table public.knowledge_occupation_reconciliations enable row level security;
revoke all on public.knowledge_occupation_reconciliations from public, anon, authenticated;

create function public.approve_knowledge_occupation_reconciliation(
  p_canonical_occupation_concept_id uuid,
  p_source_occupation_concept_id uuid,
  p_method text,
  p_rationale text,
  p_evidence jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
begin
  if v_actor is null or not private.is_super_admin(v_actor) then
    raise exception using errcode = '42501', message = 'Super Admin approval is required';
  end if;
  if p_method not in ('human_review', 'official_crosswalk') or jsonb_typeof(p_evidence) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid reconciliation contract';
  end if;
  if not exists (select 1 from public.knowledge_concepts c where c.id = p_canonical_occupation_concept_id and c.scope = 'global' and c.concept_type = 'occupation' and c.status = 'approved')
    or not exists (select 1 from public.knowledge_concepts c where c.id = p_source_occupation_concept_id and c.scope = 'global' and c.concept_type = 'occupation' and c.status = 'approved') then
    raise exception using errcode = '23503', message = 'approved global occupations are required';
  end if;
  insert into public.knowledge_occupation_reconciliations (
    canonical_occupation_concept_id, source_occupation_concept_id, status, method, rationale, evidence, decided_by_auth_user_id, decided_at
  ) values (p_canonical_occupation_concept_id, p_source_occupation_concept_id, 'approved', p_method, p_rationale, p_evidence, v_actor, now())
  on conflict (source_occupation_concept_id) do update set
    canonical_occupation_concept_id = excluded.canonical_occupation_concept_id,
    status = 'approved', method = excluded.method, rationale = excluded.rationale, evidence = excluded.evidence,
    decided_by_auth_user_id = v_actor, decided_at = now(), updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.approve_knowledge_occupation_reconciliation(uuid, uuid, text, text, jsonb) from public, anon;
grant execute on function public.approve_knowledge_occupation_reconciliation(uuid, uuid, text, text, jsonb) to authenticated;
