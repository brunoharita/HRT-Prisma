-- Forward-only hardening for environments where default table privileges
-- granted authenticated more than the explicit read contract requires.

revoke all on table public.knowledge_source_checks from public, anon, authenticated;
grant select on table public.knowledge_source_checks to authenticated;
