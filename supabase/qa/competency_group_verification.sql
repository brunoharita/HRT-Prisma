-- Synthetic fixture inherited from evidence batch verification; transaction rolls back.
-- Owner authority can cover its entire group. The negative tenant fixture belongs to ANOTHER group.
insert into public.organization_groups(id,name,slug) values(pg_temp.eid('other-group'),'Other synthetic group','group-qa2010-other');
update public.organizations set group_id=pg_temp.eid('other-group') where id=pg_temp.eid('b');
insert into public.knowledge_concepts(id,scope,organization_id,concept_type,canonical_label,status)
values(pg_temp.eid('local-concept'),'organization',pg_temp.eid('a'),'skill','Synthetic group v2010','approved');
insert into public.competency_subgroups(id,code,macro_group_code,scope,organization_id,label,definition,sort_order)
values(pg_temp.eid('foreign-subgroup'),'QA10','hard','organization',pg_temp.eid('b'),'Foreign synthetic subgroup','Synthetic definition',99);
create function pg_temp.classify(uuid default pg_temp.eid('local-concept'),uuid default null) returns jsonb language sql as $$ select public.classify_knowledge_competency($1,coalesce($2,(select id from public.competency_subgroups where code='H1' and scope='global')),'Grupo selecionado e confirmado pelo operador na tela de Competências do Perfil.') $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.eid('owner')::text,true);
select pg_temp.check_ok((pg_temp.classify()->>'version')::integer=1,'organization admin classifies concept with existing RPC');
select pg_temp.check_ok((pg_temp.classify()->>'reused')::boolean,'compatible repeat reuses classification');
select pg_temp.check_ok((select count(*)=1 from public.knowledge_competency_classifications where concept_id=pg_temp.eid('local-concept') and is_current),'one current classification, no duplicates');
select pg_temp.reject_sql('select pg_temp.classify(pg_temp.eid(''concept''))','42501');
select pg_temp.reject_sql('select pg_temp.classify(pg_temp.eid(''foreign''))','42501');
select pg_temp.reject_sql('select pg_temp.classify(pg_temp.eid(''local-concept''),pg_temp.eid(''foreign-subgroup''))','42501');
select pg_temp.reject_sql('select public.classify_knowledge_competency(pg_temp.eid(''local-concept''),null,''Confirmação factual'')','22023');
select set_config('request.jwt.claim.sub',pg_temp.eid('member')::text,true);
select pg_temp.reject_sql('select pg_temp.classify()','42501');
set local role anon;
select pg_temp.reject_sql('select pg_temp.classify()','42501');
reset role;
select pg_temp.check_ok((select count(*)=1 from public.knowledge_competency_classifications where concept_id=pg_temp.eid('local-concept')),'denials preserve approved history');
