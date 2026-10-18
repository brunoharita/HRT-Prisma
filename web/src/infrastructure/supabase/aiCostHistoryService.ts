import {supabase} from "./client";
import type {AiCostPage} from "../../domain/aiCostHistory";
export interface AiCostFilters {organizationId?:string|null;functionName?:string|null;before?:string|null;beforeId?:string|null;actionId?:string|null;eventBefore?:number|null;}
export async function readAiCostHistory(filters:AiCostFilters={}):Promise<AiCostPage>{
 const r=await supabase.rpc("ai_cost_history_v1" as never,{p_limit:25,p_organization_id:filters.organizationId??null,p_function_name:filters.functionName??null,p_before:filters.before??null,p_before_id:filters.beforeId??null,p_action_id:filters.actionId??null,p_event_before:filters.eventBefore??null} as never).abortSignal(AbortSignal.timeout(20000));
 if(r.error)throw Error("Não foi possível consultar o consumo e custo de IA. Verifique o acesso e tente novamente.");
 const p=r.data as unknown as AiCostPage;
 if(p?.contract!=="ai-action-cost-report-1.0.0"||!Array.isArray(p.items)||typeof p.hasMore!=="boolean"||p.items.some(a=>!a.actionId||!a.usage||!a.commercial||!Number.isSafeInteger(a.requestCount)||a.usage.estimatedUsd!==null&&(!Number.isFinite(a.usage.estimatedUsd)||a.usage.estimatedUsd<0)))throw Error("Histórico de custos incompatível. Atualize a página.");
 return p;
}
