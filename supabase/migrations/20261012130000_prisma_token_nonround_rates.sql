-- Configuration version: prisma-token-tariffs-2026-10-12.
-- Commercial credits, not provider usage. Existing quotes/reservations stay frozen.
lock table private.prisma_token_rates in share row exclusive mode;
do $$
begin
  if exists(select 1 from private.prisma_token_rates where effective_at > now())
    or (select count(*) from (
      select distinct on (function_name) function_name, tokens_per_unit
      from private.prisma_token_rates where effective_at <= now()
      order by function_name,effective_at desc,created_at desc,id desc
    ) r join (values ('position_assessment_items',2000),('parser_ia',10000),('profile_synthesis',5000)) expected(fn,amount)
      on r.function_name=expected.fn and r.tokens_per_unit=expected.amount) <> 3
  then raise exception 'Unexpected tariff baseline or scheduled tariff; review before activation';
  end if;
end $$;
insert into private.prisma_token_rates(function_name,tokens_per_unit,effective_at)
values ('position_assessment_items',2347,now()),('parser_ia',14785,now()),('profile_synthesis',6193,now());
