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
