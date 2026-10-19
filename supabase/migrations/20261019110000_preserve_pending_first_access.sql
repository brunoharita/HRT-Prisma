-- Administrative enablement is not completion of first access. Reuse the existing
-- locked target and audit in save_platform_user_v3; no data backfill or new grants.
do $migration$
declare definition text; anchor text := 'select * into target from public.platform_users where auth_user_id=p_auth_user for update;';
begin
 definition := pg_get_functiondef('public.save_platform_user_v3(uuid,uuid,jsonb,uuid[])'::regprocedure);
 if (length(definition)-length(replace(definition,anchor,'')))/length(anchor) <> 1
    or position('Administrative enablement preserves first access' in definition)>0 then
  raise exception 'Unexpected save_platform_user_v3 baseline';
 end if;
 definition := replace(definition,anchor,anchor||$guard$
 -- Administrative enablement preserves first access under the account lock.
 if target.id is not null then
  if target.status='blocked' then
   status_value:='blocked';
  elsif status_value='active' and (target.status='pending_first_access' or
   (target.status='inactive' and target.credential_mode='activation_link' and target.must_change_password
    and target.first_access_completed_at is null)) then
   status_value:='pending_first_access';
  end if;
 end if;
 $guard$);
 execute definition;
end $migration$;
