-- Restore ordinary authenticated writes protected by the Person deletion guards.
--
-- The context helper was SECURITY DEFINER while also comparing current_user with
-- the owner of the authoritative finalizer. That combination made the comparison
-- ineffective and, because EXECUTE had been revoked, caused every guarded write
-- from an authenticated session to fail before the Person status could be checked.
-- SECURITY INVOKER preserves the intended distinction: ordinary callers always
-- receive false, while the authoritative SECURITY DEFINER finalizer retains its
-- owner context during the nested trigger execution.

alter function private.person_deletion_context_allows(uuid, uuid) security invoker;

grant execute on function private.person_deletion_context_allows(uuid, uuid)
  to authenticated, service_role;

-- This immutable formatter is called only when a guard intentionally rejects a
-- mutation. Exposing EXECUTE does not expose data or grant mutation authority.
grant execute on function private.person_deletion_feedback(text, text)
  to authenticated, service_role;
