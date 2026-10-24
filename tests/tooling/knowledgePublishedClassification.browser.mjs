import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdir,writeFile} from "node:fs/promises";
import {createServer} from "vite";
const dir="docs/qa/evidence/knowledge-published-classification",checks=[];
await mkdir(dir,{recursive:true});
const check=(name,pass)=>{checks.push({name,pass:Boolean(pass)});assert.ok(pass,name);};
const server=await createServer({configFile:"tests/ui/visual-foundation.vite.config.mts",cacheDir:"tmp/vite-knowledge-classification",server:{port:5832}});await server.listen();
const {chromium}=createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH??"playwright");
const browser=await chromium.launch({headless:true,channel:"msedge"});
try {
 for(const width of [1448,390,320]) {
  const page=await browser.newPage({viewport:{width,height:1100},reducedMotion:"reduce"}),errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.route("**/*",route=>route.request().url().startsWith("http://127.0.0.1:5832/")?route.continue():route.abort());
  const open=async()=>{await page.goto("http://127.0.0.1:5832/knowledge-cohesion.html?state=classification");const tab=page.getByRole("tab",{name:"Propostas",exact:true});await tab.focus();await page.keyboard.press("Enter");await page.getByText("Classificação salva · v1",{exact:true}).waitFor();};
  await open();
  const cards=page.locator(".prisma-knowledge-proposals > .ant-card"),row=label=>cards.filter({has:page.locator(".ant-card-head-title",{hasText:label})});
  const pending=row("Governança Corporativa"),approved=row("Transformação operacional"),missing=row("Sem classificação publicada"),unavailable=row("Consulta indisponível");
  check(width+" approved reads current H4 without a dead selector",await approved.getByText("H4 · Estratégia e gestão",{exact:true}).isVisible()&&await approved.getByRole("combobox").count()===0&&await approved.getByRole("button").count()===0);
  check(width+" pending continuation waits for classification",await pending.getByRole("combobox").count()===1&&!await pending.getByRole("button",{name:"Aprovar na Base Global",exact:true}).isEnabled());
  await missing.getByText("Classificação publicada não localizada",{exact:true}).waitFor();
  check(width+" missing is explicit",true);
  await unavailable.getByText("Classificação temporariamente indisponível",{exact:true}).waitFor();
  check(width+" query failure distinct from missing",true);
  await unavailable.getByRole("button",{name:"Consultar novamente"}).click();await approved.getByText("Classificação salva · v1",{exact:true}).waitFor();
  check(width+" retry has no writes and preserves pending",await page.evaluate(()=>window.__knowledgeWrites.length===0)&&await pending.getByRole("combobox").isVisible());
  check(width+" rejected history is read only",await row("Rejeição histórica").getByRole("combobox").count()===0&&await row("Rejeição histórica").getByRole("button").count()===0);
  check(width+" occupation has no competency selector",await row("Ocupação sintética").getByRole("combobox").count()===0);
  check(width+" certification approval remains blocked",!await row("Certificação sintética").getByRole("button",{name:"Aprovar na Base Global",exact:true}).isEnabled());
  await pending.getByRole("combobox").scrollIntoViewIfNeeded();await pending.getByRole("combobox").focus();await page.keyboard.press("ArrowDown");await page.keyboard.press("Enter");
  check(width+" selecting shows guide and enables approval without saving",await pending.getByText("Hard Skills > Estratégia e gestão",{exact:true}).isVisible()&&await pending.getByRole("button",{name:"Aprovar na Base Global",exact:true}).isEnabled()&&await page.evaluate(()=>window.__knowledgeWrites.length===0));
  await page.screenshot({path:dir+"/classification-"+width+".png",fullPage:true});
  check(width+" responsive has no document overflow",await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await pending.getByRole("button",{name:"Aprovar na Base Global",exact:true}).click();await pending.getByText("Classificação salva · v1",{exact:true}).waitFor();
  check(width+" explicit approval transitions to saved read only state",await pending.getByRole("combobox").count()===0&&await page.evaluate(()=>window.__knowledgeDecisions.length===1&&window.__knowledgeDecisions[0].subgroupId==="strategy"));
  await open();check(width+" reload restores published source without reapproval",await approved.getByText("Classificação salva · v1",{exact:true}).isVisible()&&await page.evaluate(()=>window.__knowledgeWrites.length===0));
  check(width+" no runtime exception",errors.length===0);await page.close();
 }
} finally {await writeFile(dir+"/browser.json",JSON.stringify({checks},null,2));await browser.close();await server.close();}
console.log(JSON.stringify({checks:checks.length,pass:true}));
