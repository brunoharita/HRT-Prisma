import {supabase} from "./client";
import {ACTIVITY_ANALYSIS_VERSION,ACTIVITY_ANALYSIS_METHOD_VERSION,validateActivitySelection,type ActivityFacts,type ActivitySelection} from "../../../../src/domain/assessmentActivityAnalysis";
export interface SavedActivityAnalysis {id:string;organizationId:string;attemptId:string;attemptStatus:"started"|"submitted";status:"running"|"succeeded"|"failed"|"reconciliation_required";inputFingerprint:string;stale:boolean;methodVersion:string;model:string;createdAt:string;completedAt:string|null;facts:ActivityFacts|null;selection:ActivitySelection|null;errorCategory:string|null;}
export interface ActivityAnalysisWorkspace {contract:typeof ACTIVITY_ANALYSIS_VERSION;organizationId:string;attemptId:string;inputFingerprint?:string;analysis:SavedActivityAnalysis|null;previousAnalysis?:SavedActivityAnalysis|null;}
function checked(value:unknown,org:string,attempt:string):ActivityAnalysisWorkspace {
 const v=value as ActivityAnalysisWorkspace;
 if(!v||v.contract!==ACTIVITY_ANALYSIS_VERSION||v.organizationId!==org||v.attemptId!==attempt)throw Error("Não foi possível confirmar o contexto da análise. Atualize a consulta.");
 for(const a of [v.analysis,v.previousAnalysis])if(a){
  if(a.organizationId!==org||a.attemptId!==attempt||!["started","submitted"].includes(a.attemptStatus)||!["running","succeeded","failed","reconciliation_required"].includes(a.status)||![ACTIVITY_ANALYSIS_VERSION,ACTIVITY_ANALYSIS_METHOD_VERSION].includes(a.methodVersion)||typeof a.inputFingerprint!=="string"||typeof a.stale!=="boolean")throw Error("Análise incompatível. Os registros de atividade foram preservados.");
  if(a.status==="succeeded"){if(!a.facts||a.facts.contract!==ACTIVITY_ANALYSIS_VERSION||!Array.isArray(a.facts.patterns)||!Array.isArray(a.facts.rows)||!a.selection)throw Error("Análise incompleta. Consulte os acontecimentos.");try{validateActivitySelection(a.selection,a.facts);}catch{throw Error("A análise salva contém informações incompatíveis. Consulte os acontecimentos e atualize a consulta.");}}
 }
 return v;
}
export const assessmentActivityService={
 async load(org:string,attempt:string):Promise<ActivityAnalysisWorkspace>{const {data,error}=await supabase.rpc("assessment_activity_analysis_load" as never,{p_organization_id:org,p_attempt_id:attempt} as never).abortSignal(AbortSignal.timeout(20000));if(error)throw Error(error.code==="42501"?"Você não tem acesso à análise desta tentativa.":"Não foi possível consultar a análise. Os acontecimentos continuam disponíveis.");return checked(data,org,attempt);},
 async analyze(org:string,attempt:string,requestId:string,quoteId:string):Promise<ActivityAnalysisWorkspace>{const {data,error}=await supabase.functions.invoke("position-assessment",{body:{contract:"position-assessment-1.0.0",action:"analyze_activity",organizationId:org,attemptId:attempt,requestId,tokenQuoteId:quoteId}});if(error)throw Error("O resultado da solicitação ainda não foi confirmado. Consulte o andamento antes de tentar outra análise.");return checked(data,org,attempt);},
};
