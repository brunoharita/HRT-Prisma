-- Existing server boundary; synthetic LOCAL runner, rollback at transaction end.
reset role;
create temp table invite_deadline_preservation as select id,status,answers,result,submitted_at from public.position_assessment_attempts where token_hash=(select value#>>'{}' from pa_state where key='shared-token');
update public.position_assessment_attempts set expires_at=(((now() at time zone 'America/Sao_Paulo')::date+1)+time '23:59:59.999') at time zone 'America/Sao_Paulo' where token_hash=(select value#>>'{}' from pa_state where key='shared-token');
set local role service_role;
select m83_assert(public.position_assessment_public('load',(select value#>>'{}' from pa_state where key='shared-token'))->>'status'='started','before deadline remains accessible');
select m83_assert(((public.position_assessment_public('load',(select value#>>'{}' from pa_state where key='shared-token'))->>'expiresAt')::timestamptz at time zone 'America/Sao_Paulo')::time=time '23:59:59.999','all final seconds of chosen day included');
reset role;
update public.position_assessment_attempts set expires_at=now()-interval '1 millisecond' where token_hash=(select value#>>'{}' from pa_state where key='shared-token');
set local role service_role;
do $$ declare action text;begin
 foreach action in array array['load','start','save','submit'] loop
  begin
   perform public.position_assessment_public(action,(select value#>>'{}' from pa_state where key='shared-token'),'{}');
   raise exception 'Expired action accepted: %',action using errcode='ZX002';
  exception when sqlstate '22023' then perform m83_assert(sqlerrm='PA_EXPIRED','expired '||action||' is rejected by deadline before payload or mutation');end;
 end loop;
end $$;
reset role;
select m83_assert((select to_jsonb(p) from invite_deadline_preservation p)=(select to_jsonb(p) from (select id,status,answers,result,submitted_at from public.position_assessment_attempts where token_hash=(select value#>>'{}' from pa_state where key='shared-token')) p),'expired submission never creates result or changes partial answers/status');
update public.position_assessment_attempts set expires_at=now()-interval '1 second' where token_hash=(select value#>>'{}' from pa_state where key='tokenhash');
set local role service_role;
select m83_assert(public.position_assessment_public('load',(select value#>>'{}' from pa_state where key='tokenhash'))->>'status'='submitted','completed receipt remains completed after access deadline');
reset role;
