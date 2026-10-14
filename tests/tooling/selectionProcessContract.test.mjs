import test from"node:test";import assert from"node:assert/strict";import{readFileSync}from"node:fs";import ts from"typescript";
const source=readFileSync("web/src/infrastructure/supabase/selectionProcessService.ts","utf8").split("\n").filter(l=>!l.startsWith("import ")).join("\n").replace("export const selectionProcessService","const selectionProcessService");
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const service=data=>new Function("supabase","SELECTION_PROCESS_CONTRACT",compiled+";return selectionProcessService;")({rpc:async()=>({data,error:null})},"selection-process-management-1.0.0");
const process={organizationId:"a",id:"p",vacancyId:"v",status:"active",candidates:0,stages:{}};
const envelope={contract:"selection-process-management-1.0.0",organizationId:"a",processes:[process],selected:process,total:1,pageSize:50,counts:{active:1,closed:0}};
test("operator decoder rejects unknown contracts rather than inventing an empty workspace",async()=>{await assert.rejects(service({...envelope,contract:"unknown"}).load("a"),/incompatível/);await assert.rejects(service(null).load("a"),/incompatível/);});
test("workspace and selected records must match requested tenant",async()=>{await assert.rejects(service({...envelope,organizationId:"b"}).load("a"),/incompatível/);await assert.rejects(service({...envelope,selected:{...process,organizationId:"b"}}).load("a"),/incompatível/);await assert.rejects(service({...envelope,processes:[{...process,organizationId:"b"}]}).load("a"),/incompatível/);});
test("unknown lifecycle and unscoped eligible positions fail closed",async()=>{await assert.rejects(service({...envelope,selected:{...process,status:"paused"}}).load("a"),/incompatível/);await assert.rejects(service({...envelope,positions:[{organizationId:"b",id:"v",title:"Position"}]}).positions("a"),/incompatível/);});
test("valid empty process remains empty and readable",async()=>{const d=await service(envelope).load("a");assert.equal(d.selected.id,"p");assert.equal(d.selected.candidates,0);assert.deepEqual(d.selected.stages,{});});
test("creation and reopen guards expose a safe actionable message",async()=>{
 const raw=readFileSync("web/src/infrastructure/supabase/positionFollowUpService.ts","utf8").split("\n").filter(l=>!l.startsWith("import ")).join("\n").replace("export const positionFollowUpService","const positionFollowUpService");
 const js=ts.transpileModule(raw,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 for(const message of ["SELECTION_POSITION_OCCUPIED","SELECTION_ACTIVE_PROCESS_EXISTS"]){
  const s=new Function("supabase",js+";return positionFollowUpService;")({rpc:async()=>({data:null,error:{code:"22023",message}})});
  await assert.rejects(s.start("a","v",null,null,"request"),e=>!e.message.includes("SELECTION_")&&(e.message.includes("desocupada")||e.message.includes("processo em andamento")));
 }
});
