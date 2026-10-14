import type {ActivityEvent} from './assessmentActivityAnalysis.js';

export const RESPONSE_TIMELINE_METHOD = 'position-assessment-response-timeline-1.0.0';

export function activityInterval(event:ActivityEvent):{start:number;end:number}|null {
  if(event.kind!=='focus_episode')return null;
  const start=event.payload.startedAtClientMs,end=event.payload.endedAtClientMs;
  return typeof start==='number'&&typeof end==='number'&&Number.isFinite(start)&&Number.isFinite(end)&&start>=0&&end>=start?{start,end}:null;
}

/** Presentation only: preserve source events, aggregate facts and frozen AI snapshots. */
export function chronologicalActivity(events:readonly ActivityEvent[]):ActivityEvent[] {
  return [...events].sort((a,b)=>(activityInterval(a)?.start??a.client_at_ms)-(activityInterval(b)?.start??b.client_at_ms)||a.sequence-b.sequence||a.id-b.id);
}

export function responseChoice(previous:string|undefined,next:string):{kind:'answer_selected'|'answer_changed';values:Record<string,string|null>}|null {
  if(previous===next)return null;
  return {kind:previous?'answer_changed':'answer_selected',values:{optionId:next,previousOptionId:previous??null,support:'observed_choice',limitation:'choice_does_not_identify_intent'}};
}
