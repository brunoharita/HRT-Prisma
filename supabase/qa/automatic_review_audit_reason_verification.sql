begin;

do $qa$
declare
  review public.profile_reviews;
  actor_id uuid;
  saved record;
  persisted_reason text;
begin
  select item.* into review
  from public.profile_reviews item
  where item.state = 'draft'
    and exists (
      select 1
      from public.organization_memberships membership
      where membership.organization_id = item.organization_id
        and membership.role in ('super_admin', 'owner', 'admin', 'recruiter')
    )
  order by item.created_at desc
  limit 1;

  if not found then
    raise exception 'a draft review with an authorized reviewer is required for this QA proof';
  end if;

  select membership.user_id into actor_id
  from public.organization_memberships membership
  where membership.organization_id = review.organization_id
    and membership.role in ('super_admin', 'owner', 'admin', 'recruiter')
  order by membership.created_at
  limit 1;

  perform set_config('request.jwt.claim.sub', actor_id::text, true);

  select * into saved
  from public.save_profile_review(
    review.organization_id,
    review.id,
    review.lock_version,
    review.reviewed_data,
    null,
    'qa:automatic-review-audit:' || review.id::text || ':' || review.lock_version::text
  );

  if saved.lock_version <> review.lock_version + 1 or saved.reused then
    raise exception 'draft save without a free-text reason did not create the expected revision';
  end if;

  select revision.change_reason into persisted_reason
  from public.profile_review_revisions revision
  where revision.organization_id = review.organization_id
    and revision.review_id = review.id
    and revision.revision_number = review.lock_version + 1;

  if persisted_reason <> 'Alteração registrada pelo operador; valores anterior e novo preservados no histórico.' then
    raise exception 'automatic audit description was not persisted';
  end if;
end;
$qa$;

select
  not pg_catalog.has_function_privilege('anon', 'public.save_profile_review(uuid,uuid,integer,jsonb,text,text)', 'EXECUTE') as anon_denied,
  pg_catalog.has_function_privilege('authenticated', 'public.save_profile_review(uuid,uuid,integer,jsonb,text,text)', 'EXECUTE') as authenticated_boundary_allowed,
  not pg_catalog.has_function_privilege(
    'authenticated',
    'private.record_profile_review_evidence(uuid,uuid,integer,text,text,integer,integer,double precision,double precision,double precision,double precision,text,text,jsonb,text,uuid,text)',
    'EXECUTE'
  ) as private_evidence_core_denied;

rollback;
