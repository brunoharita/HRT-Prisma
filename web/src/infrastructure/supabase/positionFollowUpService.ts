import {sortFollowUpByAdherence} from "../../domain/positionFollowUp";
import { supabase } from "./client";
import type { Json } from "./database.types";
import type { FollowUpData } from "../../domain/positionFollowUp";
import { isSelectionOutcome } from "../../domain/selectionOutcome";
import type { PersonSelectionHistory } from "../../domain/personSelectionHistory";

function decode(value: Json): FollowUpData {
  const data = value as unknown as FollowUpData;
  if (data?.contract !== "position-follow-up-1.0.0" || !Array.isArray(data.entries) || !Array.isArray(data.history) || !Array.isArray(data.operators)) {
    throw new Error("O acompanhamento retornou um contrato incompatível. Atualize a página.");
  }
  if(data.process&&(!data.process.id||!["active","closed"].includes(data.process.status)||!Number.isSafeInteger(data.process.revision)))throw new Error("O processo retornou um contrato incompatível. Atualize a página.");
  if(data.process?.outcome && (!isSelectionOutcome(data.process.outcome)||data.process.status!=="closed"))throw new Error("O resultado do processo retornou um contrato incompatível. Atualize a página.");
  return {...data,entries:sortFollowUpByAdherence(data.entries)};
}
function failure(error: { code?: string; message: string }): Error {
  if(error.message.includes("SELECTION_CLOSURE_REQUIRED"))return new Error("Informe o resultado ao encerrar o processo. Atualize a página se necessário.");
  if(error.message.includes("SELECTION_PARTICIPANT_REQUIRED"))return new Error("Escolha uma Pessoa participante deste processo ou encerre sem escolha.");
  if(error.message.includes("SELECTION_POSITION_OCCUPIED"))return new Error("A Posição precisa estar desocupada para iniciar ou reabrir um processo.");
  if(error.message.includes("SELECTION_ACTIVE_PROCESS_EXISTS"))return new Error("Esta Posição já tem um processo em andamento. Abra o processo existente.");
  return new Error(error.code === "40001" ? "Outra pessoa alterou este acompanhamento. Atualize os dados antes de tentar novamente; seu rascunho foi preservado."
    : error.code === "42501" ? "Você não tem acesso a este acompanhamento."
      : "Não foi possível salvar ou consultar o acompanhamento. Confira os campos e tente novamente. O último estado confirmado foi preservado.");
}
export const positionFollowUpService = {
  async historyForPerson(organizationId:string,personId:string,offset=0):Promise<PersonSelectionHistory>{
    const {data,error}=await supabase.rpc("get_person_selection_history" as never,{p_organization_id:organizationId,p_person_id:personId,p_offset:offset} as never);
    if(error)throw failure(error);
    const result=data as unknown as PersonSelectionHistory;
    const validTests=(value:unknown):boolean=>Array.isArray(value)&&value.every(t=>t&&t.organizationId===organizationId&&t.personId===personId&&typeof t.id==="string"&&typeof t.vacancyId==="string");
    if(result?.contract!=="person-selection-history-1.0.0"||result.organizationId!==organizationId||result.personId!==personId||!Array.isArray(result.participations)||!Array.isArray(result.legacyTests)||!Number.isSafeInteger(result.total)||result.total<0||result.pageSize!==50
      ||!validTests(result.legacyTests)||result.participations.some(p=>!p||p.organizationId!==organizationId||p.personId!==personId||!p.processId||!p.vacancyId||!["active","closed"].includes(p.processStatus)||!validTests(p.tests)||(p.outcome&&(!isSelectionOutcome(p.outcome)||p.processStatus!=="closed"))))throw new Error("O histórico dos processos retornou um contrato incompatível. Atualize a página.");
    return result;
  },
  async load(organizationId: string, vacancyId: string, processId?:string): Promise<FollowUpData> {
    const { data, error } = processId?await supabase.rpc("get_position_follow_up_process" as never,{p_organization_id:organizationId,p_vacancy_id:vacancyId,p_process_id:processId} as never):await supabase.rpc("get_position_follow_up", { p_organization_id: organizationId, p_vacancy_id: vacancyId });
    if (error) throw failure(error); return decode(data);
  },
  async start(organizationId:string,vacancyId:string,processId:string|null,revision:number|null,requestId:string):Promise<FollowUpData>{
    const {data,error}=await supabase.rpc('start_position_selection_process' as never,{p_organization_id:organizationId,p_vacancy_id:vacancyId,p_process_id:processId,p_revision:revision,p_request_id:requestId} as never);
    if(error)throw failure(error);return decode(data);
  },
  async mutate(organizationId: string, vacancyId: string, action: string, personId: string | null, revision: number | null, payload: object = {},processId?:string): Promise<FollowUpData> {
    const args={p_organization_id: organizationId, p_vacancy_id: vacancyId, p_action: action,p_person_id:personId,p_expected_revision:revision,p_payload:payload as Json};
    const {data,error}=processId?await supabase.rpc('mutate_position_follow_up_process' as never,{...args,p_process_id:processId} as never):await supabase.rpc('mutate_position_follow_up',args);
    if (error) throw failure(error); return decode(data);
  },
  async forPerson(organizationId: string, personId: string) {
    const { data, error } = await supabase.rpc("get_position_follow_up", { p_organization_id: organizationId, p_person_id: personId });
    if (error) throw failure(error);
    const result = data as unknown as { contract: string; links: { vacancyId: string; title: string; stage: keyof typeof import("../../domain/positionFollowUp").followUpStages; processName: string; processStatus: string;processId?:string;isCurrent?:boolean }[] };
    if (result?.contract !== "position-follow-up-1.0.0" || !Array.isArray(result.links)) throw new Error("Acompanhamento incompatível.");
    return result.links;
  },
};
