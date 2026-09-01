begin;

create or replace function private.m51c_lexical_similarity(p_left text, p_right text)
returns numeric
language sql
immutable
set search_path = ''
as $$
  with left_tokens as (
    select distinct token
    from pg_catalog.regexp_split_to_table(
      pg_catalog.lower(pg_catalog.regexp_replace(coalesce(p_left, ''), '[^a-zA-Z0-9]+', ' ', 'g')),
      '\s+'
    ) token
    where token <> ''
  ), right_tokens as (
    select distinct token
    from pg_catalog.regexp_split_to_table(
      pg_catalog.lower(pg_catalog.regexp_replace(coalesce(p_right, ''), '[^a-zA-Z0-9]+', ' ', 'g')),
      '\s+'
    ) token
    where token <> ''
  ), intersection_count as (
    select count(*)::numeric as value from (
      select token from left_tokens intersect select token from right_tokens
    ) intersection_tokens
  ), union_count as (
    select count(*)::numeric as value from (
      select token from left_tokens union select token from right_tokens
    ) union_tokens
  )
  select case when union_count.value = 0 then 1
    else round(intersection_count.value / union_count.value, 4) end
  from intersection_count cross join union_count;
$$;

create or replace function private.m51c_assess_proposal_duplicate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  maximum_similarity numeric := 0;
  candidates jsonb := '[]'::jsonb;
  exact_duplicate boolean := false;
  visible_text text;
begin
  visible_text := coalesce(new.proposed_item ->> 'stem', '') || ' ' || coalesce((
    select string_agg(option ->> 'label', ' ' order by option ->> 'id')
    from jsonb_array_elements(new.proposed_item -> 'options') option
  ), '');
  if visible_text ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}'
    or visible_text ~* '([0-9]{3}[.-]?){3}[0-9]{2}' then
    new.status := 'validation_failed';
    new.validation_result := jsonb_build_object(
      'valid', false, 'reasonCodes', jsonb_build_array('POTENTIAL_PII_DETECTED')
    );
    return new;
  end if;
  with candidate_content as (
    select 'item'::text as kind, item.id, item.item_key as code,
      item.content_fingerprint as fingerprint, item.stem
    from public.assessment_items item
    where item.organization_id is null or item.organization_id = new.organization_id
    union all
    select 'proposal', proposal.id, proposal.proposed_item ->> 'key',
      proposal.content_fingerprint, proposal.proposed_item ->> 'stem'
    from public.assessment_item_generation_proposals proposal
    where proposal.organization_id = new.organization_id
  ), scored as (
    select kind, id, code, fingerprint = new.content_fingerprint as exact,
      private.m51c_lexical_similarity(new.proposed_item ->> 'stem', stem) as similarity
    from candidate_content
  ), ranked as (
    select * from scored where exact or similarity >= 0.65
    order by exact desc, similarity desc limit 5
  )
  select
    coalesce(max(similarity), 0),
    coalesce(jsonb_agg(jsonb_build_object(
      'kind', kind, 'id', id, 'code', code, 'exact', exact, 'similarity', similarity
    )), '[]'::jsonb),
    coalesce(bool_or(exact), false)
  into maximum_similarity, candidates, exact_duplicate
  from ranked;
  new.maximum_lexical_similarity := maximum_similarity;
  new.duplicate_candidates := candidates;
  if exact_duplicate or maximum_similarity >= 0.92 then
    new.status := 'duplicate_candidate';
    new.validation_result := jsonb_build_object(
      'valid', true,
      'reasonCodes', jsonb_build_array(
        'STRUCTURE_VALID',
        case when exact_duplicate then 'EXACT_DUPLICATE_REVIEW_REQUIRED'
          else 'STRONG_SIMILARITY_REVIEW_REQUIRED' end
      )
    );
  elsif maximum_similarity >= 0.65 then
    new.validation_result := jsonb_build_object(
      'valid', true,
      'reasonCodes', jsonb_build_array('STRUCTURE_VALID', 'POSSIBLE_DUPLICATE_REVIEW_RECOMMENDED')
    );
  end if;
  return new;
end;
$$;

create trigger assessment_item_generation_proposals_assess_duplicate
before insert on public.assessment_item_generation_proposals
for each row execute function private.m51c_assess_proposal_duplicate();

update public.assessment_item_generation_needs need
set status = 'resolved', updated_at = now()
where exists (
  select 1
  from public.assessment_item_generation_requests request
  join public.assessment_item_generation_proposals proposal
    on proposal.organization_id = request.organization_id
    and proposal.generation_request_id = request.id
  where request.organization_id = need.organization_id
    and request.generation_need_id = need.id
    and proposal.status = 'published'
)
and not exists (
  select 1
  from public.assessment_item_generation_requests request
  join public.assessment_item_generation_proposals proposal
    on proposal.organization_id = request.organization_id
    and proposal.generation_request_id = request.id
  where request.organization_id = need.organization_id
    and request.generation_need_id = need.id
    and proposal.status in ('proposed', 'duplicate_candidate', 'in_review', 'approved')
);

revoke all on function private.m51c_lexical_similarity(text, text)
  from public, anon, authenticated, service_role;
revoke all on function private.m51c_assess_proposal_duplicate()
  from public, anon, authenticated, service_role;

commit;
