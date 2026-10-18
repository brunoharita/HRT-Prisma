/** Backend-only metadata ledger. No prompts, payloads, credentials or document bodies are persisted. */
export interface AiHistoryClient {rpc(name:string,args:Record<string,unknown>):PromiseLike<{data:unknown;error:unknown}>;}
export interface AiHistoryScope {organizationId:string|null;functionName:string;operationId:string;sourceVersion:string;inputFingerprint:string;actorId?:string|null;actionOperationId?:string;}
type Usage={inputTokens:number|null;outputTokens:number|null;estimatedCostUsd:number|null;measurement:AiCostMeasurement|null;result:"success"|"failure";errorCategory:string|null;durationMs:number;attemptId:string;};
const record=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{};
const count=(v:unknown)=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=0?v:null;
export const AI_COST_PRICING_VERSION="openai-standard-2026-10-18";
export interface AiCostMeasurement {
 version:"ai-cost-measurement-1.0.0";requestedModel:string|null;resolvedModel:string|null;providerResponseId:string|null;providerRequestId:string|null;serviceTier:string|null;
 inputCachedTokens:number|null;inputCacheWriteTokens:number|null;outputReasoningTokens:number|null;webSearchCalls:number|null;otherToolCalls:number|null;
 calculationStatus:"calculated"|"bounded"|"partial"|"unknown";lowerBoundUsd:number|null;upperBoundUsd:number|null;tokenCostUsd:number|null;toolCostUsd:number|null;
}
const technical=(v:unknown)=>typeof v==="string"&&/^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,95}$/.test(v)?v:null;
/** Pure metadata extraction. Output/prompt text and tool arguments are never returned. Reasoning is already included in output_tokens. */
export function measureAiResponse(rawValue:unknown,requestValue:unknown,requestId:unknown=null){
 const raw=record(rawValue),request=record(requestValue),usage=record(raw.usage),details=record(usage.input_tokens_details);
 const inputTokens=count(usage.input_tokens),outputTokens=count(usage.output_tokens);
 const cached=count(details.cached_tokens),written=count(details.cache_write_tokens),reasoning=count(record(usage.output_tokens_details).reasoning_tokens);
 const tools=Array.isArray(request.tools)?request.tools.map(t=>record(t).type):[];
 const output=Array.isArray(raw.output)?raw.output.map(record):null;
 const web=output?output.filter(t=>t.type==="web_search_call").length:tools.length?null:0;
 const other=output?output.filter(t=>typeof t.type==="string"&&t.type.endsWith("_call")&&t.type!=="web_search_call").length:tools.length?null:0;
 const m:AiCostMeasurement={version:"ai-cost-measurement-1.0.0",requestedModel:technical(request.model),resolvedModel:technical(raw.model),providerResponseId:technical(raw.id),providerRequestId:technical(requestId),serviceTier:technical(raw.service_tier),inputCachedTokens:cached,inputCacheWriteTokens:written,outputReasoningTokens:reasoning,webSearchCalls:web,otherToolCalls:other,calculationStatus:"unknown",lowerBoundUsd:null,upperBoundUsd:null,tokenCostUsd:null,toolCostUsd:null};
 const knownModel=m.resolvedModel??m.requestedModel;
 const family=knownModel?.match(/^(gpt-5\.6-(?:luna|terra))(?:-\d{4}-\d{2}-\d{2})?$/)?.[1];
 const tier=m.serviceTier??technical(request.service_tier);
 const supportedTier=tier===null||tier==="default";
 const valid=inputTokens!==null&&outputTokens!==null&&(cached??0)+(written??0)<=inputTokens&&(reasoning===null||reasoning<=outputTokens);
 let estimatedCostUsd:number|null=null;
 if(family&&supportedTier&&valid){
  const scale=family==="gpt-5.6-terra"?10:1,long=inputTokens>272000;
  const inputRate=.20*scale*(long?2:1),cacheRate=.02*scale*(long?2:1),outputRate=1.20*scale*(long?1.5:1);
  const remaining=inputTokens-(cached??0)-(written??0),fixed=(cached??0)*cacheRate+(written??0)*inputRate*1.25+outputTokens*outputRate;
  const completeCache=cached!==null&&written!==null;
  const lower=(fixed+remaining*(completeCache?inputRate:cached===null?cacheRate:inputRate))/1e6;
  const upper=(fixed+remaining*(completeCache?inputRate:written===null?inputRate*1.25:inputRate))/1e6;
  const supportedTools=tools.every(t=>t==="web_search"||t==="web_search_preview")&&other===0&&web!==null;
  m.tokenCostUsd=upper;m.toolCostUsd=supportedTools?web*.01:null;
  m.lowerBoundUsd=lower+(m.toolCostUsd??0);m.upperBoundUsd=supportedTools?upper+m.toolCostUsd!:null;
  estimatedCostUsd=m.upperBoundUsd;
  m.calculationStatus=!supportedTools||!m.resolvedModel||!m.serviceTier?"partial":completeCache?"calculated":"bounded";
 }
 return {inputTokens,outputTokens,estimatedCostUsd,measurement:m,pricingVersion:family?AI_COST_PRICING_VERSION:null};
}
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
  const pricingVersion=AI_COST_PRICING_VERSION;
  const claim=await write(client,"begin_attempt",{requestId,organizationId:scope.organizationId,attemptId,stage:"provider",provider:"openai-responses",model,methodVersion:scope.sourceVersion,usageKind:"external",pricingVersion});
  if(claim.acquired!==true)throw Error("AI_HISTORY_ATTEMPT_ALREADY_ACQUIRED");
  const usage:Usage={attemptId,inputTokens:null,outputTokens:null,estimatedCostUsd:null,measurement:measureAiResponse({},body).measurement,result:"failure",errorCategory:"PROVIDER_REQUEST_FAILED",durationMs:0};usages.push(usage);
  try{const response=await fetcher(input,init);const measured=measureAiResponse(await receipt(response),body,response.headers.get("x-request-id"));usage.inputTokens=measured.inputTokens;usage.outputTokens=measured.outputTokens;usage.estimatedCostUsd=measured.estimatedCostUsd;usage.measurement=measured.measurement;
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
