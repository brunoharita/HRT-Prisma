begin;

create temporary table m543_context as
select membership.organization_id, membership.user_id
from public.organization_memberships membership
join public.platform_users operator on operator.auth_user_id = membership.user_id and operator.status = 'active'
where membership.role in ('owner', 'admin', 'recruiter')
order by membership.created_at
limit 1;

do $$ begin
  if (select count(*) from m543_context) <> 1 then raise exception 'M5.4.3 QA requires one authorized operator'; end if;
end $$;

grant select on table m543_context to authenticated;
select set_config('request.jwt.claim.sub', (select user_id::text from m543_context), true);
set local role authenticated;

create temporary table m543_first as
select * from public.resolve_occupation_on_demand(
  (select organization_id from m543_context), 'Programador de sistemas de informação', null, 'pt-BR');
create temporary table m543_second as
select * from public.resolve_occupation_on_demand(
  (select organization_id from m543_context), 'Programador de sistemas de informação', null, 'pt-BR');

do $$
begin
  if (select count(*) from m543_first) <> 1 or (select count(*) from m543_second) <> 1 then raise exception 'M5.4.3 must return one attempt'; end if;
  if (select attempt_id from m543_first) <> (select attempt_id from m543_second) or not (select reused from m543_second) then raise exception 'M5.4.3 idempotency failed'; end if;
  if exists (select 1 from m543_first where resolution_status <> 'resolved' or canonical_concept_id is null) then raise exception 'M5.4.3 approved CBO alias must resolve'; end if;
  if exists (select 1 from public.occupation_resolution_attempts attempt where attempt.id = (select attempt_id from m543_first) and attempt.evidence::text ~* 'person|profile') then raise exception 'M5.4.3 must not persist Person evidence'; end if;
end $$;

rollback;
