/** Backend-only metadata ledger. No prompts, payloads, credentials or document bodies are persisted. */
export interface AiHistoryClient {rpc(name:string,args:Record<string,unknown>):PromiseLike<{data:unknown;error:unknown}>;}
export interface AiHistoryScope {organizationId:string|null;functionName:string;operationId:string;sourceVersion:string;inputFingerprint:string;actorId?:string|null;}
type Usage={inputTokens:number|null;outputTokens:number|null;estimatedCostUsd:number|null;result:"success"|"failure";errorCategory:string|null;durationMs:number;attemptId:string;};
const record=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{};
const count=(v:unknown)=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=0?v:null;
async function fingerprint(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,"0")).join("");}
async function receipt(response:Response):Promise<Record<string,unknown>> {
 const copy=response.clone(),reader=copy.body?.getReader();if(!reader)return {};const chunks:Uint8Array[]=[];let bytes=0;
 try{while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>4*1024*1024){void reader.cancel();return {};}chunks.push(part.value);}const all=new Uint8Array(bytes);let at=0;for(const chunk of chunks){all.set(chunk,at);at+=chunk.length;}return record(JSON.parse(new TextDecoder().decode(all)));}catch{return {};}finally{reader.releaseLock();}
}
async function write(client:AiHistoryClient,action:string,data:Record<string,unknown>){const result=await client.rpc("record_ai_history_v1",{p_action:action,p_data:data});if(result.error)throw Error("AI_HISTORY_PERSISTENCE_UNAVAILABLE");return record(result.data);}
export async function withAiHistory<T>(client:AiHistoryClient,scope:AiHistoryScope,callback:(fetcher:typeof fetch)=>Promise<T>,fetcher:typeof fetch=fetch):Promise<T>{
 const opened=await write(client,"open_request",{scope:scope.organizationId===null?"platform":"organization",...scope,actorId:scope.actorId??null,idempotencyKey:await fingerprint(`${scope.functionName}:${scope.operationId}`)});
 const requestId=record(opened.request).id;const usages:Usage[]=[];let success=false;
 const tracked:typeof fetch=async(input,init)=>{
  if(String(input)!=="https://api.openai.com/v1/responses")return fetcher(input,init);
  const body=typeof init?.body==="string"?record(JSON.parse(init.body)):{};const model=typeof body.model==="string"?body.model:null;
  if(!model)throw Error("AI_HISTORY_MODEL_REQUIRED");
  const attemptId=crypto.randomUUID(),start=Date.now();
  const pricingVersion=model==="gpt-5.6-luna"&&!body.tools?"openai-standard-2026-10-09":null;
  const claim=await write(client,"begin_attempt",{requestId,organizationId:scope.organizationId,attemptId,stage:"provider",provider:"openai-responses",model,methodVersion:scope.sourceVersion,usageKind:"external",pricingVersion});
  if(claim.acquired!==true)throw Error("AI_HISTORY_ATTEMPT_ALREADY_ACQUIRED");
  const usage:Usage={attemptId,inputTokens:null,outputTokens:null,estimatedCostUsd:null,result:"failure",errorCategory:"PROVIDER_REQUEST_FAILED",durationMs:0};usages.push(usage);
  try{const response=await fetcher(input,init);const raw=await receipt(response),observed=record(raw.usage);usage.inputTokens=count(observed.input_tokens);usage.outputTokens=count(observed.output_tokens);
   if(pricingVersion&&usage.inputTokens!==null&&usage.outputTokens!==null)usage.estimatedCostUsd=(usage.inputTokens*0.20+usage.outputTokens*1.20)/1e6;
   if(response.ok){usage.result="success";usage.errorCategory=null;}return response;
  }finally{usage.durationMs=Date.now()-start;}
 };
 try{const result=await callback(tracked);success=true;return result;}finally{
  for(const usage of usages)await write(client,"complete_attempt",{requestId,organizationId:scope.organizationId,...usage,observedCostUsd:null,costEvidenceHash:null});
  await write(client,"complete_request",{requestId,organizationId:scope.organizationId,status:success&&usages.some(u=>u.result==="success")?"succeeded":"failed",errorCategory:success&&usages.some(u=>u.result==="success")?null:"AI_FUNCTION_FAILED"});
 }
}
export async function recordAiCacheHit(client:AiHistoryClient,scope:AiHistoryScope,durationMs:number):Promise<void>{
 const opened=await write(client,"open_request",{scope:scope.organizationId===null?"platform":"organization",...scope,actorId:scope.actorId??null,idempotencyKey:await fingerprint(`${scope.functionName}:${scope.operationId}`)});
 const requestId=record(opened.request).id,attemptId=crypto.randomUUID();
 await write(client,"begin_attempt",{requestId,organizationId:scope.organizationId,attemptId,stage:"cache",provider:"cache",model:"none",methodVersion:scope.sourceVersion,usageKind:"cache",pricingVersion:null});
 await write(client,"complete_attempt",{requestId,organizationId:scope.organizationId,attemptId,result:"success",durationMs,inputTokens:null,outputTokens:null,estimatedCostUsd:0,observedCostUsd:0,costEvidenceHash:null,errorCategory:null});
 await write(client,"complete_request",{requestId,organizationId:scope.organizationId,status:"succeeded",errorCategory:null});
}
