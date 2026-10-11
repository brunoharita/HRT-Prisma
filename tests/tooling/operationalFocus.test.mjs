import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import ts from 'typescript';
import {evaluateRouteAccess} from '../../dist/web/src/shared/access.js';
const source=readFileSync('web/src/app/PrismaApplication.tsx','utf8'),ast=ts.createSourceFile('app.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const routeArray=ast.statements.flatMap(n=>ts.isVariableStatement(n)?n.declarationList.declarations:[]).find(n=>n.name.getText(ast)==='routes').initializer;
const knowledge=routeArray.elements.find(n=>n.properties.some(p=>p.name?.getText(ast)==='path'&&p.initializer?.getText(ast)==='"/knowledge"'));
const ruleSource=knowledge.properties.find(p=>p.name.getText(ast)==='rule').initializer.getText(ast);
const rule=new Function('return ('+ruleSource+');')();
const functions=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&['findRoute','normalizePath'].includes(n.name?.text)).map(n=>n.getText(ast)).join('\n');
const findRoute=new Function('routes',ts.transpileModule(functions,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+';return findRoute;')([{path:'/knowledge',rule}]);
test('legacy settings binds delivered Knowledge authority and keeps structure render',()=>{
 const route=findRoute('/settings');assert.equal(route.path,'/settings');assert.equal(route.rule,rule);
 for(const role of ['member','recruiter','owner','admin','super_admin']){
  const result=evaluateRouteAccess({isAuthenticated:true,activeOrganizationId:'a',memberships:[{organizationId:'a',organizationName:'A',groupId:null,groupName:null,role}]},route.rule);
  assert.equal(result.allowed,['owner','admin','super_admin'].includes(role));
 }
 assert.equal(evaluateRouteAccess({isAuthenticated:false,activeOrganizationId:null,memberships:[]},route.rule).allowed,false);
 assert.match(source,/route.path === "\/settings"[\s\S]*?return <SettingsPage/);
 assert.ok(!routeArray.elements.some(n=>n.properties.some(p=>p.name?.getText(ast)==='path'&&p.initializer?.getText(ast)==='"/settings"')));
});
test('operational reorganization has no changed service/domain/tenant writers',()=>{
 const home=readFileSync('web/src/pages/HomePage.tsx','utf8');assert.ok(!home.includes('checkKnowledgeSource'));assert.ok(!home.includes('recordEvaluation'));
 const monitor=readFileSync('web/src/components/KnowledgeSourceMonitor.tsx','utf8');assert.ok(monitor.includes('generation.current!==current'));assert.ok(!monitor.includes('publishKnowledge'));
});
