-- v2.0.9: one explicit human confirmation, atomic cumulative links.
-- Reuse the validated unitary RPC and all source/scope checks; never infer a rationale.
create function public.link_person_competency_evidence_batch_v2(
  p_organization_id uuid, p_person_id uuid, p_profile_id uuid, p_concept_id uuid, p_sources jsonb
) returns uuid[] language plpgsql security definer set search_path='' as $$
declare v_source jsonb; v_reason text; v_ids uuid[] := '{}'::uuid[]; v_id uuid;
begin
  perform private.require_knowledge_admin(p_organization_id);
  if p_sources is null or jsonb_typeof(p_sources)<>'array' then
    raise exception 'COMPETENCY_EVIDENCE_SELECTION_REQUIRED' using errcode='22023';
  end if;
  if jsonb_array_length(p_sources) not between 1 and 100 then
    raise exception 'COMPETENCY_EVIDENCE_SELECTION_INVALID' using errcode='22023';
  end if;
  for v_source in select value from jsonb_array_elements(p_sources) loop
    if jsonb_typeof(v_source)<>'object' or coalesce(v_source->>'nature','') not in ('contextual','certified')
      or coalesce(v_source->>'sourceIndex','') !~ '^[0-9]{1,9}$'
      or jsonb_typeof(v_source->'sourceQuote') is distinct from 'string'
      or coalesce(jsonb_typeof(v_source->'credentialName'),'null') not in ('string','null')
      or coalesce(jsonb_typeof(v_source->'credentialIssuer'),'null') not in ('string','null') then
      raise exception 'COMPETENCY_EVIDENCE_INPUT_INVALID' using errcode='22023';
    end if;
    -- Compatible replay preserves an earlier human rationale instead of replacing it.
    select decision_reason into v_reason from public.person_competency_evidence_links
      where organization_id=p_organization_id and person_id=p_person_id and profile_id=p_profile_id
        and concept_id=p_concept_id and nature=v_source->>'nature' and source_index=(v_source->>'sourceIndex')::integer;
    v_id := public.link_person_competency_evidence(p_organization_id,p_person_id,p_profile_id,p_concept_id,
      v_source->>'nature',(v_source->>'sourceIndex')::integer,v_source->>'sourceQuote',
      v_source->>'credentialName',v_source->>'credentialIssuer',
      coalesce(v_reason,'Fonte selecionada e vínculo confirmado pelo operador. Sem justificativa adicional.'));
    if not (v_id=any(v_ids)) then v_ids := array_append(v_ids,v_id); end if;
  end loop;
  return v_ids;
end $$;
revoke all on function public.link_person_competency_evidence_batch_v2(uuid,uuid,uuid,uuid,jsonb) from public, anon;
grant execute on function public.link_person_competency_evidence_batch_v2(uuid,uuid,uuid,uuid,jsonb) to authenticated;
