-- Keep document identity, versioned spatial evidence and person ownership atomic.
begin;

alter table public.spatial_evidence_regions
  drop constraint spatial_evidence_regions_organization_id_document_id_docum_fkey,
  add constraint spatial_evidence_regions_document_version_fk
    foreign key (organization_id, document_id, document_version)
    references public.documents(organization_id, id, document_version)
    on delete cascade deferrable initially deferred;

create or replace function private.reassign_document_person(
  p_organization_id uuid, p_document_id uuid, p_target_person_id uuid
) returns integer language plpgsql set search_path = '' as $$
declare
  next_document_version integer;
begin
  select coalesce(max(item.document_version), 0) + 1 into next_document_version
  from public.documents item
  where item.organization_id = p_organization_id and item.person_id = p_target_person_id
    and item.id <> p_document_id;

  update public.documents set person_id = p_target_person_id,
    document_version = next_document_version, updated_at = now()
  where organization_id = p_organization_id and id = p_document_id;
  update public.spatial_evidence_regions set person_id = p_target_person_id,
    document_version = next_document_version
  where organization_id = p_organization_id and document_id = p_document_id;
  update public.document_processing_attempts set person_id = p_target_person_id
  where organization_id = p_organization_id and document_id = p_document_id;
  update public.document_page_extractions set person_id = p_target_person_id
  where organization_id = p_organization_id and document_id = p_document_id;
  update public.extraction_drafts set person_id = p_target_person_id
  where organization_id = p_organization_id and document_id = p_document_id;
  update public.evidence set person_id = p_target_person_id
  where organization_id = p_organization_id and document_id = p_document_id;
  update public.profile_reviews set person_id = p_target_person_id
  where organization_id = p_organization_id and document_id = p_document_id;
  update public.profile_publication_decisions decision set person_id = p_target_person_id
  where decision.organization_id = p_organization_id and decision.review_id in (
    select review.id from public.profile_reviews review
    where review.organization_id = p_organization_id and review.document_id = p_document_id
  );
  update public.knowledge_observations observation set person_id = p_target_person_id
  where observation.organization_id = p_organization_id and observation.evidence_id in (
    select evidence.id from public.evidence evidence
    where evidence.organization_id = p_organization_id and evidence.document_id = p_document_id
  );
  return next_document_version;
end;
$$;

revoke all on function private.reassign_document_person(uuid, uuid, uuid) from public, anon, authenticated;

commit;
