-- The publication Delta is the only client-facing authority that may promote a review.
-- The legacy approval function remains an internal implementation detail so existing
-- database routines can reuse its atomic promotion logic without allowing clients to
-- bypass omission preservation and explicit-removal governance.

revoke execute on function public.approve_profile_review(uuid, uuid, integer, text)
  from public, anon, authenticated;

revoke all on function public.publish_profile_review(uuid, uuid, integer, jsonb, text)
  from public, anon;
grant execute on function public.publish_profile_review(uuid, uuid, integer, jsonb, text)
  to authenticated;

comment on function public.approve_profile_review(uuid, uuid, integer, text) is
  'Internal profile-promotion primitive. Client publication must use publish_profile_review so omissions are preserved and explicit removals are audited.';

comment on function public.publish_profile_review(uuid, uuid, integer, jsonb, text) is
  'Canonical publication authority for reviewed profiles. Merges approved facts, preserves omissions, records explicit removals and promotes one atomic profile version.';
