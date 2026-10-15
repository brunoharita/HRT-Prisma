begin;

-- Keep this new navigation type out of existing competency/occupation resolution.
-- Exact macroarea aliases use their own typed query below. Fail on drift instead
-- of silently editing a different function body.
do $$declare signature text; definition text; marker text;
begin
  foreach signature in array array['public.resolve_knowledge_term(uuid,text,text)','public.resolve_knowledge_term_v2(uuid,text,text)','public.suggest_knowledge_concepts(uuid,text,integer)'] loop
    definition:=pg_get_functiondef(signature::regprocedure);
    marker:='join public.knowledge_concepts concept on concept.id = term.concept_id';
    if strpos(definition,marker)=0 then raise exception 'PROFESSIONAL_AREA_RESOLVER_BASELINE_DRIFT: %',signature; end if;
    execute replace(definition,marker,marker||' and concept.concept_type <> ''professional_area''');
  end loop;
  signature:='private.resolve_normalized_competency(uuid,text,jsonb)';
  if to_regprocedure(signature) is not null then
    definition:=pg_get_functiondef(signature::regprocedure);
    marker:='concept.concept_type<>''occupation''';
    if strpos(definition,marker)=0 then raise exception 'PROFESSIONAL_AREA_NORMALIZER_BASELINE_DRIFT'; end if;
    execute replace(definition,marker,'concept.concept_type not in (''occupation'',''professional_area'')');
  end if;
end $$;
create function private.reject_macroarea_as_competency() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from public.knowledge_concepts where id=new.concept_id and concept_type='professional_area') then raise exception 'MACROAREA_IS_NOT_COMPETENCY_EVIDENCE' using errcode='22023'; end if;
  return new;
end $$;
revoke all on function private.reject_macroarea_as_competency() from public,anon,authenticated;
create trigger aa_reject_macroarea_classification before insert or update on public.knowledge_competency_classifications for each row execute function private.reject_macroarea_as_competency();
do $$begin
  if to_regclass('public.person_competency_evidence_links') is not null then
    create trigger aa_reject_macroarea_evidence before insert or update on public.person_competency_evidence_links for each row execute function private.reject_macroarea_as_competency();
  end if;
end $$;

-- Stable concept IDs; each edit keeps its previous snapshot in Knowledge approvals.
create function public.save_professional_area(p_organization_id uuid,p_id uuid,p_label text,p_description text,p_aliases jsonb,p_active boolean,p_expected_version integer default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid; c public.knowledge_concepts; cs uuid; v bigint; payload jsonb; inbox public.knowledge_inbox; proposal uuid; previous jsonb; t text;
begin
  actor:=private.require_knowledge_admin(p_organization_id);
  if p_active is null or length(btrim(coalesce(p_label,''))) not between 2 and 120 or length(coalesce(p_description,''))>2000
    or jsonb_typeof(p_aliases) is distinct from 'array' or jsonb_array_length(p_aliases)>30
    or exists(select 1 from jsonb_array_elements(p_aliases) a where jsonb_typeof(a)<>'string' or length(btrim(a#>>'{}')) not between 2 and 120)
    or concat_ws(' ',p_label,p_description,p_aliases::text) ~* '(@|https?://|\m[0-9]{3}[. -]?[0-9]{3}[. -]?[0-9]{3}[- ]?[0-9]{2}\M)'
    then raise exception 'PROFESSIONAL_AREA_INPUT_INVALID' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(concat_ws('|',case when p_organization_id is null then 'global'::public.knowledge_scope else 'organization'::public.knowledge_scope end,coalesce(p_organization_id::text,'global')),0));
  if p_id is not null then
    select * into c from public.knowledge_concepts where id=p_id for update;
    if not found or c.concept_type<>'professional_area' or c.organization_id is distinct from p_organization_id then raise exception 'PROFESSIONAL_AREA_SCOPE_INVALID' using errcode='42501'; end if;
    if c.version is distinct from p_expected_version then raise exception 'PROFESSIONAL_AREA_VERSION_CONFLICT' using errcode='40001'; end if;
    select to_jsonb(c)||jsonb_build_object('aliases',coalesce(jsonb_agg(term),'[]')) into previous from public.knowledge_terms where concept_id=c.id and status='approved';
  end if;
  if exists(select 1 from public.knowledge_concepts k where k.concept_type='professional_area' and k.organization_id is not distinct from p_organization_id
    and k.id is distinct from p_id and private.normalize_knowledge_term(k.canonical_label)=private.normalize_knowledge_term(p_label)) then
    raise exception 'PROFESSIONAL_AREA_ALREADY_EXISTS' using errcode='23505'; end if;
  select coalesce(max(version),0)+1 into v from public.knowledge_change_sets where organization_id is not distinct from p_organization_id;
  insert into public.knowledge_change_sets(scope,organization_id,version,summary,changed_entities,approved_by_auth_user_id)
    values(case when p_organization_id is null then 'global'::public.knowledge_scope else 'organization'::public.knowledge_scope end,p_organization_id,v,'Cadastro humano de área profissional',jsonb_build_array(jsonb_build_object('id',p_id,'previous',previous)),actor) returning id into cs;
  payload:=jsonb_build_object('proposed_concept',jsonb_build_object('canonical_label',btrim(p_label),'concept_type','professional_area','description',btrim(coalesce(p_description,''))),'aliases',p_aliases);
  if p_id is null then
    insert into public.knowledge_concepts(scope,organization_id,concept_type,canonical_label,description,status,version,change_set_id,provenance,created_by_auth_user_id,approved_by_auth_user_id)
      values(case when p_organization_id is null then 'global'::public.knowledge_scope else 'organization'::public.knowledge_scope end,p_organization_id,'professional_area',btrim(p_label),btrim(coalesce(p_description,'')),case when p_active then 'approved'::public.knowledge_status else 'deprecated'::public.knowledge_status end,1,cs,jsonb_build_object('method','professional-area-1.0.0'),actor,actor) returning * into c;
  else
    update public.knowledge_concepts set canonical_label=btrim(p_label),description=btrim(coalesce(p_description,'')),status=case when p_active then 'approved'::public.knowledge_status else 'deprecated'::public.knowledge_status end,
      version=version+1,change_set_id=cs,approved_by_auth_user_id=actor,updated_at=now() where id=c.id returning * into c;
    update public.knowledge_terms set status='deprecated' where concept_id=c.id and status='approved';
  end if;
  for t in select distinct on(private.normalize_knowledge_term(term)) btrim(term) from (select p_label term union all select jsonb_array_elements_text(p_aliases)) terms order by private.normalize_knowledge_term(term) loop
    insert into public.knowledge_terms(concept_id,scope,organization_id,term,normalized_term,term_type,status,version,approved_by_auth_user_id)
      values(c.id,c.scope,c.organization_id,t,private.normalize_knowledge_term(t),case when private.normalize_knowledge_term(t)=private.normalize_knowledge_term(p_label) then 'canonical' else 'alias' end,
        case when p_active then 'approved'::public.knowledge_status else 'deprecated'::public.knowledge_status end,c.version,actor);
  end loop;
  insert into public.knowledge_inbox(scope,organization_id,fingerprint,original_term,normalized_search_term,status,created_by_auth_user_id)
    values(c.scope,p_organization_id,encode(extensions.digest('professional-area:'||c.id::text||':'||c.version::text,'sha256'),'hex'),btrim(p_label),private.normalize_knowledge_term(p_label),'approved',actor) returning * into inbox;
  insert into public.knowledge_proposals(inbox_id,scope,organization_id,proposal_type,original_proposal,status,prompt_version,output_schema_version,source_policy_version,published_concept_id,decided_by_auth_user_id,decided_at,decision_reason)
    values(inbox.id,c.scope,p_organization_id,'create',payload,'approved','professional-area-1.0.0','knowledge-proposal-1.0.0','trusted-sources-1.0.0',c.id,actor,now(),'Cadastro humano de área profissional') returning id into proposal;
  insert into public.knowledge_approvals(proposal_id,action,original_proposal,decided_proposal,actor_auth_user_id,reason)
    values(proposal,'edited_and_approved',coalesce(previous,'{}'),payload||jsonb_build_object('concept_id',c.id,'active',p_active,'version',c.version),actor,'Cadastro humano de área profissional');
  if p_organization_id is not null and p_active then
    -- Each revision has its own immutable proposal; origin ID is carried in payload
    -- as well as the dedicated column on the first contribution (legacy unique key).
    insert into public.knowledge_proposals(inbox_id,scope,organization_id,origin_organization_id,origin_concept_id,proposal_type,original_proposal,status,prompt_version,output_schema_version,source_policy_version)
      values(inbox.id,'global',null,p_organization_id,case when c.version=1 then c.id end,'create',payload||jsonb_build_object('observed_term',btrim(p_label),'origin',jsonb_build_object('organization_id',p_organization_id,'concept_id',c.id,'concept_version',c.version)),
        'awaiting_human_review','professional-area-1.0.0','knowledge-proposal-1.0.0','trusted-sources-1.0.0');
  end if;
  -- The generic changeset trigger runs before the new terms exist; refresh once
  -- after the full catalog mutation, using final versions and final terms.
  perform private.enqueue_people_directory(p.id) from public.professional_profiles p where review_status='approved' and superseded_at is null and (p_organization_id is null or organization_id=p_organization_id);
  return c.id;
end $$;
revoke all on function public.save_professional_area(uuid,uuid,text,text,jsonb,boolean,integer) from public,anon;
grant execute on function public.save_professional_area(uuid,uuid,text,text,jsonb,boolean,integer) to authenticated;

create function public.review_professional_area_contribution(p_proposal_id uuid,p_decision text,p_target_id uuid,p_label text,p_description text,p_aliases jsonb,p_reason text) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid; p public.knowledge_proposals; target uuid; decided jsonb;
begin
  actor:=private.require_knowledge_admin(null);
  if p_decision not in ('approved','rejected','deferred') or length(btrim(coalesce(p_reason,'')))<5 then raise exception 'PROFESSIONAL_AREA_DECISION_INVALID' using errcode='22023'; end if;
  select * into p from public.knowledge_proposals where id=p_proposal_id and scope='global' and origin_organization_id is not null and prompt_version='professional-area-1.0.0' for update;
  if not found or p.status<>'awaiting_human_review' then raise exception 'PROFESSIONAL_AREA_PROPOSAL_NOT_PENDING' using errcode='55000'; end if;
  if p_decision='approved' then
    if p_target_id is not null then
      select id into target from public.knowledge_concepts where id=p_target_id and scope='global' and concept_type='professional_area' and status='approved';
      if target is null then raise exception 'PROFESSIONAL_AREA_TARGET_INVALID' using errcode='42501'; end if;
    else
      target:=public.save_professional_area(null,null,p_label,p_description,p_aliases,true,null);
    end if;
  end if;
  decided:=jsonb_build_object('decision',p_decision,'global_concept_id',target,'label',p_label,'description',p_description,'aliases',p_aliases,'local_origin_preserved',true);
  update public.knowledge_proposals set status=p_decision,published_concept_id=target,human_edited_proposal=decided,decided_at=now(),decided_by_auth_user_id=actor,decision_reason=btrim(p_reason) where id=p.id;
  insert into public.knowledge_approvals(proposal_id,action,original_proposal,decided_proposal,actor_auth_user_id,reason)
    values(p.id,case when p_decision='approved' then 'edited_and_approved' else p_decision end,p.original_proposal,decided,actor,btrim(p_reason));
  return target;
end $$;
revoke all on function public.review_professional_area_contribution(uuid,text,uuid,text,text,jsonb,text) from public,anon;
grant execute on function public.review_professional_area_contribution(uuid,text,uuid,text,text,jsonb,text) to authenticated;

create function private.professional_area_input(p_data jsonb) returns jsonb language sql immutable set search_path='' as $$
  select jsonb_build_object('kind','profile_area','method','professional-area-1.0.0','role',left(coalesce(p_data->>'professionalTitle',''),240),
    'areas',coalesce((select jsonb_agg(left(value,160)) from (select value from jsonb_array_elements_text(case when jsonb_typeof(p_data->'areasOfExpertise')='array' then p_data->'areasOfExpertise' else '[]'::jsonb end) limit 20) a),'[]'::jsonb),
    'context',left(coalesce((select string_agg(concat_ws('. ',value->>'role',value->>'description'),' | ' order by ordinality) from jsonb_array_elements(case when jsonb_typeof(p_data->'experiences')='array' then p_data->'experiences' else '[]'::jsonb end) with ordinality),'') ,1400));
$$;

create or replace function private.people_directory_allowed(p_org uuid,p_id uuid,p_kind text) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.knowledge_concepts c where c.id=p_id and c.status='approved'
    and (c.scope='global' or c.organization_id=p_org)
    and ((p_kind='area' and c.concept_type='professional_area') or (p_kind='function' and c.concept_type='occupation'))
    and (not exists(select 1 from public.knowledge_external_mappings m where m.concept_id=c.id)
      or exists(select 1 from public.knowledge_external_mappings m join public.knowledge_source_versions v on v.id=m.source_version_id
      where m.concept_id=c.id and v.is_current and v.import_status='published')));
$$;

create function private.enqueue_professional_area(p_org uuid,p_data jsonb) returns void language plpgsql security definer set search_path='' as $$
declare i jsonb; g bigint; o bigint;
begin
  if p_data ? 'professionalAreaIds' then return; end if;
  i:=private.professional_area_input(p_data);
  if i->>'role'='' and i->>'context'='' and i->'areas'='[]' then return; end if;
  select coalesce(max(version) filter(where scope='global'),0),coalesce(max(version) filter(where scope='organization' and organization_id=p_org),0) into g,o from public.knowledge_change_sets;
  insert into public.people_directory_contexts(organization_id,fingerprint,input,global_version,organization_version,method_version)
    values(p_org,private.people_directory_key(p_org,i),i,g,o,'professional-area-1.0.0') on conflict do nothing;
end $$;

-- Keep function grouping and its protected hierarchy logic intact.
alter function private.enqueue_people_directory(uuid) rename to enqueue_people_directory_v272;
create function private.enqueue_people_directory(p_profile uuid) returns void language plpgsql security definer set search_path='' as $$
declare p public.professional_profiles;
begin
  perform private.enqueue_people_directory_v272(p_profile);
  select * into p from public.professional_profiles where id=p_profile and review_status='approved' and superseded_at is null;
  if found and p.extraction_version<>'manual-profile-1.0.0' then perform private.enqueue_professional_area(p.organization_id,p.profile_data); end if;
end $$;

create function private.capture_review_professional_area() returns trigger language plpgsql security definer set search_path='' as $$
declare ids jsonb; v text; previous jsonb; inherited_provenance jsonb; inherited_profile uuid;
begin
  if tg_op='UPDATE' then previous:=old.reviewed_data->'professionalAreaIds';
  else
    select profile_data->'professionalAreaIds',field_provenance->'professionalAreaIds',id into previous,inherited_provenance,inherited_profile from public.professional_profiles where organization_id=new.organization_id and person_id=new.person_id and review_status='approved' and superseded_at is null;
    -- Extractor output cannot impersonate a confirmed human selection.
    if new.source_kind='document' then new.reviewed_data:=new.reviewed_data-'professionalAreaIds'-'professionalAreaLabels'; end if;
  end if;
  if not new.reviewed_data ? 'professionalAreaIds' and previous is not null then
    new.reviewed_data:=jsonb_set(new.reviewed_data,'{professionalAreaIds}',previous,true);
  end if;
  ids:=new.reviewed_data->'professionalAreaIds';
  if ids is not null then
    if jsonb_typeof(ids)<>'array' or jsonb_array_length(ids)>10 or exists(select 1 from jsonb_array_elements(ids) a where jsonb_typeof(a)<>'string') then raise exception 'PROFESSIONAL_AREA_SELECTION_INVALID' using errcode='22023'; end if;
    if (select count(distinct value) from jsonb_array_elements_text(ids))<>jsonb_array_length(ids) then raise exception 'PROFESSIONAL_AREA_SELECTION_DUPLICATE' using errcode='22023'; end if;
    for v in select jsonb_array_elements_text(ids) loop
      if not exists(select 1 from public.knowledge_concepts c where c.id::text=v and c.concept_type='professional_area' and (c.scope='global' or c.organization_id=new.organization_id)
        and (c.status='approved' or coalesce(previous,'[]'::jsonb) @> jsonb_build_array(v))) then raise exception 'PROFESSIONAL_AREA_SELECTION_SCOPE_INVALID' using errcode='42501'; end if;
    end loop;
    new.reviewed_data:=jsonb_set(new.reviewed_data,'{professionalAreaLabels}',coalesce((select jsonb_agg(c.canonical_label order by a.ordinality) from jsonb_array_elements_text(ids) with ordinality a(value,ordinality) join public.knowledge_concepts c on c.id::text=a.value),'[]'),true);
    if ids is distinct from previous then
      new.field_provenance:=new.field_provenance||jsonb_build_object('professionalAreaIds',jsonb_build_object('origin','manual','actorAuthUserId',auth.uid(),'recordedAt',now(),'reviewId',new.id,'revision',new.lock_version));
    elsif not new.field_provenance ? 'professionalAreaIds' then
      new.field_provenance:=new.field_provenance||jsonb_build_object('professionalAreaIds',coalesce(inherited_provenance,jsonb_build_object('origin','inherited_profile','sourceProfileId',inherited_profile)));
    end if;
  end if;
  return new;
end $$;
create trigger zy_professional_area_selection before insert or update of reviewed_data on public.profile_reviews for each row execute function private.capture_review_professional_area();
create function private.enqueue_review_professional_area() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.source_kind='document' and new.state='draft' then perform private.enqueue_professional_area(new.organization_id,new.reviewed_data); end if;
  return new;
end $$;
create trigger enqueue_review_professional_area after insert or update of reviewed_data on public.profile_reviews for each row execute function private.enqueue_review_professional_area();

create function private.professional_area_source_exists(p_org uuid,p_input jsonb) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.professional_profiles p where p.organization_id=p_org and p.review_status='approved' and p.superseded_at is null and p.extraction_version<>'manual-profile-1.0.0' and not p.profile_data ? 'professionalAreaIds' and private.professional_area_input(p.profile_data)=p_input)
    or exists(select 1 from public.profile_reviews r where r.organization_id=p_org and r.state='draft' and r.source_kind='document' and not r.reviewed_data ? 'professionalAreaIds' and private.professional_area_input(r.reviewed_data)=p_input);
$$;
alter function public.claim_people_directory() rename to claim_people_directory_v272;
revoke all on function public.claim_people_directory_v272() from public,anon,authenticated,service_role;
create function public.claim_people_directory() returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.people_directory_contexts; a jsonb; exact jsonb; v_candidates jsonb; job jsonb;
begin
  select * into r from public.people_directory_contexts c where input->>'kind'='profile_area' and attempts<3
    and ((status in ('queued','failed') and available_at<=now()) or (status='processing' and started_at<now()-interval '5 minutes'))
    and fingerprint=private.people_directory_key(organization_id,input) and private.professional_area_source_exists(organization_id,input)
    order by created_at limit 1 for update skip locked;
  if not found then
    job:=public.claim_people_directory_v272();
    if job is null then return null; end if;
    select coalesce(jsonb_agg(value),'[]') into v_candidates from jsonb_array_elements(job->'candidates') where value->>'kind'='function';
    job:=jsonb_set(job,'{candidates}',v_candidates);
    job:=jsonb_set(job,'{exact,areas}','[]');
    update public.people_directory_contexts set candidates=v_candidates,result=job->'exact' where id=(job->>'id')::uuid;
    return job;
  end if;
  -- Exact aliases are resolved only inside the macroarea type; unrelated H1 terms
  -- cannot make a macroarea alias ambiguous. Organization layer wins per term.
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'method','approved_exact_alias')),'[]') into a from (
    select distinct id from (
      select x.term,(array_agg(c.id order by c.id))[1] id,count(*) n from
      (select jsonb_array_elements_text(r.input->'areas') term) x
      join public.knowledge_terms t on t.normalized_term=private.normalize_knowledge_term(x.term) and t.status='approved' and not t.ambiguous
      join public.knowledge_concepts c on c.id=t.concept_id and private.people_directory_allowed(r.organization_id,c.id,'area')
      where c.scope='organization' or not exists(select 1 from public.knowledge_terms lt join public.knowledge_concepts lc on lc.id=lt.concept_id where lc.organization_id=r.organization_id and lc.concept_type='professional_area' and lc.status='approved' and lt.status='approved' and lt.normalized_term=t.normalized_term)
      group by x.term having count(distinct c.id)=1
    ) resolved limit 3
  ) selected;
  exact:=jsonb_build_object('areas',a,'function',null);
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'label',canonical_label,'description',description,'aliases',aliases,'kind','area','version',version)),'[]') into v_candidates from (
    select c.id,c.canonical_label,left(c.description,600) description,c.version,coalesce((select jsonb_agg(term) from (select t.term from public.knowledge_terms t where t.concept_id=c.id and t.status='approved' order by t.term limit 10) terms),'[]') aliases
    from public.knowledge_concepts c where private.people_directory_allowed(r.organization_id,c.id,'area')
      and (c.scope='organization' or not exists(select 1 from public.knowledge_concepts local where local.organization_id=r.organization_id and local.concept_type='professional_area' and local.status='approved' and private.normalize_knowledge_term(local.canonical_label)=private.normalize_knowledge_term(c.canonical_label)))
    order by c.scope desc,c.canonical_label limit 60
  ) selected;
  update public.people_directory_contexts set status='processing',lease=gen_random_uuid(),attempts=attempts+1,started_at=now(),candidates=coalesce(v_candidates,'[]'),result=exact,error_code=null where id=r.id returning * into r;
  return jsonb_build_object('id',r.id,'organizationId',r.organization_id,'lease',r.lease,'input',r.input,'candidates',r.candidates,'exact',r.result,'model',r.model,'fingerprint',r.fingerprint,
    'externalEnabled',coalesce((select allow_external_knowledge_enrichment from public.organization_knowledge_settings where organization_id=r.organization_id),false));
end $$;
revoke all on function public.claim_people_directory() from public,anon,authenticated;
grant execute on function public.claim_people_directory() to service_role;

alter function public.complete_people_directory(uuid,uuid,jsonb,text) rename to complete_people_directory_v272;
revoke all on function public.complete_people_directory_v272(uuid,uuid,jsonb,text) from public,anon,authenticated,service_role;
create function public.complete_people_directory(p_run_id uuid,p_lease uuid,p_answer jsonb,p_error text default null) returns void
language plpgsql security definer set search_path='' as $$
declare r public.people_directory_contexts;
begin
  select * into r from public.people_directory_contexts where id=p_run_id for update;
  if not found or r.status<>'processing' or r.lease is distinct from p_lease then raise exception 'DIRECTORY_LEASE_INVALID'; end if;
  if r.input->>'kind'='profile_area' and (r.fingerprint<>private.people_directory_key(r.organization_id,r.input) or not private.professional_area_source_exists(r.organization_id,r.input)) then
    update public.people_directory_contexts set status='failed',error_code='SOURCE_CHANGED',completed_at=now(),available_at=now()+interval '1 day' where id=r.id;
    return;
  end if;
  perform public.complete_people_directory_v272(p_run_id,p_lease,p_answer,p_error);
end $$;
revoke all on function public.complete_people_directory(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.complete_people_directory(uuid,uuid,jsonb,text) to service_role;

create function private.read_professional_areas(p_org uuid,p_data jsonb) returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'label',c.canonical_label,'version',c.version,'method',case when p_data ? 'professionalAreaIds' then 'human_confirmed' else item->>'method' end,'active',c.status='approved'))
    from jsonb_array_elements(case when p_data ? 'professionalAreaIds' then (select coalesce(jsonb_agg(jsonb_build_object('id',value)),'[]') from jsonb_array_elements_text(p_data->'professionalAreaIds'))
      else coalesce((select result->'areas' from public.people_directory_contexts where organization_id=p_org and fingerprint=private.people_directory_key(p_org,private.professional_area_input(p_data))),'[]') end) item
    join public.knowledge_concepts c on c.id::text=item->>'id' and c.concept_type='professional_area' and (c.scope='global' or c.organization_id=p_org)
    where p_data ? 'professionalAreaIds' or c.status='approved'),'[]');
$$;
create function public.get_professional_areas(p_organization_id uuid,p_review_id uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r public.profile_reviews;
begin
  if auth.uid() is null or (p_organization_id is null and not private.is_super_admin(auth.uid())) or (p_organization_id is not null and not private.has_org_role(p_organization_id,array['owner','admin','recruiter','member']::public.membership_role[])) then raise exception 'PROFESSIONAL_AREAS_UNAUTHORIZED' using errcode='42501'; end if;
  if p_review_id is not null then
    perform private.require_document_reviewer(p_organization_id);
    select * into r from public.profile_reviews where id=p_review_id and organization_id=p_organization_id;
    if not found then raise exception 'PROFESSIONAL_AREA_REVIEW_SCOPE_INVALID' using errcode='42501'; end if;
  end if;
  return jsonb_build_object('options',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'label',c.canonical_label,'description',c.description,'scope',c.scope,'organizationId',c.organization_id,'active',c.status='approved','version',c.version,
      'aliases',coalesce((select jsonb_agg(t.term) from public.knowledge_terms t where t.concept_id=c.id and t.status='approved' and t.term_type='alias'),'[]')) order by c.canonical_label)
    from public.knowledge_concepts c where c.concept_type='professional_area' and (c.scope='global' or c.organization_id=p_organization_id)),'[]'),
    'suggestion',case when r.id is null then '[]'::jsonb else private.read_professional_areas(p_organization_id,r.reviewed_data) end);
end $$;
revoke all on function public.get_professional_areas(uuid,uuid) from public,anon;
grant execute on function public.get_professional_areas(uuid,uuid) to authenticated;
create function public.get_people_professional_areas(p_organization_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or p_organization_id is null or not private.has_org_role(p_organization_id,array['owner','admin','recruiter','member']::public.membership_role[]) then raise exception 'PROFESSIONAL_AREAS_UNAUTHORIZED' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('personId',p.person_id,'profileId',p.id,'areas',private.read_professional_areas(p_organization_id,p.profile_data))) from public.professional_profiles p where p.organization_id=p_organization_id and review_status='approved' and superseded_at is null),'[]');
end $$;
revoke all on function public.get_people_professional_areas(uuid) from public,anon;
grant execute on function public.get_people_professional_areas(uuid) to authenticated;

-- Macroarea cache is also erased when the final source disappears.
create function private.purge_professional_area_contexts() returns trigger language plpgsql security definer set search_path='' as $$
begin
  delete from public.people_directory_contexts c where c.organization_id=old.organization_id and c.input->>'kind'='profile_area'
    and not private.professional_area_source_exists(c.organization_id,c.input);
  return old;
end $$;
create trigger purge_professional_area_profiles after delete on public.professional_profiles for each row execute function private.purge_professional_area_contexts();
create trigger purge_professional_area_reviews after delete on public.profile_reviews for each row execute function private.purge_professional_area_contexts();

revoke all on function private.professional_area_input(jsonb),private.enqueue_professional_area(uuid,jsonb),private.enqueue_people_directory_v272(uuid),private.enqueue_people_directory(uuid),private.capture_review_professional_area(),private.enqueue_review_professional_area(),private.professional_area_source_exists(uuid,jsonb),private.read_professional_areas(uuid,jsonb),private.purge_professional_area_contexts() from public,anon,authenticated;

-- Initial Prisma editorial reference, not an external qualification taxonomy.
-- No person/Profile is edited or assigned by this seed.
do $$declare cs uuid; v bigint; a record; seed_id uuid; alias text; actor uuid;
begin
  select auth_user_id into actor from public.platform_users where access_profile='super_admin' and status='active' order by created_at limit 1;
  if actor is null then raise exception 'PROFESSIONAL_AREA_SEED_REQUIRES_GLOBAL_ADMIN'; end if;
  perform pg_advisory_xact_lock(hashtextextended('global|global',0));
  select coalesce(max(version),0)+1 into v from public.knowledge_change_sets where scope='global';
  insert into public.knowledge_change_sets(scope,version,summary,changed_entities,approved_by_auth_user_id) values('global',v,'Macroáreas profissionais iniciais autorizadas no lançamento 2.7.4 — professional-area-1.0.0','[]',actor) returning knowledge_change_sets.id into cs;
  for a in select * from (values
    ('Recursos Humanos','Gestão de pessoas, recrutamento, desenvolvimento, remuneração e relações de trabalho.',array['RH','HR','HRBP','Talent Acquisition','Gestão de Pessoas','People and Culture']),
    ('Tecnologia','Sistemas, infraestrutura, software, dados, segurança e transformação tecnológica.',array['TI','Tecnologia da Informação','IT','Software','Infraestrutura de TI','Dados e Inteligência Artificial']),
    ('Finanças','Planejamento financeiro, tesouraria, controladoria e investimentos.',array['Financeiro','Controladoria','FP&A','Tesouraria']),
    ('Contabilidade e Fiscal','Contabilidade, tributos, escrituração e obrigações fiscais.',array['Contábil','Fiscal','Tributário']),
    ('Comercial e Vendas','Desenvolvimento de negócios, relacionamento comercial e vendas.',array['Vendas','Comercial','Business Development']),
    ('Marketing e Comunicação','Marca, comunicação, pesquisa de mercado e marketing.',array['Marketing','Comunicação','Publicidade']),
    ('Operações','Gestão e execução operacional, processos e serviços.',array['Operações','Processos','Serviços Operacionais']),
    ('Logística e Suprimentos','Compras, estoque, transporte, distribuição e cadeia de suprimentos.',array['Logística','Compras','Supply Chain','Suprimentos']),
    ('Engenharia e Produção','Engenharia, projetos técnicos, fabricação e produção industrial.',array['Engenharia','Produção','Manufatura']),
    ('Qualidade e Segurança do Trabalho','Qualidade, melhoria contínua, saúde e segurança ocupacional.',array['Qualidade','Segurança do Trabalho','SSMA']),
    ('Jurídico e Compliance','Direito, contratos, conformidade e governança jurídica.',array['Jurídico','Compliance','Legal']),
    ('Administração','Administração geral, serviços administrativos e apoio organizacional.',array['Administrativo','Administração','Facilities']),
    ('Educação e Pesquisa','Ensino, gestão educacional, pesquisa e desenvolvimento acadêmico.',array['Educação','Ensino','Pesquisa','Pedagogia']),
    ('Saúde','Assistência, serviços e gestão em saúde.',array['Saúde','Enfermagem','Medicina']),
    ('Atendimento e Sucesso do Cliente','Atendimento, suporte ao cliente e gestão de sucesso do cliente.',array['Atendimento','Customer Success','Relacionamento com Clientes']),
    ('Estratégia e Gestão','Estratégia corporativa, direção geral e gestão de negócios.',array['Estratégia','Gestão Empresarial','Direção Executiva'])
  ) x(label,description,aliases) loop
    insert into public.knowledge_concepts(scope,concept_type,canonical_label,description,status,version,change_set_id,provenance)
      values('global','professional_area',a.label,a.description,'approved',1,cs,'{"method":"professional-area-1.0.0","source":"Prisma editorial seed approved 2026-10-15"}') returning knowledge_concepts.id into seed_id;
    insert into public.knowledge_terms(concept_id,scope,term,normalized_term,term_type,status,version) values(seed_id,'global',a.label,private.normalize_knowledge_term(a.label),'canonical','approved',1);
    foreach alias in array a.aliases loop
      if private.normalize_knowledge_term(alias)<>private.normalize_knowledge_term(a.label) then
        insert into public.knowledge_terms(concept_id,scope,term,normalized_term,term_type,status,version) values(seed_id,'global',alias,private.normalize_knowledge_term(alias),'alias','approved',1);
      end if;
    end loop;
  end loop;
end $$;
select private.enqueue_people_directory(id) from public.professional_profiles where review_status='approved' and superseded_at is null;
select private.enqueue_professional_area(organization_id,reviewed_data) from public.profile_reviews where source_kind='document' and state='draft';
commit;
