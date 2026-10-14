import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";import ts from "typescript";
import {evaluateRouteAccess} from "../../dist/web/src/shared/access.js";
import {operatorHistoryPath} from "../../dist/web/src/shared/navigationHistory.js";
const s=readFileSync("web/src/app/PrismaApplication.tsx","utf8"),a=ts.createSourceFile("app.tsx",s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const f=a.statements.filter(n=>ts.isFunctionDeclaration(n)&&["findRoute","normalizePath"].includes(n.name?.text)).map(n=>n.getText(a)).join("\n");
const route=new Function("routes",ts.transpileModule(f,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+";return findRoute;")([]);
test("dedicated list, selected process and Position history share reviewer authority",()=>{
 for(const path of ["/selection-processes","/selection-processes/process1","/selection-processes/position/position1"]){
  const r=route(path);assert.equal(r.path,"/selection-processes");
  for(const role of ["member","recruiter","admin","owner","super_admin"]){assert.equal(evaluateRouteAccess({isAuthenticated:true,activeOrganizationId:"a",memberships:[{organizationId:"a",organizationName:"A",groupId:null,groupName:null,role}]},r.rule).allowed,role!=="member");}
  assert.equal(evaluateRouteAccess({isAuthenticated:false,activeOrganizationId:null,memberships:[]},r.rule).allowed,false);
  assert.equal(evaluateRouteAccess({isAuthenticated:true,activeOrganizationId:"b",memberships:[]},r.rule).allowed,false);
 }
 assert.equal(route("/selection-processes/process1").selectionProcessId,"process1");assert.equal(route("/selection-processes/position/position1").vacancyId,"position1");
});
test("dedicated origins participate in scoped back navigation",()=>{assert.equal(operatorHistoryPath("/selection-processes/process1"),"/selection-processes/process1");assert.equal(operatorHistoryPath("/selection-processes?token=x"),null);});
test("legacy process and proof URLs retain explicit identity",()=>{const r=route("/vacancies/v/follow-up/processes/p/assessment");assert.equal(r.selectionProcessId,"p");assert.equal(r.processAssessment,true);});
