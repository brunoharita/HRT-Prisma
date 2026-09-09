-- Run only in Prisma-QA. Every synthetic fixture is rolled back.
begin;
do $qa$
<<qa_block>>
declare
  org_id uuid := '5dcad29a-1dd2-4c12-9adb-8015a79bea4e';
  actor_id uuid; person_id uuid := gen_random_uuid(); absorbed_id uuid := gen_random_uuid();
  new_person_id uuid := gen_random_uuid(); document_id uuid := gen_random_uuid();
  attempt_id uuid := gen_random_uuid(); evidence_id uuid := gen_random_uuid(); vacancy_id uuid;
  preview record; started record; finalized record;
  knowledge_before bigint; item_before bigint; users_before bigint;
  expected_failure boolean := false; blocked_mutation boolean := false;
begin
  select membership.user_id into actor_id from public.organization_memberships membership
  join public.platform_users actor on actor.auth_user_id=membership.user_id
  where membership.organization_id=org_id and membership.role='owner'
    and actor.access_profile='owner' and actor.status='active' limit 1;
  select id into vacancy_id from public.vacancies where organization_id=org_id limit 1;
  if actor_id is null then raise exception 'M55 QA owner unavailable'; end if;
  select count(*) into knowledge_before from public.knowledge_concepts where organization_id is null or organization_id=org_id;
  select count(*) into item_before from public.assessment_items where organization_id is null or organization_id=org_id;
  select count(*) into users_before from public.platform_users;

  insert into public.people(id,organization_id,full_name) values
    (person_id,org_id,'M55 Synthetic Rich Fixture'),(absorbed_id,org_id,'M55 Synthetic Absorbed Reference');
  update public.people set operational_status='merged',merged_into_person_id=person_id,merged_at=now() where id=absorbed_id;
  insert into public.person_private_data(organization_id,person_id,email,phone,notes)
    values(org_id,person_id,'m55.synthetic@example.invalid','+5511999999999','synthetic QA only');
  insert into public.documents(id,organization_id,person_id,filename,media_type,storage_path,storage_bucket,
    checksum_sha256,extraction_version,source_type,byte_size,page_count,actor_auth_user_id)
    values(document_id,org_id,person_id,'m55-synthetic.pdf','application/pdf','m55/'||person_id::text||'/synthetic.pdf',
      'person-documents',repeat('a',64),'qa-m55-1','resume_pdf',128,1,actor_id);
  insert into public.document_processing_attempts(id,organization_id,person_id,document_id,attempt_number,
    native_extraction_version,structuring_version,actor_auth_user_id)
    values(attempt_id,org_id,person_id,document_id,1,'qa-m55-native','qa-m55-structure',actor_id);
  insert into public.document_page_extractions(organization_id,person_id,document_id,processing_attempt_id,
    page_number,origin,text_content,useful_character_count,method,method_version)
    values(org_id,person_id,document_id,attempt_id,1,'native_pdf','synthetic resume content',24,'pdfjs','qa-m55-native');
  insert into public.evidence(id,organization_id,person_id,document_id,kind,fact,source_block,quoted_text,
    extraction_version,processing_attempt_id)
    values(evidence_id,org_id,person_id,document_id,'experience','synthetic fact','synthetic block','synthetic quote','qa-m55-1',attempt_id);
  insert into public.inferences(organization_id,person_id,inference_type,value,rationale,inference_version)
    values(org_id,person_id,'synthetic','synthetic value','synthetic rationale','qa-m55-1');
  insert into public.professional_profiles(organization_id,person_id,source_document_id,processing_attempt_id,
    profile_data,extraction_version,inference_version,embedding_version,prompt_version,model_version,profile_version,superseded_at)
    values
      (org_id,person_id,document_id,attempt_id,'{}','qa-m55-1','qa-m55-1','qa-m55-1','qa-m55-1','qa-m55-1',1,now()),
      (org_id,person_id,document_id,attempt_id,'{}','qa-m55-1','qa-m55-1','qa-m55-1','qa-m55-1','qa-m55-1',2,null);
  insert into public.profile_reviews(organization_id,person_id,document_id,processing_attempt_id,extracted_data,
    reviewed_data,started_by_auth_user_id,last_edited_by_auth_user_id)
    values(org_id,person_id,document_id,attempt_id,'{}','{}',actor_id,actor_id);
  insert into public.knowledge_observations(organization_id,person_id,evidence_id,original_term,normalized_term,
    resolution_state,normalization_method,knowledge_global_version,source_snapshot)
    values(org_id,person_id,evidence_id,'Synthetic Skill','synthetic skill','unresolved','qa-m55',1,'{}');
  if vacancy_id is not null then
    insert into public.match_evaluations(organization_id,person_id,vacancy_id,evaluation_data,matching_version,prompt_version,model_version)
      values(org_id,person_id,vacancy_id,'{}','qa-m55','qa-m55','qa-m55');
    insert into public.verification_needs(organization_id,person_id,vacancy_id,competency_key,competency_label,
      target_level,criticality,sufficiency_status,sufficiency_requirement,sufficiency_explanation,
      sufficiency_engine_version,policy_version,created_by_auth_user_id)
      values(org_id,person_id,vacancy_id,'m55-synthetic','M55 Synthetic','basic','low','verification_optional',
        'optional','synthetic QA need','qa-m55','qa-m55',actor_id);
  end if;

  perform set_config('request.jwt.claim.sub',actor_id::text,true);
  select * into preview from public.preview_person_definitive_deletion(org_id,person_id);
  select * into started from public.begin_person_definitive_deletion(
    org_id,person_id,preview.preflight_fingerprint,'m55-rich-fixture:'||gen_random_uuid()::text);
  if started.operation_status<>'purging' then raise exception 'operation did not enter purging'; end if;
  perform set_config('prisma.person_deletion_operation_id','',true);
  begin perform * from public.finalize_person_definitive_deletion(org_id,started.operation_id);
  exception when object_not_in_prerequisite_state then expected_failure:=true; end;
  if not expected_failure then raise exception 'pending Storage incorrectly completed'; end if;
  if (select status from public.person_deletion_operations where id=started.operation_id)<>'purging'
    then raise exception 'failed finalize changed authoritative state'; end if;
  begin
    insert into public.inferences(organization_id,person_id,inference_type,value,rationale,inference_version)
      values(org_id,person_id,'late','late','late','qa-m55');
  exception when object_not_in_prerequisite_state then blocked_mutation:=true; end;
  if not blocked_mutation then raise exception 'mutation accepted while deleting'; end if;
  perform public.mark_person_deletion_storage_removed(started.operation_id,'person-documents','m55/'||person_id::text||'/synthetic.pdf');
  select * into finalized from public.finalize_person_definitive_deletion(org_id,started.operation_id);
  if finalized.operation_status<>'completed' then raise exception 'operation did not complete'; end if;
  if exists(select 1 from public.people item where item.id=qa_block.person_id)
    or exists(select 1 from public.person_private_data item where item.person_id=qa_block.person_id)
    or exists(select 1 from public.documents item where item.person_id=qa_block.person_id)
    or exists(select 1 from public.professional_profiles item where item.person_id=qa_block.person_id)
    or exists(select 1 from public.knowledge_observations item where item.person_id=qa_block.person_id)
    or exists(select 1 from public.match_evaluations item where item.person_id=qa_block.person_id)
    or exists(select 1 from public.verification_needs item where item.person_id=qa_block.person_id)
    then raise exception 'individual residue'; end if;
  if (select merged_into_person_id from public.people where id=absorbed_id) is not null
    then raise exception 'merge redirect residue'; end if;
  if not exists(select 1 from public.person_deletion_operations where id=started.operation_id and status='completed'
    and person_name_snapshot='M55 Synthetic Rich Fixture' and actor_kind='owner') then raise exception 'minimal audit missing'; end if;
  if (select count(*) from public.knowledge_concepts where organization_id is null or organization_id=org_id)<>knowledge_before
    or (select count(*) from public.assessment_items where organization_id is null or organization_id=org_id)<>item_before
    then raise exception 'shared Knowledge or Item Bank changed'; end if;
  if (select count(*) from public.platform_users)<>users_before then raise exception 'platform users changed'; end if;
  insert into public.people(id,organization_id,full_name) values(new_person_id,org_id,'M55 Synthetic Rich Fixture');
  if new_person_id=qa_block.person_id or exists(select 1 from public.documents item where item.person_id=qa_block.new_person_id)
    or exists(select 1 from public.professional_profiles item where item.person_id=qa_block.new_person_id)
    then raise exception 'fresh re-registration failed'; end if;
end
$qa$;
rollback;
select 'PASS: partial failure, lock, rich purge, audit, shared preservation, recadastro' as rich_fixture;
