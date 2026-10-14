-- Additive metadata timeline. Preserve previous collectors, data, authorization and grants.
alter table public.position_assessment_events drop constraint position_assessment_events_kind_check;
alter table public.position_assessment_events add constraint position_assessment_events_kind_check
 check(kind in ('focus_episode','mouse_idle_before_first_choice','zoom_observed','capture_shortcut_observed','observation_gap','question_reopened','answer_changed','text_selection_observed','copy_action_observed','context_menu_observed','question_displayed','answer_selected'));

do $upgrade$
declare original text;updated text;
begin
 original:=pg_get_functiondef('public.position_assessment_public(text,text,jsonb)'::regprocedure);
 updated:=replace(original,$old$'text_selection_observed','copy_action_observed','context_menu_observed')$old$,$new$'text_selection_observed','copy_action_observed','context_menu_observed','question_displayed','answer_selected')$new$);
 -- Only extend the kind allowlist, not the content-signal branch.
 updated:=replace(updated,$old$if kind in ('text_selection_observed','copy_action_observed','context_menu_observed','question_displayed','answer_selected')$old$,$new$if kind in ('text_selection_observed','copy_action_observed','context_menu_observed')$new$);
 if updated=original then raise exception 'Unexpected event kind baseline';end if;original:=updated;
 updated:=replace(original,$old$'position-assessment-content-signals-1.1.0')$old$,$new$'position-assessment-content-signals-1.1.0','position-assessment-response-timeline-1.0.0')$new$);
 -- Preserve the content method guard; the new method is exclusively for response timeline.
 updated:=replace(updated,$old$('position-assessment-content-signals-1.0.0','position-assessment-content-signals-1.1.0','position-assessment-response-timeline-1.0.0')$old$,$new$('position-assessment-content-signals-1.0.0','position-assessment-content-signals-1.1.0')$new$);
 if updated=original then raise exception 'Unexpected event method baseline';end if;original:=updated;
 updated:=replace(original,$old$allowed:=case kind when 'focus_episode'$old$,$new$allowed:=case when event->>'method'='position-assessment-response-timeline-1.0.0' and kind in ('answer_selected','answer_changed') then array['optionId','previousOptionId','support','limitation'] else case kind when 'focus_episode'$new$);
 if updated=original then raise exception 'Unexpected payload baseline';end if;
 original:=updated;updated:=replace(original,$old$else array['support','limitation'] end;$old$,$new$else array['support','limitation'] end end;$new$);
 if updated=original then raise exception 'Unexpected payload ending';end if;original:=updated;
 updated:=replace(original,$old$   select * into ev from public.position_assessment_events where attempt_id=t.id and event_id=eid;$old$,$new$   if event->>'method'='position-assessment-response-timeline-1.0.0' then
    if kind not in ('question_displayed','answer_selected','answer_changed') then raise exception 'PA_TIMELINE_INVALID' using errcode='22023';end if;
    if kind='question_displayed' then
     if event#>>'{values,support}' is distinct from 'observed_display' or event#>>'{values,limitation}' is distinct from 'display_does_not_confirm_reading' then raise exception 'PA_TIMELINE_INVALID' using errcode='22023';end if;
    else
     if event#>>'{values,support}' is distinct from 'observed_choice' or event#>>'{values,limitation}' is distinct from 'choice_does_not_identify_intent'
      or jsonb_typeof(event#>'{values,optionId}') is distinct from 'string'
      or not exists(select 1 from jsonb_array_elements(a.questions) q cross join lateral jsonb_array_elements(q->'options') o where q->>'id'=event->>'questionInstanceId' and o->>'id'=event#>>'{values,optionId}')
      or (kind='answer_selected' and jsonb_typeof(event#>'{values,previousOptionId}') is distinct from 'null')
      or (kind='answer_changed' and (jsonb_typeof(event#>'{values,previousOptionId}') is distinct from 'string' or event#>>'{values,previousOptionId}'=event#>>'{values,optionId}'
       or not exists(select 1 from jsonb_array_elements(a.questions) q cross join lateral jsonb_array_elements(q->'options') o where q->>'id'=event->>'questionInstanceId' and o->>'id'=event#>>'{values,previousOptionId}')))
     then raise exception 'PA_TIMELINE_INVALID' using errcode='22023';end if;
    end if;
   elsif kind in ('question_displayed','answer_selected') then raise exception 'PA_TIMELINE_INVALID' using errcode='22023';end if;
   select * into ev from public.position_assessment_events where attempt_id=t.id and event_id=eid;$new$);
 if updated=original then raise exception 'Unexpected event insertion baseline';end if;
 execute updated;
end $upgrade$;
