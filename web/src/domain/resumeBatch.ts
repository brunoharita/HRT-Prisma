import type {ResumeIdentity} from "../../../src/domain/resumeIdentity.js";
import type {ProcessedDocumentInput,ResumeIntakeIdentityResult,ResumeIntakeResolutionResult} from "./personIngestion.js";

export interface PreparedBatchResume {processed:ProcessedDocumentInput;identity:ResumeIdentity;intake:ResumeIntakeIdentityResult|ResumeIntakeResolutionResult;}
export interface ResumeBatchItem {id:string;file:File;status:"waiting"|"reading"|"identity"|"ready"|"published"|"failed";prepared?:PreparedBatchResume;error?:string|undefined;}
export const RESUME_BATCH_LIMIT=10;
/** No retries or parallel inference. Context cancellation prevents dispatch of the next file. */
export async function runSerialResumeBatch<T,R>(items:readonly T[],run:(item:T)=>Promise<R>,active:()=>boolean,onResult:(item:T,result:R)=>void,onFailure:(item:T,error:unknown)=>void,continueNext:()=>boolean=()=>true):Promise<void> {
  for(const item of items){
    if(!active()||!continueNext())break;
    try{const result=await run(item);if(active())onResult(item,result);}
    catch(error){if(active())onFailure(item,error);}
  }
}
