reset role;
create temp table nr_state(key text primary key,value jsonb);
grant all on nr_state to authenticated,anon;
set local role authenticated;
select set_config('request.jwt.claim.sub',m83_id('recruiter')::text,true);
insert into nr_state values
 ('old-parser',public.prisma_tokens('quote',m83_id('a'),'{"functionName":"parser_ia","quantity":1}')),
 ('old-items',public.prisma_tokens('quote',m83_id('a'),'{"functionName":"position_assessment_items","quantity":20}')),
 ('old-synthesis',public.prisma_tokens('quote',m83_id('a'),'{"functionName":"profile_synthesis","quantity":1}'));
reset role;
select private.prisma_token_reserve(m83_id('a'),'parser_ia',m83_id('nr-old-parser'),(select (value->>'id')::uuid from nr_state where key='old-parser'),1);
create temp table nr_rates as select * from private.prisma_token_rates;
create temp table nr_quotes as select * from private.prisma_token_quotes;
create temp table nr_reservations as select * from private.prisma_token_reservations;
create temp table nr_preserved as select
 (select jsonb_agg(to_jsonb(x) order by id) from private.prisma_token_packages x) packages,
 (select jsonb_agg(to_jsonb(x) order by organization_id) from private.prisma_token_accounts x) accounts,
 (select jsonb_agg(to_jsonb(x) order by id) from private.prisma_token_lots x) lots,
 (select jsonb_agg(to_jsonb(x) order by id) from private.prisma_token_movements x) movements,
 (select jsonb_agg(to_jsonb(x) order by id) from private.prisma_token_orders x) orders,
 (select jsonb_agg(to_jsonb(x) order by id) from public.professional_profiles x) profiles,
 (select jsonb_agg(to_jsonb(x) order by id) from public.match_evaluations x) matching,
 (select jsonb_agg(to_jsonb(x) order by id) from public.vacancies x) positions;
