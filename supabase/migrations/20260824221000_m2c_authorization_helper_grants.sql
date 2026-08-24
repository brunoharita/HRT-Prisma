-- These boolean helpers are invoked by membership RLS policies. Their table
-- access remains encapsulated and they return no operator details.
grant execute on function private.is_active_platform_user(uuid) to authenticated;
grant execute on function private.is_super_admin(uuid) to authenticated;
