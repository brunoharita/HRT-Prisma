select m83_assert((select count(*)=6 from private.prisma_token_rates),'only three new tariff revisions');
select m83_assert(not exists(select * from nr_rates except select * from private.prisma_token_rates),'historical tariffs immutable');
select m83_assert(not exists(select * from nr_quotes except select * from private.prisma_token_quotes),'existing quotes immutable');
select m83_assert(not exists(select * from nr_reservations except select * from private.prisma_token_reservations),'existing reservations immutable');
select m83_assert((select packages is not distinct from (select jsonb_agg(to_jsonb(x) order by id) from private.prisma_token_packages x)
 and accounts is not distinct from (select jsonb_agg(to_jsonb(x) order by organization_id) from private.prisma_token_accounts x)
 and lots is not distinct from (select jsonb_agg(to_jsonb(x) order by id) from private.prisma_token_lots x)
 and movements is not distinct from (select jsonb_agg(to_jsonb(x) order by id) from private.prisma_token_movements x)
 and orders is not distinct from (select jsonb_agg(to_jsonb(x) order by id) from private.prisma_token_orders x)
 and profiles is not distinct from (select jsonb_agg(to_jsonb(x) order by id) from public.professional_profiles x)
 and matching is not distinct from (select jsonb_agg(to_jsonb(x) order by id) from public.match_evaluations x)
 and positions is not distinct from (select jsonb_agg(to_jsonb(x) order by id) from public.vacancies x) from nr_preserved),'packages balances orders profiles matching and positions preserved');
set local role authenticated;
insert into nr_state values
 ('new-parser',public.prisma_tokens('quote',m83_id('a'),'{"functionName":"parser_ia","quantity":1}')),
 ('new-items',public.prisma_tokens('quote',m83_id('a'),'{"functionName":"position_assessment_items","quantity":20}')),
 ('new-synthesis',public.prisma_tokens('quote',m83_id('a'),'{"functionName":"profile_synthesis","quantity":1}'));
select m83_assert((select value->>'amount'='14785' and value->>'tokensPerUnit'='14785' from nr_state where key='new-parser'),'new parser quote 14785');
select m83_assert((select value->>'amount'='46940' and value->>'tokensPerUnit'='2347' from nr_state where key='new-items'),'20 questions exactly 46940 at 2347');
select m83_assert((select value->>'amount'='6193' and value->>'tokensPerUnit'='6193' from nr_state where key='new-synthesis'),'new synthesis quote 6193');
select m83_assert((select bool_and((value->>'tokensPerUnit')::bigint%10<>0) from nr_state where key like 'new-%'),'all unit tariffs nonround');
select m83_assert(jsonb_array_length(public.prisma_tokens('overview',m83_id('a'))->'rates')=3,'overview returns three current tariffs');
select m83_reject('select * from private.prisma_token_rates','42501');
select m83_reject('select public.prisma_tokens(''save_rate'',null,''{"functionName":"parser_ia","tokensPerUnit":1}'')','42501');
select m83_reject('select public.prisma_tokens(''overview'',m83_id(''b''))','42501');
reset role;
select m83_reject(format('select private.prisma_token_reserve(%L,''parser_ia'',%L,%L,1)',m83_id('b'),m83_id('nr-cross'),(select value->>'id' from nr_state where key='new-parser')),'42501');
select m83_reject(format('select private.prisma_token_reserve(%L,''position_assessment_items'',%L,%L,21)',m83_id('a'),m83_id('nr-overquantity'),(select value->>'id' from nr_state where key='new-items')),'22023');
select private.prisma_token_reserve(m83_id('a'),'parser_ia',m83_id('nr-new-parser'),(select (value->>'id')::uuid from nr_state where key='new-parser'),1);
select private.prisma_token_settle(m83_id('a'),'parser_ia',m83_id('nr-old-parser'),true);
select private.prisma_token_settle(m83_id('a'),'parser_ia',m83_id('nr-old-parser'),true);
select private.prisma_token_settle(m83_id('a'),'parser_ia',m83_id('nr-new-parser'),true);
select private.prisma_token_settle(m83_id('a'),'parser_ia',m83_id('nr-new-parser'),true);
select m83_assert((select amount=10000 and status='charged' from private.prisma_token_reservations where operation_id=m83_id('nr-old-parser')),'old reservation charges frozen 10000');
select m83_assert((select amount=14785 and status='charged' from private.prisma_token_reservations where operation_id=m83_id('nr-new-parser')),'new reservation charges 14785');
select m83_assert((select count(*)=2 and sum(amount)=-24785 from private.prisma_token_movements where kind='debit'),'settlement replay debits only twice total');
select m83_assert(public.prisma_tokens('overview',m83_id('a'))->>'available'='975215','exact available balance no rounding');
select private.prisma_token_reserve(m83_id('a'),'position_assessment_items',m83_id('nr-old-items'),(select (value->>'id')::uuid from nr_state where key='old-items'),20);
select m83_assert((select amount=40000 from private.prisma_token_reservations where operation_id=m83_id('nr-old-items')),'old unreserved quote still binds original tariff');
select private.prisma_token_settle(m83_id('a'),'position_assessment_items',m83_id('nr-old-items'),false);
select private.prisma_token_reserve(m83_id('a'),'position_assessment_items',m83_id('nr-new-items'),(select (value->>'id')::uuid from nr_state where key='new-items'),20);
select m83_assert((select amount=46940 from private.prisma_token_reservations where operation_id=m83_id('nr-new-items')),'new assessment reservation exact batch total');
select private.prisma_token_settle(m83_id('a'),'position_assessment_items',m83_id('nr-new-items'),false);
select private.prisma_token_reserve(m83_id('a'),'profile_synthesis',m83_id('nr-new-synthesis'),(select (value->>'id')::uuid from nr_state where key='new-synthesis'),1);
select private.prisma_token_settle(m83_id('a'),'profile_synthesis',m83_id('nr-new-synthesis'),false);
select m83_assert(public.prisma_tokens('overview',m83_id('a'))->>'available'='975215' and public.prisma_tokens('overview',m83_id('a'))->>'reservedTotal'='0','failed deliveries release without charge');
update private.prisma_token_quotes set expires_at=now()-interval '1 minute' where id=(select (value->>'id')::uuid from nr_state where key='old-synthesis');
select m83_reject(format('select private.prisma_token_reserve(%L,''profile_synthesis'',%L,%L,1)',m83_id('a'),m83_id('nr-expired'),(select value->>'id' from nr_state where key='old-synthesis')),'22023');
set local role authenticated;
select set_config('request.jwt.claim.sub',m83_id('member')::text,true);
select m83_assert(public.prisma_tokens('quote',m83_id('a'),'{"functionName":"profile_synthesis","quantity":1}')->>'amount'='6193','member synthesis permission preserved');
select m83_reject('select public.prisma_tokens(''quote'',m83_id(''a''),''{"functionName":"parser_ia","quantity":1}'')','42501');
reset role; set local role anon;
select m83_reject('select public.prisma_tokens(''overview'',m83_id(''a''))','42501');
reset role;
-- Reapplying against a changed baseline must fail without introducing extra rates.
