import test from 'node:test';import assert from 'node:assert/strict';import {createServer} from 'vite';
test('calendar wallet planning: full windows, expiry priority, renewal, reservations and uncertainty',async()=>{
 const vite=await createServer({configFile:'web/vite.config.ts',server:{middlewareMode:true,watch:null},logLevel:'silent'});
 try{const {calculateTokenPlanning:plan,tokenAssessmentPath:path}=await vite.ssrLoadModule('/src/domain/prismaTokens.ts');
 const data=()=>({account:{active:true},lots:[{id:'m',source:'monthly',available:615032,expiresAt:'2026-11-01T03:00:00Z'},{id:'p',source:'additional',available:185429,expiresAt:'2026-10-20T12:00:00Z'}],planning:{method:'prisma-token-planning-1.0.0',asOf:'2026-10-14T03:00:00Z',observedSince:'2026-08-01T03:00:00Z',timezone:'America/Sao_Paulo',renewalAt:'2026-11-01T03:00:00Z',windowStart7:'2026-10-07T03:00:00Z',windowStart30:'2026-09-14T03:00:00Z',dailyConsumption:Array.from({length:30},(_,i)=>({day:new Date(Date.UTC(2026,8,14+i)).toISOString().slice(0,10),tokens:i>=23?(i===29?41428:41424):0}))}});
 let v=data(),r=plan(v);assert.equal(r.status,'estimated');assert.equal(Math.round(r.average),41425);assert.equal(r.dailyReference,34168);assert.equal(r.exhaustedAt.slice(0,10),'2026-10-28');assert.equal(r.sufficientUntilRenewal,false);
 // Ignoring package expiry would place exhaustion in November; the package expires before use.
 assert.ok(Date.parse(r.exhaustedAt)<Date.parse(v.planning.renewalAt));assert.equal(v.lots[0].available,615032,'projection never mutates the wallet');
 v=data();v.lots.reverse();assert.equal(plan(v).exhaustedAt,r.exhaustedAt,'monthly priority independent of input order');
 v=data();v.lots[1].expiresAt='2026-12-01T03:00:00Z';assert.equal(plan(v).sufficientUntilRenewal,true,'valid additional lasts to renewal');
 v=data();v.lots[0].available=1000;v.lots[1].available=1000;v.lots[1].expiresAt='2026-10-14T03:10:00Z';assert.ok(Date.parse(plan(v).exhaustedAt)<Date.parse(v.planning.asOf)+86400000,'early unused package is removed at its event');
 v=data();v.lots[0].available=0;v.lots[1].available=1000;assert.equal(plan(v).dailyReference,0);assert.ok(plan(v).exhaustedAt,'additional only supported');
 v=data();v.lots=[];assert.equal(Date.parse(plan(v).exhaustedAt),Date.parse(v.planning.asOf),'empty available wallet exhausts now');
 v=data();v.planning.observedSince='2026-10-08T03:00:00Z';assert.equal(plan(v).status,'insufficient_history');assert.equal(plan(v).average,null);
 v=data();v.planning.dailyConsumption.forEach(d=>d.tokens=0);assert.equal(plan(v).status,'no_recent_use');assert.equal(plan(v).exhaustedAt,null);
 v=data();v.planning.dailyConsumption[29].tokens=700;v.planning.dailyConsumption.slice(23,29).forEach(d=>d.tokens=0);assert.equal(plan(v).average,100,'zero-use days remain in denominator');
 v=data();assert.equal(Math.round(plan(v,30).average),9666,'30day window independent of current month');
 v=data();v.planning.observedSince='2026-09-20T03:00:00Z';assert.equal(plan(v,30).status,'insufficient_history');assert.equal(plan(v,7).status,'estimated');
 v=data();v.account.active=false;assert.equal(plan(v).status,'suspended');
 v=data();v.planning=null;assert.equal(plan(v).status,'unavailable');
 v=data();v.planning.dailyConsumption.pop();assert.equal(plan(v).status,'unavailable','missing yesterday never treated as zero');
 v=data();v.planning.dailyConsumption[29].tokens=-1;assert.equal(plan(v).status,'unavailable');
 v=data();v.lots[0].available=NaN;assert.equal(plan(v).status,'unavailable');
 v=data();v.planning.renewalAt=v.planning.asOf;assert.equal(plan(v).status,'unavailable','stale cycle cannot generate false forecast');
 v=data();v.lots[0].available=18*41424.57142857143;v.lots[0].available=Math.ceil(v.lots[0].available);assert.equal(plan(v).sufficientUntilRenewal,true);
 // A pending reservation has already reduced available; projection must not count remaining/total.
 v=data();v.lots[0].remaining=1000000;v.lots[0].total=1000000;v.lots[0].available=100;assert.equal(plan(v).dailyReference,5);
 assert.equal(path({vacancyId:'v',processId:'historical',personId:null}),'/vacancies/v/follow-up/processes/historical/assessment');
 assert.equal(path({vacancyId:'v',processId:null,personId:'p'}),'/vacancies/v/follow-up/p/assessment');
 assert.equal(path({vacancyId:'v',processId:null,personId:null}),null,'never link missing historical context to current process');
 const originalTz=process.env.TZ;process.env.TZ='Asia/Tokyo';assert.equal(plan(data()).exhaustedAt.slice(0,10),'2026-10-28');if(originalTz===undefined)delete process.env.TZ;else process.env.TZ=originalTz;
 }finally{await vite.close();}
});
