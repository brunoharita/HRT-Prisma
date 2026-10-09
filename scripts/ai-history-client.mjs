import {withAiHistory,recordAiCacheHit} from '../dist/src/infrastructure/aiHistory.js';
export function createWorkerHistory({supabaseUrl,publishableKey,historySecret,fetcher=fetch}) {
 if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(supabaseUrl??'')||!publishableKey||typeof historySecret!=='string'||historySecret.length<40)throw Error('AI_HISTORY_CONFIGURATION_UNAVAILABLE');
 return {rpc:async(_name,args)=>{
  try{const response=await fetcher(`${supabaseUrl}/rest/v1/rpc/record_ai_worker_history_v1`,{method:'POST',headers:{apikey:publishableKey,'Content-Type':'application/json'},body:JSON.stringify({p_secret:historySecret,...args}),signal:AbortSignal.timeout(20000),redirect:'error'});
   return response.ok?{data:await response.json(),error:null}:{data:null,error:'AI_HISTORY_PERSISTENCE_UNAVAILABLE'};
  }catch{return {data:null,error:'AI_HISTORY_PERSISTENCE_UNAVAILABLE'};}
 }};
}
export {withAiHistory,recordAiCacheHit};
