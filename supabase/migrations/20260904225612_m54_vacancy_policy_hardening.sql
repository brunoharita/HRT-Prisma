-- M5.4 - keep position and vacancy mutations behind the authoritative RPC.

drop policy if exists vacancies_manage on public.vacancies;
drop policy if exists positions_manage on public.positions;

revoke insert, update, delete on public.positions from authenticated;
grant select on public.positions to authenticated;
