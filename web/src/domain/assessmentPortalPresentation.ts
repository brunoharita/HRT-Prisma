import {ASSESSMENT_TIMEZONE} from "./assessmentInvitations.js";

export function assessmentRemainingSeconds(deadline:string|undefined,now=Date.now()):number|null {
 const at=deadline?Date.parse(deadline):NaN;
 return Number.isFinite(at)?Math.max(0,Math.ceil((at-now)/1000)):null;
}
export function assessmentRemainingLabel(seconds:number|null):string {
 if(seconds===null||!Number.isFinite(seconds))return "Tempo indisponível";
 if(seconds<=0)return "Prazo encerrado";
 if(seconds<60)return "Menos de 1 minuto restante";
 const minutes=Math.floor(seconds/60),days=Math.floor(minutes/1440),hours=Math.floor(minutes%1440/60),rest=minutes%60;
 const values=[[days,"dia"],[hours,"hora"],[rest,"minuto"]] as const;
 const parts=values.filter(([n])=>n>0).map(([n,label])=>`${n} ${label}${n===1?"":"s"}`);
 const singular=parts.length===1&&values.some(([n])=>n===1);
 return `${parts.length>1?parts.slice(0,-1).join(", ")+" e "+parts.at(-1):parts[0]} ${singular?"restante":"restantes"}`;
}
export function assessmentDeadlineLabel(deadline:string|undefined):string {
 const at=deadline?Date.parse(deadline):NaN;if(!Number.isFinite(at))return "Data indisponível";
 const date=new Date(at);
 return `${date.toLocaleDateString("pt-BR",{timeZone:ASSESSMENT_TIMEZONE})} às ${date.toLocaleTimeString("pt-BR",{timeZone:ASSESSMENT_TIMEZONE,hour:"2-digit",minute:"2-digit"})}`;
}
