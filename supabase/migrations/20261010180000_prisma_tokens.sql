-- Tokens Prisma commercial ledger v1.0.0. Additive; no historical AI backfill.
-- All commercial authority stays on the server. Private tables are not Data API resources.
create table private.prisma_token_accounts (
 organization_id uuid primary key references public.organizations(id),
 monthly_tokens bigint not null default 1000000 check(monthly_tokens between 0 and 1000000000000),
 pending_monthly_tokens bigint check(pending_monthly_tokens between 0 and 1000000000000),
 pending_cycle_day integer check(pending_cycle_day between 1 and 31),
 cycle_anchor date not null default (now() at time zone 'America/Sao_Paulo')::date,
 current_period date, next_period date, active boolean not null default true
);
create table private.prisma_token_packages (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 80),
 tokens bigint not null check(tokens between 1 and 1000000000000), price_cents integer not null check(price_cents between 1 and 100000000),
 validity_months integer not null default 12 check(validity_months between 1 and 60),
 effective_at timestamptz not null default now(), active boolean not null default true,
 created_at timestamptz not null default clock_timestamp(), created_by uuid references auth.users(id)
);
create table private.prisma_token_rates (
 id uuid primary key default gen_random_uuid(), function_name text not null check(function_name in ('position_assessment_items','parser_ia','profile_synthesis')),
 tokens_per_unit bigint not null check(tokens_per_unit between 1 and 1000000000),
 effective_at timestamptz not null default now(), created_at timestamptz not null default clock_timestamp(), created_by uuid references auth.users(id)
);
create index prisma_token_rates_current on private.prisma_token_rates(function_name,effective_at desc,created_at desc);
create table private.prisma_token_lots (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references private.prisma_token_accounts(organization_id),
 source text not null check(source in ('monthly','additional','bonus','refund')), source_key text not null,
 total bigint not null check(total>0), remaining bigint not null check(remaining between 0 and total),
 expires_at timestamptz not null, expired boolean not null default false, created_at timestamptz not null default now(),
 unique(organization_id,source_key), unique(organization_id,id)
);
create table private.prisma_token_quotes (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references private.prisma_token_accounts(organization_id),
 actor_id uuid not null references auth.users(id), function_name text not null, quantity integer not null check(quantity between 1 and 10000),
 used_quantity integer not null default 0 check(used_quantity between 0 and quantity),
 rate_id uuid not null references private.prisma_token_rates(id), tokens_per_unit bigint not null,
 expires_at timestamptz not null default now()+interval '10 minutes',
 unique(organization_id,id)
);
create table private.prisma_token_reservations (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references private.prisma_token_accounts(organization_id),
 operation_id uuid not null, function_name text not null, actor_id uuid references auth.users(id),
 quote_id uuid not null, amount bigint not null check(amount>0), status text not null default 'reserved' check(status in ('reserved','charged','released')),
 created_at timestamptz not null default now(), completed_at timestamptz, reason text,
 foreign key(organization_id,quote_id) references private.prisma_token_quotes(organization_id,id),
 unique(organization_id,function_name,operation_id), unique(organization_id,id)
);
create table private.prisma_token_allocations (
 organization_id uuid not null, reservation_id uuid not null, lot_id uuid not null, amount bigint not null check(amount>0),
 primary key(reservation_id,lot_id),
 foreign key(organization_id,reservation_id) references private.prisma_token_reservations(organization_id,id),
 foreign key(organization_id,lot_id) references private.prisma_token_lots(organization_id,id)
);
create table private.prisma_token_movements (
 id bigint generated always as identity primary key, organization_id uuid not null references private.prisma_token_accounts(organization_id),
 kind text not null check(kind in ('grant','debit','expiry','release','configuration','reconciliation')),
 amount bigint not null, actor_id uuid references auth.users(id), function_name text, reference_id uuid,
 reason text check(length(reason)<=500), created_at timestamptz not null default now()
);
create index prisma_token_movements_org on private.prisma_token_movements(organization_id,created_at desc);
create table private.prisma_token_orders (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references private.prisma_token_accounts(organization_id),
 actor_id uuid not null references auth.users(id), package_id uuid not null references private.prisma_token_packages(id),
 package_name text not null, tokens bigint not null, price_cents integer not null, validity_months integer not null,
 status text not null default 'requested' check(status in ('requested','awaiting_payment','released','cancelled','refused')),
 offer_expires_at timestamptz not null default now()+interval '7 days', payment_reference text,
 reason text check(length(reason)<=500), resolved_by uuid references auth.users(id),
 created_at timestamptz not null default now(), released_at timestamptz,
 unique(organization_id,id)
);
-- Defense in depth even though no browser role has schema/table access.
alter table private.prisma_token_accounts enable row level security;
alter table private.prisma_token_packages enable row level security;
alter table private.prisma_token_rates enable row level security;
alter table private.prisma_token_lots enable row level security;
alter table private.prisma_token_quotes enable row level security;
alter table private.prisma_token_reservations enable row level security;
alter table private.prisma_token_allocations enable row level security;
alter table private.prisma_token_movements enable row level security;
alter table private.prisma_token_orders enable row level security;
revoke all on private.prisma_token_accounts,private.prisma_token_packages,private.prisma_token_rates,private.prisma_token_lots,
 private.prisma_token_quotes,private.prisma_token_reservations,private.prisma_token_allocations,private.prisma_token_movements,private.prisma_token_orders from public,anon,authenticated,service_role;
revoke all on sequence private.prisma_token_movements_id_seq from public,anon,authenticated,service_role;
insert into private.prisma_token_packages(name,tokens,price_cents) values('Complemento',1000000,4900),('Expansão',3000000,12900),('Volume',10000000,34900);
insert into private.prisma_token_rates(function_name,tokens_per_unit) values('position_assessment_items',2000),('parser_ia',10000),('profile_synthesis',5000);

create function private.prisma_token_ensure(p_org uuid,p_clock timestamptz default now()) returns void language plpgsql security definer set search_path='' as $$
declare a private.prisma_token_accounts; period date; v_next_period date; months integer; lot private.prisma_token_lots; today date:= (p_clock at time zone 'America/Sao_Paulo')::date; new_anchor date;
begin
 if p_org is null then raise exception 'PT_ORGANIZATION_REQUIRED' using errcode='42501'; end if;
 perform 1 from public.organizations where id=p_org for update;
 if not found then raise exception 'PT_ORGANIZATION_REQUIRED' using errcode='42501'; end if;
 insert into private.prisma_token_accounts(organization_id) values(p_org) on conflict do nothing;
 select * into a from private.prisma_token_accounts where organization_id=p_org for update;
 months:=greatest(0,(extract(year from today)::integer-extract(year from a.cycle_anchor)::integer)*12
  +extract(month from today)::integer-extract(month from a.cycle_anchor)::integer);
 period:=(a.cycle_anchor+make_interval(months=>months))::date;
 if period>today then months:=greatest(0,months-1);period:=(a.cycle_anchor+make_interval(months=>months))::date;end if;
 v_next_period:=(a.cycle_anchor+make_interval(months=>months+1))::date;
 if a.cycle_anchor>today and a.current_period is not null then
  period:=a.current_period;v_next_period:=a.cycle_anchor;
 end if;
 if a.current_period is distinct from period then
  if a.current_period is not null and a.pending_monthly_tokens is not null then a.monthly_tokens:=a.pending_monthly_tokens; end if;
  if a.current_period is not null and a.pending_cycle_day is not null then
   new_anchor:=date_trunc('month',period)::date+least(a.pending_cycle_day,extract(day from (date_trunc('month',period)+interval '1 month - 1 day'))::integer)-1;
   if new_anchor<=period then new_anchor:=(date_trunc('month',period)+interval '1 month')::date+least(a.pending_cycle_day,extract(day from (date_trunc('month',period)+interval '2 months - 1 day'))::integer)-1;end if;
   a.cycle_anchor:=new_anchor;v_next_period:=new_anchor;
  end if;
  update private.prisma_token_accounts set current_period=period,next_period=v_next_period,cycle_anchor=a.cycle_anchor,monthly_tokens=a.monthly_tokens,pending_monthly_tokens=null,pending_cycle_day=null where organization_id=p_org;
 end if;
 -- Only the current period is granted; periods of inactivity are not backfilled.
 if a.active and a.monthly_tokens>0 and period<=today then
  insert into private.prisma_token_lots(organization_id,source,source_key,total,remaining,expires_at)
   values(p_org,'monthly','month:'||period,a.monthly_tokens,a.monthly_tokens,v_next_period::timestamp at time zone 'America/Sao_Paulo')
   on conflict do nothing returning * into lot;
  if found then insert into private.prisma_token_movements(organization_id,kind,amount,reference_id,reason)
   values(p_org,'grant',lot.total,lot.id,'Franquia mensal '||period);end if;
 end if;
 for lot in select l.* from private.prisma_token_lots l where l.organization_id=p_org and not l.expired and l.expires_at<=now()
  and not exists(select 1 from private.prisma_token_allocations al join private.prisma_token_reservations r on r.id=al.reservation_id
   where al.lot_id=l.id and r.status='reserved') for update loop
  update private.prisma_token_lots set expired=true where id=lot.id;
  insert into private.prisma_token_movements(organization_id,kind,amount,reference_id,reason) values(p_org,'expiry',-lot.remaining,lot.id,'Validade encerrada');
 end loop;
end $$;

create function private.prisma_token_balance(p_org uuid) returns bigint language sql stable set search_path='' as $$
 select coalesce(sum(l.remaining-coalesce((select sum(al.amount) from private.prisma_token_allocations al
  join private.prisma_token_reservations r on r.id=al.reservation_id where al.lot_id=l.id and r.status='reserved'),0)),0)::bigint
 from private.prisma_token_lots l where l.organization_id=p_org and not l.expired and l.expires_at>now()
$$;

create function private.prisma_token_reserve(p_org uuid,p_function text,p_operation uuid,p_quote uuid,p_quantity integer) returns uuid
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
 for l in select * from private.prisma_token_lots where organization_id=p_org and not expired and expires_at>now() order by expires_at,created_at,id for update loop
  select l.remaining-coalesce(sum(al.amount),0) into available from private.prisma_token_allocations al join private.prisma_token_reservations rs on rs.id=al.reservation_id where al.lot_id=l.id and rs.status='reserved';
  allocated:=least(needed,available);
  if allocated>0 then insert into private.prisma_token_allocations values(p_org,r.id,l.id,allocated);needed:=needed-allocated;end if;
  exit when needed=0;
 end loop;
 if needed<>0 then raise exception 'PT_INSUFFICIENT_BALANCE' using errcode='22023';end if;
 update private.prisma_token_quotes set used_quantity=used_quantity+p_quantity where id=q.id;
 return r.id;
end $$;

create function private.prisma_token_settle(p_org uuid,p_function text,p_operation uuid,p_success boolean,p_reason text default null) returns void
language plpgsql security definer set search_path='' as $$
declare r private.prisma_token_reservations;
begin
 perform private.prisma_token_ensure(p_org);
 select * into r from private.prisma_token_reservations where organization_id=p_org and function_name=p_function and operation_id=p_operation for update;
 if not found then return;end if; -- pre-rollout jobs were never charged
 if r.status<>'reserved' then
  if (r.status='charged') is distinct from p_success then raise exception 'PT_SETTLEMENT_CONFLICT' using errcode='40001';end if;
  return;
 end if;
 if p_success then update private.prisma_token_lots l set remaining=l.remaining-al.amount from private.prisma_token_allocations al where al.reservation_id=r.id and al.lot_id=l.id;end if;
 update private.prisma_token_reservations set status=case when p_success then 'charged' else 'released' end,completed_at=now(),reason=p_reason where id=r.id;
 insert into private.prisma_token_movements(organization_id,kind,amount,actor_id,function_name,reference_id,reason)
  values(p_org,case when p_success then 'debit' else 'release' end,case when p_success then -r.amount else 0 end,r.actor_id,r.function_name,r.id,coalesce(p_reason,case when p_success then 'Entrega concluída' else 'Falha sem entrega' end));
 perform private.prisma_token_ensure(p_org);
end $$;

create function public.prisma_tokens(p_action text,p_organization_id uuid default null,p_data jsonb default '{}'::jsonb) returns jsonb
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
  insert into private.prisma_token_packages(name,tokens,price_cents,validity_months,effective_at,created_by)
   values(trim(p_data->>'name'),(p_data->>'tokens')::bigint,(p_data->>'priceCents')::integer,coalesce((p_data->>'validityMonths')::integer,12),coalesce(nullif(p_data->>'effectiveAt','')::timestamptz,now()),actor) returning * into pack;
  return to_jsonb(pack);
 elsif p_action='archive_package' then
  update private.prisma_token_packages set active=false where id=(p_data->>'id')::uuid returning * into pack;
  if not found then raise exception 'PT_PACKAGE_UNAVAILABLE' using errcode='22023';end if;return to_jsonb(pack);
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
  if p_data->>'monthlyTokens' is null then raise exception 'PT_INVALID_INPUT' using errcode='22023';end if;
  -- Current lot is immutable; new monthly quota applies to the next cycle.
  update private.prisma_token_accounts set pending_monthly_tokens=(p_data->>'monthlyTokens')::bigint,pending_cycle_day=case when p_data ? 'cycleDay' then nullif(p_data->>'cycleDay','')::integer else pending_cycle_day end,active=coalesce((p_data->>'active')::boolean,active) where organization_id=p_organization_id returning * into a;
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
   return to_jsonb(ord);
  end if;
  select * into pack from private.prisma_token_packages where id=(p_data->>'packageId')::uuid and active and effective_at<=now();
  if not found then raise exception 'PT_PACKAGE_UNAVAILABLE' using errcode='22023';end if;
  insert into private.prisma_token_orders(id,organization_id,actor_id,package_id,package_name,tokens,price_cents,validity_months)
   values((p_data->>'operationId')::uuid,p_organization_id,actor,pack.id,pack.name,pack.tokens,pack.price_cents,pack.validity_months)
   on conflict do nothing returning * into ord;
  if not found then select * into ord from private.prisma_token_orders where id=(p_data->>'operationId')::uuid and organization_id=p_organization_id and actor_id=actor and package_id=pack.id;end if;
  if ord.id is null then raise exception 'PT_OPERATION_CONFLICT' using errcode='40001';end if;
  return to_jsonb(ord);
 elsif p_action='order_status' then
  if not manager then raise exception 'PT_ACCESS_DENIED' using errcode='42501';end if;
  select * into ord from private.prisma_token_orders where id=(p_data->>'id')::uuid and organization_id=p_organization_id for update;
  if not found then raise exception 'PT_ORDER_UNAVAILABLE' using errcode='42501';end if;
  if p_data->>'status' in ('awaiting_payment','released','refused') and not is_super then raise exception 'PT_ACCESS_DENIED' using errcode='42501';end if;
  if ord.status=p_data->>'status' then return to_jsonb(ord);end if;
  if ord.status in ('released','cancelled','refused') then raise exception 'PT_ORDER_CLOSED' using errcode='40001';end if;
  reason:=trim(p_data->>'reason');
  if p_data->>'status' in ('cancelled','refused') then
   if reason is null or length(reason) not between 3 and 500 then raise exception 'PT_REASON_REQUIRED' using errcode='22023';end if;
  elsif p_data->>'status'='awaiting_payment' then
   if ord.status<>'requested' or ord.offer_expires_at<=now() then raise exception 'PT_OFFER_EXPIRED' using errcode='22023';end if;
  elsif p_data->>'status'='released' then
   if ord.status<>'awaiting_payment' or p_data->>'paymentConfirmed' is distinct from 'true' or length(trim(coalesce(p_data->>'paymentReference','')))<3 then raise exception 'PT_PAYMENT_CONFIRMATION_REQUIRED' using errcode='22023';end if;
   insert into private.prisma_token_lots(organization_id,source,source_key,total,remaining,expires_at)
    values(p_organization_id,'additional','order:'||ord.id,ord.tokens,ord.tokens,now()+make_interval(months=>ord.validity_months)) returning id into lot_id;
   insert into private.prisma_token_movements(organization_id,kind,amount,actor_id,reference_id,reason) values(p_organization_id,'grant',ord.tokens,actor,lot_id,'Pacote adicional: '||ord.package_name);
  else raise exception 'PT_TRANSITION_INVALID' using errcode='22023';end if;
  update private.prisma_token_orders set status=p_data->>'status',resolved_by=actor,reason=token_action.reason,
   payment_reference=case when p_data->>'status'='released' then left(trim(p_data->>'paymentReference'),200) else payment_reference end,
   released_at=case when p_data->>'status'='released' then now() else released_at end where id=ord.id returning * into ord;
  return to_jsonb(ord);
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
  return jsonb_build_object('contract','prisma-tokens-1.0.0','packages',(select coalesce(jsonb_agg(to_jsonb(p) order by created_at desc),'[]') from private.prisma_token_packages p),
   'rates',(select coalesce(jsonb_agg(to_jsonb(t) order by effective_at desc),'[]') from private.prisma_token_rates t),
   'companies',(select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('name',o.name,'available',private.prisma_token_balance(o.id)) order by o.name),'[]') from private.prisma_token_accounts t join public.organizations o on o.id=t.organization_id),
   'orders',(select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('organization_name',o.name) order by t.created_at desc),'[]') from private.prisma_token_orders t join public.organizations o on o.id=t.organization_id),
   'reservations',(select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc),'[]') from private.prisma_token_reservations t where status='reserved'),
   'movements',(select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('actor_name',(select u.full_name from public.platform_users u where u.auth_user_id=t.actor_id)) order by created_at desc),'[]') from private.prisma_token_movements t),
   'technicalCosts',jsonb_build_object('estimatedUsd',(select sum(estimated_cost_usd) from public.ai_usage_events where contract_version='ai-usage-events-2.0.0'),'unknownEvents',(select count(*) from public.ai_usage_events where contract_version='ai-usage-events-2.0.0' and cost_status='unknown')));
 elsif p_action='overview' then
  select * into a from private.prisma_token_accounts where organization_id=p_organization_id;
  return jsonb_build_object('contract','prisma-tokens-1.0.0','organizationId',p_organization_id,'manager',manager,'account',to_jsonb(a),'available',private.prisma_token_balance(p_organization_id),
   'consumedPeriod',(select coalesce(-sum(m.amount),0) from private.prisma_token_movements m where organization_id=p_organization_id and kind='debit' and created_at>=a.current_period::timestamp at time zone 'America/Sao_Paulo' and (manager or actor_id=actor)),
   'reservedTotal',(select coalesce(sum(r.amount),0) from private.prisma_token_reservations r where organization_id=p_organization_id and status='reserved'),
   'lots',(select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('available',t.remaining-coalesce((select sum(al.amount) from private.prisma_token_allocations al join private.prisma_token_reservations r on r.id=al.reservation_id where al.lot_id=t.id and r.status='reserved'),0)) order by expires_at),'[]') from private.prisma_token_lots t where organization_id=p_organization_id and not expired and expires_at>now()),
   'rates',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from (select distinct on(function_name) * from private.prisma_token_rates where effective_at<=now() order by function_name,effective_at desc,created_at desc,id desc) t),
   'packages',case when manager then (select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'tokens',tokens,'price_cents',price_cents,'validity_months',validity_months) order by tokens),'[]') from private.prisma_token_packages where active and effective_at<=now()) else '[]'::jsonb end,
   'orders',case when manager then (select coalesce(jsonb_agg(to_jsonb(t)-'payment_reference' order by created_at desc),'[]') from private.prisma_token_orders t where organization_id=p_organization_id) else '[]'::jsonb end,
   'reservations',(select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc),'[]') from private.prisma_token_reservations t where organization_id=p_organization_id and (manager or actor_id=actor)),
   'movements',(select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('actor_name',(select u.full_name from public.platform_users u where u.auth_user_id=t.actor_id)) order by created_at desc),'[]')
    from (select * from private.prisma_token_movements where organization_id=p_organization_id and (manager or actor_id=actor) order by created_at desc) t));
 else raise exception 'PT_ACTION_INVALID' using errcode='22023';end if;
exception when invalid_text_representation or numeric_value_out_of_range or check_violation or not_null_violation then raise exception 'PT_INVALID_INPUT' using errcode='22023';
end $$;
revoke all on function public.prisma_tokens(text,uuid,jsonb) from public,anon,service_role;
grant execute on function public.prisma_tokens(text,uuid,jsonb) to authenticated;
revoke all on function private.prisma_token_ensure(uuid,timestamptz),private.prisma_token_balance(uuid),private.prisma_token_reserve(uuid,text,uuid,uuid,integer),private.prisma_token_settle(uuid,text,uuid,boolean,text) from public,anon,authenticated,service_role;

