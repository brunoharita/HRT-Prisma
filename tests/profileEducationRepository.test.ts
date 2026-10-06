import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import * as classification from '../src/domain/educationClassification.js';
import {legacyReviewEntityIdFromValue} from '../web/src/domain/reviewFieldLifecycle.js';
import {buildPrismaProfileView} from '../web/src/domain/canonicalProfile.js';
import {profileHighlights} from '../web/src/domain/profileHighlights.js';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const {createProfileEducationTransport,educationRows}=await import(pathToFileURL(resolve('tests/fixtures/profileEducationPublished.mjs')).href);
const path='web/src/infrastructure/supabase/prismaRepository.ts';
const source=readFileSync(path,'utf8');
const ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const functions=ast.statements.filter(ts.isFunctionDeclaration).map(x=>x.getText(ast)).join('\n');
let method='';
function visit(node:ts.Node){if(ts.isMethodDeclaration(node)&&node.name.getText(ast)==='loadPersonProfile')method=node.getText(ast);ts.forEachChild(node,visit);}
visit(ast);assert.ok(method);
const dataPath='web/src/domain/prismaData.ts';
const dataAst=ts.createSourceFile(dataPath,readFileSync(dataPath,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const dataCode=dataAst.statements.filter(x=> ts.isClassDeclaration(x)&&x.name?.text==='DataAccessFailure'||ts.isFunctionDeclaration(x)&&x.name?.text==='isPersonLifecycle'||ts.isVariableStatement(x)&&x.declarationList.declarations.some(d=>d.name.getText(dataAst)==='PERSON_LIFECYCLES')).map(x=>x.getText(dataAst).replace(/^export /,'')).join('\n');
async function load(education:unknown[],baseline=false){
 const transport=createProfileEducationTransport('reviewed',education);
 const original=structuredClone(transport.profileRow);
 const code=`${dataCode}\n${baseline?functions.replace('...resolveEducationClassification({ ...record, ...candidate } as unknown as StructuredDraft["education"][number])','...resolveEducationClassification(candidate)'):functions}\nreturn {${method}};`;
 const js=ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const inputs={supabase:transport.client,legacyReviewEntityIdFromValue,...classification};
 const repository=new Function(...Object.keys(inputs),js)(...Object.values(inputs));
 const result=await repository.loadPersonProfile('synthetic-org','synthetic-person','member');
 assert.deepEqual(transport.profileRow,original,'reads must not mutate stored rows');
 assert.equal(transport.calls.length,7,'no additional reads or mutations');
 const view=buildPrismaProfileView({fullName:result.person.fullName,profile:result.profile,version:{profileId:result.profile.id,number:result.profile.profileVersion,publishedAt:result.profile.approvedAt,current:true}});
 return {result,view,card:profileHighlights(view,new Date(2026,9,6)).find(x=>x.id==='education')!};
}
test('actual repository → decoder → canonical view preserves reviewed MBA and specialization, and baseline reproduces missing card',async()=>{
 const rows=educationRows();const old=await load(rows,true);assert.equal(old.card.values.length,0);
 const {result,view,card}=await load(rows);assert.equal(card.headline,'MBA · Especialização');assert.equal(card.values.length,2);
 for(const [i,entry] of result.profile.education.entries())for(const key of ['classificationReviewed','classificationSources','classificationReasons','classificationMethodVersion','classifierSnapshot','originalText'])assert.deepEqual(entry[key],rows[i][key]);
 assert.equal(view.identity.fullName,'Marina Costa');assert.equal(view.identity.location,'São Paulo, SP');assert.equal(view.experiences.length,2);assert.equal(view.version?.number,3);assert.equal(view.about?.summary,'Resumo publicado preservado.');
});
test('explicit completion needs no extra confirmation; inference and string true cannot fabricate completion',async()=>{
 assert.equal((await load(educationRows('explicit'))).card.headline,'MBA · Especialização');
 for(const mode of ['inferred','invalid'])assert.equal((await load(educationRows(mode))).card.values.length,0);
 const rows=educationRows('inferred').map((x:object)=>({...x,classificationReviewed:true}));assert.equal((await load(rows)).card.values.length,2);
});
test('legacy, malformed metadata and in-progress entries remain unavailable; unknown qualification stays generic',async()=>{
 for(const patch of [{status:'in_progress'},{status:'unknown'},{level:'unknown'},{classificationSources:{level:'invalid',status:'invalid',qualification:'invalid'},classificationReviewed:false,classifierSnapshot:{level:'invalid'}}])assert.equal((await load(educationRows('inferred').map((x:object)=>({...x,...patch})))).card.values.length,0);
 assert.equal((await load([{id:'legacy',course:'MBA antigo',period:'2019 - 2020'}])).card.values.length,0);
 assert.equal((await load(educationRows().map((x:object)=>({...x,qualification:'unknown'})))).card.headline,'Pós-graduação');
 const malformed=await load(educationRows('inferred').map((x:object)=>({...x,classifierSnapshot:{level:'invalid'},classificationReasons:'not a list'})));assert.equal(malformed.result.profile.education[0].classifierSnapshot,undefined);assert.ok(Array.isArray(malformed.result.profile.education[0].classificationReasons));
});
