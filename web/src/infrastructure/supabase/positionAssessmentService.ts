import {supabase} from "./client";
import type {AssessmentWorkspace,PositionAssessment,AssessmentQuestion,ParticipantAssessment} from "../../domain/positionAssessmentData";
import type {Json} from "./database.types";
const contract="position-assessment-1.0.0";
async function rpc<T>(name:string,args:object):Promise<T>{
 const {data,error}=await supabase.rpc(name as never,args as never);
 if(error)throw Error(error.code==="40001"?"Outra operação alterou este rascunho. Atualize os dados; suas escolhas foram preservadas.":error.code==="42501"?"Você não tem acesso a esta avaliação.":"Não foi possível concluir. Confira os campos, distribuição, revisão e prazo. O último estado confirmado foi preservado.");
 return data as unknown as T;
}
async function boundary<T>(body:object):Promise<T>{const {data,error}=await supabase.functions.invoke("position-assessment",{body:{contract,...body}});if(error)throw Error("Não foi possível sincronizar. Suas escolhas foram preservadas; tente novamente.");return data as T;}
export const positionAssessmentService={
 async load(org:string,vacancy:string,person:string){const data=await rpc<AssessmentWorkspace>("position_assessment_workspace",{p_organization_id:org,p_vacancy_id:vacancy,p_person_id:person});if(data.contract!==contract||!Array.isArray(data.assessments)||!Array.isArray(data.attempts))throw Error("Contrato de avaliação incompatível. Atualize a página.");return data;},
 mutate(org:string,vacancy:string,person:string,action:string,a:PositionAssessment|null,payload:object={}){return rpc<PositionAssessment>("position_assessment_mutate",{p_organization_id:org,p_vacancy_id:vacancy,p_person_id:person,p_action:action,p_assessment_id:a?.id??null,p_revision:a?.revision??null,p_payload:payload as Json});},
 bank(org:string,id:string){return rpc<AssessmentQuestion[]>("position_assessment_bank",{p_organization_id:org,p_assessment_id:id});},
 generate(body:object){return boundary<{status:string;duplicate?:boolean}>({action:"generate",...body});},
 send(body:object){return boundary<{state:string;deliveryId:string}>({action:"send",...body});},
 dispatch(body:object){return boundary<{state:string}>({action:"dispatch",...body});},
 async participant(token:string,action:string,payload:object={}){const data=await boundary<ParticipantAssessment>({token,action,payload});if(data.contract!==contract)throw Error("Versão do portal incompatível.");return data;}
};
