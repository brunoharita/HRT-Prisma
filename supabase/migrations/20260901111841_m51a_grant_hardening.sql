begin;

revoke all on public.verification_definitions from anon;
revoke all on public.verification_policies from anon;
revoke all on public.verification_needs from anon;
revoke all on public.assessment_blueprints from anon;
revoke all on public.assessment_rubrics from anon;
revoke all on public.assessment_item_families from anon;
revoke all on public.assessment_items from anon;
revoke all on public.prepared_assessments from anon;
revoke all on public.verification_audit_events from anon;

revoke all on public.verification_definitions from authenticated;
revoke all on public.verification_policies from authenticated;
revoke all on public.verification_needs from authenticated;
revoke all on public.assessment_blueprints from authenticated;
revoke all on public.assessment_rubrics from authenticated;
revoke all on public.assessment_item_families from authenticated;
revoke all on public.assessment_items from authenticated;
revoke all on public.prepared_assessments from authenticated;
revoke all on public.verification_audit_events from authenticated;

grant select on public.verification_definitions to authenticated;
grant select on public.verification_policies to authenticated;
grant select on public.verification_needs to authenticated;
grant select on public.assessment_blueprints to authenticated;
grant select on public.assessment_rubrics to authenticated;
grant select on public.assessment_item_families to authenticated;
grant select on public.assessment_items to authenticated;
grant select on public.prepared_assessments to authenticated;
grant select on public.verification_audit_events to authenticated;

grant insert, update, delete on public.verification_definitions to authenticated;
grant insert, update, delete on public.verification_policies to authenticated;
grant insert, update, delete on public.assessment_blueprints to authenticated;
grant insert, update, delete on public.assessment_rubrics to authenticated;
grant insert, update, delete on public.assessment_item_families to authenticated;
grant insert, update, delete on public.assessment_items to authenticated;

revoke all on function public.ensure_m51a_demo_need(uuid) from public, anon, authenticated;
revoke all on function public.load_m51a_verification_workspace(uuid) from public, anon, authenticated;
revoke all on function public.prepare_m51a_assessment(uuid, uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.ensure_m51a_demo_need(uuid) to authenticated;
grant execute on function public.load_m51a_verification_workspace(uuid) to authenticated;
grant execute on function public.prepare_m51a_assessment(uuid, uuid, uuid, text, text) to authenticated;

drop policy if exists verification_definitions_manage on public.verification_definitions;
drop policy if exists verification_policies_manage on public.verification_policies;
drop policy if exists verification_needs_manage on public.verification_needs;
drop policy if exists assessment_blueprints_manage on public.assessment_blueprints;
drop policy if exists assessment_rubrics_manage on public.assessment_rubrics;
drop policy if exists assessment_item_families_manage on public.assessment_item_families;
drop policy if exists assessment_items_manage on public.assessment_items;
drop policy if exists prepared_assessments_manage on public.prepared_assessments;
drop policy if exists verification_definitions_insert on public.verification_definitions;
drop policy if exists verification_definitions_update on public.verification_definitions;
drop policy if exists verification_definitions_delete on public.verification_definitions;
drop policy if exists verification_policies_insert on public.verification_policies;
drop policy if exists verification_policies_update on public.verification_policies;
drop policy if exists verification_policies_delete on public.verification_policies;
drop policy if exists assessment_blueprints_insert on public.assessment_blueprints;
drop policy if exists assessment_blueprints_update on public.assessment_blueprints;
drop policy if exists assessment_blueprints_delete on public.assessment_blueprints;
drop policy if exists assessment_rubrics_insert on public.assessment_rubrics;
drop policy if exists assessment_rubrics_update on public.assessment_rubrics;
drop policy if exists assessment_rubrics_delete on public.assessment_rubrics;
drop policy if exists assessment_item_families_insert on public.assessment_item_families;
drop policy if exists assessment_item_families_update on public.assessment_item_families;
drop policy if exists assessment_item_families_delete on public.assessment_item_families;
drop policy if exists assessment_items_insert on public.assessment_items;
drop policy if exists assessment_items_update on public.assessment_items;
drop policy if exists assessment_items_delete on public.assessment_items;

create policy verification_definitions_insert on public.verification_definitions for insert to authenticated
with check (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])));
create policy verification_definitions_update on public.verification_definitions for update to authenticated
using (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])))
with check (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])));
create policy verification_definitions_delete on public.verification_definitions for delete to authenticated
using (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])));

create policy verification_policies_insert on public.verification_policies for insert to authenticated
with check ((select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])));
create policy verification_policies_update on public.verification_policies for update to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])));
create policy verification_policies_delete on public.verification_policies for delete to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])));

create policy assessment_blueprints_insert on public.assessment_blueprints for insert to authenticated
with check (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])));
create policy assessment_blueprints_update on public.assessment_blueprints for update to authenticated
using (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])))
with check (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])));
create policy assessment_blueprints_delete on public.assessment_blueprints for delete to authenticated
using (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])));

create policy assessment_rubrics_insert on public.assessment_rubrics for insert to authenticated
with check (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])));
create policy assessment_rubrics_update on public.assessment_rubrics for update to authenticated
using (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])))
with check (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])));
create policy assessment_rubrics_delete on public.assessment_rubrics for delete to authenticated
using (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])));

create policy assessment_item_families_insert on public.assessment_item_families for insert to authenticated
with check (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])));
create policy assessment_item_families_update on public.assessment_item_families for update to authenticated
using (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])))
with check (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])));
create policy assessment_item_families_delete on public.assessment_item_families for delete to authenticated
using (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])));

create policy assessment_items_insert on public.assessment_items for insert to authenticated
with check (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])));
create policy assessment_items_update on public.assessment_items for update to authenticated
using (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])))
with check (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])));
create policy assessment_items_delete on public.assessment_items for delete to authenticated
using (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])));

commit;
