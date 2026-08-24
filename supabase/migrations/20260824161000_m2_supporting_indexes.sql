create index if not exists documents_actor_auth_user_idx
on public.documents (actor_auth_user_id)
where actor_auth_user_id is not null;

create index if not exists document_page_extractions_org_person_idx
on public.document_page_extractions (organization_id, person_id);

create index if not exists evidence_org_document_idx
on public.evidence (organization_id, document_id);

create index if not exists extraction_drafts_org_document_idx
on public.extraction_drafts (organization_id, document_id);

create index if not exists extraction_drafts_org_person_idx
on public.extraction_drafts (organization_id, person_id);

create index if not exists person_ingestion_events_actor_idx
on public.person_ingestion_events (actor_auth_user_id)
where actor_auth_user_id is not null;

create index if not exists person_ingestion_events_org_document_idx
on public.person_ingestion_events (organization_id, document_id)
where document_id is not null;

create index if not exists person_ingestion_events_org_attempt_idx
on public.person_ingestion_events (organization_id, processing_attempt_id)
where processing_attempt_id is not null;

create index if not exists professional_profiles_org_document_idx
on public.professional_profiles (organization_id, source_document_id);

create index if not exists professional_profiles_org_attempt_idx
on public.professional_profiles (organization_id, processing_attempt_id)
where processing_attempt_id is not null;

create index if not exists platform_user_audit_events_target_idx
on public.platform_user_audit_events (target_platform_user_id)
where target_platform_user_id is not null;

create index if not exists platform_user_audit_events_group_idx
on public.platform_user_audit_events (group_id)
where group_id is not null;

create index if not exists platform_user_audit_events_organization_idx
on public.platform_user_audit_events (organization_id)
where organization_id is not null;
