-- Movement 4 hardening after the first QA advisor pass.
-- Cover every new foreign-key path used by deletion, review, and lineage queries.

create index knowledge_approvals_actor_idx on public.knowledge_approvals (actor_auth_user_id);
create index knowledge_approvals_proposal_idx on public.knowledge_approvals (proposal_id);
create index knowledge_change_sets_approver_idx on public.knowledge_change_sets (approved_by_auth_user_id);
create index knowledge_change_sets_organization_idx on public.knowledge_change_sets (organization_id);
create index knowledge_concepts_approver_idx on public.knowledge_concepts (approved_by_auth_user_id);
create index knowledge_concepts_change_set_idx on public.knowledge_concepts (change_set_id);
create index knowledge_concepts_creator_idx on public.knowledge_concepts (created_by_auth_user_id);
create index knowledge_concepts_organization_idx on public.knowledge_concepts (organization_id);
create index knowledge_external_mappings_concept_idx on public.knowledge_external_mappings (concept_id);
create index knowledge_inbox_creator_idx on public.knowledge_inbox (created_by_auth_user_id);
create index knowledge_inbox_organization_idx on public.knowledge_inbox (organization_id);
create index knowledge_observations_concept_fk_idx on public.knowledge_observations (concept_id);
create index knowledge_observations_person_fk_idx on public.knowledge_observations (organization_id, person_id);
create index knowledge_proposals_decider_idx on public.knowledge_proposals (decided_by_auth_user_id);
create index knowledge_proposals_inbox_idx on public.knowledge_proposals (inbox_id);
create index knowledge_proposals_organization_idx on public.knowledge_proposals (organization_id);
create index knowledge_proposals_published_concept_idx on public.knowledge_proposals (published_concept_id);
create index knowledge_proposals_research_run_idx on public.knowledge_proposals (research_run_id);
create index knowledge_proposals_target_concept_idx on public.knowledge_proposals (target_concept_id);
create index knowledge_impacts_profile_fk_idx on public.knowledge_reinterpretation_impacts (organization_id, profile_id);
create index knowledge_impacts_change_set_idx on public.knowledge_reinterpretation_impacts (change_set_id);
create index knowledge_impacts_concept_idx on public.knowledge_reinterpretation_impacts (concept_id);
create index knowledge_jobs_profile_fk_idx on public.knowledge_reinterpretation_jobs (organization_id, base_profile_id);
create index knowledge_jobs_impact_idx on public.knowledge_reinterpretation_jobs (impact_id);
create index knowledge_jobs_person_fk_idx on public.knowledge_reinterpretation_jobs (organization_id, person_id);
create index knowledge_jobs_requester_idx on public.knowledge_reinterpretation_jobs (requested_by_auth_user_id);
create index knowledge_jobs_review_idx on public.knowledge_reinterpretation_jobs (review_id);
create index knowledge_relations_approver_idx on public.knowledge_relations (approved_by_auth_user_id);
create index knowledge_relations_organization_idx on public.knowledge_relations (organization_id);
create index knowledge_relations_source_fk_idx on public.knowledge_relations (source_id);
create index knowledge_relations_target_idx on public.knowledge_relations (target_concept_id);
create index knowledge_research_runs_organization_idx on public.knowledge_research_runs (organization_id);
create index knowledge_research_sources_source_idx on public.knowledge_research_sources (knowledge_source_id);
create index knowledge_source_versions_previous_idx on public.knowledge_source_versions (previous_version_id);
create index knowledge_sources_approver_idx on public.knowledge_sources (approved_by_auth_user_id);
create index knowledge_terms_approver_idx on public.knowledge_terms (approved_by_auth_user_id);
create index knowledge_terms_concept_idx on public.knowledge_terms (concept_id);
create index knowledge_terms_organization_idx on public.knowledge_terms (organization_id);
create index knowledge_terms_source_idx on public.knowledge_terms (source_id);
create index organization_knowledge_settings_updater_idx on public.organization_knowledge_settings (updated_by_auth_user_id);

-- Keep read and write policy predicates independent so SELECT does not evaluate
-- two permissive policies for administrators.
drop policy organization_knowledge_settings_manage on public.organization_knowledge_settings;

create policy organization_knowledge_settings_insert
on public.organization_knowledge_settings
for insert to authenticated
with check ((select private.has_org_role(
  organization_id,
  array['super_admin','owner','admin']::public.membership_role[]
)));

create policy organization_knowledge_settings_update
on public.organization_knowledge_settings
for update to authenticated
using ((select private.has_org_role(
  organization_id,
  array['super_admin','owner','admin']::public.membership_role[]
)))
with check ((select private.has_org_role(
  organization_id,
  array['super_admin','owner','admin']::public.membership_role[]
)));

create policy organization_knowledge_settings_delete
on public.organization_knowledge_settings
for delete to authenticated
using ((select private.has_org_role(
  organization_id,
  array['super_admin','owner','admin']::public.membership_role[]
)));
