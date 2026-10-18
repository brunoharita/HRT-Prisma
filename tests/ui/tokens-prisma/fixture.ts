import {aiCostFixture} from "./aiCostFixture.js";
// Browser fixture only. Never contacts Auth, a provider or a production database.
const params=new URLSearchParams(location.search);
const wallet=params.get("wallet")==="calendar";
const asOf="2026-10-14T03:00:00Z";
export const org="24000000-0000-4000-8000-000000000001",actor="24000000-0000-4000-8000-000000000002";
const created=new Date().toISOString(),period=new Date().toLocaleDateString("sv-SE",{timeZone:"America/Sao_Paulo"});
const packages=[{id:"24000000-0000-4000-8000-000000000010",name:"Complemento",tokens:1000000,priceCents:4900,validityDays:30,active:true,effectiveAt:created},{id:"24000000-0000-4000-8000-000000000011",name:"Expansão",tokens:3000000,priceCents:12900,validityDays:30,active:true,effectiveAt:created},{id:"24000000-0000-4000-8000-000000000012",name:"Volume",tokens:10000000,priceCents:34900,validityDays:30,active:true,effectiveAt:created}];
const nonround=wallet||params.get("tariffs")==="nonround";
const rates=[{id:"rate1",functionName:"position_assessment_items",tokensPerUnit:nonround?2347:2000,effectiveAt:created},{id:"rate2",functionName:"parser_ia",tokensPerUnit:nonround?14785:10000,effectiveAt:created},{id:"rate3",functionName:"profile_synthesis",tokensPerUnit:nonround?6193:5000,effectiveAt:created}];
const account={organizationId:org,monthlyTokens:1000000,pendingMonthlyTokens:null as number|null,pendingCycleDay:null as number|null,currentPeriod:period,nextPeriod:"2026-11-10",cycleAnchor:period,active:true,name:wallet?"Empresa Horizonte":"Empresa exemplo",available:865000,createdAt:"2026-08-01T03:00:00Z",policyVersion:"prisma-token-policy-2.0.0"};
const movement={id:1,organizationId:org,kind:"debit",amount:-40000,actorId:actor,actorName:"Pessoa exemplo",functionName:"position_assessment_items",referenceId:null,reason:"Entrega concluída",createdAt:created};
const overview={contract:"prisma-tokens-2.0.0",organizationId:org,manager:params.get("role")!=="recruiter",account,available:865000,consumedPeriod:135000,reservedTotal:0,lots:[{id:"lot1",organizationId:org,source:"monthly",total:1000000,remaining:865000,available:865000,expiresAt:"2026-11-10T03:00:00Z"}],rates,packages,orders:[] as any[],reservations:[],movements:[movement,{...movement,id:2,amount:-90000,functionName:"parser_ia"},{...movement,id:3,amount:-5000,functionName:"profile_synthesis"}] as any[]};
const platform={contract:"prisma-tokens-2.0.0",packages,rates,companies:[account],orders:[] as any[],reservations:[],movements:[movement,{...movement,id:2,amount:-90000,functionName:"parser_ia"},{...movement,id:3,amount:-5000,functionName:"profile_synthesis"}],technicalCosts:{estimatedUsd:0.75,unknownEvents:2}};
// The approved visual reference is a deterministic fictional state, not a production account.
if(wallet){
 account.available=800461;account.currentPeriod="2026-10-01";account.nextPeriod="2026-11-01";account.cycleAnchor="2026-10-01";
 Object.assign(overview,{available:800461,consumedPeriod:384968,planning:{method:"prisma-token-planning-1.0.0",asOf,observedSince:"2026-08-01T03:00:00Z",timezone:"America/Sao_Paulo",renewalAt:"2026-11-01T03:00:00Z",windowStart7:"2026-10-07T03:00:00Z",windowStart30:"2026-09-14T03:00:00Z",dailyConsumption:Array.from({length:30},(_,i)=>({day:new Date(Date.UTC(2026,8,14+i)).toISOString().slice(0,10),tokens:i>=23?(i===29?41428:41424):0}))},lots:[
 {id:"month",organizationId:org,source:"monthly",name:"Franquia do mês",total:1000000,remaining:615032,available:615032,acquiredAt:"2026-10-01T03:00:00Z",expiresAt:"2026-11-01T03:00:00Z"},
 {id:"extra",organizationId:org,source:"additional",name:"Pacote Complemento",total:1000000,remaining:185429,available:185429,acquiredAt:"2026-09-20T12:00:00Z",expiresAt:"2026-10-20T12:00:00Z"}],movements:[
 {...movement,id:101,createdAt:"2026-10-14T03:00:00Z",amount:-14785,functionName:"parser_ia",quantity:1,operationId:"op-parser",sources:[{lotId:"month",source:"monthly",amount:14785,expiresAt:"2026-11-01T03:00:00Z"}]},
 {...movement,id:102,createdAt:"2026-10-14T03:00:00Z",amount:-11735,functionName:"position_assessment_items",quantity:5,operationId:"op-questions",sources:[{lotId:"month",source:"monthly",amount:11735,expiresAt:"2026-11-01T03:00:00Z"}]},
 {...movement,id:103,createdAt:"2026-10-13T18:00:00Z",amount:-6193,functionName:"profile_synthesis",quantity:1,operationId:"op-synthesis",sources:[{lotId:"month",source:"monthly",amount:6193,expiresAt:"2026-11-01T03:00:00Z"}]},
 {...movement,id:104,createdAt:"2026-10-10T18:00:00Z",amount:-147850,functionName:"parser_ia",quantity:10,sources:[{lotId:"month",source:"monthly",amount:147850,expiresAt:"2026-11-01T03:00:00Z"}]},
 {...movement,id:105,createdAt:"2026-10-11T18:00:00Z",amount:-117350,functionName:"position_assessment_items",quantity:50,sources:[{lotId:"month",source:"monthly",amount:117350,expiresAt:"2026-11-01T03:00:00Z"}]},
 {...movement,id:106,createdAt:"2026-10-12T18:00:00Z",amount:-18579,functionName:"profile_synthesis",quantity:3,sources:[{lotId:"month",source:"monthly",amount:18579,expiresAt:"2026-11-01T03:00:00Z"}]}]});
 overview.movements.push(
 {...movement,id:107,createdAt:"2026-10-02T18:00:00Z",amount:-44355,functionName:"parser_ia",quantity:3,operationId:"old-parser",sources:[{lotId:"month",source:"monthly",amount:44355,expiresAt:"2026-11-01T03:00:00Z"}]},
 {...movement,id:108,createdAt:"2026-10-03T18:00:00Z",amount:-11735,functionName:"position_assessment_items",quantity:5,operationId:"old-questions",sources:[{lotId:"month",source:"monthly",amount:11735,expiresAt:"2026-11-01T03:00:00Z"}]},
 {...movement,id:109,createdAt:"2026-10-04T18:00:00Z",amount:-12386,functionName:"profile_synthesis",quantity:2,operationId:"old-synthesis",sources:[{lotId:"month",source:"monthly",amount:12386,expiresAt:"2026-11-01T03:00:00Z"}]});
 overview.movements.sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));platform.movements=overview.movements;
 const companyB={...account,organizationId:"24000000-0000-4000-8000-000000000009",name:"Empresa Aurora",available:500000};
 platform.companies.push(companyB);
 if(!overview.manager){overview.movements=overview.movements.filter(m=>m.functionName==="parser_ia");Object.assign(overview,{planning:null});}
}
export const fixture={calls:[] as any[],fail:false,hold:false,overview,platform};
Object.assign(window,{__tokensFixture:fixture});
export const supabase={rpc(name:string,args:any){return {abortSignal:async()=>{
 fixture.calls.push({name,args});while(fixture.hold)await new Promise(r=>setTimeout(r,20));await new Promise(r=>setTimeout(r,60));
 if(fixture.fail)return {data:null,error:{message:"PT_ACCESS_DENIED"}};
 if(name==="ai_cost_history_v1")return {data:aiCostFixture(args),error:null};
 if(name!=="prisma_tokens")throw Error("Unexpected synthetic RPC");
 const action=args.p_action,d=args.p_data??{};
 if(action==="quote")return {error:null,data:{contract:"prisma-token-quote-1.0.0",organizationId:args.p_organization_id,id:crypto.randomUUID(),functionName:d.functionName,quantity:d.quantity,tokensPerUnit:rates.find(r=>r.functionName===d.functionName)?.tokensPerUnit??2000,amount:(rates.find(r=>r.functionName===d.functionName)?.tokensPerUnit??2000)*d.quantity,available:1000000,expiresAt:new Date(Date.now()+600000).toISOString()}};
 if(action==="overview")return {data:structuredClone({...overview,...(args.p_organization_id!==org?{organizationId:args.p_organization_id,account:{...account,organizationId:args.p_organization_id,name:"Empresa Aurora"},available:500000,lots:[{...overview.lots[0],available:500000,remaining:500000}],planning:null,movements:[]}:{}),...(!overview.manager?{packages:[],orders:[],planning:null}: {})}),error:null};
 if(action==="platform")return {data:structuredClone(platform),error:null};
 if(action==="request_package"){const p=packages.find(p=>p.id===d.packageId)!;if(!overview.orders.some(o=>o.id===d.operationId)){const o={id:d.operationId,organizationId:org,organizationName:account.name,packageName:p.name,tokens:p.tokens,priceCents:p.priceCents,validityDays:30,status:"requested",reason:null,createdAt:created,offerExpiresAt:"2026-10-17T03:00:00Z",releasedAt:null};overview.orders.push(o);platform.orders.push(o);}}
 if(action==="configure"){account.pendingMonthlyTokens=d.monthlyTokens;account.pendingCycleDay=d.cycleDay;account.active=d.active;}
 if(action==="save_package")packages.push({...d,id:crypto.randomUUID(),effectiveAt:d.effectiveAt??created,active:true});
 if(action==="order_status"){const o=platform.orders.find(o=>o.id===d.id);if(o)o.status=d.status;}
 return {data:{recorded:true},error:null};
 }};}};
