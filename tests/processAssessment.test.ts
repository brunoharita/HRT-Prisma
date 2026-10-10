import test from 'node:test';
import assert from 'node:assert/strict';
import {assembleProcessAssessment,processAssessmentDeficit,splitGenerationParts} from '../src/domain/processAssessment.js';
import {createDistributionSnapshot,type ContextualAssessmentQuestion} from '../src/domain/positionAssessment.js';
const requirements=[{id:'api',competencyKey:'api'},{id:'db',competencyKey:'db'}];
function q(id:string,req='api',difficulty:ContextualAssessmentQuestion['difficulty']='easy'):ContextualAssessmentQuestion{return {organizationId:'org',id,version:'1',requirementId:req,competencyKey:req,difficulty,language:'pt-BR',stem:'Pergunta',options:['A','B','C','D','E'].map(id=>({id,label:id})),correctOptionId:'A',explanation:'Justificativa',source:'bank',review:'pending',provenance:{method:'approved-item-bank',version:'1',authorId:'human'}};}
test('maximum matching resolves shared item without greedy coverage loss or duplicates',()=>{
 const bank=[q('a'),q('a','db'),q('b'),...Array.from({length:8},(_,n)=>q(`q${n}`,'api',n<2?'easy':n<6?'medium':'hard'))];
 const selected=assembleProcessAssessment(bank,requirements,createDistributionSnapshot(10,2),'org');
 assert.equal(selected.length,10);assert.equal(new Set(selected.map(q=>q.id)).size,10);assert.equal(selected.find(q=>q.id==='a')?.requirementId,'db');assert.deepEqual(processAssessmentDeficit(createDistributionSnapshot(10,2),requirements,selected),[]);
});
test('bank abundance cannot replace missing requirement; AI deficit reserves coverage',()=>{
 const bank=Array.from({length:20},(_,n)=>q(`q${n}`,'api',n<8?'easy':n<16?'medium':'hard'));
 const selected=assembleProcessAssessment(bank,requirements,createDistributionSnapshot(20,2),'org');assert.equal(selected.length,19);
 const deficit=processAssessmentDeficit(createDistributionSnapshot(20,2),requirements,selected);assert.equal(deficit[0]!.requirementId,'db');assert.equal(deficit[0]!.quantity,1);
});
test('tenant/provenance/source mismatch is excluded, quantities exact and batches bounded',()=>{
 const selected=assembleProcessAssessment([{...q('foreign'),organizationId:'other'},{...q('ai'),source:'ai'},{...q('edited'),provenance:{method:'human-edited-bank',version:'1',authorId:'human'}},q('ok')],requirements,createDistributionSnapshot(20,2),'org');assert.equal(selected.length,1);
 const parts=processAssessmentDeficit(createDistributionSnapshot(50,2),requirements,[]),chunks=splitGenerationParts(parts);
 assert.deepEqual(chunks.map(c=>c.reduce((s,p)=>s+p.quantity,0)),[20,20,10]);assert.equal(parts.reduce((s,p)=>s+p.quantity,0),50);
});
test('retrying assembly preserves reviewed draft and fills newly available bank slots',()=>{
 const saved=[{...q('saved'),stem:'Human edited draft',provenance:{method:'human-edited-bank',version:'1',authorId:'human'}}];
 const bank=Array.from({length:20},(_,n)=>q(`q${n}`,n%2?'db':'api',n<8?'easy':n<16?'medium':'hard'));
 const selected=assembleProcessAssessment(bank,requirements,createDistributionSnapshot(20,2),'org',saved);assert.equal(selected.length,20);assert.deepEqual(selected[0],saved[0]);assert.equal(processAssessmentDeficit(createDistributionSnapshot(20,2),requirements,selected).length,0);
});
