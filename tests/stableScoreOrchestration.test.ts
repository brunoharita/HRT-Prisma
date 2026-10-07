import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {restoreStableMatch} from "../web/src/domain/stableMatching.js";
const source=readFileSync("web/src/infrastructure/supabase/vacancyService.ts","utf8"),ast=ts.createSourceFile("service.ts",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const helper=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==="loadStableCandidates");assert.ok(helper);
const compiled=ts.transpileModule(helper.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const vacancy={organizationId:"org",versionId:"v1"},candidates=[1,2,3].map(n=>({personId:`person${n}`,profileId:`profile${n}`,fullName:`Synthetic ${n}`}));
const saved=(profileId:string)=>({state:"current",evaluationId:"40000000-0000-0000-0000-000000000001",calculatedAt:"2026-10-01",match:{score:{score:55,referenceDate:"2026-10-01",profileVersion:profileId,positionVersion:"v1"},requirements:[],discoveryGroup:"main_area"}});
function orchestration(invoke:unknown){return new Function("supabase","restoreStableMatch","isSemanticDiscoveryEligible","supabaseFunctionOperationError",`${compiled}; return loadStableCandidates;`)(
 {functions:{invoke}},restoreStableMatch,()=>true,async()=>Error("synthetic transport failure"));}
test("actual batch restores saved results in candidate order with bounded concurrency and scoped force",async()=>{
 const calls:Record<string,unknown>[]= [];let active=0,maximum=0;
 const load=orchestration(async(_name:string,{body}:{body:Record<string,string>})=>{calls.push(body);active++;maximum=Math.max(maximum,active);await new Promise(r=>setTimeout(r,5));active--;return {data:saved(body.profileId!),error:null};});
 const result=await load(vacancy,candidates,false);
 assert.deepEqual(result.map((m:{candidate:{personId:string}})=>m.candidate.personId),candidates.map(c=>c.personId));
 assert.equal(maximum,2);assert.ok(calls.every(c=>c.operation==="stable_load"));
 calls.length=0;await load(vacancy,[candidates[0]],true);assert.equal(calls.length,1);assert.equal(calls[0]?.operation,"recalculate");
});
test("one unavailable person never replaces or hides another person's saved score",async()=>{
 const load=orchestration(async(_name:string,{body}:{body:Record<string,string>})=>body.profileId==="profile1"?{data:null,error:Error("offline")}:{data:saved(body.profileId!),error:null});
 const unavailable:string[]=[];const result=await load(vacancy,candidates,false,undefined,undefined,undefined,(c:{personId:string})=>unavailable.push(c.personId));
 assert.deepEqual(unavailable,["person1"]);assert.equal(result.length,2);assert.equal(result[0].score.score,55);
 await assert.rejects(load(vacancy,[candidates[0]],false),/transport failure/);
});
test("snapshot action reconfirms same saved identity; changed sources cannot authorize old score",async()=>{
 const variable=ast.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>ts.isIdentifier(d.name)&&d.name.text==="vacancyService"));assert.ok(variable&&ts.isVariableStatement(variable));
 const object=variable.declarationList.declarations[0]?.initializer;assert.ok(object&&ts.isObjectLiteralExpression(object));
 const method=object.properties.find(n=>ts.isMethodDeclaration(n)&&n.name.getText(ast)==="recordEvaluation");assert.ok(method);
 const code=ts.transpileModule(`const service={${method.getText(ast)}};`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const value=saved("profile1"),match={...value.match,candidate:candidates[0],stableResult:{state:"current",evaluationId:value.evaluationId}};
 for(const changed of [false,true]){let calls=0;const record=new Function("supabase",`${code};return service.recordEvaluation;`)({functions:{invoke:async()=>{calls++;return {data:{...value,evaluationId:changed?"different":value.evaluationId},error:null};}}});
  if(changed)await assert.rejects(record(vacancy,match),/fontes/);else assert.equal(await record(vacancy,match),value.evaluationId);assert.equal(calls,1);
 }
});
