import { supabase } from './client';
import { positionAssessmentService } from './positionAssessmentService';
import type { ProcessAssessmentWorkspace } from '../../domain/processAssessmentData';
import type { PositionAssessment } from '../../domain/positionAssessmentData';
async function rpc<T>(name:string,args:object):Promise<T> {
 const {data,error}=await supabase.rpc(name as never,args as never);
 if(error)throw Error(error.code==='40001'?'Outra operação alterou estes dados. Atualize para conciliar; suas escolhas foram preservadas.':error.code==='42501'?'Você não tem acesso a este processo.':'Operação não concluída. Confira a configuração, os contatos, a revisão e o prazo. O último estado confirmado foi preservado.');
 return data as T;
}
async function boundary<T>(body:object):Promise<T> {
 const {data,error}=await supabase.functions.invoke('position-assessment',{body:{contract:'process-assessment-1.0.0',...body}});
 if(error)throw Error('Não foi possível confirmar a operação. Suas escolhas foram preservadas. Atualize antes de tentar novamente.');return data as T;
}
export const processAssessmentService={
 async load(org:string,vacancy:string,processId?:string){const w=await rpc<ProcessAssessmentWorkspace>('process_assessment_workspace',{p_organization_id:org,p_vacancy_id:vacancy,p_process_id:processId??null});if(!w||w.contract!=='process-assessment-1.0.0'||w.organizationId!==org||w.vacancyId!==vacancy||!w.process?.id||(processId&&w.process.id!==processId)||!Array.isArray(w.candidates)||!Array.isArray(w.attempts)||!Array.isArray(w.requirements)||!Array.isArray(w.reusable)||!Array.isArray(w.legacy)||(w.assessment&&(w.assessment.organization_id!==org||w.assessment.process_id!==w.process.id||w.assessment.person_id!==null||w.assessment.contract_version!=='position-assessment-2.0.0')))throw Error('Contrato de avaliação incompatível.');return w;},
 mutate(org:string,vacancy:string,action:string,a:PositionAssessment|null,payload:object={}){return rpc<PositionAssessment>('position_assessment_mutate',{p_organization_id:org,p_vacancy_id:vacancy,p_person_id:null,p_action:action,p_assessment_id:a?.id??null,p_revision:a?.revision??null,p_payload:payload});},
 bank:positionAssessmentService.bank,
 generate(body:object){return boundary<{status:string;duplicate?:boolean}>({action:'generate',...body});},
 send(body:object){return boundary<{status:string;duplicate?:boolean;receipts:Array<{personId:string;deliveryId:string;state:string}>}>({action:'send_batch',...body});},
 dispatch(body:object){return boundary<{state:string}>({action:'dispatch_batch',...body});},
 reuse(org:string,vacancy:string,processId:string,source:string){return rpc<PositionAssessment>('process_assessment_reuse',{p_organization_id:org,p_vacancy_id:vacancy,p_process_id:processId,p_source_id:source});},
 cancel(org:string,attemptId:string){return rpc<{status:string}>('process_assessment_cancel_attempt',{p_organization_id:org,p_attempt_id:attemptId});},
};
