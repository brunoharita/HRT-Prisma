import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdir,writeFile} from "node:fs/promises";
import {createServer} from "vite";
const dir="docs/qa/evidence/knowledge-decisions-v281",checks=[];
await mkdir(dir,{recursive:true});
const check=(name,pass)=>{checks.push({name,pass:Boolean(pass)});assert.ok(pass,name);};
const server=await createServer({configFile:"tests/ui/visual-foundation.vite.config.mts",cacheDir:"tmp/vite-knowledge-decisions",server:{port:5831}});await server.listen();
const {chromium}=createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH??"playwright");
const browser=await chromium.launch({headless:true,channel:"msedge"});
try{
 for(const width of [1448,390,320]){
  const p=await browser.newPage({viewport:{width,height:1000},reducedMotion:"reduce"}),errors=[];p.on("pageerror",e=>errors.push(e.message));
  await p.route("**/*",r=>r.request().url().startsWith("http://127.0.0.1:5831/")?r.continue():r.abort());
  await p.goto("http://127.0.0.1:5831/knowledge-cohesion.html?state=decisions");
  const tab=p.getByRole("tab",{name:"Propostas",exact:true});await tab.focus();await p.keyboard.press("Enter");
  const cards=p.locator(".prisma-knowledge-proposals > .ant-card");await cards.nth(6).waitFor();
  const row=label=>cards.filter({has:p.locator(".ant-card-head-title",{hasText:label})});
  const pending=row("Business Process Management"),occupation=row("Ocupação sintética"),cert=row("Certificação sintética"),unclassified=row("Sem classificação");
  check(width+" no implicit decisions",await p.evaluate(()=>window.__knowledgeDecisions.length===0));
  check(width+" no rejection action",await p.getByRole("button",{name:"Rejeitar",exact:true}).count()===0);
  check(width+" historical rejection stays readable",await row("Rejeição histórica").getByText("Rejeitado",{exact:true}).isVisible());
  check(width+" both decisions enabled without reason",await pending.getByRole("button",{name:"Aprovar na Base Global",exact:true}).isEnabled()&&await pending.getByRole("button",{name:"Manter somente local",exact:true}).isEnabled());
  check(width+" classification and certification remain required",!(await unclassified.getByRole("button",{name:"Aprovar na Base Global",exact:true}).isEnabled())&&!(await cert.getByRole("button",{name:"Aprovar na Base Global",exact:true}).isEnabled()));
  await pending.screenshot({path:dir+"/pending-"+width+".png"});
  await pending.getByRole("button",{name:"Aprovar na Base Global",exact:true}).click();await pending.getByText("Aprovado",{exact:true}).waitFor();
  await unclassified.getByRole("button",{name:"Manter somente local",exact:true}).click();await unclassified.getByText("Mantido somente local",{exact:true}).waitFor();
  await cert.getByLabel("Justificativa da decisão global (opcional)").fill("x");await cert.getByRole("button",{name:"Manter somente local",exact:true}).click();await cert.getByText("Mantido somente local",{exact:true}).waitFor();
  await occupation.getByLabel("Justificativa da decisão global (opcional)").fill("x");await occupation.getByRole("button",{name:"Aprovar na Base Global",exact:true}).click();await occupation.getByText("Aprovado",{exact:true}).waitFor();
  const calls=await p.evaluate(()=>window.__knowledgeDecisions);
  check(width+" exact explicit decisions and optional reasons",JSON.stringify(calls.map(c=>[c.action,c.reason]))===JSON.stringify([["approved",""],["deferred",""],["deferred","x"],["approved","x"]]));
  check(width+" subgroup preserved and occupation has none",calls[0].subgroupId==="strategy"&&calls[3].subgroupId===null);
  check(width+" final decisions have no active actions",await unclassified.getByRole("button").count()===0);
  check(width+" no runtime exceptions",errors.length===0);await p.close();
 }
 const p=await browser.newPage();await p.goto("http://127.0.0.1:5831/knowledge-cohesion.html?state=decisions&failDecision=1");
 const tab=p.getByRole("tab",{name:"Propostas",exact:true});await tab.click();const first=p.locator(".prisma-knowledge-proposals > .ant-card").first();
 await first.getByLabel("Justificativa da decisão global (opcional)").fill("x");await first.getByRole("button",{name:"Manter somente local",exact:true}).click();
 await p.getByText("Falha sintética de decisão",{exact:true}).first().waitFor();
 check("server error leaves pending decision available",await first.getByText("Pendente de revisão",{exact:true}).isVisible()&&await first.getByRole("button",{name:"Manter somente local",exact:true}).isEnabled());
 check("server error preserves optional reason",await first.getByLabel("Justificativa da decisão global (opcional)").inputValue()==="x");await p.close();
 const local=await browser.newPage();await local.goto("http://127.0.0.1:5831/knowledge-cohesion.html?scope=local&state=decisions");await local.getByRole("tab",{name:"Visão Geral",exact:true}).waitFor();
 check("company profile has no global decisions tab",await local.getByRole("tab",{name:"Propostas",exact:true}).count()===0);await local.close();
}finally{await writeFile(dir+"/browser.json",JSON.stringify({checks},null,2));await browser.close();await server.close();}
console.log(JSON.stringify({checks:checks.length,pass:true}));
