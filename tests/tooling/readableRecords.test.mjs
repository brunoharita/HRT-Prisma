import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
test('tracked UI does not render serialized JSON as JSX content or a string attribute',()=>{
 const files=execFileSync('git',['ls-files','web/src'],{encoding:'utf8'}).trim().split('\n').filter(path=>path.endsWith('.tsx'));
 const violations=[];
 for(const path of files){const source=ts.createSourceFile(path,readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  function serialized(node){if(ts.isArrowFunction(node)||ts.isFunctionExpression(node))return false;if(ts.isCallExpression(node)&&node.expression.getText(source)==='JSON.stringify')return true;return ts.forEachChild(node,serialized)??false;}
  function visit(node){if(ts.isJsxExpression(node)&&node.expression&&ts.isCallExpression(node.expression)&&serialized(node.expression))violations.push(path+':'+source.getLineAndCharacterOfPosition(node.pos).line);ts.forEachChild(node,visit);}visit(source);
 }
 assert.deepEqual(violations,[]);
});
test('all discovered record surfaces use a readable record and profile history is complete',()=>{
 for(const path of ['components/PositionTaxonomyPanel.tsx','components/FollowUpHistory.tsx','pages/CompetencyVerificationPage.tsx','pages/ProfileDeltaPage.tsx','components/review/StructuredReviewPanel.tsx']){
  const source=readFileSync('web/src/'+path,'utf8');assert.match(source,/<ReadableRecord value=/);assert.doesNotMatch(source,/<pre[^>]*>\s*\{JSON\.stringify/);
 }
 const review=readFileSync('web/src/components/review/StructuredReviewPanel.tsx','utf8');assert.doesNotMatch(review,/formatHistoryValue|rendered\.slice\(0, 177\)/);
 const original=readFileSync('web/src/pages/PersonWorkspacePage.tsx','utf8');assert.match(original,/<pre>\{currentPage\?\.text\}<\/pre>/);
});
