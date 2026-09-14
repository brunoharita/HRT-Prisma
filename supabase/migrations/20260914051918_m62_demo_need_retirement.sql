-- M6.2 retires the old synthetic/demo mutation from every client role.
-- Historical rows remain readable; the function stays only for migration history.
revoke all on function public.ensure_m51a_demo_need(uuid) from public, anon, authenticated;
comment on function public.ensure_m51a_demo_need is 'Legacy M5.1A QA fixture. Retired by M6.2; no client role may execute it.';
