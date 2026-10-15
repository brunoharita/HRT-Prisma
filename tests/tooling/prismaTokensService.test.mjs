import test from 'node:test';import assert from 'node:assert/strict';import {createServer} from 'vite';
test('quotes share concurrent preview, publish refresh, bind confirmed version and reject expired or foreign scope',async()=>{
 process.env.VITE_SUPABASE_URL='https://fixture.supabase.co';process.env.VITE_SUPABASE_PUBLISHABLE_KEY='public-fixture';
 const vite=await createServer({configFile:'web/vite.config.ts',server:{middlewareMode:true,watch:null},logLevel:'silent'});let amount=10000,calls=0;
 try{const {supabase}=await vite.ssrLoadModule('/src/infrastructure/supabase/client.ts');supabase.rpc=(_name,args)=>({abortSignal:async()=>{calls++;await new Promise(r=>setTimeout(r,5));return {error:null,data:{contract:'prisma-token-quote-1.0.0',organizationId:args.p_organization_id,id:crypto.randomUUID(),functionName:args.p_data.functionName,quantity:args.p_data.quantity,tokensPerUnit:amount,amount,available:1000000,expiresAt:new Date(Date.now()+600000).toISOString()}};}});
 const s=await vite.ssrLoadModule('/src/infrastructure/supabase/prismaTokensService.ts'),updates=[],org='24000000-0000-4000-8000-000000000099';const stop=s.subscribeTokenQuote(org,'parser_ia',1,q=>updates.push(q));
 const [a,b]=await Promise.all([s.getTokenQuote(org,'parser_ia',1),s.getTokenQuote(org,'parser_ia',1)]);assert.equal(a.id,b.id);assert.equal(calls,1);
 amount=20000;const next=await s.getTokenQuote(org,'parser_ia',1,true);assert.equal(updates.at(-1).id,next.id);assert.equal(next.amount,20000);assert.equal((await s.takeTokenQuote(org,'parser_ia',1,a)).id,a.id);assert.equal((await s.takeTokenQuote(org,'parser_ia',1)).id,next.id);
 await assert.rejects(s.takeTokenQuote(org,'parser_ia',1));await assert.rejects(s.takeTokenQuote('foreign','parser_ia',1,a));await assert.rejects(s.takeTokenQuote(org,'profile_synthesis',1,a));await assert.rejects(s.takeTokenQuote(org,'parser_ia',1,{...a,expiresAt:'2000-01-01T00:00:00Z'}));stop();
 }finally{await vite.close();}
});
test('real snake-case planning payload decodes numeric window suffixes before projection',async()=>{
 process.env.VITE_SUPABASE_URL='https://fixture.supabase.co';process.env.VITE_SUPABASE_PUBLISHABLE_KEY='public-fixture';
 const vite=await createServer({configFile:'web/vite.config.ts',server:{middlewareMode:true,watch:null},logLevel:'silent'});
 try{const org='24000000-0000-4000-8000-000000000099';
 const {supabase}=await vite.ssrLoadModule('/src/infrastructure/supabase/client.ts');
 const payload={contract:'prisma-tokens-2.0.0',organizationId:org,manager:true,account:{organization_id:org,policy_version:'prisma-token-policy-2.0.0',active:true},available:615032,movements:[],reservations:[],rates:[],lots:[{id:'monthly',source:'monthly',total:1000000,remaining:615032,available:615032,expires_at:'2026-11-01T03:00:00Z'}],planning:{method:'prisma-token-planning-1.0.0',as_of:'2026-10-14T03:00:00Z',observed_since:'2026-10-11T11:14:00Z',timezone:'America/Sao_Paulo',renewal_at:'2026-11-01T03:00:00Z',window_start_7:'2026-10-07T03:00:00Z',window_start_30:'2026-09-14T03:00:00Z',daily_consumption:Array.from({length:30},(_,i)=>({day:new Date(Date.UTC(2026,8,14+i)).toISOString().slice(0,10),tokens:30000}))}};
 supabase.rpc=()=>({abortSignal:async()=>({data:payload,error:null})});
 const {prismaTokensService}=await vite.ssrLoadModule('/src/infrastructure/supabase/prismaTokensService.ts');const {calculateTokenPlanning}=await vite.ssrLoadModule('/src/domain/prismaTokens.ts');
 let v=await prismaTokensService.overview(org);assert.equal(v.planning.windowStart7,'2026-10-07T03:00:00Z');assert.equal(v.planning.windowStart30,'2026-09-14T03:00:00Z');
 assert.equal(calculateTokenPlanning(v).status,'insufficient_history');assert.equal(calculateTokenPlanning(v).dailyReference,34168);
 payload.planning.observed_since='2026-08-01T03:00:00Z';v=await prismaTokensService.overview(org);assert.equal(calculateTokenPlanning(v).status,'estimated');assert.equal(calculateTokenPlanning(v).average,30000);
 assert.equal(calculateTokenPlanning(v,30).status,'estimated');
 }finally{await vite.close();}
});
