import {OCCUPATIONAL_RAG_VERSION,OCCUPATIONAL_SEARCH_VERSION,OCCUPATIONAL_DRAFT_VERSION,OCCUPATIONAL_SEARCH_INSTRUCTIONS,OCCUPATIONAL_DRAFT_INSTRUCTIONS,occupationalSearchSchema,occupationalSchemaForCandidates,readOccupationalContext,hasOccupationalContext,insufficientOccupationalDraft,readOccupationalSearch,readOccupationalDraft,rankOccupationalCandidates} from '../dist/src/domain/occupationalRag.js';

const allowedModels=new Set(['qwen3:1.7b-q4_K_M','qwen3:4b-instruct-2507-q4_K_M']);
const vectorCache=new Map();
export function occupationalProposalTimeout(elapsedMs){
  const remaining=420000-elapsedMs;
  if(!Number.isFinite(elapsedMs)||elapsedMs<0||remaining<1000)throw Error('RAG_PROCESSING_DEADLINE');
  return Math.min(300000,remaining);
}
export async function openOccupationalHistory(client,job,fetcher=fetch){
  const write=async(action,data)=>{const result=await client.rpc('record_ai_history_v1',{p_action:action,p_data:data});if(result.error)throw Error('RAG_AUDIT_UNAVAILABLE');return result.data;};
  const idempotencyKey=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`occupational_rag:${job.id}:${job.lease}`));
  const opened=await write('open_request',{scope:'organization',organizationId:job.organizationId,functionName:'occupational_rag',operationId:job.lease,actorId:null,sourceVersion:OCCUPATIONAL_RAG_VERSION,inputFingerprint:job.inputHash,idempotencyKey:Buffer.from(idempotencyKey).toString('hex')});
  const requestId=opened?.request?.id;if(!requestId)throw Error('RAG_AUDIT_UNAVAILABLE');
  const usage={requests:0,input_tokens:0,output_tokens:0,complete:true};
  const tracked=async(url,init)=>{
    const body=JSON.parse(init.body),attemptId=crypto.randomUUID(),started=Date.now();
    const stage=String(url).endsWith('/api/embed')?'retrieval':body.format?.properties?.search_terms?'query_expansion':'proposal';
    const acquired=await write('begin_attempt',{requestId,organizationId:job.organizationId,attemptId,stage,provider:'ollama-local',model:body.model,methodVersion:stage==='query_expansion'?OCCUPATIONAL_SEARCH_VERSION:stage==='proposal'?OCCUPATIONAL_DRAFT_VERSION:OCCUPATIONAL_RAG_VERSION,usageKind:'external',pricingVersion:'local-provider-no-api-fee-1.0.0'});
    if(acquired.acquired!==true)throw Error('RAG_AUDIT_UNAVAILABLE');
    usage.requests++;let response,result,input=null,output=null;
    try{
      response=await fetcher(url,init);
      try{result=await readBoundedJson(response.clone(),4*1024*1024);}catch{result=null;}
      input=Number.isSafeInteger(result?.prompt_eval_count)&&result.prompt_eval_count>=0?result.prompt_eval_count:null;
      output=stage==='retrieval'&&input!==null?0:Number.isSafeInteger(result?.eval_count)&&result.eval_count>=0?result.eval_count:null;
      if(input===null||output===null)usage.complete=false;else{usage.input_tokens+=input;usage.output_tokens+=output;}
      return response;
    }catch(error){usage.complete=false;throw error;}finally{
      await write('complete_attempt',{requestId,organizationId:job.organizationId,attemptId,result:response?.ok?'success':'failure',durationMs:Date.now()-started,inputTokens:input,outputTokens:output,estimatedCostUsd:input!==null&&output!==null?0:null,observedCostUsd:null,costEvidenceHash:null,errorCategory:response?.ok?null:'RAG_PROVIDER_UNAVAILABLE'});
    }
  };
  return {fetcher:tracked,usage,close:success=>write('complete_request',{requestId,organizationId:job.organizationId,status:success?'succeeded':'failed',errorCategory:success?null:'RAG_OPERATION_FAILED'})};
}
export function readOccupationalModelConfig(env){
  if(env.OCCUPATIONAL_RAG_ENABLED!=='true')return null;
  if(!allowedModels.has(env.OCCUPATIONAL_RAG_MODEL)||!/^http:\/\/(knowledge-model:11434|127\.0\.0\.1:11435)$/.test(env.OCCUPATIONAL_RAG_URL??'')||![env.OCCUPATIONAL_RAG_MODEL_DIGEST,env.OCCUPATIONAL_RAG_EMBEDDING_DIGEST].every(x=>/^[a-f0-9]{64}$/.test(x??'')))throw Error('RAG_CONFIGURATION_INVALID');
  return {base:env.OCCUPATIONAL_RAG_URL,model:env.OCCUPATIONAL_RAG_MODEL,modelDigest:env.OCCUPATIONAL_RAG_MODEL_DIGEST,embeddingDigest:env.OCCUPATIONAL_RAG_EMBEDDING_DIGEST,embeddingModel:'bge-m3',timeout:180000};
}
export async function verifyOccupationalModels(config,fetcher=fetch){
  let response;try{response=await fetcher(config.base+'/api/tags',{redirect:'error',signal:AbortSignal.timeout(10000)});}catch{throw Error('RAG_PROVIDER_UNAVAILABLE');}
  const raw=await readBoundedJson(response,65536);
  if(!Array.isArray(raw.models)||raw.models.find(x=>x.name===config.model)?.digest!==config.modelDigest||raw.models.find(x=>['bge-m3','bge-m3:latest'].includes(x.name))?.digest!==config.embeddingDigest)throw Error('RAG_MODEL_VERSION_UNAVAILABLE');
}
async function readBoundedJson(response,maximum){
  if(!response.ok)throw Error('RAG_PROVIDER_UNAVAILABLE');
  if(!response.body)throw Error('RAG_RESPONSE_INVALID');
  const reader=response.body.getReader();const chunks=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maximum){await reader.cancel();throw Error('RAG_RESPONSE_TOO_LARGE');}chunks.push(Buffer.from(value));}}
  finally{reader.releaseLock();}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Error('RAG_RESPONSE_INVALID');}
}
async function modelPost(config,endpoint,body,fetcher,maximum=65536){
  let response;try{response=await fetcher(config.base+endpoint,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(config.timeout)});}catch{throw Error('RAG_PROVIDER_UNAVAILABLE');}
  const result=await readBoundedJson(response,maximum);if(result.error)throw Error('RAG_PROVIDER_UNAVAILABLE');return result;
}
export async function occupationalChat(config,instructions,input,schema,fetcher=fetch){
  const result=await modelPost(config,'/api/chat',{model:config.model,think:false,stream:false,format:schema,
    messages:[{role:'system',content:instructions},{role:'user',content:JSON.stringify(input)}],options:{temperature:0,num_ctx:4096,num_predict:600,num_thread:2},keep_alive:'5m'},fetcher);
  if(result.model!==config.model||result.done!==true||result.done_reason==='length'||typeof result.message?.content!=='string')throw Error('RAG_RESPONSE_INVALID');
  try{return JSON.parse(result.message.content);}catch{throw Error('RAG_RESPONSE_INVALID');}
}
async function embed(config,input,fetcher){
  const result=await modelPost(config,'/api/embed',{model:config.embeddingModel,input,truncate:false,keep_alive:'5m'},fetcher,4*1024*1024);
  if(!Array.isArray(result.embeddings)||result.embeddings.length!==input.length||result.embeddings.some(x=>!Array.isArray(x)||x.length<64||x.length>4096||x.some(n=>!Number.isFinite(n))))throw Error('RAG_EMBEDDING_INVALID');
  return result.embeddings;
}
export async function retrieveOccupationalCandidates(config,job,candidates,fetcher=fetch){
  if(!Array.isArray(candidates)||candidates.length>40)throw Error('RAG_CANDIDATES_INVALID');
  if(!candidates.length)return [];
  for(const c of candidates)if(!c.id||!c.label||typeof c.description!=='string'||!Array.isArray(c.sources)||!Array.isArray(c.aliases)||!['organization','global'].includes(c.scope))throw Error('RAG_CANDIDATES_INVALID');
  const context=readOccupationalContext(job.context),vectors=[];
  for(let offset=0;offset<candidates.length;offset+=8){
    const batch=candidates.slice(offset,offset+8);
    const keys=batch.map(c=>`${job.organizationId}:${config.embeddingModel}:${c.id}:${c.version}:${c.label}:${c.description}:${JSON.stringify(c.aliases)}`);
    const missing=batch.map((c,i)=>({c,i})).filter(({i})=>!vectorCache.has(keys[i]));
    if(missing.length){const values=await embed(config,missing.map(({c})=>`${c.label}. ${c.aliases.slice(0,5).join('; ')}. ${c.description}`),fetcher);missing.forEach(({i},n)=>vectorCache.set(keys[i],values[n]));}
    vectors.push(...keys.map(key=>vectorCache.get(key)));
  }
  // Transient, tenant-keyed vectors only; Knowledge remains the sole persistence owner.
  while(vectorCache.size>256)vectorCache.delete(vectorCache.keys().next().value);
  const [query]=await embed(config,[`${context.title}. ${context.responsibilities}`],fetcher);
  return rankOccupationalCandidates(candidates,vectors,query);
}
export async function runOccupationalRagOnce(config,callRpc,fetcher=fetch){
  const job=await callRpc('claim_occupational_rag',{});
  if(!job)return {state:'idle'};
  const started=Date.now();let payload=null,error=null,history=null;
  try{
    const context=readOccupationalContext(job.context);let draft,candidates=[];
    if(!hasOccupationalContext(context))draft=insufficientOccupationalDraft(context);
    else{
      await verifyOccupationalModels(config,fetcher);
      if(!config.historyClient)throw Error('RAG_AUDIT_UNAVAILABLE');
      history=await openOccupationalHistory(config.historyClient,job,fetcher);fetcher=history.fetcher;
      const search=readOccupationalSearch(await occupationalChat(config,OCCUPATIONAL_SEARCH_INSTRUCTIONS,context,occupationalSearchSchema,fetcher),context);
      const pool=await callRpc('search_occupational_rag_candidates',{p_job_id:job.id,p_lease:job.lease,p_terms:search});
      candidates=await retrieveOccupationalCandidates(config,job,pool,fetcher);
      const proposalConfig={...config,timeout:occupationalProposalTimeout(Date.now()-started)};
      const proposalCandidates=candidates.map(({id,label,description})=>({id,label,description}));
      draft=readOccupationalDraft(await occupationalChat(proposalConfig,OCCUPATIONAL_DRAFT_INSTRUCTIONS,{context,candidates:proposalCandidates},occupationalSchemaForCandidates(candidates),fetcher),context,candidates);
    }
    payload={contract:OCCUPATIONAL_RAG_VERSION,input_hash:job.inputHash,proposed_concept:{canonical_label:draft.canonical_label,concept_type:'occupation',description:draft.description},
      aliases:draft.aliases,unresolved_questions:draft.unresolved_questions,rationale:draft.rationale,
      candidate_concepts:candidates.map(c=>({...c,canonical_label:c.label,concept_type:'occupation',match:'semantic_candidate'})),
      rag:{decision:draft.decision,target_id:draft.target_id,related_ids:draft.related_ids,evidence:draft.evidence,model_digest:history?config.modelDigest:null,embedding_digest:history?config.embeddingDigest:null,embedding_model:hasOccupationalContext(context)?config.embeddingModel:null,method:hasOccupationalContext(context)?'lexical-expansion-semantic-reranking':'deterministic-context-guard',version:OCCUPATIONAL_RAG_VERSION,search_prompt_version:OCCUPATIONAL_SEARCH_VERSION,draft_prompt_version:OCCUPATIONAL_DRAFT_VERSION}};
  }catch(cause){error=/^RAG_[A-Z_]{1,60}$/.test(cause?.message??'')?cause.message:'RAG_UNAVAILABLE';}
  if(history)try{await history.close(!error);}catch{error='RAG_AUDIT_UNAVAILABLE';payload=null;}
  await callRpc('complete_occupational_rag',{p_job_id:job.id,p_lease:job.lease,p_result:payload,p_model:history?config.model:'none',p_duration_ms:Date.now()-started,p_error:error,p_usage:history?.usage??{requests:0,input_tokens:0,output_tokens:0,complete:true}});
  return {state:error?'failed':'proposal_ready',durationMs:Date.now()-started,...(error?{error}:{})};
}
