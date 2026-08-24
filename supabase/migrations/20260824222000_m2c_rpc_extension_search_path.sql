-- The applied QA function bodies use unqualified pgcrypto helpers. Restrict
-- resolution to trusted system/extension schemas; public remains excluded.
alter function public.register_person_document(uuid, uuid, public.document_source_type, text, text, text, text, bigint, integer, text, text)
  set search_path = pg_catalog, extensions;
alter function public.record_document_failure(uuid, uuid, uuid, public.processing_state, text, text, text)
  set search_path = pg_catalog, extensions;
alter function public.persist_person_extraction(uuid, uuid, uuid, jsonb, jsonb, integer, integer, text, text, text, text, text, uuid)
  set search_path = pg_catalog, extensions;
alter function public.start_profile_review(uuid, uuid, uuid, uuid, text)
  set search_path = pg_catalog, extensions;
alter function public.save_profile_review(uuid, uuid, integer, jsonb, text, text)
  set search_path = pg_catalog, extensions;
alter function public.approve_profile_review(uuid, uuid, integer, text)
  set search_path = pg_catalog, extensions;
