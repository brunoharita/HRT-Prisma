import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {resolve,dirname,relative} from 'node:path';import {pathToFileURL} from 'node:url';import ts from 'typescript';
const org='31200000-0000-4000-8000-000000000001',requestId='31200000-0000-4000-8000-000000000002',assessmentId='31200000-0000-4000-8000-000000000003';
async function loadEdge(file){let source=await readFile(file,'utf8');source=source.replace(/from "(\.{1,2}\/[^"\n]+\.ts)"/g,(_all,spec)=>{const absolute=resolve(dirname(file),spec);if(absolute.endsWith('activity-analysis.ts'))return 'from '+JSON.stringify(globalThis.__costActivityUrl);return 'from '+JSON.stringify(pathToFileURL(resolve('dist',relative(process.cwd(),absolute)).replace(/\.ts$/,'.js')).href);});source=source.replace(/import \{ createClient \} from "npm:[^"]+";/,'const createClient=globalThis.__costCreateClient;');return import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText+'\n//'+crypto.randomUUID()).toString('base64'));}
const receipt=(text)=>({id:'resp_fixture',model:'gpt-5.6-luna',service_tier:'default',status:'completed',usage:{input_tokens:100,output_tokens:20,input_tokens_details:{cached_tokens:20,cache_write_tokens:10},output_tokens_details:{reasoning_tokens:5}},output:[{type:'message',content:[{type:'output_text',text}]}]});
test('real generation controller records richer cost even on HTTP failure without changing its existing budget estimate',async()=>{
 for(const httpStatus of [200,500]){
  const calls=[];let handler,io=0;const previousFetch=globalThis.fetch,previousDeno=globalThis.Deno;
  const server={rpc:async(name,args)=>{calls.push({name,args});return {data:name==='record_ai_history_v1'?(args.p_action==='open_request'?{request:{id:requestId}}:{acquired:true}):{status:args.p_success?'succeeded':'failed'},error:null};}};
  const user={auth:{getUser:async()=>({data:{user:{id:requestId}},error:null})},rpc:async()=>({data:{status:'reserved',actor_id:requestId,requirements:[],distribution:[{quantity:1}],revision:1},error:null})};
  try{globalThis.__costCreateClient=(_url,_key,options)=>options.global?user:server;globalThis.Deno={env:{get:n=>n==='SUPABASE_URL'?'https://fixture.supabase.co':'synthetic-only'},serve:fn=>{handler=fn;}};
   globalThis.fetch=async(url)=>{assert.equal(String(url),'https://api.openai.com/v1/responses');io++;return Response.json(receipt(JSON.stringify({items:[{stem:'Synthetic technical question',options:[],explanation:'Synthetic'}]})),{status:httpStatus,headers:{'x-request-id':'req_fixture'}});};
   const activity=await loadEdge('supabase/functions/position-assessment/activity-analysis.ts');globalThis.__costActivityUrl='data:text/javascript,export const activityMethodHeaders={};export const analyzeAssessmentActivity=()=>{};';assert.equal(typeof activity.analyzeAssessmentActivity,'function');
   await loadEdge('supabase/functions/position-assessment/index.ts');assert.ok(handler);
   const response=await handler(new Request('http://localhost/function',{method:'POST',headers:{origin:'http://localhost:5555',authorization:'Bearer fixture','content-type':'application/json'},body:JSON.stringify({contract:'process-assessment-1.0.0',action:'generate',organizationId:org,assessmentId,requestId,distribution:[{quantity:1}]})}));
   assert.equal(response.status,httpStatus===200?200:422);assert.equal(io,1);const event=calls.find(c=>c.args.p_action==='complete_attempt')?.args.p_data;assert.ok(event);assert.equal(event.inputTokens,100);assert.ok(Math.abs(event.estimatedCostUsd-.0000409)<1e-12);assert.equal(event.measurement.inputCacheWriteTokens,10);assert.equal(event.measurement.providerRequestId,'req_fixture');assert.equal(event.result,httpStatus===200?'success':'failure');
   if(httpStatus===200)assert.equal(calls.find(c=>c.name==='position_assessment_generation_finish').args.p_actual_usd,.000044);
   assert.ok(!JSON.stringify(event).includes('Synthetic technical question'));
  }finally{globalThis.fetch=previousFetch;globalThis.Deno=previousDeno;delete globalThis.__costCreateClient;delete globalThis.__costActivityUrl;}
 }
});
test('activity HTTP rejection and lost response preserve cost or unknown without another provider call',async()=>{
 const {analyzeAssessmentActivity}=await loadEdge('supabase/functions/position-assessment/activity-analysis.ts');
 for(const mode of ['http','timeout']){let io=0,completion;const user={rpc:async()=>({data:{acquired:true,snapshot:{attemptStatus:'started',questions:[{id:'q1',version:'v1'}],events:[{id:1,question_id:'q1',question_version:'v1',kind:'focus_episode',client_at_ms:1000,received_at:'2026-10-18T12:00:00Z',sequence:1,method:'fixture',payload:{durationMs:7000}}]}},error:null})};
  const server={rpc:async(_name,args)=>{completion=args;return {data:{status:'failed'},error:null};}};
  await analyzeAssessmentActivity(user,server,{organizationId:org,attemptId:assessmentId,requestId,tokenQuoteId:assessmentId},{apiKey:'fixture-only',fetch:async()=>{io++;if(mode==='timeout')throw Error('synthetic interrupted');return Response.json(receipt('{}'),{status:500});}});
  assert.equal(io,1);assert.equal(completion.p_success,false);assert.equal(completion.p_usage.inputTokens,mode==='http'?100:null);if(mode==='http'){assert.equal(completion.p_usage.measurement.resolvedModel,'gpt-5.6-luna');assert.ok(completion.p_usage.estimatedCostUsd>0);}else assert.equal(completion.p_usage.estimatedCostUsd,null);
 }
});
