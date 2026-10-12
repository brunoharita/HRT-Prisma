import {useEffect,useState} from "react";
/** Presentation clock only. Schedules the next boundary; never requests or writes. */
export function useAssessmentDeadline(deadlines:readonly number[]):number {
 const [now,setNow]=useState(Date.now);const key=deadlines.filter(Number.isFinite).join(",");
 useEffect(()=>{let timer:ReturnType<typeof setTimeout>;let disposed=false;function tick(){const time=Date.now();if(disposed)return;setNow(time);const future=key.split(",").filter(Boolean).map(Number).filter(n=>n>time);if(future.length)timer=setTimeout(tick,Math.min(60_000,Math.max(1,Math.min(...future)-time+1)));}tick();return()=>{disposed=true;clearTimeout(timer);};},[key]);
 return now;
}
