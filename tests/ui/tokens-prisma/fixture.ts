// Browser fixture only. Never contacts Auth, a provider or a production database.
const params=new URLSearchParams(location.search);
export const org="24000000-0000-4000-8000-000000000001",actor="24000000-0000-4000-8000-000000000002";
const created=new Date().toISOString(),period=new Date().toLocaleDateString("sv-SE",{timeZone:"America/Sao_Paulo"});
const packages=[{id:"24000000-0000-4000-8000-000000000010",name:"Complemento",tokens:1000000,priceCents:4900,validityMonths:12,active:true,effectiveAt:created},{id:"24000000-0000-4000-8000-000000000011",name:"Expansão",tokens:3000000,priceCents:12900,validityMonths:12,active:true,effectiveAt:created},{id:"24000000-0000-4000-8000-000000000012",name:"Volume",tokens:10000000,priceCents:34900,validityMonths:12,active:true,effectiveAt:created}];
const rates=[{id:"rate1",functionName:"position_assessment_items",tokensPerUnit:2000,effectiveAt:created},{id:"rate2",functionName:"parser_ia",tokensPerUnit:10000,effectiveAt:created},{id:"rate3",functionName:"profile_synthesis",tokensPerUnit:5000,effectiveAt:created}];
const account={organizationId:org,monthlyTokens:1000000,pendingMonthlyTokens:null as number|null,pendingCycleDay:null as number|null,currentPeriod:period,nextPeriod:"2026-11-10",cycleAnchor:period,active:true,name:"Empresa exemplo",available:865000};
const movement={id:1,organizationId:org,kind:"debit",amount:-40000,actorId:actor,actorName:"Pessoa exemplo",functionName:"position_assessment_items",referenceId:null,reason:"Entrega concluída",createdAt:created};
const overview={contract:"prisma-tokens-1.0.0",organizationId:org,manager:params.get("role")!=="recruiter",account,available:865000,consumedPeriod:135000,reservedTotal:0,lots:[{id:"lot1",organizationId:org,source:"monthly",total:1000000,remaining:865000,available:865000,expiresAt:"2026-11-10T03:00:00Z"}],rates,packages,orders:[] as any[],reservations:[],movements:[movement,{...movement,id:2,amount:-90000,functionName:"parser_ia"},{...movement,id:3,amount:-5000,functionName:"profile_synthesis"}]};
const platform={contract:"prisma-tokens-1.0.0",packages,rates,companies:[account],orders:[] as any[],reservations:[],movements:[movement,{...movement,id:2,amount:-90000,functionName:"parser_ia"},{...movement,id:3,amount:-5000,functionName:"profile_synthesis"}],technicalCosts:{estimatedUsd:0.75,unknownEvents:2}};
export const fixture={calls:[] as any[],fail:false,hold:false,overview,platform};
Object.assign(window,{__tokensFixture:fixture});
export const supabase={rpc(name:string,args:any){return {abortSignal:async()=>{
 fixture.calls.push({name,args});while(fixture.hold)await new Promise(r=>setTimeout(r,20));await new Promise(r=>setTimeout(r,60));
 if(fixture.fail)return {data:null,error:{message:"PT_ACCESS_DENIED"}};
 if(name!=="prisma_tokens")throw Error("Unexpected synthetic RPC");
 const action=args.p_action,d=args.p_data??{};
 if(action==="quote")return {error:null,data:{contract:"prisma-token-quote-1.0.0",organizationId:args.p_organization_id,id:crypto.randomUUID(),functionName:d.functionName,quantity:d.quantity,tokensPerUnit:rates.find(r=>r.functionName===d.functionName)?.tokensPerUnit??2000,amount:(rates.find(r=>r.functionName===d.functionName)?.tokensPerUnit??2000)*d.quantity,available:1000000,expiresAt:new Date(Date.now()+600000).toISOString()}};
 if(action==="overview")return {data:structuredClone({...overview,...(!overview.manager?{packages:[],orders:[]}: {})}),error:null};
 if(action==="platform")return {data:structuredClone(platform),error:null};
 if(action==="request_package"){const p=packages.find(p=>p.id===d.packageId)!;if(!overview.orders.some(o=>o.id===d.operationId)){const o={id:d.operationId,organizationId:org,organizationName:account.name,packageName:p.name,tokens:p.tokens,priceCents:p.priceCents,validityMonths:p.validityMonths,status:"requested",reason:null,createdAt:created,offerExpiresAt:"2026-10-17T03:00:00Z",releasedAt:null};overview.orders.push(o);platform.orders.push(o);}}
 if(action==="configure"){account.pendingMonthlyTokens=d.monthlyTokens;account.pendingCycleDay=d.cycleDay;account.active=d.active;}
 if(action==="save_package")packages.push({...d,id:crypto.randomUUID(),effectiveAt:d.effectiveAt??created,active:true});
 if(action==="order_status"){const o=platform.orders.find(o=>o.id===d.id);if(o)o.status=d.status;}
 return {data:{recorded:true},error:null};
 }};}};
