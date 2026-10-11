import {Empty} from "antd";
import {ReadableRecord} from "../ui/ReadableRecord";
import {followUpHistoryLabels, followUpStages, type FollowUpData} from "../domain/positionFollowUp";

const labels: Record<string,string> = {
  stage: "Etapa", status: "Situação do processo", nextAction: "Próxima ação", assignee: "Responsável",
  dueDate: "Prazo", notes: "Anotações e perguntas internas", interview: "Entrevista", decision: "Decisão",
};
function record(value: unknown): Record<string,unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string,unknown> : {};
}
function fields(value: unknown) {
  const data=record(value);
  return {...data,...record(data.details)};
}
function display(key: string, value: unknown, operators: FollowUpData["operators"]): string {
  if(value===null||value===undefined||value==="")return "Não informado";
  if(key==="assignee")return operators.find(o=>o.id===value)?.name??"Responsável indisponível";
  if(key==="stage")return followUpStages[value as keyof typeof followUpStages]??String(value);
  if(key==="status")return value==="active"?"Em andamento":value==="closed"?"Encerrado":String(value);
  if(key==="dueDate"&&typeof value==="string")return value.split("-").reverse().join("/");
  if(key==="interview"){
    const interview=record(value),at=typeof interview.at==="string"?new Date(interview.at):null;
    let localDate:string|null=null;
    if(at&&!Number.isNaN(at.getTime())){
      try{localDate=at.toLocaleString("pt-BR",typeof interview.timezone==="string"?{timeZone:interview.timezone}:undefined);}
      catch{localDate=at.toISOString();}
    }
    return [interview.status==="scheduled"?"Agendada":interview.status==="cancelled"?"Cancelada":"Situação não informada",localDate,interview.timezone,interview.participants].filter(Boolean).join(" · ");
  }
  if(key==="decision"){
    const decision=record(value);
    return [decision.outcome==="proceed"?"Prosseguir":decision.outcome==="do_not_proceed"?"Não prosseguir neste processo":"Decisão registrada",decision.rationale].filter(Boolean).join(" · ");
  }
  return String(value);
}
export function FollowUpHistory({history,operators}:{history:FollowUpData["history"];operators:FollowUpData["operators"]}) {
  if(!history.length)return <Empty description="Nenhuma alteração registrada."/>;
  return <div className="pf-readable-history">{history.map(event=>{
    const before=fields(event.before),after=fields(event.after);
    const changed=Object.keys(labels).filter(key=>JSON.stringify(before[key])!==JSON.stringify(after[key]));
    return <article key={event.id}><h3>{followUpHistoryLabels[event.action]??"Alteração registrada"}</h3><p>{event.actor} · {new Date(event.at).toLocaleString("pt-BR")}</p>
      {changed.length?<dl>{changed.map(key=><div key={key}><dt>{labels[key]}</dt><dd><span>Anterior: {display(key,before[key],operators)}</span><span>Registrado: {display(key,after[key],operators)}</span></dd></div>)}</dl>:<p>{event.action==="add"?"Pessoa adicionada ao acompanhamento.":"Registro preservado neste processo."}</p>}
      <details className="prisma-disclosure"><summary>Consultar registro completo da alteração</summary><div><ReadableRecord value={{anterior:event.before,registrado:event.after}}/></div></details>
    </article>;
  })}</div>;
}
