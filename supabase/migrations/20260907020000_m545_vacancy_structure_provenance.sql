-- M5.4.5 keeps the original description and item-level structural provenance
-- on the immutable vacancy version. Historical versions stay readable.
alter table public.vacancy_versions
  add column if not exists structure_source jsonb not null default '{}'::jsonb check (jsonb_typeof(structure_source) = 'object');

create or replace function public.record_vacancy_structure_source(
  p_organization_id uuid,
  p_vacancy_version_id uuid,
  p_source jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_original text; v_contract text; v_items jsonb;
begin
  if v_actor is null or not private.has_org_role(p_organization_id, array['owner','admin','recruiter']::public.membership_role[]) then raise exception 'VACANCY_UNAUTHORIZED'; end if;
  if jsonb_typeof(p_source) <> 'object' then raise exception 'VACANCY_STRUCTURE_SOURCE_INVALID'; end if;
  v_original := nullif(btrim(p_source->>'originalDescription'),''); v_contract := nullif(btrim(p_source->>'contractVersion'),''); v_items := coalesce(p_source->'items','[]'::jsonb);
  if v_original is null or char_length(v_original) > 5000 or v_contract is null or jsonb_typeof(v_items) <> 'array' then raise exception 'VACANCY_STRUCTURE_SOURCE_INVALID'; end if;
  if exists (select 1 from jsonb_array_elements(v_items) item where jsonb_typeof(item) <> 'object' or coalesce(item->>'category','') = '' or coalesce(item->>'suggestionId','') = '' or coalesce(item->>'method','') not in ('explicit','faithful_synthesis')) then raise exception 'VACANCY_STRUCTURE_PROVENANCE_INVALID'; end if;
  update public.vacancy_versions set structure_source = jsonb_build_object('originalDescription',v_original,'contractVersion',v_contract,'structuredAt',coalesce(p_source->>'structuredAt',now()::text),'items',v_items), contract_version = 'vacancy-definition-2.0.0'
  where id=p_vacancy_version_id and organization_id=p_organization_id and source_kind='assisted_description';
  if not found then raise exception 'VACANCY_STRUCTURE_VERSION_INVALID'; end if;
end; $$;

revoke all on function public.record_vacancy_structure_source(uuid,uuid,jsonb) from public, anon;
grant execute on function public.record_vacancy_structure_source(uuid,uuid,jsonb) to authenticated;
