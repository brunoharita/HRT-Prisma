begin;

-- Browser tabs opened before the frontend rollout may still submit the visual
-- "(LinkedIn)" PDF label. Canonicalize only the review copy at the database
-- boundary so the preserved pages and source evidence remain unchanged.
create or replace function private.normalize_resume_linkedin_for_review(payload jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  normalized jsonb := payload;
  raw_linkedin text;
  canonical_linkedin text;
  current_uncertainties jsonb;
  linkedin_review_uncertainty constant text := 'O endereço do LinkedIn identificado precisa de conferência.';
begin
  if jsonb_typeof(payload) <> 'object'
    or payload #> '{contact,linkedin}' is null
    or payload #> '{contact,linkedin}' = 'null'::jsonb
  then
    return payload;
  end if;

  -- Unexpected structural types remain untouched and are rejected by the
  -- existing structured-summary constraint instead of being silently coerced.
  if jsonb_typeof(payload #> '{contact,linkedin}') <> 'string' then
    return payload;
  end if;

  raw_linkedin := btrim(payload #>> '{contact,linkedin}');
  canonical_linkedin := btrim(pg_catalog.regexp_replace(
    raw_linkedin,
    '\s*\(linkedin\)\s*$',
    '',
    'i'
  ));
  canonical_linkedin := pg_catalog.regexp_replace(canonical_linkedin, '^http://', 'https://', 'i');
  if canonical_linkedin !~* '^https://' then
    canonical_linkedin := 'https://' || canonical_linkedin;
  end if;
  canonical_linkedin := pg_catalog.regexp_replace(canonical_linkedin, '[?#].*$', '');
  canonical_linkedin := pg_catalog.regexp_replace(canonical_linkedin, '/$', '');

  if char_length(canonical_linkedin) <= 500
    and canonical_linkedin ~* '^https://([a-z0-9-]+\.)?linkedin\.com/in/[a-z0-9%_.-]+$'
  then
    return pg_catalog.jsonb_set(
      normalized,
      '{contact,linkedin}',
      pg_catalog.to_jsonb(canonical_linkedin),
      false
    );
  end if;

  normalized := pg_catalog.jsonb_set(
    normalized,
    '{contact,linkedin}',
    'null'::jsonb,
    false
  );
  current_uncertainties := case
    when jsonb_typeof(normalized -> 'uncertainties') = 'array'
      then normalized -> 'uncertainties'
    else '[]'::jsonb
  end;
  if not current_uncertainties @> pg_catalog.jsonb_build_array(linkedin_review_uncertainty) then
    current_uncertainties := current_uncertainties
      || pg_catalog.jsonb_build_array(linkedin_review_uncertainty);
  end if;

  return pg_catalog.jsonb_set(
    normalized,
    '{uncertainties}',
    current_uncertainties,
    true
  );
end;
$$;

revoke all on function private.normalize_resume_linkedin_for_review(jsonb)
from public, anon, authenticated;

create or replace function private.normalize_extraction_draft_linkedin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.identified_fields := private.normalize_resume_linkedin_for_review(new.identified_fields);
  return new;
end;
$$;

revoke all on function private.normalize_extraction_draft_linkedin()
from public, anon, authenticated;

drop trigger if exists normalize_extraction_draft_linkedin
on public.extraction_drafts;

create trigger normalize_extraction_draft_linkedin
before insert or update of identified_fields on public.extraction_drafts
for each row
execute function private.normalize_extraction_draft_linkedin();

-- Fail the migration atomically if the database implementation diverges from
-- the already approved frontend behavior.
do $$
declare
  labeled_result jsonb;
  invalid_result jsonb;
  malformed_payload jsonb := '{"contact":{"linkedin":["unexpected"]},"uncertainties":[]}'::jsonb;
begin
  labeled_result := private.normalize_resume_linkedin_for_review(
    '{"contact":{"linkedin":"www.linkedin.com/in/synthetic-profile (LinkedIn)"},"summary":"Preservado","uncertainties":[]}'::jsonb
  );
  if labeled_result #>> '{contact,linkedin}' <> 'https://www.linkedin.com/in/synthetic-profile'
    or labeled_result ->> 'summary' <> 'Preservado'
    or labeled_result -> 'uncertainties' <> '[]'::jsonb
  then
    raise exception using errcode = '23514', message = 'linkedin labeled draft normalization failed';
  end if;

  invalid_result := private.normalize_resume_linkedin_for_review(
    '{"contact":{"linkedin":"https://www.linkedin.com/company/synthetic-company"},"uncertainties":[]}'::jsonb
  );
  if invalid_result #> '{contact,linkedin}' <> 'null'::jsonb
    or not (invalid_result -> 'uncertainties') @> pg_catalog.jsonb_build_array(
      'O endereço do LinkedIn identificado precisa de conferência.'
    )
  then
    raise exception using errcode = '23514', message = 'linkedin invalid draft review fallback failed';
  end if;

  if private.normalize_resume_linkedin_for_review(malformed_payload) <> malformed_payload then
    raise exception using errcode = '23514', message = 'linkedin malformed structure was silently coerced';
  end if;
end;
$$;

comment on function private.normalize_resume_linkedin_for_review(jsonb) is
  'Canonicalizes the LinkedIn review copy from stale resume clients without changing preserved pages or accepting malformed structured data.';

comment on trigger normalize_extraction_draft_linkedin on public.extraction_drafts is
  'Protects draft persistence from stale clients that include a visual LinkedIn PDF label.';

commit;
