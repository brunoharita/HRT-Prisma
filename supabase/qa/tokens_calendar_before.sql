reset role;
select set_config('request.jwt.claim.sub',m83_id('super')::text,true);
-- Synthetic legacy package: deliberately older than30days, still valid under old12month policy.
insert into public.organizations(id,name,group_id) values(m83_id('calendar'),'Calendar fixture',m83_id('group'));
select private.prisma_token_ensure(m83_id('calendar'));
insert into private.prisma_token_lots(id,organization_id,source,source_key,total,remaining,created_at,expires_at)
 values(m83_id('old-additional'),m83_id('calendar'),'additional','synthetic-old',100000,100000,now()-interval '31 days',now()+interval '11 months');
create temp table cw_state(key text primary key,value jsonb);
grant all on cw_state to authenticated,anon;
insert into cw_state values('old-quote',public.prisma_tokens('quote',m83_id('calendar'),'{"functionName":"parser_ia","quantity":1}'));
select private.prisma_token_reserve(m83_id('calendar'),'parser_ia',m83_id('old-calendar-reservation'),(select (value->>'id')::uuid from cw_state where key='old-quote'),1);
create temp table cw_monthly as select id,total,remaining from private.prisma_token_lots where organization_id=m83_id('calendar') and source='monthly';
create temp table cw_quotes as select * from private.prisma_token_quotes;
create temp table cw_reservations as select * from private.prisma_token_reservations;
create temp table cw_allocations as select * from private.prisma_token_allocations;
create temp table cw_debits as select * from private.prisma_token_movements where kind='debit';
create temp table cw_rates as select * from private.prisma_token_rates;
create temp table cw_protected as select
 (select jsonb_agg(to_jsonb(x) order by id) from public.people x) people,
 (select jsonb_agg(to_jsonb(x) order by id) from public.professional_profiles x) profiles,
 (select jsonb_agg(to_jsonb(x) order by id) from public.position_assessments x) assessments,
 (select jsonb_agg(to_jsonb(x) order by id) from public.match_evaluations x) matching;
