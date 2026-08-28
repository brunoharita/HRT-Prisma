create index if not exists profile_review_adaptation_events_revision_idx
  on public.profile_review_adaptation_events (organization_id, review_revision_id);

create index if not exists profile_review_adaptation_events_actor_idx
  on public.profile_review_adaptation_events (actor_auth_user_id);
