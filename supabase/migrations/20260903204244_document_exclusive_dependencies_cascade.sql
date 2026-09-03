-- Exclusive review/evidence rows may be removed only by the authorized owner-bound lifecycle RPC.
create or replace function private.prevent_review_evidence_history_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare lifecycle_owner name; authorized_operation_id uuid;
begin
  select pg_catalog.pg_get_userbyid(procedure.proowner) into lifecycle_owner
  from pg_catalog.pg_proc procedure
  where procedure.oid = 'public.finalize_document_deletion(uuid,uuid)'::regprocedure;
  begin
    authorized_operation_id := nullif(current_setting('prisma.document_deletion_operation_id', true), '')::uuid;
  exception when invalid_text_representation then
    authorized_operation_id := null;
  end;
  if tg_op = 'DELETE' and current_user = lifecycle_owner and exists (
    select 1 from public.document_operations operation
    where operation.id = authorized_operation_id
      and operation.organization_id = old.organization_id
      and operation.operation_type = 'delete_document'
      and operation.status = 'started'
  ) then return old; end if;
  raise exception using errcode = '55000', message = 'review evidence history is immutable';
end;
$$;

revoke all on function private.prevent_review_evidence_history_mutation() from public, anon, authenticated;

create function private.authorize_document_dependency_cascade()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare lifecycle_owner name; authorized_operation_id uuid;
begin
  select pg_catalog.pg_get_userbyid(procedure.proowner) into lifecycle_owner
  from pg_catalog.pg_proc procedure
  where procedure.oid = 'public.finalize_document_deletion(uuid,uuid)'::regprocedure;
  select operation.id into authorized_operation_id
  from public.document_operations operation
  where operation.organization_id = old.organization_id
    and operation.operation_type = 'delete_document'
    and operation.status = 'started'
    and operation.result ->> 'document_id' = old.id::text
  order by operation.started_at desc limit 1;
  if current_user <> lifecycle_owner or authorized_operation_id is null then
    raise exception using errcode = '42501', message = 'document deletion must use the authorized lifecycle operation';
  end if;
  perform set_config('prisma.document_deletion_operation_id', authorized_operation_id::text, true);
  return old;
end;
$$;

revoke all on function private.authorize_document_dependency_cascade() from public, anon, authenticated;

create trigger documents_authorize_dependency_cascade
before delete on public.documents
for each row execute function private.authorize_document_dependency_cascade();

alter table public.profile_review_evidence_events
  drop constraint profile_review_evidence_event_organization_id_previous_lin_fkey,
  add constraint profile_review_evidence_events_previous_link_lifecycle_fk
    foreign key (organization_id, previous_link_id)
    references public.profile_review_evidence_links(organization_id, id) on delete cascade,
  drop constraint profile_review_evidence_events_organization_id_new_link_id_fkey,
  add constraint profile_review_evidence_events_new_link_lifecycle_fk
    foreign key (organization_id, new_link_id)
    references public.profile_review_evidence_links(organization_id, id) on delete cascade;

alter table public.profile_review_evidence_refinements
  drop constraint profile_review_evidence_refin_organization_id_mapped_link__fkey,
  add constraint profile_review_evidence_refinements_link_lifecycle_fk
    foreign key (organization_id, mapped_link_id)
    references public.profile_review_evidence_links(organization_id, id) on delete cascade,
  drop constraint profile_review_evidence_refineme_organization_id_region_id_fkey,
  add constraint profile_review_evidence_refinements_region_lifecycle_fk
    foreign key (organization_id, region_id)
    references public.spatial_evidence_regions(organization_id, id) on delete cascade;

alter table public.knowledge_observations
  drop constraint knowledge_observations_evidence_link_fk,
  add constraint knowledge_observations_evidence_link_lifecycle_fk
    foreign key (organization_id, evidence_link_id)
    references public.profile_review_evidence_links(organization_id, id) on delete set null (evidence_link_id);

alter table public.profile_review_evidence_links
  drop constraint profile_review_evidence_links_organization_id_evidence_id_fkey,
  add constraint profile_review_evidence_links_evidence_lifecycle_fk
    foreign key (organization_id, evidence_id)
    references public.evidence(organization_id, id) on delete cascade,
  drop constraint profile_review_evidence_links_organization_id_spatial_regi_fkey,
  add constraint profile_review_evidence_links_region_lifecycle_fk
    foreign key (organization_id, spatial_region_id)
    references public.spatial_evidence_regions(organization_id, id) on delete cascade,
  drop constraint profile_review_evidence_links_organization_id_replaces_lin_fkey,
  add constraint profile_review_evidence_links_replaces_lifecycle_fk
    foreign key (organization_id, replaces_link_id)
    references public.profile_review_evidence_links(organization_id, id) on delete cascade,
  drop constraint profile_review_evidence_links_organization_id_superseded_b_fkey,
  add constraint profile_review_evidence_links_superseded_lifecycle_fk
    foreign key (organization_id, superseded_by_link_id)
    references public.profile_review_evidence_links(organization_id, id) on delete cascade;

alter table public.organization_custom_section_confirmations
  drop constraint organization_custom_section_conf_organization_id_review_id_fkey,
  add constraint organization_custom_section_confirmations_review_lifecycle_fk
    foreign key (organization_id, review_id)
    references public.profile_reviews(organization_id, id) on delete cascade;

comment on function private.prevent_review_evidence_history_mutation() is
  'Keeps evidence ledgers immutable except for the exact in-flight document lifecycle operation carried by the deleting transaction.';
comment on function private.authorize_document_dependency_cascade() is
  'Allows document cascades only for a matching started delete_document operation owned by the authoritative lifecycle RPC.';
