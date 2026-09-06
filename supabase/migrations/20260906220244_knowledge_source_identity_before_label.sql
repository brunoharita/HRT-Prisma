-- Source URI/code and source version are the identity of an imported official
-- concept. A translated label is presentation data and may be shared by
-- different occupations before they are reconciled into one user-facing role.
drop index if exists public.knowledge_concepts_canonical_idx;

create index knowledge_concepts_canonical_lookup_idx
  on public.knowledge_concepts (
    scope,
    coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid),
    concept_type,
    lower(btrim(canonical_label)),
    language,
    version
  );
