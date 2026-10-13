-- Additive metadata-only content signals. No clipboard/text/image access or historic rewrite.
alter table public.position_assessment_events drop constraint position_assessment_events_kind_check;
alter table public.position_assessment_events add constraint position_assessment_events_kind_check
 check(kind in ('focus_episode','mouse_idle_before_first_choice','zoom_observed','capture_shortcut_observed','observation_gap','question_reopened','answer_changed','text_selection_observed','copy_action_observed','context_menu_observed'));
alter table private.assessment_activity_analyses alter column method_version set default 'assessment-activity-analysis-1.1.0';

do $upgrade$
declare original text; updated text;
begin
 original:=pg_get_functiondef('public.position_assessment_public(text,text,jsonb)'::regprocedure);
 updated:=replace(original,$old$'focus_episode','mouse_idle_before_first_choice','zoom_observed','capture_shortcut_observed','observation_gap','question_reopened','answer_changed'$old$,$new$'focus_episode','mouse_idle_before_first_choice','zoom_observed','capture_shortcut_observed','observation_gap','question_reopened','answer_changed','text_selection_observed','copy_action_observed','context_menu_observed'$new$);
 if updated=original then raise exception 'Unexpected event baseline';end if;
 original:=updated;
 updated:=replace(original,$old$'position-assessment-mouse-samples-1.0.0','position-assessment-browser-signals-1.0.0'$old$,$new$'position-assessment-mouse-samples-1.0.0','position-assessment-browser-signals-1.0.0','position-assessment-content-signals-1.0.0'$new$);
 if updated=original then raise exception 'Unexpected method baseline';end if;
 original:=updated;
 updated:=replace(original,$old$when 'capture_shortcut_observed' then array['shortcut','support','limitation']$old$,$new$when 'text_selection_observed' then array['region','characterCount','support','limitation'] when 'copy_action_observed' then array['region','characterCount','trigger','support','limitation'] when 'context_menu_observed' then array['region','characterCount','support','limitation'] when 'capture_shortcut_observed' then array['shortcut','support','limitation']$new$);
 if updated=original then raise exception 'Unexpected payload baseline';end if;
 original:=updated;
 updated:=replace(original,$old$   select * into ev from public.position_assessment_events where attempt_id=t.id and event_id=eid;$old$,$new$   if kind in ('text_selection_observed','copy_action_observed','context_menu_observed') then
    if event->>'method' is distinct from 'position-assessment-content-signals-1.0.0'
      or coalesce(event#>>'{values,region}','') not in ('stem','options','mixed')
      or jsonb_typeof(event#>'{values,characterCount}') is distinct from 'number'
      or (event#>>'{values,characterCount}')::numeric not between 0 and 100000
      or trunc((event#>>'{values,characterCount}')::numeric)<>(event#>>'{values,characterCount}')::numeric
      or (kind<>'context_menu_observed' and (event#>>'{values,characterCount}')::numeric=0)
      or (kind='text_selection_observed' and (event#>>'{values,support}' is distinct from 'observed_selection' or event#>>'{values,limitation}' is distinct from 'selection_does_not_confirm_copy'))
      or (kind='context_menu_observed' and (event#>>'{values,support}' is distinct from 'received_context_menu' or event#>>'{values,limitation}' is distinct from 'menu_does_not_confirm_copy'))
      or (kind='copy_action_observed' and (event#>>'{values,support}' is distinct from 'received_copy_event' or event#>>'{values,limitation}' is distinct from 'clipboard_result_and_destination_not_observable' or coalesce(event#>>'{values,trigger}','') not in ('keyboard_correlated','context_menu_correlated','not_identified')))
    then raise exception 'PA_CONTENT_SIGNAL_INVALID' using errcode='22023';end if;
   elsif event->>'method'='position-assessment-content-signals-1.0.0' then raise exception 'PA_CONTENT_SIGNAL_INVALID' using errcode='22023';end if;
   select * into ev from public.position_assessment_events where attempt_id=t.id and event_id=eid;$new$);
 if updated=original then raise exception 'Unexpected event insertion baseline';end if;
 execute updated;
 original:=pg_get_functiondef('private.assessment_activity_view(private.assessment_activity_analyses,text)'::regprocedure);
 updated:=replace(original,'r.fingerprint<>p_current_fingerprint',$new$(r.fingerprint<>p_current_fingerprint or r.method_version<>'assessment-activity-analysis-1.1.0')$new$);
 if updated=original then raise exception 'Unexpected activity view baseline';end if;execute updated;
 original:=pg_get_functiondef('public.assessment_activity_analysis_start(uuid,uuid,uuid,uuid)'::regprocedure);
 updated:=replace(original,$old$'assessment-activity-analysis-1.0.0'$old$,$new$'assessment-activity-analysis-1.1.0'$new$);
 updated:=replace(updated,$old$ actor:=private.authorize_position_follow_up(p_organization_id);$old$,$new$ if coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-prisma-activity-method','')<>'assessment-activity-analysis-1.1.0' then raise exception 'PA_ACTIVITY_METHOD_INVALID' using errcode='22023';end if;
 actor:=private.authorize_position_follow_up(p_organization_id);$new$);
 updated:=replace(updated,$old$fingerprint=fp and status in ('running','succeeded')$old$,$new$fingerprint=fp and method_version='assessment-activity-analysis-1.1.0' and status in ('running','succeeded')$new$);
 if updated=original then raise exception 'Unexpected activity start baseline';end if;execute updated;
 original:=pg_get_functiondef('public.assessment_activity_analysis_finish(uuid,uuid,boolean,jsonb,jsonb,jsonb)'::regprocedure);
 updated:=replace(original,$old$('focus','mouse','capture','missing','navigation')$old$,$new$('focus','mouse','capture','missing','navigation','copy')$new$);
 if updated=original then raise exception 'Unexpected activity finish baseline';end if;execute updated;
end $upgrade$;

