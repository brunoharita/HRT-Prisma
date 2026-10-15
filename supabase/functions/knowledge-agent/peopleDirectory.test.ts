import { processPeopleDirectory } from "./peopleDirectory.ts";
const assert = (value: unknown, message: string) => { if (!value) throw Error(message); };
const initialFetch = globalThis.fetch;
Deno.test("directory worker: bounded call, minimized input, closed candidates, ledger and fallback", async () => {
  Deno.env.set("KNOWLEDGE_AGENT_ENABLED","true");Deno.env.set("KNOWLEDGE_RESEARCH_MODEL","gpt-5.6-luna");Deno.env.set("OPENAI_API_KEY","fixture");
  Deno.env.set("COMPETENCY_NORMALIZATION_DAILY_CAP","20");Deno.env.set("COMPETENCY_NORMALIZATION_MONTHLY_CAP","200");
  const job = {id:"job",organizationId:"org",lease:"lease",fingerprint:"fingerprint",model:"gpt-5.6-luna",externalEnabled:true,
    input:{role:"Gerente de TI",context:"Gestão de infraestrutura",areas:[]},exact:{areas:[],function:null},candidates:[{id:"area",kind:"area",label:"Tecnologia",version:1}]};
  let requests=0;const completed: Array<Record<string,unknown>>=[];let permitted=true;
  const client = {rpc(name:string,args:Record<string,unknown>={}) {return Promise.resolve({error:null,data:name==="claim_people_directory"?job:name==="reserve_people_directory_call"?permitted:name==="record_ai_history_v1"?(args.p_action==="open_request"?{request:{id:"history"}}:{acquired:true}): (completed.push(args),null)});}};
  globalThis.fetch = (async (_url,options)=>{ requests++;const body=JSON.parse(String(options?.body));
    assert(body.store===false&&!body.tools,"closed provider");assert(!body.input.includes("organizationId")&&!body.input.includes("profileId"),"no identity");
    return Response.json({output_text:JSON.stringify({areaIds:["area"],functionId:null}),usage:{input_tokens:10,output_tokens:10}});
  }) as typeof fetch;
  try {
    const result=await processPeopleDirectory(client as never);assert(result.status==="complete"&&requests===1,"one successful call");
    assert(JSON.stringify(completed.at(-1)).includes('"area"'),"grounded completion");
    permitted=false;await processPeopleDirectory(client as never);assert(requests===1&&completed.at(-1)?.p_error==="BUDGET_LIMITED","no call above cap");
    permitted=true;job.externalEnabled=false;await processPeopleDirectory(client as never);assert(requests===1&&completed.at(-1)?.p_error==="AI_DISABLED","opt-in required");
    job.externalEnabled=true;job.input.context="contact@example.invalid";await processPeopleDirectory(client as never);assert(requests===1&&completed.at(-1)?.p_error==="INPUT_LIMIT","contact blocked");
    job.input.context="Gestão";globalThis.fetch=(async()=>Response.json({output_text:'{"areaIds":["invented"],"functionId":null}'})) as typeof fetch;
    await processPeopleDirectory(client as never);assert(completed.at(-1)?.p_error==="RESPONSE_INVALID","invented IDs rejected");
  } finally {globalThis.fetch=initialFetch;}
});
