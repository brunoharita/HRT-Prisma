-- Synthetic LOCAL QA only; called after the existing process/portal regression.
reset role;
select m83_assert(not exists(select 1 from cq_original o left join public.position_assessments a using(id) where o.data is distinct from to_jsonb(a)),'private recovery does not edit original emitted assessment');
select m83_assert(not exists(select 1 from cq_global o left join public.assessment_items i using(id) where o.data is distinct from to_jsonb(i)),'institutional global content and availability preserved');
select m83_assert((select count(*) from public.assessment_items where provenance->>'bankReuseVersion'='company-question-reuse-1.0.0')>0,'approved content is projected into the reusable company bank');
select m83_assert(not exists(select 1 from public.assessment_items where provenance->>'bankReuseVersion'='company-question-reuse-1.0.0' and (organization_id is null or source<>'organization')),'new projections are always private and tenant-owned');
select m83_assert(not exists(select 1 from public.assessment_items i join public.position_assessments a on a.id=(i.provenance->>'assessmentId')::uuid and a.organization_id=i.organization_id cross join lateral jsonb_array_elements(a.questions) q where i.provenance->>'bankReuseVersion'='company-question-reuse-1.0.0' and q->>'id'=i.provenance->>'questionId' and (q->>'review'<>'approved' or i.human_approved_by_auth_user_id::text<>q->>'approvedBy' or i.human_approved_at<>(q->>'approvedAt')::timestamptz or i.stem<>q->>'stem' or i.options<>q->'options' or i.explanation<>q->>'explanation' or i.answer_key->>'correctOptionId'<>q->>'correctOptionId')),'backfill preserves actual content, original reviewer and original date');
select m83_assert((select count(*) from public.assessment_items i cross join cq_original o cross join lateral jsonb_array_elements(o.data->'questions') q where i.organization_id=(o.data->>'organization_id')::uuid and i.stem=q->>'stem' and i.options=q->'options' and i.answer_key->>'correctOptionId'=q->>'correctOptionId')=10,'all ten previously approved synthetic questions recovered');
select m83_assert((select count(*) from public.assessment_items i join public.position_assessments a on a.organization_id=i.organization_id cross join lateral jsonb_array_elements(a.questions) q where a.id=(select (value->>'id')::uuid from pa_state where key='shared') and i.stem=q->>'stem' and i.options=q->'options')=10,'batch approval publishes every approved question privately');
create temp table cq_counts as select (select count(*) from public.assessment_items) items,(select count(*) from public.assessment_item_families) families,(select count(*) from public.verification_audit_events where action='company_question_bank_projected') audit;
select m83_assert(private.project_company_assessment_questions(m83_id('a'),(select (value->>'id')::uuid from pa_state where key='shared'))=0,'replay does not add another bank item');
select m83_assert((select items from cq_counts)=(select count(*) from public.assessment_items) and (select families from cq_counts)=(select count(*) from public.assessment_item_families) and (select audit from cq_counts)=(select count(*) from public.verification_audit_events where action='company_question_bank_projected'),'replay has no duplicate item, family or technical audit');
select m83_assert(not exists(select 1 from public.verification_audit_events where action='company_question_bank_projected' and (payload->>'humanDecisionCreated'<>'false' or payload->>'executionKind'<>'backend-projection')),'technical projection is not a fabricated human decision');
select m83_assert(not has_function_privilege('authenticated','private.project_company_assessment_questions(uuid,uuid)','execute') and not has_function_privilege('service_role','private.project_company_assessment_questions(uuid,uuid)','execute') and not has_function_privilege('authenticated','private.company_question_issue_before_v251(uuid,uuid,integer,uuid,jsonb,text,text,timestamptz)','execute'),'clients cannot call writers or bypass guarded approval');
set local role anon;
select m83_reject('select public.position_assessment_bank(m83_id(''a''),(select (value->>''id'')::uuid from pa_state where key=''shared''))','42501');
reset role;set local role authenticated;
select set_config('request.jwt.claim.sub',qb_id('outsider')::text,true);
select m83_assert(not exists(select 1 from jsonb_array_elements(public.load_m51c_item_bank_workspace(qb_id('b'))->'items') x where x->>'organizationId'=m83_id('a')::text),'company B catalog does not expose company A questions');
select m83_reject('select public.position_assessment_bank(qb_id(''b''),(select (value->>''id'')::uuid from pa_state where key=''shared''))','42501');
select m83_reject('select public.position_assessment_bank(m83_id(''a''),(select (value->>''id'')::uuid from pa_state where key=''shared''))','42501');
select set_config('request.jwt.claim.sub',qb_id('super')::text,true);
select m83_assert(public.load_m51c_item_bank_workspace(qb_id('a'))#>>'{permissions,canPublishGlobal}'='false','even a privileged company workspace has only private publishing destination');
select qb_reject('select public.create_m51c_fake_generation_request(qb_id(''a''),qb_id(''missing''),''knowledge'',1,''global'',''company-global-fake'')','QB_COMPANY_PRIVATE_REQUIRED');
select qb_reject('select public.request_m51c_item_generation(qb_id(''a''),qb_id(''missing''),1,''global'',1,''company-global-ai'')','QB_COMPANY_PRIVATE_REQUIRED');
select qb_reject(format('select public.approve_and_publish_question_bank_proposal(qb_id(''a''),%L,''Synthetic explicit exception rationale'')',(select value->>'id' from qb_state where key='globalproposal')),'QB_COMPANY_PRIVATE_REQUIRED');
reset role;
select m83_assert(not exists(select 1 from public.assessment_items where provenance->>'proposalId'=(select value->>'id' from qb_state where key='globalproposal')),'failed global publish leaves no shared item');
select m83_assert(not exists(select 1 from public.assessment_item_generation_reviews where proposal_id=(select (value->>'id')::uuid from qb_state where key='globalproposal')),'failed global combined action rolls back human-review mutation');
set local role authenticated;select set_config('request.jwt.claim.sub',m83_id('recruiter')::text,true);
select m83_assert(jsonb_array_length(public.position_assessment_bank(m83_id('a'),(select (value->>'id')::uuid from pa_state where key='reuse')))>=10,'same company can compose another evaluation using approved recovered content');
-- A new edit of the current unissued assessment must wait for actual approval.
do $$ declare a jsonb; qs jsonb; q jsonb; begin
 a:=public.process_assessment_workspace(m83_id('a'),m83_id('vacancy'))->'assessment';
 select jsonb_agg(case when n=1 then jsonb_set(value,'{stem}','"Exclusive company synthetic new question"') else value end order by n) into qs from jsonb_array_elements(a->'questions') with ordinality x(value,n);
 a:=public.position_assessment_mutate(m83_id('a'),m83_id('vacancy'),null,'questions',(a->>'id')::uuid,(a->>'revision')::integer,jsonb_build_object('questions',qs));
 update pa_state set value=a where key='reuse';
 perform m83_assert(a#>>'{questions,0,review}'='pending','new or edited question remains pending until human approval');
end $$;
reset role;
select m83_assert(not exists(select 1 from public.assessment_items where stem='Exclusive company synthetic new question'),'pending edit is absent from reusable bank');
set local role authenticated;select set_config('request.jwt.claim.sub',m83_id('recruiter')::text,true);
do $$ declare a jsonb;begin
 select value into a from pa_state where key='reuse';
 a:=public.position_assessment_mutate(m83_id('a'),m83_id('vacancy'),null,'approve',(a->>'id')::uuid,(a->>'revision')::integer,jsonb_build_object('questionId',a#>>'{questions,0,id}','saveToBank',false));
 update pa_state set value=a where key='reuse';
end $$;
reset role;
select m83_assert((select count(*) from public.assessment_items where organization_id=m83_id('a') and stem='Exclusive company synthetic new question' and source='organization' and human_approved_by_auth_user_id=m83_id('recruiter'))=1,'individual explicit approval saves privately even without the old optional flag');
update public.assessment_items set state='compromised' where stem='Exclusive company synthetic new question';
select m83_assert(private.project_company_assessment_questions(m83_id('a'),(select (value->>'id')::uuid from pa_state where key='reuse'))=0,'recovery does not recreate blocked content');
select m83_assert((select state from public.assessment_items where stem='Exclusive company synthetic new question')='compromised','recovery never reactivates compromised content');
-- Restore only the synthetic availability for the separate concurrent fixture.
update public.assessment_items set state='approved' where stem='Exclusive company synthetic new question';
