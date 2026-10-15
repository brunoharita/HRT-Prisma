-- Tokens Prisma policy 2.0.0 / product2.6.2. Quote/worker contracts stay unchanged.
-- Calendar months in Brasilia; paid lots expire 720 hours after actual release.
lock table public.organizations in exclusive mode;
lock table private.prisma_token_accounts,private.prisma_token_lots,private.prisma_token_orders,private.prisma_token_packages in share row exclusive mode;
alter table private.prisma_token_accounts add column created_at timestamptz not null default now();
update private.prisma_token_accounts a set created_at=coalesce((select min(l.created_at) from private.prisma_token_lots l where l.organization_id=a.organization_id),now());
alter table private.prisma_token_accounts add column policy_version text not null default 'prisma-token-policy-2.0.0' check(policy_version='prisma-token-policy-2.0.0');
alter table private.prisma_token_packages add column validity_days integer not null default 30 check(validity_days=30);
alter table private.prisma_token_orders add column validity_days integer not null default 30 check(validity_days=30);
-- Retain the deprecated months columns as historical metadata; no new API uses them.
do $$
declare a private.prisma_token_accounts; l private.prisma_token_lots; period date:=date_trunc('month',now() at time zone 'America/Sao_Paulo')::date;
 nxt timestamptz:=((date_trunc('month',now() at time zone 'America/Sao_Paulo')+interval '1 month') at time zone 'America/Sao_Paulo');
begin
 for a in select * from private.prisma_token_accounts order by organization_id for update loop
  perform 1 from public.organizations where id=a.organization_id for update;
  if (select count(*) from private.prisma_token_lots where organization_id=a.organization_id and source='monthly' and not expired and expires_at>now())>1 then
   raise exception 'Multiple live monthly lots require review before calendar migration';
  end if;
  select * into l from private.prisma_token_lots where organization_id=a.organization_id and source='monthly' and not expired and expires_at>now() for update;
  if found then
   update private.prisma_token_lots set source_key='month:'||period,expires_at=nxt where id=l.id;
  end if;
  update private.prisma_token_accounts set cycle_anchor=period,current_period=period,next_period=(period+interval '1 month')::date,pending_cycle_day=null where organization_id=a.organization_id;
  insert into private.prisma_token_movements(organization_id,kind,amount,reason)
   values(a.organization_id,'configuration',0,'Calendário mensal de Brasília; franquia vigente conservada, sem concessão duplicada. Política2.0.0');
 end loop;
end $$;
update private.prisma_token_lots l set expires_at=coalesce((select o.released_at from private.prisma_token_orders o where o.organization_id=l.organization_id and 'order:'||o.id=l.source_key),l.created_at)+interval '720 hours'
 where l.source='additional';

create or replace function private.prisma_token_ensure(p_org uuid,p_clock timestamptz default now()) returns void language plpgsql security definer set search_path='' as $$
declare a private.prisma_token_accounts; period date:=date_trunc('month',p_clock at time zone 'America/Sao_Paulo')::date;
 nxt date:=(date_trunc('month',p_clock at time zone 'America/Sao_Paulo')+interval '1 month')::date; lot private.prisma_token_lots;
begin
 if p_org is null then raise exception 'PT_ORGANIZATION_REQUIRED' using errcode='42501';end if;
 perform 1 from public.organizations where id=p_org for update;
 if not found then raise exception 'PT_ORGANIZATION_REQUIRED' using errcode='42501';end if;
 insert into private.prisma_token_accounts(organization_id,created_at,cycle_anchor) values(p_org,p_clock,period) on conflict do nothing;
 select * into a from private.prisma_token_accounts where organization_id=p_org for update;
 -- Clock argument is private and only used by deterministic QA. Never move a real account backwards.
 if a.current_period is not null and a.current_period>period then raise exception 'PT_CLOCK_REVERSED' using errcode='22023';end if;
 if a.current_period is distinct from period then
  update private.prisma_token_accounts set monthly_tokens=coalesce(pending_monthly_tokens,monthly_tokens),pending_monthly_tokens=null,
   pending_cycle_day=null,cycle_anchor=period,current_period=period,next_period=nxt where organization_id=p_org returning * into a;
 end if;
 if a.active and a.monthly_tokens>0 then
  insert into private.prisma_token_lots(organization_id,source,source_key,total,remaining,expires_at,created_at)
   values(p_org,'monthly','month:'||period,a.monthly_tokens,a.monthly_tokens,nxt::timestamp at time zone 'America/Sao_Paulo',p_clock)
   on conflict do nothing returning * into lot;
  if found then insert into private.prisma_token_movements(organization_id,kind,amount,reference_id,reason,created_at)
   values(p_org,'grant',lot.total,lot.id,'Franquia mensal '||period,p_clock);end if;
 end if;
 for lot in select l.* from private.prisma_token_lots l where l.organization_id=p_org and not l.expired and l.expires_at<=p_clock
  and not exists(select 1 from private.prisma_token_allocations al join private.prisma_token_reservations r on r.id=al.reservation_id where al.lot_id=l.id and r.status='reserved') for update loop
  update private.prisma_token_lots set expired=true where id=lot.id;
  insert into private.prisma_token_movements(organization_id,kind,amount,reference_id,reason,created_at) values(p_org,'expiry',-lot.remaining,lot.id,'Validade encerrada',p_clock);
 end loop;
end $$;

-- One projection of the ledger supplies company and super-user detail. No direct client grant.
create function private.prisma_token_lot_details(p_org uuid) returns jsonb language sql stable set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(l)||jsonb_build_object('name',case l.source when 'monthly' then 'Franquia do mês' when 'additional' then coalesce(o.package_name,'Pacote adicional') when 'bonus' then 'Bonificação' else 'Restituição' end,
 'acquired_at',coalesce(o.released_at,l.created_at),'available',l.remaining-coalesce((select sum(al.amount) from private.prisma_token_allocations al join private.prisma_token_reservations r on r.id=al.reservation_id where al.lot_id=l.id and r.status='reserved'),0))
 order by case when l.source='monthly' then 0 else 1 end,l.expires_at,l.created_at,l.id),'[]')
 from private.prisma_token_lots l left join private.prisma_token_orders o on o.organization_id=l.organization_id and 'order:'||o.id=l.source_key
 where l.organization_id=p_org and not l.expired and l.expires_at>now()
$$;

create function private.prisma_token_movement_details(p_org uuid,p_actor uuid,p_manager boolean) returns jsonb language sql stable set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(m)||jsonb_build_object('actor_name',u.full_name,'operation_id',r.operation_id,'quantity',case when q.tokens_per_unit>0 then r.amount/q.tokens_per_unit end,
 'assessment_context',case when a.id is not null then jsonb_build_object('assessment_id',a.id,'vacancy_id',a.vacancy_id,'process_id',a.process_id,'person_id',a.person_id) end,
 'sources',coalesce((select jsonb_agg(jsonb_build_object('lot_id',l.id,'source',l.source,'amount',al.amount,'expires_at',l.expires_at) order by case when l.source='monthly' then 0 else 1 end,l.expires_at)
  from private.prisma_token_allocations al join private.prisma_token_lots l on l.id=al.lot_id and l.organization_id=m.organization_id where al.organization_id=m.organization_id and al.reservation_id=r.id),(select jsonb_agg(jsonb_build_object('lot_id',l.id,'source',l.source,'amount',abs(m.amount),'expires_at',l.expires_at)) from private.prisma_token_lots l where l.organization_id=m.organization_id and l.id=m.reference_id),'[]')) order by m.created_at desc,m.id desc),'[]')
 from private.prisma_token_movements m left join public.platform_users u on u.auth_user_id=m.actor_id
 left join private.prisma_token_reservations r on r.organization_id=m.organization_id and r.id=m.reference_id
 left join private.prisma_token_quotes q on q.organization_id=m.organization_id and q.id=r.quote_id
 left join public.position_assessment_generation g on g.organization_id=m.organization_id and g.id=r.operation_id
 left join public.position_assessments a on a.organization_id=m.organization_id and a.id=g.assessment_id
 where (p_org is null or m.organization_id=p_org) and (p_manager or m.actor_id=p_actor)
$$;

create function private.prisma_token_planning_data(p_org uuid) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('method','prisma-token-planning-1.0.0','as_of',now(),'observed_since',a.created_at,'timezone','America/Sao_Paulo',
 'renewal_at',a.next_period::timestamp at time zone 'America/Sao_Paulo',
 'window_start_7',((now() at time zone 'America/Sao_Paulo')::date-7)::timestamp at time zone 'America/Sao_Paulo',
 'window_start_30',((now() at time zone 'America/Sao_Paulo')::date-30)::timestamp at time zone 'America/Sao_Paulo',
 'daily_consumption',coalesce((select jsonb_agg(jsonb_build_object('day',d.day,'tokens',coalesce((select -sum(m.amount) from private.prisma_token_movements m where m.organization_id=p_org and m.kind='debit'
  and m.created_at>=d.day::timestamp at time zone 'America/Sao_Paulo' and m.created_at<(d.day+1)::timestamp at time zone 'America/Sao_Paulo'),0)) order by d.day)
  from (select ((now() at time zone 'America/Sao_Paulo')::date-n)::date as day from generate_series(1,30) n) d),'[]'))
 from private.prisma_token_accounts a where a.organization_id=p_org
$$;
revoke all on function private.prisma_token_lot_details(uuid),private.prisma_token_movement_details(uuid,uuid,boolean),private.prisma_token_planning_data(uuid) from public,anon,authenticated,service_role;

create or replace function private.prisma_token_reserve(p_org uuid,p_function text,p_operation uuid,p_quote uuid,p_quantity integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare q private.prisma_token_quotes; r private.prisma_token_reservations; l private.prisma_token_lots; needed bigint; allocated bigint; available bigint; amount bigint;
begin
 perform private.prisma_token_ensure(p_org);
 select * into r from private.prisma_token_reservations where organization_id=p_org and function_name=p_function and operation_id=p_operation for update;
 if found then
  if r.quote_id is distinct from p_quote then raise exception 'PT_OPERATION_CONFLICT' using errcode='40001';end if;
  return r.id;
 end if;
 select * into q from private.prisma_token_quotes where id=p_quote and organization_id=p_org for update;
 if auth.uid() is not null and q.actor_id is distinct from auth.uid() then raise exception 'PT_ACCESS_DENIED' using errcode='42501';end if;
 if not found or q.function_name<>p_function or q.expires_at<=now() or p_quantity is null or p_quantity<1 or q.used_quantity+p_quantity>q.quantity
  then raise exception 'PT_QUOTE_EXPIRED' using errcode='22023';end if;
 if not exists(select 1 from public.platform_users u where u.auth_user_id=q.actor_id and u.status='active' and
  (u.access_profile='super_admin' or exists(select 1 from public.organization_memberships m where m.organization_id=p_org and m.user_id=q.actor_id and (m.role in ('owner','admin','recruiter') or (m.role='member' and p_function='profile_synthesis')))))
  then raise exception 'PT_ACCESS_DENIED' using errcode='42501';end if;
 if not (select active from private.prisma_token_accounts where organization_id=p_org) then raise exception 'PT_ACCOUNT_DISABLED' using errcode='42501';end if;
 amount:=q.tokens_per_unit*p_quantity;needed:=amount;
 if private.prisma_token_balance(p_org)<needed then raise exception 'PT_INSUFFICIENT_BALANCE' using errcode='22023';end if;
 insert into private.prisma_token_reservations(organization_id,operation_id,function_name,actor_id,quote_id,amount)
  values(p_org,p_operation,p_function,q.actor_id,q.id,amount) returning * into r;
 for l in select * from private.prisma_token_lots where organization_id=p_org and not expired and expires_at>now() order by case when source='monthly' then 0 else 1 end,expires_at,created_at,id for update loop
  select l.remaining-coalesce(sum(al.amount),0) into available from private.prisma_token_allocations al join private.prisma_token_reservations rs on rs.id=al.reservation_id where al.lot_id=l.id and rs.status='reserved';
  allocated:=least(needed,available);
  if allocated>0 then insert into private.prisma_token_allocations values(p_org,r.id,l.id,allocated);needed:=needed-allocated;end if;
  exit when needed=0;
 end loop;
 if needed<>0 then raise exception 'PT_INSUFFICIENT_BALANCE' using errcode='22023';end if;
 update private.prisma_token_quotes set used_quantity=used_quantity+p_quantity where id=q.id;
 return r.id;
end $$;


create or replace function public.prisma_tokens(p_action text,p_organization_id uuid default null,p_data jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
<<token_action>>
declare actor uuid:=auth.uid(); is_super boolean:=private.is_super_admin(auth.uid()); manager boolean; a private.prisma_token_accounts;
 pack private.prisma_token_packages; ord private.prisma_token_orders; q private.prisma_token_quotes; rate private.prisma_token_rates;
 reason text; amount bigint; lot_id uuid; rs private.prisma_token_reservations; result jsonb; org uuid;
begin
 if actor is null or not exists(select 1 from public.platform_users where auth_user_id=actor and status='active') then raise exception 'PT_ACCESS_DENIED' using errcode='42501';end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' then raise exception 'PT_INVALID_INPUT' using errcode='22023';end if;
 if p_action in ('platform','save_package','archive_package','save_rate') then
  if not is_super then raise exception 'PT_ACCESS_DENIED' using errcode='42501';end if;
 else
  if p_organization_id is null or not private.has_org_role(p_organization_id,array['owner','admin','recruiter','member']::public.membership_role[]) then raise exception 'PT_ACCESS_DENIED' using errcode='42501';end if;
  manager:=private.has_org_role(p_organization_id,array['owner','admin']::public.membership_role[]);
  perform private.prisma_token_ensure(p_organization_id);
 end if;
 if p_action='save_package' then
  if (p_data ? 'validityMonths') or (p_data ? 'validityDays' and (p_data->>'validityDays')::integer is distinct from 30) then raise exception 'PT_INVALID_INPUT' using errcode='22023';end if;
  insert into private.prisma_token_packages(name,tokens,price_cents,validity_days,effective_at,created_by)
   values(trim(p_data->>'name'),(p_data->>'tokens')::bigint,(p_data->>'priceCents')::integer,30,coalesce(nullif(p_data->>'effectiveAt','')::timestamptz,now()),actor) returning * into pack;
  return to_jsonb(pack)-'validity_months';
 elsif p_action='archive_package' then
  update private.prisma_token_packages set active=false where id=(p_data->>'id')::uuid returning * into pack;
  if not found then raise exception 'PT_PACKAGE_UNAVAILABLE' using errcode='22023';end if;return to_jsonb(pack)-'validity_months';
 elsif p_action='save_rate' then
  insert into private.prisma_token_rates(function_name,tokens_per_unit,effective_at,created_by)
   values(p_data->>'functionName',(p_data->>'tokensPerUnit')::bigint,coalesce((p_data->>'effectiveAt')::timestamptz,now()),actor) returning * into rate;return to_jsonb(rate);
 elsif p_action='quote' then
  if p_data->>'functionName'<>'profile_synthesis' and not private.has_org_role(p_organization_id,array['owner','admin','recruiter']::public.membership_role[]) then raise exception 'PT_ACCESS_DENIED' using errcode='42501';end if;
  select * into rate from private.prisma_token_rates where function_name=p_data->>'functionName' and effective_at<=now() order by effective_at desc,created_at desc,id desc limit 1;
  if not found then raise exception 'PT_RATE_UNAVAILABLE' using errcode='22023';end if;
  insert into private.prisma_token_quotes(organization_id,actor_id,function_name,quantity,rate_id,tokens_per_unit)
   values(p_organization_id,actor,rate.function_name,(p_data->>'quantity')::integer,rate.id,rate.tokens_per_unit) returning * into q;
  return jsonb_build_object('contract','prisma-token-quote-1.0.0','organizationId',p_organization_id,'id',q.id,'functionName',q.function_name,'quantity',q.quantity,'tokensPerUnit',q.tokens_per_unit,'amount',q.tokens_per_unit*q.quantity,'available',private.prisma_token_balance(p_organization_id),'expiresAt',q.expires_at);
 elsif p_action='configure' then
  if not is_super then raise exception 'PT_ACCESS_DENIED' using errcode='42501';end if;
  if p_data ? 'cycleDay' and p_data->>'cycleDay' is not null then raise exception 'PT_INVALID_INPUT' using errcode='22023';end if;
  if p_data->>'monthlyTokens' is null then raise exception 'PT_INVALID_INPUT' using errcode='22023';end if;
  -- Current lot is immutable; new monthly quota applies to the next cycle.
  update private.prisma_token_accounts set pending_monthly_tokens=(p_data->>'monthlyTokens')::bigint,pending_cycle_day=null,active=coalesce((p_data->>'active')::boolean,active) where organization_id=p_organization_id returning * into a;
  insert into private.prisma_token_movements(organization_id,kind,amount,actor_id,reason) values(p_organization_id,'configuration',0,actor,'Franquia do próximo ciclo: '||a.pending_monthly_tokens||case when a.pending_cycle_day is null then '' else '; novo dia mensal: '||a.pending_cycle_day end);
  return to_jsonb(a);
 elsif p_action in ('grant','refund') then
  if not is_super then raise exception 'PT_ACCESS_DENIED' using errcode='42501';end if;
  reason:=trim(p_data->>'reason');amount:=(p_data->>'tokens')::bigint;
  if reason is null or length(reason) not between 3 and 500 or amount is null or amount not between 1 and 1000000000000 then raise exception 'PT_REASON_REQUIRED' using errcode='22023';end if;
  if p_data->>'operationId' is null then raise exception 'PT_INVALID_INPUT' using errcode='22023';end if;
  if exists(select 1 from private.prisma_token_lots l where l.organization_id=p_organization_id and l.source_key=p_action||':'||(p_data->>'operationId')::uuid and (l.total<>token_action.amount or not exists(select 1 from private.prisma_token_movements m where m.reference_id=l.id and m.actor_id=actor and m.reason=token_action.reason))) then raise exception 'PT_OPERATION_CONFLICT' using errcode='40001';end if;
  insert into private.prisma_token_lots(organization_id,source,source_key,total,remaining,expires_at)
   values(p_organization_id,case when p_action='refund' then 'refund' else 'bonus' end,p_action||':'||(p_data->>'operationId')::uuid,amount,amount,now()+interval '12 months')
   on conflict do nothing returning id into lot_id;
  if lot_id is not null then insert into private.prisma_token_movements(organization_id,kind,amount,actor_id,reference_id,reason) values(p_organization_id,'grant',amount,actor,lot_id,reason);end if;
  return jsonb_build_object('recorded',lot_id is not null);
 elsif p_action='request_package' then
  if not manager then raise exception 'PT_ACCESS_DENIED' using errcode='42501';end if;
  select * into ord from private.prisma_token_orders where id=(p_data->>'operationId')::uuid;
  if found then
   if ord.organization_id<>p_organization_id or ord.actor_id<>actor or ord.package_id<>(p_data->>'packageId')::uuid then raise exception 'PT_OPERATION_CONFLICT' using errcode='40001';end if;
   return to_jsonb(ord)-'validity_months';
  end if;
  select * into pack from private.prisma_token_packages where id=(p_data->>'packageId')::uuid and active and effective_at<=now();
  if not found then raise exception 'PT_PACKAGE_UNAVAILABLE' using errcode='22023';end if;
  insert into private.prisma_token_orders(id,organization_id,actor_id,package_id,package_name,tokens,price_cents,validity_months)
   values((p_data->>'operationId')::uuid,p_organization_id,actor,pack.id,pack.name,pack.tokens,pack.price_cents,pack.validity_months)
   on conflict do nothing returning * into ord;
  if not found then select * into ord from private.prisma_token_orders where id=(p_data->>'operationId')::uuid and organization_id=p_organization_id and actor_id=actor and package_id=pack.id;end if;
  if ord.id is null then raise exception 'PT_OPERATION_CONFLICT' using errcode='40001';end if;
  return to_jsonb(ord)-'validity_months';
 elsif p_action='order_status' then
  if not manager then raise exception 'PT_ACCESS_DENIED' using errcode='42501';end if;
  select * into ord from private.prisma_token_orders where id=(p_data->>'id')::uuid and organization_id=p_organization_id for update;
  if not found then raise exception 'PT_ORDER_UNAVAILABLE' using errcode='42501';end if;
  if p_data->>'status' in ('awaiting_payment','released','refused') and not is_super then raise exception 'PT_ACCESS_DENIED' using errcode='42501';end if;
  if ord.status=p_data->>'status' then return to_jsonb(ord)-'validity_months';end if;
  if ord.status in ('released','cancelled','refused') then raise exception 'PT_ORDER_CLOSED' using errcode='40001';end if;
  reason:=trim(p_data->>'reason');
  if p_data->>'status' in ('cancelled','refused') then
   if reason is null or length(reason) not between 3 and 500 then raise exception 'PT_REASON_REQUIRED' using errcode='22023';end if;
  elsif p_data->>'status'='awaiting_payment' then
   if ord.status<>'requested' or ord.offer_expires_at<=now() then raise exception 'PT_OFFER_EXPIRED' using errcode='22023';end if;
  elsif p_data->>'status'='released' then
   if ord.status<>'awaiting_payment' or p_data->>'paymentConfirmed' is distinct from 'true' or length(trim(coalesce(p_data->>'paymentReference','')))<3 then raise exception 'PT_PAYMENT_CONFIRMATION_REQUIRED' using errcode='22023';end if;
   insert into private.prisma_token_lots(organization_id,source,source_key,total,remaining,expires_at)
    values(p_organization_id,'additional','order:'||ord.id,ord.tokens,ord.tokens,now()+interval '720 hours') returning id into lot_id;
   insert into private.prisma_token_movements(organization_id,kind,amount,actor_id,reference_id,reason) values(p_organization_id,'grant',ord.tokens,actor,lot_id,'Pacote adicional: '||ord.package_name);
  else raise exception 'PT_TRANSITION_INVALID' using errcode='22023';end if;
  update private.prisma_token_orders set status=p_data->>'status',resolved_by=actor,reason=token_action.reason,
   payment_reference=case when p_data->>'status'='released' then left(trim(p_data->>'paymentReference'),200) else payment_reference end,
   released_at=case when p_data->>'status'='released' then now() else released_at end where id=ord.id returning * into ord;
  return to_jsonb(ord)-'validity_months';
 elsif p_action='reconcile' then
  if not is_super then raise exception 'PT_ACCESS_DENIED' using errcode='42501';end if;
  reason:=trim(p_data->>'reason');
  if reason is null or length(reason) not between 10 and 500 or coalesce(p_data->>'delivered','') not in ('true','false') then raise exception 'PT_REASON_REQUIRED' using errcode='22023';end if;
  select * into rs from private.prisma_token_reservations where id=(p_data->>'id')::uuid and organization_id=p_organization_id for update;
  if not found or rs.status<>'reserved' or rs.created_at>now()-interval '15 minutes' then raise exception 'PT_RECONCILIATION_NOT_READY' using errcode='22023';end if;
  perform private.prisma_token_settle(p_organization_id,rs.function_name,rs.operation_id,(p_data->>'delivered')::boolean,reason);
  insert into private.prisma_token_movements(organization_id,kind,amount,actor_id,reference_id,reason) values(p_organization_id,'reconciliation',0,actor,rs.id,reason);
  return jsonb_build_object('recorded',true);
 elsif p_action='platform' then
  for org in select id from public.organizations loop perform private.prisma_token_ensure(org);end loop;
  return jsonb_build_object('contract','prisma-tokens-2.0.0','packages',(select coalesce(jsonb_agg(to_jsonb(p)-'validity_months' order by created_at desc),'[]') from private.prisma_token_packages p),
   'rates',(select coalesce(jsonb_agg(to_jsonb(t) order by effective_at desc),'[]') from private.prisma_token_rates t),
   'companies',(select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('name',o.name,'available',private.prisma_token_balance(o.id)) order by o.name),'[]') from private.prisma_token_accounts t join public.organizations o on o.id=t.organization_id),
   'orders',(select coalesce(jsonb_agg((to_jsonb(t)-'validity_months')||jsonb_build_object('organization_name',o.name) order by t.created_at desc),'[]') from private.prisma_token_orders t join public.organizations o on o.id=t.organization_id),
   'reservations',(select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc),'[]') from private.prisma_token_reservations t where status='reserved'),
   'movements',private.prisma_token_movement_details(null,actor,true),
   'technicalCosts',jsonb_build_object('estimatedUsd',(select sum(estimated_cost_usd) from public.ai_usage_events where contract_version='ai-usage-events-2.0.0'),'unknownEvents',(select count(*) from public.ai_usage_events where contract_version='ai-usage-events-2.0.0' and cost_status='unknown')));
 elsif p_action='overview' then
  select * into a from private.prisma_token_accounts where organization_id=p_organization_id;
  return jsonb_build_object('contract','prisma-tokens-2.0.0','organizationId',p_organization_id,'manager',manager,'account',to_jsonb(a)||jsonb_build_object('name',(select name from public.organizations where id=p_organization_id)),'available',private.prisma_token_balance(p_organization_id),
   'consumedPeriod',(select coalesce(-sum(m.amount),0) from private.prisma_token_movements m where organization_id=p_organization_id and kind='debit' and created_at>=a.current_period::timestamp at time zone 'America/Sao_Paulo' and (manager or actor_id=actor)),
   'reservedTotal',(select coalesce(sum(r.amount),0) from private.prisma_token_reservations r where organization_id=p_organization_id and status='reserved'),
   'lots',private.prisma_token_lot_details(p_organization_id),
   'planning',case when manager then private.prisma_token_planning_data(p_organization_id) else null end,
   'rates',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from (select distinct on(function_name) * from private.prisma_token_rates where effective_at<=now() order by function_name,effective_at desc,created_at desc,id desc) t),
   'packages',case when manager then (select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'tokens',tokens,'price_cents',price_cents,'validity_days',validity_days) order by tokens),'[]') from private.prisma_token_packages where active and effective_at<=now()) else '[]'::jsonb end,
   'orders',case when manager then (select coalesce(jsonb_agg(to_jsonb(t)-'payment_reference'-'validity_months' order by created_at desc),'[]') from private.prisma_token_orders t where organization_id=p_organization_id) else '[]'::jsonb end,
   'reservations',(select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc),'[]') from private.prisma_token_reservations t where organization_id=p_organization_id and (manager or actor_id=actor)),
   'movements',private.prisma_token_movement_details(p_organization_id,actor,manager));
 else raise exception 'PT_ACTION_INVALID' using errcode='22023';end if;
exception when invalid_text_representation or numeric_value_out_of_range or check_violation or not_null_violation then raise exception 'PT_INVALID_INPUT' using errcode='22023';
end $$;
revoke all on function public.prisma_tokens(text,uuid,jsonb) from public,anon,service_role;
grant execute on function public.prisma_tokens(text,uuid,jsonb) to authenticated;

-- Apply expirations using the new policy, without regranting the migrated current lot.
do $$declare o uuid;begin for o in select organization_id from private.prisma_token_accounts order by organization_id loop perform private.prisma_token_ensure(o);end loop;end $$;
