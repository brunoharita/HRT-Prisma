function assert(v:unknown,m:string){if(!v)throw Error(m);}
let handler:(request:Request)=>Promise<Response>;const originalServe=Deno.serve,originalFetch=fetch;
Deno.serve=((h:typeof handler)=>{handler=h;return {} as ReturnType<typeof Deno.serve>;}) as typeof Deno.serve;
await import('./index.ts');Deno.serve=originalServe;
const org='23000000-0000-4000-8000-000000000001',actor='23000000-0000-4000-8000-000000000002',run='23000000-0000-4000-8000-000000000003';
Deno.test('Knowledge history covers research, description, occupation and vacancy with original gates and no payload retention',async()=>{
 for(const [k,v]of Object.entries({SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_ANON_KEY:'public-fixture',SUPABASE_SERVICE_ROLE_KEY:'backend-fixture',KNOWLEDGE_AGENT_ENABLED:'true',OPENAI_API_KEY:'provider-fixture',KNOWLEDGE_RESEARCH_MODEL:'gpt-5.6-luna',KNOWLEDGE_RESEARCH_DAILY_CAP:'100',KNOWLEDGE_RESEARCH_MONTHLY_CAP:'1000'}))Deno.env.set(k,v);
 const source={id:run,domain:'developer.mozilla.org',publisher:'MDN',source_class:'official_vendor_documentation'},url='https://developer.mozilla.org/en-US/docs/Web/JavaScript';
 const bodies=[{mode:'concept_description',contract:'concept-description-suggestion-request-1.0.0',organizationId:org,competencyName:'JavaScript',language:'pt-BR'},
 {mode:'occupation_resolution',contract:'occupation-resolution-agent-request-1.0.0',organizationId:org,attemptId:run},
 {mode:'vacancy_advisor',contract:'vacancy-advisor-request-1.0.0',organizationId:org,question:'Quais práticas profissionais usar?',roleTitle:'Desenvolvedor',area:'Software',language:'pt-BR'},
 {inboxId:run}];
 try{for(const body of bodies){const history:Array<{p_action:string;p_data:Record<string,unknown>}>=[];let provider=0;
 globalThis.fetch=async(input,init)=>{const target=String(input),method=init?.method??'GET';const raw=typeof init?.body==='string'?JSON.parse(init.body):{};
  if(target==='https://api.openai.com/v1/responses'){
   provider++;assert(history.some(c=>c.p_action==='begin_attempt'),'history before provider');const name=raw.text.format.name;
   const answer=name==='knowledge_concept_description'?{definition:'JavaScript é uma linguagem de programação utilizada no desenvolvimento de aplicações.'}:name==='occupation_resolution'?{safe:false,selected_external_id:null,reason:'Equivalência não confirmada.'}:name==='vacancy_advisor_market_answer'?{market_summary:'Práticas descritas na documentação.',recommendation:'Avaliar práticas no contexto da Posição.',caveats:['Não estabelece decisão de contratação.'],sources:[{url,title:'JavaScript'}]}:{observed_term:'JavaScript',proposed_concept:{canonical_label:'JavaScript',concept_type:'technology',description:'Linguagem de programação.'},aliases:[],proposed_relations:[],sources:[{url,title:'JavaScript',publisher:'MDN',source_class:source.source_class,retrieved_at:new Date().toISOString()}],rationale:'Documentação oficial.',unresolved_questions:[]};
   const output_text=JSON.stringify(answer);return Response.json({usage:{input_tokens:100,output_tokens:40},output_text,output:[{type:'message',content:[{type:'output_text',text:output_text}]},{type:'web_search_call',action:{sources:[{url}]}}]});
  }
  if(target.includes('/auth/v1/user'))return Response.json({id:actor,email:'fixture@example.invalid',aud:'authenticated',role:'authenticated'});
  if(target.includes('/rpc/record_ai_history_v1')){history.push(raw);return Response.json(raw.p_action==='open_request'?{request:{id:run}}:{acquired:true});}
  if(target.includes('/rpc/complete_occupation_resolution_agent'))return Response.json([{id:run,status:'ambiguous',selected_external_id:null,safe:false,reason:'Não confirmado'}]);
  if(method==='HEAD')return new Response(null,{status:200,headers:{'content-range':'0-0/0'}});
  if(method==='POST')return Response.json(raw?.provider?{id:run}:null);
  if(method==='PATCH')return Response.json(null);
  if(target.includes('/platform_users'))return Response.json([{access_profile:'super_admin',status:'active'}]);
  if(target.includes('/organization_knowledge_settings'))return Response.json([{allow_external_knowledge_enrichment:true}]);
  if(target.includes('/knowledge_sources'))return Response.json([source]);
  if(target.includes('/knowledge_inbox'))return Response.json([{id:run,scope:'global',organization_id:null,original_term:'JavaScript',normalized_search_term:'JavaScript',language:'pt-BR',status:'pending',cooldown_until:null}]);
  if(target.includes('/occupation_resolution_attempts'))return Response.json({id:run,organization_id:org,normalized_term:'Desenvolvedor',language:'pt-BR',candidate_snapshot:[{externalId:'esco-fixture'}],status:'pending_agent'});
  return Response.json([]);
 };
 const response=await handler(new Request('https://fixture.invalid/knowledge-agent',{method:'POST',headers:{Authorization:'Bearer fixture','Content-Type':'application/json'},body:JSON.stringify(body)}));const output=await response.json();assert(response.status===200,`${body.mode??'research'}:${response.status}:${JSON.stringify(output)}`);
 assert(provider===1,'one provider call');assert(history.map(c=>c.p_action).join(',')==='open_request,begin_attempt,complete_attempt,complete_request','full request lifecycle');assert(history[2]?.p_data.inputTokens===100,'actual input tokens');assert(!JSON.stringify(history).includes('JavaScript'),'no term or prompt in history');assert(history[0]?.p_data.scope===(body.mode?'organization':'platform'),'scope separated');
 }}finally{globalThis.fetch=originalFetch;}
});
