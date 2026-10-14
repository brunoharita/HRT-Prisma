import { supabase } from "./client";
import { SELECTION_PROCESS_CONTRACT, type SelectionProcess, type SelectionPosition, type SelectionWorkspace } from "../../domain/selectionProcess";
import { isSelectionOutcome } from "../../domain/selectionOutcome";
const errorMessage = (error:{message:string;code?:string}) => error.message.includes("SELECTION_POSITION_OCCUPIED")?"A Posição precisa estar desocupada para iniciar um processo."
 :error.message.includes("SELECTION_ACTIVE_PROCESS_EXISTS")?"Esta Posição já tem um processo em andamento. Abra o processo existente."
 :error.code==="40001"?"A Posição ou o processo mudou. Atualize os dados antes de tentar novamente."
 :error.code==="42501"?"Você não tem acesso a estes processos seletivos.":"Não foi possível consultar ou salvar o processo. O último estado confirmado foi preservado.";
function envelope(value:unknown,organizationId:string):Record<string,unknown>{
 const data=value as Record<string,unknown>;
 if(data?.contract!==SELECTION_PROCESS_CONTRACT||data.organizationId!==organizationId)throw Error("Contrato de processos incompatível. Atualize a página.");
 return data;
}
function process(value:unknown,organizationId:string):SelectionProcess{
 const p=value as SelectionProcess;
 if(p?.organizationId!==organizationId||!p.id||!p.vacancyId||!["active","closed"].includes(p.status)||!Number.isSafeInteger(p.candidates)||!p.stages)throw Error("Processo seletivo incompatível.");
 if(p.outcome&&(!isSelectionOutcome(p.outcome)||p.status!=="closed"))throw Error("Resultado do processo incompatível.");
 return p;
}
export const selectionProcessService={
 async load(organizationId:string,options:{search?:string;status?:string;offset?:number;selectedId?:string;vacancyId?:string}={}):Promise<SelectionWorkspace>{
  const {data,error}=await supabase.rpc("get_selection_process_workspace" as never,{p_organization_id:organizationId,p_search:options.search??"",p_status:options.status??"all",p_offset:options.offset??0,p_selected_process_id:options.selectedId??null,p_vacancy_id:options.vacancyId??null} as never);
  if(error)throw Error(errorMessage(error));
  const d=envelope(data,organizationId);
  if(!Array.isArray(d.processes)||!Number.isSafeInteger(d.total)||d.pageSize!==50||!d.counts)throw Error("Lista de processos incompatível.");
  return {...d,processes:d.processes.map(p=>process(p,organizationId)),selected:d.selected?process(d.selected,organizationId):null} as unknown as SelectionWorkspace;
 },
 async positions(organizationId:string,search="",offset=0):Promise<{positions:SelectionPosition[];total:number}>{
  const {data,error}=await supabase.rpc("get_selection_process_positions" as never,{p_organization_id:organizationId,p_search:search,p_offset:offset} as never);
  if(error)throw Error(errorMessage(error));
  const d=envelope(data,organizationId);
  if(!Array.isArray(d.positions)||!Number.isSafeInteger(d.total)||d.positions.some(p=>p.organizationId!==organizationId))throw Error("Lista de Posições incompatível.");
  return {positions:d.positions,total:d.total as number};
 },
 errorMessage
};
