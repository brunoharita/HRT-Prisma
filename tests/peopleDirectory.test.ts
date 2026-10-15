import assert from "node:assert/strict";
import test from "node:test";
import { directoryEntries, matchesDirectory, directorySearch, type DirectoryEntry } from "../web/src/domain/peopleDirectory.js";
import { readDirectoryAnswer, safeDirectoryInput } from "../src/knowledge/peopleDirectory.js";
const concept = (id:string) => ({id,label:id,version:1,method:"ai_grouping" as const});
const entry = (index:number,period:string,area:string,role:string): DirectoryEntry => ({personId:"person",profileId:"approved",profileVersion:2,experienceIndex:index,
  originalRole:role,organization:"Empresa",period,status:"complete",methodVersion:"people-directory-1.0.0",globalVersion:1,organizationVersion:0,areas:[concept(area)],function:concept(role)});
const today = new Date(2026,9,15);
test("directory: all current jobs, latest closed ties, trajectory and unknown dates",()=>{
  const old=entry(0,"Jan/2020 - Dez/2022","RH","Analista"), current=entry(1,"Jan/2023 - Atual","TI","Gerente"), other=entry(2,"Jan/2024 - Atual","Operações","Diretor");
  assert.deepEqual(directoryEntries([old,current,other],"recent",today).entries,[current,other]);
  assert.deepEqual(directoryEntries([old,entry(3,"Jan/2021 - Dez/2022","TI","Analista")],"recent",today).entries.length,2);
  assert.equal(directoryEntries([old,current],"trajectory",today).entries.length,2);
  assert.equal(directoryEntries([old,entry(4,"2023 - 2026","TI","Gerente")],"recent",today).chronologyKnown,false);
  assert.equal(directoryEntries([entry(1,"Jan/2027 - Atual","TI","Gerente")],"recent",today).entries.length,0);
  assert.equal(directoryEntries(null,"recent",today).entries.length,0);
});
test("directory: area and function must belong to the same experience",()=>{
  const entries=[entry(0,"Jan/2020 - Dez/2022","RH","Analista"),entry(1,"Jan/2023 - Atual","TI","Gerente")];
  assert.equal(entries.some(e=>matchesDirectory(e,"RH","Gerente")),false);
  assert.equal(entries.some(e=>matchesDirectory(e,"TI","Gerente")),true);
  assert.equal(directoryEntries(entries,"recent",today).entries.some(e=>matchesDirectory(e,"RH","")),false);
  assert.match(directorySearch(entries),/Empresa/);assert.match(directorySearch(entries),/Analista/);
});
test("closed AI: only candidate IDs with matching type, ambiguity is empty, no contact",()=>{
  const candidates=[{id:"a",label:"TI",kind:"area" as const,version:1},{id:"f",label:"Gerente",kind:"function" as const,version:1}];
  assert.deepEqual(readDirectoryAnswer({areaIds:["a"],functionId:"f"},candidates),{areaIds:["a"],functionId:"f"});
  assert.deepEqual(readDirectoryAnswer({areaIds:[],functionId:null},candidates),{areaIds:[],functionId:null});
  for(const value of [{areaIds:["invented"],functionId:null},{areaIds:["f"],functionId:null},{areaIds:["a","a"],functionId:null},{areaIds:[],functionId:"a"}]) assert.throws(()=>readDirectoryAnswer(value,candidates));
  assert.equal(safeDirectoryInput({role:"Gerente de TI",context:"Gestão de infraestrutura",areas:[]}),true);
  for(const context of ["bruno@example.invalid","https://example.invalid","+55 14 99999-1234","x".repeat(1401)]) assert.equal(safeDirectoryInput({role:"Gerente",context,areas:[]}),false);
});
