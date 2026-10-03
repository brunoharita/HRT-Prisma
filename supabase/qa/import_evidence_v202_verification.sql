-- SYNTHETIC fixtures, disposable local PostgreSQL only. Every write rolls back.
begin;
create function public.v202_id(text) returns uuid language sql immutable as $$ select md5('v202-fixture-'||$1)::uuid $$;
create function public.v202_assert(boolean,text) returns void language plpgsql as $$
begin if $1 is distinct from true then raise exception 'V202 FAIL: %',$2; end if; raise notice 'PASS: %',$2; end $$;
create function public.v202_reject(text,text) returns void language plpgsql as $$
begin
  begin execute $1; exception when others then
    if sqlstate=$2 then raise notice 'PASS: denied (%)',sqlstate; return; end if;
    raise exception 'Unexpected denial %: %',sqlstate,sqlerrm;
  end;
  raise exception 'V202 FAIL: expected rejection';
end $$;
select v202_reject($test$select '{"value":"\u0000"}'::jsonb$test$, '22P05');
select v202_assert('{"value":"�😀á\nItem composto"}'::jsonb ->> 'value' like '�😀á%', 'represented Unicode and valid emoji are JSONB-compatible');
create temp table v202_state(key text primary key,value jsonb);
grant all on v202_state to authenticated;
insert into v202_state values ('draft', :'draft'::jsonb), ('pages', :'pages'::jsonb), ('method',to_jsonb(:'method'::text)), ('evidence_count',to_jsonb(:evidence_count::integer));
insert into public.organization_groups(id,name,slug) values(v202_id('group'),'V202 synthetic','v202-synthetic');
insert into public.organizations(id,name,group_id) values(v202_id('org'),'V202 A',v202_id('group')),(v202_id('other-org'),'V202 B',v202_id('group'));
insert into auth.users(id,email) select v202_id(u),u||'@v202.invalid' from unnest(array['recruiter','member','outsider']) u;
insert into public.platform_users(id,auth_user_id,full_name,username,email,access_profile,group_id,status)
select v202_id('platform-'||u),v202_id(u),'Synthetic '||u,'v202-'||u,u||'@v202.invalid',case when u='recruiter' then 'recruiter'::public.membership_role else 'member'::public.membership_role end,v202_id('group'),'active'
from unnest(array['recruiter','member','outsider']) u;
insert into public.organization_memberships(organization_id,user_id,role) values(v202_id('org'),v202_id('recruiter'),'recruiter'),(v202_id('org'),v202_id('member'),'member'),(v202_id('other-org'),v202_id('outsider'),'member');
insert into public.people(id,organization_id,full_name) values(v202_id('person'),v202_id('org'),'Synthetic Person');
insert into public.person_private_data(organization_id,person_id,email) values(v202_id('org'),v202_id('person'),'synthetic@example.invalid');
insert into public.professional_profiles(id,organization_id,person_id,profile_data,extraction_version,inference_version,embedding_version,prompt_version,model_version)
values(v202_id('profile'),v202_id('org'),v202_id('person'),'{"syntheticApprovedBaseline":true}','synthetic','synthetic','synthetic','synthetic','synthetic');

-- SQL and preflight agree across the categories accepted by the Parser.
select v202_assert(private.import_evidence_issue(:'pages'::jsonb,:'draft'::jsonb) is null,'all Parser categories accepted by authoritative validator');
select v202_assert(private.is_valid_import_evidence_path('education.0.classificationOrigin') and private.import_evidence_target_exists(:'draft'::jsonb,'education.0.course'),'legacy ordinal addresses preserved');
select v202_assert(not private.import_evidence_target_exists(:'draft'::jsonb,'experiences.99.role'),'unknown entity target denied');
select v202_assert(private.import_evidence_issue(jsonb_set(:'pages'::jsonb,'{0,field_evidence,0,x}','1'),:'draft'::jsonb)->>'reason'='geometry_invalid','overflow geometry denied');
select v202_assert(private.import_evidence_issue(jsonb_set(:'pages'::jsonb,'{0,field_evidence,0,width}','0'),:'draft'::jsonb)->>'reason'='geometry_invalid','zero size denied');
select v202_assert(private.import_evidence_issue(jsonb_set(:'pages'::jsonb,'{0,field_evidence,0,method}','"tesseract-layout-v1"'),:'draft'::jsonb)->>'reason'='method_origin_invalid','method cannot contradict source origin');
select v202_assert(private.import_evidence_issue(jsonb_set(:'pages'::jsonb,'{0,field_evidence,0,fieldPath}','"customSections.unknown12.name"'),:'draft'::jsonb)->>'reason'='field_target_missing','missing custom target denied');
select v202_assert(private.import_evidence_issue(jsonb_set(:'pages'::jsonb,'{0,field_evidence}','null'),:'draft'::jsonb)->>'reason'='arrays_invalid','null array denied');
select v202_assert(private.import_evidence_issue(jsonb_set(:'pages'::jsonb,'{0,field_evidence}',(select jsonb_agg(:'pages'::jsonb#>'{0,field_evidence,0}') from generate_series(1,1001))),:'draft'::jsonb)->>'reason'='payload_limit','evidence limit retained');
select v202_assert(not has_function_privilege('anon','public.record_resume_import_failure(uuid,uuid,uuid,uuid,jsonb,text)','execute'),'anonymous failure RPC denied');
select v202_assert(not has_function_privilege('authenticated','private.import_evidence_issue(jsonb,jsonb)','execute'),'private validators remain private');

set local role authenticated;
select set_config('request.jwt.claim.sub',v202_id('recruiter')::text,true);
do $$
declare d jsonb; pages jsonb; method text; intake record; resolved record; attempt record; review record; reopened record; diag jsonb; before_count integer; denied boolean;
begin
  select value into d from v202_state where key='draft'; select value into pages from v202_state where key='pages'; select value#>>'{}' into method from v202_state where key='method';
  select * into intake from public.start_resume_intake(v202_id('org'),'synthetic.pdf','application/pdf','application/pdf',repeat('a',64),4096,1,'pdfjs-5.4.296/parser-ia-spans-v1','v202-start-intake-original');
  perform public.identify_resume_intake(v202_id('org'),intake.intake_id,'Synthetic Person','synthetic@example.invalid',null);
  select * into resolved from public.resolve_resume_intake(v202_id('org'),intake.intake_id,'link_existing_person',v202_id('person'),'v202-link-existing-person');
  insert into v202_state values ('intake',to_jsonb(intake.intake_id)),('document',to_jsonb(resolved.document_id));
  select count(*) into before_count from public.document_processing_attempts;
  begin
    perform public.persist_person_extraction(v202_id('org'),resolved.person_id,resolved.document_id,jsonb_set(pages,'{0,field_evidence,0,fieldPath}','"invalid-path"'),d,1,0,'pdfjs-5.4.296/parser-ia-spans-v1',null,method,'synthetic','v202-persist-invalid-data',null);
    raise exception 'Invalid evidence was persisted';
  exception when sqlstate '22023' then denied:=true; end;
  perform v202_assert(denied and (select count(*)=before_count from public.document_processing_attempts) and (select count(*)=0 from public.document_page_extractions),'invalid evidence rolls back without attempt/pages');
  diag:=jsonb_build_object('contract','import-evidence-1.1.0','stage','persisting','reason','unicode_invalid','fieldPath',null,'pageNumber',1,'evidenceIndex',0,'technicalCode','22P05','adapterVersion','evidence-adapter-1.0.1','structuringVersion',method);
  perform v202_reject(format('select public.record_resume_import_failure(%L,%L,%L,%L,%L::jsonb,%L)',v202_id('org'),resolved.person_id,resolved.document_id,intake.intake_id,diag||'{"resumeText":"FORBIDDEN"}','v202-denied-raw-diagnostic'),'22023');
  perform public.record_resume_import_failure(v202_id('org'),resolved.person_id,resolved.document_id,intake.intake_id,diag,'v202-record-failure-contract');
  perform public.record_resume_import_failure(v202_id('org'),resolved.person_id,resolved.document_id,intake.intake_id,diag,'v202-record-failure-contract');
  perform v202_assert((select count(*)=1 from public.person_ingestion_events where document_id=resolved.document_id and event_type='processing_failed'),'failure retry idempotent, no duplicated event');
  perform v202_assert((select status='failed' and error_code='import_evidence_contract_invalid' from public.resume_intakes where id=intake.intake_id),'intake failed atomically with permanent reason');
  perform v202_assert((select count(*)=1 from public.person_ingestion_events where document_id=resolved.document_id and event_type='resume_intake_failed'),'intake failure event also idempotent');
  perform v202_assert((select not can_reprocess from public.documents where id=resolved.document_id),'permanent retry unavailable until corrected adapter');
  perform v202_assert((select metadata->'diagnostic'=diag from public.person_ingestion_events where document_id=resolved.document_id and event_type='processing_failed'),'safe diagnostic persisted without raw error/PII');
  perform v202_reject(format('select public.record_resume_import_failure(%L,%L,%L,%L,%L::jsonb,%L)',v202_id('org'),resolved.person_id,resolved.document_id,intake.intake_id,diag||'{"adapterVersion":"evidence-adapter-1.0.0"}'::jsonb,'v202-mismatched-contract-pair'),'22023');
  begin
    perform public.record_resume_import_failure(v202_id('org'),resolved.person_id,resolved.document_id,intake.intake_id,diag||'{"contract":"import-evidence-1.0.0","adapterVersion":"evidence-adapter-1.0.0","reason":"field_path_invalid","technicalCode":"22023"}'::jsonb,'v202-legacy-client-diagnostic');
    raise exception using errcode='ZX001',message='rollback successful legacy compatibility proof';
  exception when sqlstate 'ZX001' then raise notice 'PASS: legacy diagnostic client remains supported, subtransaction rolled back'; end;
  select * into attempt from public.persist_person_extraction(v202_id('org'),resolved.person_id,resolved.document_id,pages,d,1,0,'pdfjs-5.4.296/parser-ia-spans-v1',null,method,'synthetic','v202-persist-corrected-data',null);
  select * into reopened from public.persist_person_extraction(v202_id('org'),resolved.person_id,resolved.document_id,pages,d,1,0,'pdfjs-5.4.296/parser-ia-spans-v1',null,method,'synthetic','v202-persist-corrected-data',null);
  perform v202_assert(reopened.reused and reopened.processing_attempt_id=attempt.processing_attempt_id,'corrected persistence is idempotent');
  perform v202_assert((select field_evidence=pages#>'{0,field_evidence}' and layout_blocks=pages#>'{0,layout_blocks}' from public.document_page_extractions where processing_attempt_id=attempt.processing_attempt_id),'every region and separate descriptor preserved');
  select * into review from public.start_document_revision(v202_id('org'),resolved.person_id,resolved.document_id,attempt.processing_attempt_id,'v202-start-human-review');
  select * into reopened from public.start_document_revision(v202_id('org'),resolved.person_id,resolved.document_id,attempt.processing_attempt_id,'v202-start-human-review');
  perform v202_assert(reopened.reused and reopened.review_id=review.review_id,'review can be opened and reopened without duplicate');
  perform v202_assert((select extracted_data=d and reviewed_data=d and state='draft' from public.profile_reviews where id=review.review_id),'review retains sections/results/tools/contexts without approval');
  perform v202_assert((select count(*)=(select value::integer from v202_state where key='evidence_count') from public.profile_review_evidence_links where review_id=review.review_id and spatial_region_id is not null),'actual UI revision RPC links every original region');
  perform v202_assert((select count(*)=4 from public.profile_review_evidence_links where review_id=review.review_id and (field_path in ('toolsAndTechnologies','professionalContexts') or field_path like 'customSections.%.name')),'titles/tools/contexts remain selectable original evidence');
  select * into reopened from public.save_profile_review(v202_id('org'),review.review_id,review.lock_version,d||'{"toolsAndTechnologies":["Synthetic edited tool"],"professionalContexts":["Synthetic edited context"]}',null,'v202-save-category-review');
  perform v202_assert((select count(*)=2 from public.profile_review_changes where review_id=review.review_id and field_path in ('toolsAndTechnologies','professionalContexts')),'category edits have their own review history');
  perform v202_assert((select count(*)=1 and bool_and(profile_data='{"syntheticApprovedBaseline":true}'::jsonb and superseded_at is null) from public.professional_profiles where person_id=resolved.person_id),'existing profile never published/replaced');
  perform v202_assert((select count(*)=1 from public.people),'no duplicate person');
  insert into v202_state values ('review',to_jsonb(review.review_id));
end $$;
select set_config('request.jwt.claim.sub',v202_id('member')::text,true);
select v202_reject(format('select public.record_resume_import_failure(%L,%L,%L,%L,%L::jsonb,%L)',v202_id('org'),v202_id('person'),(select value#>>'{}' from v202_state where key='document'),(select value#>>'{}' from v202_state where key='intake'),'{}','v202-member-forbidden-rpc'),'42501');
select set_config('request.jwt.claim.sub',v202_id('outsider')::text,true);
select v202_assert((select count(*)=0 from public.profile_reviews),'RLS hides another tenant review');
select v202_reject(format('select * from public.persist_person_extraction(%L,%L,%L,%L::jsonb,%L::jsonb,1,0,%L,null,%L,%L,%L,null)',v202_id('org'),v202_id('person'),(select value#>>'{}' from v202_state where key='document'),(select value from v202_state where key='pages'),(select value from v202_state where key='draft'),'synthetic','synthetic','synthetic','v202-outsider-forbidden-rpc'),'42501');
select set_config('request.jwt.claim.sub','',true);
select v202_reject(format('select public.record_resume_import_failure(%L,%L,%L,%L,%L::jsonb,%L)',v202_id('org'),v202_id('person'),(select value#>>'{}' from v202_state where key='document'),(select value#>>'{}' from v202_state where key='intake'),'{}','v202-session-forbidden-rpc'),'42501');
rollback;
select 'V202_POSTGRES_QA_PASS_ROLLED_BACK' as verification;
