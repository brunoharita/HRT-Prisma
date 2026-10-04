-- Disposable LOCAL PostgreSQL only; synthetic authorized actors and data; all writes rolled back.
begin;
create function public.s202_id(text) returns uuid language sql immutable as $$ select md5('s202-fixture-'||$1)::uuid $$;
create function public.s202_assert(boolean,text) returns void language plpgsql as $$
begin if $1 is distinct from true then raise exception 'S202 FAIL: %',$2; end if; raise notice 'PASS: %',$2; end $$;
create function public.s202_reject(text,text) returns void language plpgsql as $$
begin
  begin execute $1; exception when others then
    if sqlstate=$2 then raise notice 'PASS: denied (%)',sqlstate; return; end if;
    raise exception 'Unexpected denial %: %',sqlstate,sqlerrm;
  end;
  raise exception 'S202 FAIL: expected rejection';
end $$;
create temp table s202_state(key text primary key,value jsonb);
grant all on s202_state to authenticated;
insert into s202_state values ('draft', :'draft'::jsonb),('pages', :'pages'::jsonb),('method',to_jsonb(:'method'::text));
insert into public.organization_groups(id,name,slug) values(s202_id('group'),'S202 synthetic','s202-synthetic');
insert into public.organizations(id,name,group_id) values(s202_id('org'),'S202 A',s202_id('group')),(s202_id('other-org'),'S202 B',s202_id('group'));
insert into auth.users(id,email) select s202_id(u),u||'@s202.invalid' from unnest(array['recruiter','member','outsider']) u;
insert into public.platform_users(id,auth_user_id,full_name,username,email,access_profile,group_id,status)
select s202_id('platform-'||u),s202_id(u),'Synthetic '||u,'s202-'||u,u||'@s202.invalid',case when u='member' then 'member'::public.membership_role else 'recruiter'::public.membership_role end,s202_id('group'),'active'
from unnest(array['recruiter','member','outsider']) u;
insert into public.organization_memberships(organization_id,user_id,role) values(s202_id('org'),s202_id('recruiter'),'recruiter'),(s202_id('org'),s202_id('member'),'member'),(s202_id('other-org'),s202_id('outsider'),'recruiter');
insert into public.people(id,organization_id,full_name) select s202_id('person-'||i),s202_id('org'),'Synthetic Person' from generate_series(1,5) i;
insert into public.person_private_data(organization_id,person_id,email) select s202_id('org'),s202_id('person-'||i),'person'||i||'@s202.invalid' from generate_series(1,5) i;
select s202_assert(not has_function_privilege('anon','public.publish_profile_review(uuid,uuid,integer,text,jsonb,text)','execute'),'anonymous publication denied');
select s202_assert(not has_function_privilege('authenticated','private.learn_approved_custom_profile_sections()','execute'),'learning trigger remains private');
set local role authenticated;
select set_config('request.jwt.claim.sub',s202_id('recruiter')::text,true);
do $$
declare
  d jsonb; pages jsonb; method text; intake record; resolved record; attempt record; review record;
  published record; replay record; section_key text; section_name text; section_format text;
  before_count integer; before_events integer; before_data jsonb;
begin
  select value into pages from s202_state where key='pages';
  select value#>>'{}' into method from s202_state where key='method';
  pages := jsonb_set(pages,'{0,field_evidence}',(select jsonb_agg(value) from jsonb_array_elements(pages#>'{0,field_evidence}') where value->>'fieldPath'='professionalTitle'));
  for i in 1..5 loop
    select value into d from s202_state where key='draft';
    -- Valid fixture, with independent source/item IDs for each publication.
    section_key := case i when 1 then 'section_first123' when 2 then 'section_second12' when 3 then 'section_first123' when 4 then 'section_first123' else 'section_fifth123' end;
    section_name := case when i>=4 then 'Synthetic Renamed Heading' else 'Synthetic Shared Heading' end;
    section_format := case when i=3 then 'text' else 'list' end;
    d := d || jsonb_build_object('education','[]'::jsonb,'keyResults','[]'::jsonb,'customSections',jsonb_build_array(jsonb_build_object(
      'id',section_key,'name',section_name,'format',section_format,'source','extracted',
      'items',jsonb_build_array(jsonb_build_object('id','item_source_'||i,'value','Synthetic declared item '||i))
    )));
    d := jsonb_set(d,'{contact,email}',to_jsonb('person'||i||'@s202.invalid'));
    d := jsonb_set(d,'{contact,phone}','null');
    select * into intake from public.start_resume_intake(s202_id('org'),'s202-'||i||'.pdf','application/pdf','application/pdf',md5('s202-source-'||i)||md5('s202-source-'||i),4096,1,'synthetic','s202-start-intake-'||i);
    perform public.identify_resume_intake(s202_id('org'),intake.intake_id,'Synthetic Person','person'||i||'@s202.invalid',null);
    select * into resolved from public.resolve_resume_intake(s202_id('org'),intake.intake_id,'link_existing_person',s202_id('person-'||i),'s202-link-person-'||i);
    select * into attempt from public.persist_person_extraction(s202_id('org'),resolved.person_id,resolved.document_id,pages,d,1,0,'synthetic',null,method,'synthetic','s202-persist-data-'||i,null);
    select * into review from public.start_document_revision(s202_id('org'),resolved.person_id,resolved.document_id,attempt.processing_attempt_id,'s202-start-review-'||i);
    perform s202_reject(format('select public.publish_profile_review(%L,%L,%s,%L,%L::jsonb,%L)',s202_id('org'),review.review_id,review.lock_version+1,'merge','[]','s202-stale-review-'||i),'P0001');
    perform s202_assert((select count(*)=0 from public.professional_profiles where person_id=resolved.person_id) and (select state='draft' and lock_version=review.lock_version from public.profile_reviews where id=review.review_id),'stale review rolls back without changing Profile/review');
    select jsonb_agg(to_jsonb(link) order by link.id) into before_data from public.profile_review_evidence_links link where link.review_id=review.review_id;
    if i=2 then
      insert into s202_state values ('review',to_jsonb(review.review_id));
      -- Running this fixture against the old trigger reproduces 23505 here.
    end if;
    select * into published from public.publish_profile_review(s202_id('org'),review.review_id,review.lock_version,'merge','[]'::jsonb,'s202-publish-review-'||i);
    perform s202_assert(published.profile_version=1 and not published.reused,'first publication completes for synthetic Person '||i);
    perform s202_assert((select profile_data->'customSections'=d->'customSections' from public.professional_profiles where id=published.profile_id),'source IDs/items/order unchanged for Person '||i);
    perform s202_assert((select jsonb_agg(to_jsonb(link) order by link.id)=before_data from public.profile_review_evidence_links link where link.review_id=review.review_id),'evidence links and source descriptors unchanged through publication');
    perform s202_assert((select state='approved' and approved_profile_id=published.profile_id from public.profile_reviews where id=review.review_id),'review and Profile committed atomically');
    select count(*) into before_count from public.organization_custom_section_confirmations;
    select count(*) into before_events from public.person_ingestion_events;
    select * into replay from public.publish_profile_review(s202_id('org'),review.review_id,review.lock_version,'merge','[]'::jsonb,'s202-publish-review-'||i);
    perform s202_assert(replay.reused and replay.profile_id=published.profile_id and (select count(*)=1 from public.professional_profiles where person_id=resolved.person_id),'publication replay reuses immutable version');
    perform s202_assert((select count(*)=before_count from public.organization_custom_section_confirmations) and (select count(*)=before_events from public.person_ingestion_events),'replay adds no confirmations/events');
    if i=2 then
      perform s202_assert((select count(*)=1 and min(catalog.section_key)='section_first123' and min(confirmation_count)=2 from public.organization_custom_section_definitions catalog where organization_id=s202_id('org')),'same normalized heading with different source IDs reuses canonical definition');
      perform s202_assert((select count(*)=2 and count(distinct confirmation.section_key)=2 from public.organization_custom_section_confirmations confirmation),'confirmation ledger preserves each source key');
    end if;
  end loop;
  perform s202_assert((select count(*)=1 and min(confirmation_count)=5 and min(normalized_name)='synthetic renamed heading' and min(format)='list' from public.organization_custom_section_definitions where organization_id=s202_id('org')),'same key format/rename retained; changed key with renamed heading also reuses definition');
  insert into s202_state values ('person',to_jsonb(resolved.person_id));
end $$;
select set_config('request.jwt.claim.sub',s202_id('member')::text,true);
select s202_reject(format('select public.publish_profile_review(%L,%L,1,%L,%L::jsonb,%L)',s202_id('org'),(select value#>>'{}' from s202_state where key='review'),'merge','[]','s202-member-publish-denied'),'42501');
select s202_reject('insert into public.organization_custom_section_definitions(organization_id,section_key,display_name,normalized_name,format) values (public.s202_id(''org''),''section_forbidden'',''Forbidden'',''forbidden'',''list'')','42501');
select set_config('request.jwt.claim.sub',s202_id('outsider')::text,true);
select s202_assert((select count(*)=0 from public.organization_custom_section_definitions),'catalog RLS isolates tenants');
select s202_reject(format('select public.publish_profile_review(%L,%L,1,%L,%L::jsonb,%L)',s202_id('org'),(select value#>>'{}' from s202_state where key='review'),'merge','[]','s202-outsider-publish-denied'),'42501');
select set_config('request.jwt.claim.sub','',true);
select s202_reject(format('select public.publish_profile_review(%L,%L,1,%L,%L::jsonb,%L)',s202_id('org'),(select value#>>'{}' from s202_state where key='review'),'merge','[]','s202-no-session-denied'),'42501');
reset role;
-- A matching title in another tenant stays an independent identity.
insert into public.organization_custom_section_definitions(organization_id,section_key,display_name,normalized_name,format)
values(s202_id('other-org'),'section_other123','Synthetic Renamed Heading','synthetic renamed heading','list');
select s202_assert((select count(*)=2 from public.organization_custom_section_definitions where normalized_name='synthetic renamed heading'),'same name is independent across tenants');
select s202_reject('update public.organization_custom_section_confirmations set section_key=''section_changed''','55000');
rollback;
select 'S202_PUBLICATION_QA_PASS_ROLLED_BACK' as verification;
