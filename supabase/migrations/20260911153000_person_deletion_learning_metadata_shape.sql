-- Allow definitive deletion to detach durable learning provenance safely.
-- Approved/rejected learning is metadata-only after its Person review is purged.
alter table public.extraction_learning_cases
  drop constraint extraction_learning_cases_source_shape_check,
  add constraint extraction_learning_cases_source_shape_check check (
    (evidence_event_id is not null and adaptation_event_id is null and pattern_key is null)
    or (
      evidence_event_id is null
      and adaptation_event_id is not null
      and (pattern_key ~ '^experience:block-v2:[a-z0-9:-]+$' or pattern_key ~ '^record:(experience|education|certification):block-v1:[a-z0-9:-]+$')
      and source_method_version in ('prisma-document-learning-v2', 'prisma-document-learning-v3', 'prisma-document-learning-v4')
    )
    or (
      evidence_event_id is null
      and adaptation_event_id is null
      and pattern_key is null
      and status in ('approved', 'rejected')
    )
  );
