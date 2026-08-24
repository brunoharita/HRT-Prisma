-- The platform-users Edge Function writes with service_role. These helpers are
-- required by platform user constraints and membership synchronization only.
grant execute on function private.is_reserved_username(text) to service_role;
grant execute on function private.sync_owner_memberships_for_user(uuid) to service_role;
grant execute on function private.sync_owner_memberships_for_group() to service_role;
grant execute on function private.platform_users_owner_membership_trigger() to service_role;
grant execute on function private.validate_membership_scope() to service_role;
