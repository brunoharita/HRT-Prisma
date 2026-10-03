begin;

-- Additive adapter contract. Existing extraction/review history is never rewritten.
create or replace function private.is_valid_import_evidence_path(path text)
returns boolean language sql immutable strict set search_path = '' as $$
  select path ~ '^(identity\.fullName|contact\.(city|state|phone|email|linkedin)|professionalTitle|areasOfExpertise|professionalObjective|summary|keyResults\.result_[a-z0-9]{8,64}\.value|certifications|languages|competencies|toolsAndTechnologies|professionalContexts|uncertainties|notIdentified|experiences\.([0-9]+|experience_[a-z0-9]{8,64})(\.(role|organization|period|description))?|education\.([0-9]+|education_[a-z0-9]{8,64})(\.(course|institution|period|description|level|qualification|status|classificationOrigin))?|customSections\.[a-z0-9][a-z0-9_-]{7,79}\.(name|items\.[a-z0-9][a-z0-9_-]{7,79}\.value))$';
$$;

create or replace function private.import_evidence_target_exists(draft jsonb, path text)
returns boolean language plpgsql immutable strict set search_path = '' as $$
declare
  parts text[] := string_to_array(path, '.');
  entity jsonb;
  entity_index integer;
begin
  if not private.is_valid_import_evidence_path(path) or jsonb_typeof(draft) <> 'object' then return false; end if;
  if array_length(parts, 1) = 1 then return draft ? parts[1]; end if;
  if parts[1] in ('identity', 'contact') then return coalesce((draft -> parts[1]) ? parts[2], false); end if;
  if parts[1] in ('experiences', 'education') then
    if jsonb_typeof(draft -> parts[1]) <> 'array' then return false; end if;
    for entity, entity_index in select value, ordinality::integer - 1 from jsonb_array_elements(draft -> parts[1]) with ordinality loop
      if entity ->> 'id' = parts[2] or entity_index::text = parts[2] then return true; end if;
    end loop;
  elsif parts[1] = 'keyResults' then
    return exists (select 1 from jsonb_array_elements(coalesce(draft -> 'keyResults', '[]')) item where item ->> 'id' = parts[2]);
  elsif parts[1] = 'customSections' then
    for entity in select value from jsonb_array_elements(coalesce(draft -> 'customSections', '[]')) loop
      if entity ->> 'id' <> parts[2] then continue; end if;
      if parts[3] = 'name' then return entity ? 'name'; end if;
      return exists (select 1 from jsonb_array_elements(entity -> 'items') item where item ->> 'id' = parts[4]);
    end loop;
  end if;
  return false;
exception when others then return false;
end;
$$;

create or replace function private.import_evidence_issue(pages jsonb, draft jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  page jsonb; descriptor jsonb; page_number integer; descriptor_index integer;
  reason text; path text; safe_path text; numbers double precision[];
  seen integer[] := '{}';
begin
  if coalesce(jsonb_typeof(pages), '') <> 'array' then return jsonb_build_object('reason','pages_invalid'); end if;
  if jsonb_array_length(pages) not between 1 and 200 then return jsonb_build_object('reason','pages_invalid'); end if;
  for page in select value from jsonb_array_elements(pages) loop
    if coalesce(jsonb_typeof(page -> 'page_number'), '') <> 'number' or (page ->> 'page_number') !~ '^[0-9]+$' then return jsonb_build_object('reason','page_invalid'); end if;
    page_number := (page ->> 'page_number')::integer;
    if page_number not between 1 and jsonb_array_length(pages) or page_number = any(seen) then return jsonb_build_object('reason','page_invalid'); end if;
    if coalesce(jsonb_typeof(page -> 'text_content'),'') <> 'string' or coalesce(page ->> 'origin','') not in ('native_pdf','ocr','manual_text') then return jsonb_build_object('reason','page_invalid'); end if;
    seen := array_append(seen,page_number);
    if jsonb_typeof(coalesce(page -> 'layout_blocks', '[]')) <> 'array' or jsonb_typeof(coalesce(page -> 'field_evidence', '[]')) <> 'array' then
      return jsonb_build_object('reason','arrays_invalid','pageNumber',page_number);
    end if;
    if jsonb_array_length(coalesce(page -> 'layout_blocks','[]')) > 10000 or jsonb_array_length(coalesce(page -> 'field_evidence','[]')) > 1000 then
      return jsonb_build_object('reason','payload_limit','pageNumber',page_number);
    end if;
    for descriptor, descriptor_index in select value, ordinality::integer - 1 from jsonb_array_elements(coalesce(page -> 'field_evidence','[]')) with ordinality loop
      reason := null; path := descriptor ->> 'fieldPath'; safe_path := null;
      if coalesce(jsonb_typeof(descriptor), '') <> 'object' or not coalesce(private.is_valid_import_evidence_path(path),false) then reason := 'field_path_invalid';
      else
        safe_path := regexp_replace(regexp_replace(regexp_replace(path, '^(experiences|education|keyResults)\.[^.]+', '\1.*'), '^customSections\.[^.]+', 'customSections.*'), '\.items\.[^.]+', '.items.*');
        if not private.import_evidence_target_exists(draft,path) then reason := 'field_target_missing';
        elsif coalesce(jsonb_typeof(descriptor -> 'pageNumber'),'') <> 'number' or descriptor ->> 'pageNumber' <> page_number::text then reason := 'evidence_page_invalid';
        elsif coalesce(jsonb_typeof(descriptor -> 'text'),'') <> 'string' or btrim(descriptor ->> 'text') = '' then reason := 'evidence_text_invalid';
        elsif coalesce(descriptor ->> 'method','') not in ('pdfjs-layout-v1','tesseract-layout-v1','text-line-v1') then reason := 'method_origin_invalid';
        elsif (descriptor ->> 'x') is not null or (descriptor ->> 'y') is not null or (descriptor ->> 'width') is not null or (descriptor ->> 'height') is not null then
          if coalesce(jsonb_typeof(descriptor -> 'x'),'') <> 'number' or coalesce(jsonb_typeof(descriptor -> 'y'),'') <> 'number'
            or coalesce(jsonb_typeof(descriptor -> 'width'),'') <> 'number' or coalesce(jsonb_typeof(descriptor -> 'height'),'') <> 'number' then reason := 'geometry_invalid';
          else
            numbers := array[(descriptor ->> 'x')::double precision,(descriptor ->> 'y')::double precision,(descriptor ->> 'width')::double precision,(descriptor ->> 'height')::double precision];
            if numbers[1] < 0 or numbers[2] < 0 or numbers[3] <= 0 or numbers[4] <= 0 or numbers[1]+numbers[3] > 1 or numbers[2]+numbers[4] > 1 then reason := 'geometry_invalid';
            elsif not ((page ->> 'origin' = 'native_pdf' and descriptor ->> 'method' = 'pdfjs-layout-v1') or (page ->> 'origin' = 'ocr' and descriptor ->> 'method' = 'tesseract-layout-v1')) then reason := 'method_origin_invalid'; end if;
          end if;
        end if;
      end if;
      if reason is not null then return jsonb_build_object('reason',reason,'fieldPath',safe_path,'pageNumber',page_number,'evidenceIndex',descriptor_index); end if;
    end loop;
  end loop;
  return null;
exception when numeric_value_out_of_range or invalid_text_representation then
  return jsonb_build_object('reason','geometry_invalid');
end;
$$;

revoke all on function private.is_valid_import_evidence_path(text), private.import_evidence_target_exists(jsonb,text), private.import_evidence_issue(jsonb,jsonb) from public,anon,authenticated;

alter table public.profile_review_evidence_links drop constraint profile_review_evidence_links_field_path_check;
alter table public.profile_review_evidence_links add constraint profile_review_evidence_links_field_path_check check (private.is_valid_import_evidence_path(field_path));

-- Keep manual evidence and review history aligned with the same existing roots.
do $$
declare function_oid oid; definition text; previous_definition text; old_pattern text;
begin
  function_oid := 'private.record_profile_review_evidence(uuid,uuid,integer,text,text,integer,integer,double precision,double precision,double precision,double precision,text,text,jsonb,text,uuid,text)'::regprocedure;
  definition := pg_get_functiondef(function_oid);
  old_pattern := substring(definition from $pattern$p_field_path !~ '([^']+)'$pattern$);
  if old_pattern is null then raise exception 'manual evidence path gate was not found'; end if;
  definition := replace(definition, 'p_field_path !~ ''' || old_pattern || '''', 'not private.is_valid_import_evidence_path(p_field_path)');
  previous_definition := definition;
  definition := replace(definition, '''languages'', ''competencies'', ''customSections''', '''languages'', ''competencies'', ''toolsAndTechnologies'', ''professionalContexts'', ''customSections''');
  if definition=previous_definition then raise exception 'manual evidence history roots were not found'; end if;
  execute definition;
  function_oid := 'public.save_profile_review(uuid,uuid,integer,jsonb,text,text)'::regprocedure;
  definition := pg_get_functiondef(function_oid);
  previous_definition := definition;
  definition := replace(definition, '''languages'', ''competencies'', ''customSections''', '''languages'', ''competencies'', ''toolsAndTechnologies'', ''professionalContexts'', ''customSections''');
  if definition=previous_definition then raise exception 'review history roots were not found'; end if;
  execute definition;
end;
$$;

alter table public.profile_review_changes drop constraint profile_review_changes_field_path_check;
alter table public.profile_review_changes add constraint profile_review_changes_field_path_check check (field_path in ('summary','experiences','education','certifications','languages','competencies','toolsAndTechnologies','professionalContexts','customSections','identity','contact','professionalTitle','areasOfExpertise','professionalObjective','keyResults','uncertainties','notIdentified'));

create or replace function public.persist_person_extraction(
  p_organization_id uuid,p_person_id uuid,p_document_id uuid,p_pages jsonb,p_draft jsonb,
  p_pages_native integer,p_pages_ocr integer,p_native_extraction_version text,p_ocr_version text,
  p_structuring_version text,p_draft_version text,p_idempotency_key text,p_retry_of_attempt_id uuid default null
)
returns table(processing_attempt_id uuid,structured boolean,attempt_number integer,reused boolean)
language plpgsql security definer set search_path = '' as $$
declare result record; issue jsonb;
begin
  perform private.require_document_reviewer(p_organization_id);
  if not exists(select 1 from public.documents where organization_id=p_organization_id and person_id=p_person_id and id=p_document_id) then
    raise exception using errcode='P0002',message='document not found in organization';
  end if;
  issue := private.import_evidence_issue(p_pages,p_draft);
  if issue is not null then
    raise exception using errcode='22023',message='prisma_import_evidence_invalid',detail=(issue || jsonb_build_object('contract','import-evidence-1.0.0','stage','persisting'))::text;
  end if;
  if not private.is_valid_education_classification(p_draft,true) then raise exception using errcode='22023',message='education classification contract is invalid'; end if;
  select * into result from private.persist_person_extraction(p_organization_id,p_person_id,p_document_id,p_pages,p_draft,p_pages_native,p_pages_ocr,p_native_extraction_version,p_ocr_version,p_structuring_version,p_draft_version,p_idempotency_key,p_retry_of_attempt_id);
  update public.document_page_extractions page
  set layout_blocks=coalesce(payload.value -> 'layout_blocks','[]'),field_evidence=coalesce(payload.value -> 'field_evidence','[]')
  from jsonb_array_elements(p_pages) payload(value)
  where page.organization_id=p_organization_id and page.processing_attempt_id=result.processing_attempt_id and page.page_number=(payload.value ->> 'page_number')::integer;
  return query select result.processing_attempt_id,result.structured,result.attempt_number,result.reused;
end;
$$;

create or replace function public.record_resume_import_failure(
  p_organization_id uuid,p_person_id uuid,p_document_id uuid,p_intake_id uuid,p_diagnostic jsonb,p_idempotency_key text
)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; failure record; failure_code text; friendly_message text; permanent boolean;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  if not exists(select 1 from public.resume_intakes where organization_id=p_organization_id and id=p_intake_id and resolved_person_id=p_person_id and resolved_document_id=p_document_id and status in ('processing','failed')) then
    raise exception using errcode='22023',message='resume intake diagnostic target is invalid';
  end if;
  if coalesce(jsonb_typeof(p_diagnostic),'') <> 'object' or p_diagnostic - array['contract','stage','reason','fieldPath','pageNumber','evidenceIndex','technicalCode','adapterVersion','structuringVersion'] <> '{}'
    or coalesce(p_diagnostic ->> 'contract','') <> 'import-evidence-1.0.0'
    or coalesce(p_diagnostic ->> 'adapterVersion','') <> 'evidence-adapter-1.0.0'
    or coalesce(p_diagnostic ->> 'stage','') not in ('structuring','persisting','completing')
    or coalesce(p_diagnostic ->> 'reason','') not in ('pages_invalid','page_invalid','arrays_invalid','payload_limit','field_path_invalid','field_target_missing','evidence_page_invalid','evidence_text_invalid','geometry_invalid','method_origin_invalid','unavailable','session_required','environment_mismatch','operation_failed')
    or coalesce(p_diagnostic ->> 'structuringVersion','') !~ '^(parser-ia-1\.0\.0/[A-Za-z0-9_.-]{1,80}/[a-f0-9]{64}(/evidence-adapter-[0-9.]+)?|prisma-layout-adaptive-v[0-9]+)$'
    or ((p_diagnostic ->> 'technicalCode') is not null and (p_diagnostic ->> 'technicalCode') !~ '^[A-Z0-9]{5,8}$')
    or ((p_diagnostic ->> 'fieldPath') is not null and (p_diagnostic ->> 'fieldPath') !~ '^(identity\.fullName|contact\.(city|state|phone|email|linkedin)|professionalTitle|areasOfExpertise|professionalObjective|summary|certifications|languages|competencies|toolsAndTechnologies|professionalContexts|uncertainties|notIdentified|experiences\.\*(\.(role|organization|period|description))?|education\.\*(\.(course|institution|period|description|level|qualification|status|classificationOrigin))?|keyResults\.\*\.value|customSections\.\*\.(name|items\.\*\.value))$')
    or ((p_diagnostic ->> 'pageNumber') is not null and (coalesce(jsonb_typeof(p_diagnostic -> 'pageNumber'),'') <> 'number' or (p_diagnostic ->> 'pageNumber') !~ '^[0-9]{1,3}$' or (p_diagnostic ->> 'pageNumber')::integer not between 1 and 200))
    or ((p_diagnostic ->> 'evidenceIndex') is not null and (coalesce(jsonb_typeof(p_diagnostic -> 'evidenceIndex'),'') <> 'number' or (p_diagnostic ->> 'evidenceIndex') !~ '^[0-9]{1,4}$' or (p_diagnostic ->> 'evidenceIndex')::integer not between 0 and 1000)) then
    raise exception using errcode='22023',message='resume import diagnostic contract is invalid';
  end if;
  permanent := p_diagnostic ->> 'reason' not in ('unavailable','session_required','operation_failed');
  failure_code := case when permanent then 'import_evidence_contract_invalid' else 'resume_intake_processing_failed' end;
  friendly_message := case when permanent then 'A leitura foi concluída, mas a gravação encontrou uma incompatibilidade interna. O documento foi preservado e o Perfil vigente não foi publicado ou substituído. Aguarde a correção do sistema antes de retomar.' else 'A importação foi interrompida. O documento foi preservado; retome pela Central da Pessoa após verificar a conexão e a sessão.' end;
  select * into failure from public.record_document_failure(p_organization_id,p_person_id,p_document_id,'failed_structuring',failure_code,friendly_message,p_idempotency_key);
  if failure.reused then
    if not exists(select 1 from public.person_ingestion_events where organization_id=p_organization_id and processing_attempt_id=failure.processing_attempt_id and event_type='processing_failed' and metadata -> 'diagnostic'=p_diagnostic) then
      raise exception using errcode='23505',message='resume import diagnostic idempotency conflict';
    end if;
    return;
  end if;
  perform public.fail_resume_intake(p_organization_id,p_intake_id,failure_code,friendly_message);
  update public.document_processing_attempts set structuring_version=p_diagnostic ->> 'structuringVersion',can_reprocess=not permanent where organization_id=p_organization_id and id=failure.processing_attempt_id;
  update public.documents set can_reprocess=not permanent where organization_id=p_organization_id and id=p_document_id;
  update public.person_ingestion_events set metadata=metadata || jsonb_build_object('diagnostic',p_diagnostic)
    where organization_id=p_organization_id and document_id=p_document_id and processing_attempt_id=failure.processing_attempt_id and event_type='processing_failed';
end;
$$;

revoke all on function public.persist_person_extraction(uuid,uuid,uuid,jsonb,jsonb,integer,integer,text,text,text,text,text,uuid),public.record_resume_import_failure(uuid,uuid,uuid,uuid,jsonb,text) from public,anon;
grant execute on function public.persist_person_extraction(uuid,uuid,uuid,jsonb,jsonb,integer,integer,text,text,text,text,text,uuid),public.record_resume_import_failure(uuid,uuid,uuid,uuid,jsonb,text) to authenticated;
comment on function public.persist_person_extraction(uuid,uuid,uuid,jsonb,jsonb,integer,integer,text,text,text,text,text,uuid) is 'import-evidence-1.0.0: tenant-authorized atomic persistence with validated targets, bounded geometry and preserved section titles/tools/contexts.';
comment on function public.record_resume_import_failure(uuid,uuid,uuid,uuid,jsonb,text) is 'import-evidence-1.0.0: authorized atomic failure record using fixed reasons and redacted field metadata; never accepts resume text.';

commit;
