-- Appended to manual_profile_v270_verification inside a disposable transaction.
-- The reused conflict scenario deliberately leaves a stale draft. Retire only
-- that synthetic fixture before testing new independent publication scenarios.
update public.profile_reviews set state='invalidated',invalidated_at=now()
where id=(select (value->>'review_id')::uuid from manual_state where key='conflict_review');
select set_config('request.jwt.claim.sub',m83_id('recruiter')::text,true);
set local role authenticated;
do $$
declare
  mode text; action_name text; draft record; publication record; replay record;
  payload jsonb; decisions jsonb; root text; event_count integer; audit_count integer;
begin
  foreach mode in array array['merge','replace'] loop
    foreach action_name in array array['update','replace'] loop
      select * into draft from public.start_manual_profile_review(m83_id('a'),(select (value->>'person_id')::uuid from manual_state where key='new'),'{}',false,'scalar-start-'||mode||'-'||action_name);
      select reviewed_data into payload from public.profile_reviews where id=draft.review_id;
      payload := payload || jsonb_build_object('professionalTitle','Título '||mode||action_name,'professionalObjective','Objetivo '||mode||action_name,'summary','Resumo '||mode||action_name);
      select jsonb_agg(jsonb_build_object('fieldPath',v,'action',action_name,'resolver','same_block','sourceBlockId',null,'targetBlockId',null)) into decisions
      from unnest(array['professionalTitle','professionalObjective','summary','areasOfExpertise::operacoes','competencies::sql','languages::ingles','certifications::certificacao']) v;
      perform public.save_profile_review(m83_id('a'),draft.review_id,1,payload,'Atualização sintética','scalar-save-'||mode||'-'||action_name);
      select * into publication from public.publish_profile_review(m83_id('a'),draft.review_id,2,mode,decisions,'scalar-publish-'||mode||'-'||action_name);
      perform m83_assert((select profile_data->>'professionalTitle'=payload->>'professionalTitle' and profile_data->>'professionalObjective'=payload->>'professionalObjective' and profile_data->>'summary'=payload->>'summary' from public.professional_profiles where id=publication.profile_id),'scalar values published: '||mode||'/'||action_name);
      perform m83_assert((select count(*)=7 and bool_and(target_block_id is null and action=action_name and actor_auth_user_id=m83_id('recruiter')) from public.profile_publication_decisions where review_id=draft.review_id),'seven scalar/list decisions audited: '||mode||'/'||action_name);
      select count(*) into event_count from public.person_ingestion_events;
      select count(*) into audit_count from public.profile_publication_decisions;
      select * into replay from public.publish_profile_review(m83_id('a'),draft.review_id,2,mode,decisions,'scalar-publish-'||mode||'-'||action_name);
      perform m83_assert(replay.reused and replay.profile_id=publication.profile_id and (select count(*)=event_count from public.person_ingestion_events) and (select count(*)=audit_count from public.profile_publication_decisions),'replay preserves audit and versions: '||mode||'/'||action_name);
    end loop;
  end loop;
  foreach root in array array['experiences','education','keyResults','customSections'] loop
    foreach action_name in array array['update','replace'] loop
      perform m83_reject(format('select private.validate_profile_block_decisions(%L,%L,%L)', '{}','{}',jsonb_build_array(jsonb_build_object('fieldPath',root||'::missing','action',action_name,'resolver','same_block'))),'42501');
    end loop;
  end loop;
end $$;
reset role;
-- Internal validator cases use the fixture owner; callers cannot execute it directly.
do $$ declare root text; action_name text; statement text; begin
  foreach root in array array['experiences','education','keyResults','customSections'] loop
    foreach action_name in array array['update','replace'] loop
      perform m83_reject(format('select private.validate_profile_block_decisions(%L,%L,%L)', '{}','{}',jsonb_build_array(jsonb_build_object('fieldPath',root||'::missing','action',action_name,'resolver','same_block'))),'22023');
      perform m83_reject(format('select private.validate_profile_block_decisions(%L,%L,%L)', '{}','{}',jsonb_build_array(jsonb_build_object('fieldPath',root||'::missing','action',action_name,'resolver','same_block','targetBlockId','missing'))),'22023');
      statement := format('insert into public.profile_publication_decisions(organization_id,person_id,review_id,approved_profile_id,field_path,action,resolver,actor_auth_user_id) select organization_id,person_id,review_id,approved_profile_id,%L,%L,''same_block'',actor_auth_user_id from public.profile_publication_decisions limit 1',root||'::negative-'||action_name,action_name);
      perform m83_reject(statement,'23514');
    end loop;
  end loop;
end $$;
-- Existing valid entity target/update behavior and keep/remove semantics.
do $$ declare b jsonb; p jsonb; d jsonb; begin
  b := '{"experiences":[{"id":"experience_approved001","organization":"Synthetic","role":"Analyst"}]}'::jsonb;
  p := '{"experiences":[{"id":"experience_approved001","organization":"Synthetic","role":"Senior Analyst"}]}'::jsonb;
  d := '[{"fieldPath":"experiences::experience_approved001","action":"update","resolver":"same_block","targetBlockId":"experience_approved001","sourceBlockId":"experience_approved001"}]'::jsonb;
  perform private.validate_profile_block_decisions(b,p,d);
  perform m83_assert(private.apply_profile_block_decisions(b,p,d)#>>'{experiences,0,role}'='Senior Analyst','valid entity update preserved');
end $$;
select m83_assert((select relrowsecurity from pg_class where oid='public.profile_publication_decisions'::regclass) and not has_table_privilege('authenticated','public.profile_publication_decisions','insert') and not has_table_privilege('anon','public.profile_publication_decisions','select'),'audit RLS and direct-write restrictions preserved');
