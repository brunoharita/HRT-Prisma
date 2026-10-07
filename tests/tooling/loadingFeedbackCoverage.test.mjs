import assert from "node:assert/strict";
import test from "node:test";
import {readdir,readFile} from "node:fs/promises";
import ts from "typescript";

test("every page declares loading feedback; synchronous assisted description has no artificial wait", async()=>{
 const audited=[];
 for(const file of await readdir("web/src/pages")){
  if(!file.endsWith(".tsx"))continue;
  const source=await readFile(`web/src/pages/${file}`,"utf8"),tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  for(const n of tree.statements){if(!ts.isFunctionDeclaration(n)||!n.name?.text.endsWith("Page")||!n.body)continue;
   const name=n.name.text,body=n.body.getText(tree);
   if(name==="VacancyAssistPage"){assert.doesNotMatch(body,/\bawait\b|\.then\(/);continue;}
   assert.match(body,/useLoadingFeedback\(|useLoadingTask\(/,`${name} must register visible pending operations`);audited.push(name);
  }
 }
 assert.ok(audited.length>=29,"page inventory unexpectedly incomplete");
});

test("loading companion has no network, polling, score recalculation or pointer blocking",async()=>{
 const hook=await readFile("web/src/ui/PrismaLoadingFeedback.tsx","utf8");
 assert.doesNotMatch(hook,/fetch\(|supabase|setInterval\(|recalculate|recordEvaluation/);
 assert.match(hook,/aria-live="polite"/);assert.match(hook,/aria-busy=/);
 const css=await readFile("web/src/ui/foundation.css","utf8");
 assert.match(css,/\.prisma-loading-feedback \{[^}]*pointer-events: none/);
 const owner=await readFile("docs/product/ux-foundation.md","utf8");assert.match(owner,/Diretriz permanente de carregamento visível/);
});
