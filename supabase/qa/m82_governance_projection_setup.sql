-- Synthetic fixture for the M8.2 human-created concept projection regression.
-- Run inside one disposable local transaction after M8.1 setup and verification.
insert into public.people(id,organization_id,full_name)
values(m81_id('governance-person'),m81_id('org-a'),'Pessoa sintética Governança');
insert into public.professional_profiles(id,organization_id,person_id,profile_data,
  extraction_version,inference_version,embedding_version,prompt_version,model_version,
  profile_version,review_status,approved_at,superseded_at)
values(m81_id('governance-profile'),m81_id('org-a'),m81_id('governance-person'),
  '{"competencies":["Governança QA"]}'::jsonb,
  'fixture','fixture','fixture','fixture','fixture',1,'approved',now(),null);
insert into public.knowledge_concepts(id,scope,organization_id,concept_type,canonical_label,status)
values(m81_id('governance-concept'),'organization',m81_id('org-a'),'knowledge','Governança Corporativa QA','approved');
set local role authenticated;
select set_config('request.jwt.claim.sub',m81_id('owner-a')::text,true);
select public.classify_knowledge_competency(m81_id('governance-concept'),
  (select id from public.competency_subgroups where code='H4' and scope='global'),
  'Classificação humana do conceito sintético de governança');
reset role;
update public.profile_competency_normalization_runs
set status='complete',completed_at=now(),
  result='[{"originalIndex":0,"originalTerm":"Governança QA","sourceText":"Governança QA",
    "normalizedTerm":"Governança QA","state":"ambiguous","conceptId":null,"reason":"Conceito indefinido antes da decisão humana."}]'::jsonb
where organization_id=m81_id('org-a') and profile_id=m81_id('governance-profile');
insert into public.knowledge_observations(id,organization_id,person_id,profile_id,
  original_term,normalized_term,resolution_state,normalization_method,resolution_method_version,
  concept_id,knowledge_global_version,source_field_path,source_snapshot,resolved_at,resolved_by_auth_user_id)
values(m81_id('governance-observation'),m81_id('org-a'),m81_id('governance-person'),
  m81_id('governance-profile'),'Governança QA','governanca qa','resolved',
  'human_organization_concept','knowledge-governance-3.0.0',m81_id('governance-concept'),
  0,'competencies','{}'::jsonb,now(),m81_id('owner-a'));
