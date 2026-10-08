import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import ts from 'typescript';
import {evaluateRouteAccess} from '../../dist/web/src/shared/access.js';
const source=readFileSync('web/src/app/PrismaApplication.tsx','utf8'),ast=ts.createSourceFile('app.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const functions=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&['findRoute','normalizePath'].includes(n.name?.text)).map(n=>n.getText(ast)).join('\n');
const findRoute=new Function('routes',ts.transpileModule(functions,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+';return findRoute;')([]);
test('board/detail/history preserve Position authority and identity',()=>{
 for(const path of ['/vacancies/p1/follow-up','/vacancies/p1/follow-up/person1','/vacancies/p1/history']){
  const route=findRoute(path);assert.equal(route.path,'/vacancies');assert.equal(route.vacancyId,'p1');
  for(const role of ['member','recruiter','admin','owner','super_admin']){const outcome=evaluateRouteAccess({isAuthenticated:true,activeOrganizationId:'a',memberships:[{organizationId:'a',organizationName:'A',groupId:null,groupName:null,role}]},route.rule);assert.equal(outcome.allowed,role!=='member');}
  assert.equal(evaluateRouteAccess({isAuthenticated:false,activeOrganizationId:null,memberships:[]},route.rule).allowed,false);
 }
 assert.equal(findRoute('/vacancies/p1/follow-up/person1').vacancyFollowUpPersonId,'person1');
});
test('follow-up transport uses only reviewed operational RPCs, never calculation',()=>{
 const service=readFileSync('web/src/infrastructure/supabase/positionFollowUpService.ts','utf8');
 assert.ok(!service.includes('functions.invoke'));assert.ok(!service.includes('recordEvaluation'));assert.ok(!service.includes('loadPeopleByIds'));
 assert.ok(service.includes('position-follow-up-1.0.0'));
});
