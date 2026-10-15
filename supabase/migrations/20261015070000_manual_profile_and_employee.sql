-- manual-profile-1.0.0 / employee-status-1.0.0. Additive; no historical profile rewrite.
begin;

alter table public.people add column is_active_employee boolean not null default false;
create index people_active_employee_idx on public.people(organization_id,is_active_employee,updated_at desc);

create function private.audit_employee_status() returns trigger
language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin
  if (tg_op='INSERT' and new.is_active_employee) or (tg_op='UPDATE' and old.is_active_employee is distinct from new.is_active_employee) then
    actor:=private.require_document_reviewer(new.organization_id);
    insert into public.person_ingestion_events(organization_id,person_id,actor_auth_user_id,event_type,result,metadata)
    values(new.organization_id,new.id,actor,'employee_status_changed','success',jsonb_build_object(
      'contract','employee-status-1.0.0','previous',case when tg_op='UPDATE' then old.is_active_employee else false end,'current',new.is_active_employee));
  end if;
  return new;
end $$;
revoke all on function private.audit_employee_status() from public,anon,authenticated;
create trigger employee_status_audit after insert or update of is_active_employee on public.people
for each row execute function private.audit_employee_status();

alter table public.profile_reviews drop constraint profile_reviews_source_kind_check;
alter table public.profile_reviews add constraint profile_reviews_source_kind_check check(source_kind in('document','profile','manual'));
alter table public.profile_reviews drop constraint profile_reviews_source_shape_check;
alter table public.profile_reviews add constraint profile_reviews_source_shape_check check(
  (source_kind='document' and ((document_id is not null and processing_attempt_id is not null) or (document_id is null and source_document_snapshot is not null)))
  or (source_kind='profile' and source_profile_id is not null)
  or (source_kind='manual' and document_id is null and processing_attempt_id is null and source_document_snapshot is null));
create unique index profile_reviews_one_manual_draft_idx on public.profile_reviews(organization_id,person_id) where state='draft' and source_kind='manual';
alter table public.profile_reviews add column field_provenance jsonb not null default '{}' check(jsonb_typeof(field_provenance)='object');
alter table public.professional_profiles add column field_provenance jsonb not null default '{}' check(jsonb_typeof(field_provenance)='object');

-- Add a new operation without reopening the current operation allowlist.
do $$ declare definition text;
begin
  select pg_get_constraintdef(oid) into definition from pg_constraint
  where conrelid='public.document_operations'::regclass and conname='document_operations_operation_type_check';
  if definition is null or strpos(definition,'''save_review_draft''')=0 then raise exception 'operation allowlist baseline changed'; end if;
  alter table public.document_operations drop constraint document_operations_operation_type_check;
  execute 'alter table public.document_operations add constraint document_operations_operation_type_check '||replace(definition,'''save_review_draft''','''start_manual_review'', ''save_review_draft''');
end $$;

-- The same exact-name, normalized email/phone rules used by curriculum-first intake.
create function private.manual_profile_duplicates(p_org uuid,p_identity jsonb) returns jsonb
language sql stable set search_path='' as $$
  with input as (
    select lower(regexp_replace(btrim(p_identity->>'fullName'),'[[:space:]]+',' ','g')) name,
      nullif(lower(btrim(p_identity->>'email')),'') email,
      nullif(regexp_replace(coalesce(p_identity->>'phone',''),'[^0-9]','','g'),'') phone
  ), normalized as (select name,email,case when length(phone) in(10,11) then '55'||phone else phone end phone from input),
  matches as (
    select p.id person_id,p.full_name,d.email,coalesce(d.phone_e164,d.phone) phone,
      array_remove(array[case when n.email=lower(btrim(d.email)) then 'same_email' end,
        case when n.phone=regexp_replace(coalesce(d.phone_e164,d.phone),'[^0-9]','','g') then 'same_phone' end,
        case when n.name=lower(regexp_replace(btrim(p.full_name),'[[:space:]]+',' ','g')) then 'same_name' end],null) reasons,
      coalesce(n.email=lower(btrim(d.email)),false) or coalesce(n.phone=regexp_replace(coalesce(d.phone_e164,d.phone),'[^0-9]','','g'),false) strong
    from public.people p left join public.person_private_data d on d.organization_id=p.organization_id and d.person_id=p.id cross join normalized n
    where p.organization_id=p_org and p.operational_status<>'merged' and (
      n.name=lower(regexp_replace(btrim(p.full_name),'[[:space:]]+',' ','g')) or n.email=lower(btrim(d.email)) or n.phone=regexp_replace(coalesce(d.phone_e164,d.phone),'[^0-9]','','g'))
    order by strong desc,p.updated_at desc limit 12
  ) select coalesce(jsonb_agg(to_jsonb(matches) order by strong desc,full_name),'[]') from matches
$$;
revoke all on function private.manual_profile_duplicates(uuid,jsonb) from public,anon,authenticated;

create function public.find_manual_profile_duplicates(p_organization_id uuid,p_identity jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  perform private.require_document_reviewer(p_organization_id);
  if coalesce(jsonb_typeof(p_identity),'')<>'object' or length(coalesce(p_identity->>'fullName',''))>160 then raise exception using errcode='22023',message='manual_identity_invalid'; end if;
  return private.manual_profile_duplicates(p_organization_id,p_identity);
end $$;
revoke all on function public.find_manual_profile_duplicates(uuid,jsonb) from public,anon;
grant execute on function public.find_manual_profile_duplicates(uuid,jsonb) to authenticated;

-- Flatten meaningful facts using record IDs (or value hashes for scalar lists), never list indices.
create function private.manual_fact_values(p_value jsonb,p_path text default '') returns table(path text,value jsonb)
language plpgsql immutable set search_path='' as $$
declare item record; segment text;
begin
  if jsonb_typeof(p_value)='object' then
    for item in select * from jsonb_each(p_value) loop
      if item.key in('id','source','classifierSnapshot','classificationSources','classificationReviewed','classificationOrigin','classificationReasons','classificationMethodVersion','evidenceText','page','originalText','uncertainties','notIdentified') then continue; end if;
      return query select * from private.manual_fact_values(item.value,concat_ws('.',nullif(p_path,''),item.key));
    end loop;
  elsif jsonb_typeof(p_value)='array' then
    for item in select v from jsonb_array_elements(p_value) t(v) loop
      segment:=coalesce(item.v->>'id',encode(extensions.digest(item.v::text,'sha256'),'hex'));
      return query select * from private.manual_fact_values(item.v,concat_ws('.',nullif(p_path,''),segment));
    end loop;
  elsif p_value<>'null'::jsonb and p_value<>'""'::jsonb then
    return query select p_path,p_value;
  end if;
end $$;
revoke all on function private.manual_fact_values(jsonb,text) from public,anon,authenticated;

create function private.assert_manual_profile_fields(payload jsonb) returns void
language plpgsql immutable set search_path='' as $$
declare field record; val text;
begin
  if not private.is_valid_structured_resume_summary(payload) or not private.is_valid_review_field_lifecycle(payload,true)
    or not private.is_valid_education_classification(payload,true) then raise exception using errcode='22023',message='manual_contract_invalid'; end if;
  if length(btrim(coalesce(payload#>>'{identity,fullName}',''))) not between 2 and 160 then perform private.raise_review_action_required('full_name_required','identity.fullName'); end if;
  val:=nullif(btrim(payload#>>'{contact,email}'),'');
  if val is not null and (length(val)>320 or val !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then raise exception using errcode='22023',message='manual_email_invalid'; end if;
  val:=nullif(btrim(payload#>>'{contact,phone}'),'');
  if val is not null and (val !~ '^\+?[0-9[:space:]().-]+$' or length(regexp_replace(val,'[^0-9]','','g')) not between 10 and 15) then raise exception using errcode='22023',message='manual_phone_invalid'; end if;
  val:=nullif(btrim(payload#>>'{contact,linkedin}'),'');
  if val is not null and (length(val)>500 or val !~* '^https://([a-z0-9-]+\.)?linkedin\.com/in/[a-z0-9%_.-]+/?$') then raise exception using errcode='22023',message='manual_linkedin_invalid'; end if;
  for field in select * from (values('professionalTitle',240),('professionalObjective',4000),('summary',12000)) limits(name,max_length) loop
    if length(payload->>field.name)>field.max_length then raise exception using errcode='22023',message='manual_field_too_long'; end if;
  end loop;
  perform private.assert_review_period_formats(payload);
end $$;
revoke all on function private.assert_manual_profile_fields(jsonb) from public,anon,authenticated;

create function private.track_manual_profile_provenance() returns trigger
language plpgsql security definer set search_path='' as $$
declare fact record; prior jsonb; provenance jsonb; base public.professional_profiles; actor uuid;
begin
  if new.source_kind='document' and tg_op='INSERT' then return new; end if;
  actor:=private.require_document_reviewer(new.organization_id);
  if new.source_kind='manual' then perform private.assert_manual_profile_fields(new.reviewed_data); end if;
  if coalesce(new.source_profile_id,new.base_profile_id) is not null then
    select * into base from public.professional_profiles p where p.organization_id=new.organization_id and p.person_id=new.person_id and p.id=coalesce(new.source_profile_id,new.base_profile_id);
  end if;
  if tg_op='INSERT' then
    prior:=coalesce(base.profile_data,'{}'); provenance:=coalesce(base.field_provenance,'{}')||new.field_provenance;
  else
    prior:=old.reviewed_data; provenance:=old.field_provenance;
  end if;
  for fact in select n.path,n.value,coalesce(o.value,b.value) previous,b.value base_value from private.manual_fact_values(new.reviewed_data) n
    left join private.manual_fact_values(prior) o using(path)
    left join private.manual_fact_values(coalesce(base.profile_data,'{}')) b using(path) loop
    if tg_op='INSERT' and new.field_provenance ? fact.path then continue; end if;
    if fact.value is distinct from fact.previous then
      provenance:=provenance||jsonb_build_object(fact.path,jsonb_build_object('origin','manual','actorAuthUserId',actor,'recordedAt',now(),'reviewId',new.id,'revision',new.lock_version));
    elsif not provenance ? fact.path then
      provenance:=provenance||jsonb_build_object(fact.path,
        case when fact.value=fact.base_value and base.id is not null then coalesce(base.field_provenance->fact.path,jsonb_build_object('origin','inherited_profile','sourceProfileId',base.id))
          when new.document_id is not null then jsonb_build_object('origin','document','documentId',new.document_id,'processingAttemptId',new.processing_attempt_id)
          else jsonb_build_object('origin','inherited_profile','sourceProfileId',new.source_profile_id) end);
    end if;
  end loop;
  new.field_provenance:=provenance;
  return new;
end $$;
revoke all on function private.track_manual_profile_provenance() from public,anon,authenticated;
create trigger zz_manual_profile_provenance before insert or update of reviewed_data on public.profile_reviews
for each row execute function private.track_manual_profile_provenance();

create function private.copy_profile_field_provenance() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.review_id is not null then
    select r.field_provenance into new.field_provenance from public.profile_reviews r
    where r.organization_id=new.organization_id and r.person_id=new.person_id and r.id=new.review_id;
  elsif new.base_profile_id is not null then
    select p.field_provenance into new.field_provenance from public.professional_profiles p
    where p.organization_id=new.organization_id and p.person_id=new.person_id and p.id=new.base_profile_id;
  end if;
  new.field_provenance:=coalesce(new.field_provenance,'{}'); return new;
end $$;
revoke all on function private.copy_profile_field_provenance() from public,anon,authenticated;
create trigger profile_field_provenance before insert on public.professional_profiles for each row execute function private.copy_profile_field_provenance();

create function public.start_manual_profile_review(p_organization_id uuid,p_person_id uuid,p_identity jsonb,p_confirm_new boolean,p_idempotency_key text)
returns table(person_id uuid,review_id uuid,reused boolean)
language plpgsql security definer set search_path='' as $$
#variable_conflict error
declare actor uuid; person public.people; base public.professional_profiles; review public.profile_reviews; op public.document_operations;
  payload jsonb; private_data public.person_private_data; fingerprint text; created_person uuid; matches jsonb; digits text; initial_sources jsonb:='{}';
begin
  actor:=private.require_document_reviewer(p_organization_id);
  if p_idempotency_key is null or length(p_idempotency_key) not between 16 and 160 or coalesce(jsonb_typeof(p_identity),'')<>'object'
    or length(p_identity::text)>4096 or p_identity-array['fullName','email','phone']<>'{}'::jsonb
  then raise exception using errcode='22023',message='manual_request_invalid'; end if;
  fingerprint:=encode(extensions.digest(jsonb_build_array(p_person_id,p_identity,p_confirm_new)::text,'sha256'),'hex');
  -- Serializes creation and replays before a Person exists. Locks are transaction scoped.
  perform pg_advisory_xact_lock(hashtextextended('manual-profile:'||p_organization_id::text,0));
  select * into op from public.document_operations o where o.organization_id=p_organization_id and o.operation_type='start_manual_review' and o.idempotency_key=p_idempotency_key for update;
  if found then
    if op.request_fingerprint<>fingerprint or op.actor_auth_user_id<>actor then raise exception using errcode='23505',message='manual_request_conflict'; end if;
    if op.status='completed' then return query select op.person_id,op.review_id,true; return; end if;
  end if;
  if p_person_id is null then
    if length(btrim(coalesce(p_identity->>'fullName',''))) not between 2 and 160 then raise exception using errcode='22023',message='manual_name_required'; end if;
    if nullif(p_identity->>'email','') is not null and (length(p_identity->>'email')>254 or p_identity->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then raise exception using errcode='22023',message='manual_email_invalid'; end if;
    if nullif(p_identity->>'phone','') is not null and (length(p_identity->>'phone')>40 or p_identity->>'phone' !~ '^\+?[0-9[:space:]().-]+$' or length(regexp_replace(p_identity->>'phone','[^0-9]','','g')) not between 10 and 15) then raise exception using errcode='22023',message='manual_phone_invalid'; end if;
    matches:=private.manual_profile_duplicates(p_organization_id,p_identity);
    if jsonb_array_length(matches)>0 and p_confirm_new is distinct from true then raise exception using errcode='23505',message='manual_duplicate_confirmation_required'; end if;
    insert into public.people(organization_id,full_name,lifecycle) values(p_organization_id,btrim(p_identity->>'fullName'),'candidate') returning id into created_person;
    digits:=nullif(regexp_replace(coalesce(p_identity->>'phone',''),'[^0-9]','','g'),'');
    if length(digits) in(10,11) then digits:='55'||digits; end if;
    insert into public.person_private_data(organization_id,person_id,email,phone,phone_e164,phone_country_iso2,phone_country_label,phone_country_code,phone_national_number)
    values(p_organization_id,created_person,nullif(lower(btrim(p_identity->>'email')),''),nullif(btrim(p_identity->>'phone'),''),case when digits is not null then '+'||digits end,
      case when digits like '55%' then 'BR' end,case when digits like '55%' then 'Brasil' end,case when digits like '55%' then '+55' end,case when digits like '55%' then substring(digits from 3) end);
  else created_person:=p_person_id;
  end if;
  select * into person from public.people p where p.organization_id=p_organization_id and p.id=created_person and p.operational_status='active' for update;
  if not found then raise exception using errcode='P0002',message='manual_person_unavailable'; end if;
  select * into review from public.profile_reviews r where r.organization_id=p_organization_id and r.person_id=created_person and r.source_kind='manual' and r.state='draft' for update;
  op:=private.claim_document_operation(p_organization_id,created_person,null,'start_manual_review',p_idempotency_key,fingerprint,actor);
  if review.id is not null then
    update public.document_operations o set review_id=review.id,status='completed',completed_at=now() where o.id=op.id;
    return query select created_person,review.id,true; return;
  end if;
  select * into base from public.professional_profiles p where p.organization_id=p_organization_id and p.person_id=created_person and p.superseded_at is null for update;
  select * into private_data from public.person_private_data d where d.organization_id=p_organization_id and d.person_id=created_person;
  payload:=jsonb_build_object('identity',jsonb_build_object('fullName',person.full_name),'contact',jsonb_build_object(
    'email',coalesce(private_data.email,nullif(p_identity->>'email','')),'phone',coalesce(private_data.phone_e164,private_data.phone,nullif(p_identity->>'phone','')),
    'city',private_data.city,'state',private_data.state_code,'linkedin',private_data.linkedin_url),
    'professionalTitle',null,'areasOfExpertise','[]'::jsonb,'professionalObjective',null,'summary',null,'keyResults','[]'::jsonb,
    'experiences','[]'::jsonb,'education','[]'::jsonb,'certifications','[]'::jsonb,'languages','[]'::jsonb,'competencies','[]'::jsonb,
    'toolsAndTechnologies','[]'::jsonb,'professionalContexts','[]'::jsonb,'customSections','[]'::jsonb,'uncertainties','[]'::jsonb,'notIdentified','[]'::jsonb)
    ||coalesce(base.profile_data-'identity'-'contact','{}'::jsonb);
  payload:=private.normalize_profile_review_contract(payload,payload);
  if p_person_id is not null then
    select coalesce(jsonb_object_agg(f.path,jsonb_build_object('origin','person_registry','sourcePersonId',created_person,'snapshotAt',now())),'{}') into initial_sources
    from private.manual_fact_values(jsonb_build_object('identity',payload->'identity','contact',payload->'contact')) f;
  end if;
  insert into public.profile_reviews(organization_id,person_id,source_kind,source_profile_id,base_profile_id,base_profile_version,
    current_profile_id_at_start,current_profile_version_at_start,extracted_data,reviewed_data,field_provenance,started_by_auth_user_id,last_edited_by_auth_user_id)
  values(p_organization_id,created_person,'manual',base.id,base.id,base.profile_version,base.id,base.profile_version,payload,payload,initial_sources,actor,actor) returning * into review;
  insert into public.profile_review_revisions(organization_id,review_id,revision_number,reviewed_data,change_reason,actor_auth_user_id)
  values(p_organization_id,review.id,1,payload,'Preenchimento manual estruturado iniciado; versão vigente preservada.',actor);
  update public.document_operations o set review_id=review.id,status='completed',completed_at=now(),result=jsonb_build_object('review_id',review.id) where o.id=op.id;
  insert into public.person_ingestion_events(organization_id,person_id,actor_auth_user_id,event_type,result,metadata)
  values(p_organization_id,created_person,actor,'manual_profile_review_started','success',jsonb_build_object('contract','manual-profile-1.0.0','review_id',review.id,'source_profile_id',base.id,'duplicate_confirmation',p_confirm_new));
  return query select created_person,review.id,false;
end $$;
revoke all on function public.start_manual_profile_review(uuid,uuid,jsonb,boolean,text) from public,anon;
grant execute on function public.start_manual_profile_review(uuid,uuid,jsonb,boolean,text) to authenticated;

-- Permit partial manual drafts only. Preserve all shape gates and PDF behavior.
do $$ declare definition text; marker text;
begin
  definition:=pg_get_functiondef('public.save_profile_review(uuid,uuid,integer,jsonb,text,text)'::regprocedure);
  marker:='  next_revision := review.lock_version + 1;';
  if (length(definition)-length(replace(definition,marker,'')))/length(marker)<>1 then raise exception 'manual save preflight baseline changed'; end if;
  execute replace(definition,marker,'  if review.source_kind=''manual'' then perform private.assert_manual_profile_fields(p_reviewed_data); end if;'||chr(10)||marker);

  definition:=pg_get_functiondef('private.enforce_saved_profile_review_lifecycle()'::regprocedure);
  marker:='  if nullif(btrim(new.reviewed_data #>> ''{contact,phone}''), '''') is null';
  if strpos(definition,marker)=0 then raise exception 'review contact guard baseline changed'; end if;
  definition:=replace(definition,marker,'  if not (new.source_kind=''manual'' and new.state=''draft'') and nullif(btrim(new.reviewed_data #>> ''{contact,phone}''), '''') is null');
  marker:='  if not private.has_material_professional_information(new.reviewed_data)';
  if strpos(definition,marker)=0 then raise exception 'review material guard baseline changed'; end if;
  execute replace(definition,marker,'  if not (new.source_kind=''manual'' and new.state=''draft'') and not private.has_material_professional_information(new.reviewed_data)');

  definition:=pg_get_functiondef('public.approve_profile_review(uuid,uuid,integer,text)'::regprocedure);
  marker:='  perform 1 from public.people item';
  if (length(definition)-length(replace(definition,marker,'')))/length(marker)<>1 then raise exception 'approval baseline changed'; end if;
  definition:=replace(definition,marker,$guard$
  if review.source_kind='manual' then
    if not private.has_material_professional_information(review.reviewed_data) then perform private.raise_review_action_required('professional_information_required','professionalTitle'); end if;
    if nullif(btrim(review.reviewed_data#>>'{contact,phone}'),'') is null and nullif(btrim(review.reviewed_data#>>'{contact,email}'),'') is null
      and not exists(select 1 from public.person_private_data d where d.organization_id=p_organization_id and d.person_id=review.person_id
        and coalesce(nullif(btrim(d.email),''),nullif(btrim(d.phone_e164),''),nullif(btrim(d.phone),'')) is not null)
    then perform private.raise_review_action_required('contact_required','contact.phone'); end if;
  end if;
$guard$||marker);
  marker:='case when review.source_kind = ''profile'' then ''profile-snapshot-reuse-v1'' else ''m2c-reviewed-v2'' end';
  if strpos(definition,marker)=0 then raise exception 'approval origin baseline changed'; end if;
  execute replace(definition,marker,'case when review.source_kind=''manual'' then ''manual-profile-1.0.0'' when review.source_kind=''profile'' then ''profile-snapshot-reuse-v1'' else ''m2c-reviewed-v2'' end');
end $$;

-- The inner approval remains callable only through the existing publication boundary.
revoke all on function public.approve_profile_review(uuid,uuid,integer,text) from public,anon,authenticated;
comment on column public.people.is_active_employee is 'Administrative boolean, default false. False does not assert former/never employee; no AI inference. Tenant-scoped audited human changes.';
comment on column public.professional_profiles.field_provenance is 'Per-fact manual declarations with author/date/review; inherited facts retain origin, never imply PDF evidence or Prisma verification.';
commit;
