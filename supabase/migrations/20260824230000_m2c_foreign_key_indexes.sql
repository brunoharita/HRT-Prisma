-- Cover M2-C foreign keys used by joins, cascades, and actor audit lookups.
create index if not exists document_operations_actor_idx
  on public.document_operations (actor_auth_user_id);
create index if not exists document_operations_person_idx
  on public.document_operations (organization_id, person_id);
create index if not exists document_operations_attempt_idx
  on public.document_operations (organization_id, processing_attempt_id);
create index if not exists document_operations_profile_idx
  on public.document_operations (organization_id, profile_id);
create index if not exists document_operations_review_idx
  on public.document_operations (organization_id, review_id);

create index if not exists processing_attempts_actor_idx
  on public.document_processing_attempts (actor_auth_user_id);
create index if not exists processing_attempts_retry_idx
  on public.document_processing_attempts (organization_id, retry_of_attempt_id);

create index if not exists profile_review_changes_actor_idx
  on public.profile_review_changes (actor_auth_user_id);
create index if not exists profile_review_changes_revision_idx
  on public.profile_review_changes (organization_id, review_revision_id);

create index if not exists profile_review_revisions_actor_idx
  on public.profile_review_revisions (actor_auth_user_id);

create index if not exists profile_reviews_approved_by_idx
  on public.profile_reviews (approved_by_auth_user_id);
create index if not exists profile_reviews_last_edited_by_idx
  on public.profile_reviews (last_edited_by_auth_user_id);
create index if not exists profile_reviews_approved_profile_idx
  on public.profile_reviews (organization_id, approved_profile_id);
create index if not exists profile_reviews_base_profile_idx
  on public.profile_reviews (organization_id, base_profile_id);
create index if not exists profile_reviews_document_idx
  on public.profile_reviews (organization_id, document_id);
create index if not exists profile_reviews_started_by_idx
  on public.profile_reviews (started_by_auth_user_id);
