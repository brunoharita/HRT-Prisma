-- Collector1.1 clips selection to question content, including whole-page copy.
-- Preserve collector1.0 and all permissions/data.
do $upgrade$
declare original text;updated text;
begin
 original:=pg_get_functiondef('public.position_assessment_public(text,text,jsonb)'::regprocedure);
 updated:=replace(original,$old$'position-assessment-browser-signals-1.0.0','position-assessment-content-signals-1.0.0'$old$,$new$'position-assessment-browser-signals-1.0.0','position-assessment-content-signals-1.0.0','position-assessment-content-signals-1.1.0'$new$);
 if updated=original then raise exception 'Unexpected content method baseline';end if;original:=updated;
 updated:=replace(original,$old$event->>'method' is distinct from 'position-assessment-content-signals-1.0.0'$old$,$new$coalesce(event->>'method','') not in ('position-assessment-content-signals-1.0.0','position-assessment-content-signals-1.1.0')$new$);
 if updated=original then raise exception 'Unexpected content validation baseline';end if;original:=updated;
 updated:=replace(original,$old$elsif event->>'method'='position-assessment-content-signals-1.0.0'$old$,$new$elsif event->>'method' in ('position-assessment-content-signals-1.0.0','position-assessment-content-signals-1.1.0')$new$);
 if updated=original then raise exception 'Unexpected non-content method baseline';end if;
 execute updated;
end $upgrade$;
