/** Ordering of saved observations only. Never invent a score or recalculate it. */
export function comparePositionScores(left:number|null|undefined,right:number|null|undefined):number {
 const valid=(value:number|null|undefined)=>typeof value==="number"&&Number.isFinite(value)&&value>=0&&value<=100;
 const a=valid(left)?left!:null,b=valid(right)?right!:null;
 return a===null?b===null?0:1:b===null?-1:b-a;
}
export function savedPositionScore(score:unknown,state:unknown):number|null {
 return typeof score==="number"&&Number.isFinite(score)&&score>=0&&score<=100&&["saved","updating","update_failed"].includes(String(state))?score:null;
}
