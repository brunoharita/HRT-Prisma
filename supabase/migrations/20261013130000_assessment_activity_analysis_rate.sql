-- Approved by Bruno on 2026-10-13: 6,193 commercial Tokens Prisma per delivered analysis.
-- Cached reads are free; settlement/release remains governed by the existing ledger.
lock table private.prisma_token_rates in share row exclusive mode;
do $$
begin
  if exists(select 1 from private.prisma_token_rates where function_name='assessment_activity_analysis') then
    raise exception 'Activity analysis tariff already exists; review before activation';
  end if;
end $$;
insert into private.prisma_token_rates(function_name,tokens_per_unit,effective_at)
values ('assessment_activity_analysis',6193,now());
