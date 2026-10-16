import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdir,writeFile,readFile} from "node:fs/promises";
import {execFileSync} from "node:child_process";
import {createServer} from "vite";

const baseline=process.argv.includes("--baseline"),base="c4ef51011fe0e82b17f3cbb2896828d0fb61251b";
const dir="docs/qa/evidence/knowledge-proposals-overflow/"+(baseline?"before":"after"),checks=[],measurements=[];
await mkdir(dir,{recursive:true});
const check=(name,value)=>{checks.push({name,pass:Boolean(value)});assert.ok(value,name);};
const server=await createServer({configFile:"tests/ui/visual-foundation.vite.config.mts",cacheDir:"tmp/vite-knowledge-proposals",server:{port:5830},plugins:baseline?[{name:"proposals-baseline",enforce:"pre",transform(_code,id){const path=id.replaceAll("\\","/");for(const file of ["web/src/styles.css","web/src/pages/KnowledgePage.tsx"])if(path.endsWith("/"+file))return execFileSync("git",["show",base+":"+file],{encoding:"utf8"});}}]:[]});
await server.listen();
const {chromium}=createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH??"playwright");
const browser=await chromium.launch({headless:true,channel:"msedge"});
try {
 for(const width of (process.env.PRISMA_PROPOSAL_WIDTHS??"1448,1265,390,320").split(",").map(Number)) {
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:"reduce"}),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.route("**/*",r=>r.request().url().startsWith("http://127.0.0.1:5830/")?r.continue():r.abort());
  await page.goto("http://127.0.0.1:5830/knowledge-cohesion.html?state=proposals");
  const tab=page.getByRole("tab",{name:"Propostas",exact:true});await tab.focus();await page.keyboard.press("Enter");
  await page.locator(".prisma-knowledge-proposals .ant-card").first().waitFor();
  const cards=page.locator(".prisma-knowledge-proposals > .ant-card"),pending=cards.nth(0);
  check(width+" all proposal states",await cards.count()===5);
  check(width+" four global actions",(await pending.getByRole("button").allTextContents()).join("|")==="Pesquisar com IA|Aprovar|Manter somente local|Rejeitar");
  check(width+" reason required",!(await pending.getByRole("button",{name:"Aprovar",exact:true}).isEnabled()));
  const reason=pending.getByPlaceholder("Motivo auditável da decisão global");await reason.fill("Revisão sintética preservada");
  check(width+" valid reason enables explicit decision",await pending.getByRole("button",{name:"Aprovar",exact:true}).isEnabled());
  check(width+" certification stays blocked",!(await cards.nth(3).getByRole("button",{name:"Aprovar",exact:true}).isEnabled()));
  const subgroup=pending.getByRole("combobox");await subgroup.focus();await page.keyboard.press("ArrowDown");await page.keyboard.press("Enter");
  const selected=await pending.locator(".ant-select").innerText();
  await page.setViewportSize({width:width===390?1448:390,height:1000});
  await page.setViewportSize({width,height:1000});
  check(width+" reason and subgroup survive reflow",await reason.inputValue()==="Revisão sintética preservada"&&await pending.locator(".ant-select").innerText()===selected);
  const geometry=await cards.evaluateAll(nodes=>nodes.map(card=>{const bounds=card.getBoundingClientRect();const elements=Array.from(card.querySelectorAll("button, .ant-tag, .ant-select, textarea, .ant-alert, .ant-card-head-title, p, a"));return {title:card.querySelector(".ant-card-head-title")?.textContent,content:card.textContent,width:bounds.width,overflow:elements.filter(e=>{const r=e.getBoundingClientRect();return r.right>bounds.right+1||r.left<bounds.left-1||(e.clientWidth>0&&e.scrollWidth>e.clientWidth+2);}).map(e=>({tag:e.tagName,text:e.textContent?.slice(0,85),excess:e.scrollWidth-e.clientWidth,right:e.getBoundingClientRect().right-bounds.right}))};}));
  const pageOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
  if(pageOverflow)console.log(JSON.stringify(await page.evaluate(()=>Array.from(document.querySelectorAll('body *')).filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>innerWidth+1;}).map(e=>({tag:e.tagName,class:e.className,right:Math.round(e.getBoundingClientRect().right)})).slice(0,20))));
  measurements.push({width,pageOverflow,cards:geometry});
  for(let i=0;i<5;i++)await cards.nth(i).screenshot({path:dir+"/"+width+"-"+i+".png"});
  if(!baseline){check(width+" page contained",!pageOverflow);check(width+" all card content contained",geometry.every(c=>!c.overflow.length));const before=JSON.parse(await readFile("docs/qa/evidence/knowledge-proposals-overflow/before/results.json","utf8")).measurements.find(m=>m.width===width);check(width+" full text preserved",geometry.every((c,i)=>c.content===before.cards[i].content));}
  check(width+" no implicit writes",await page.evaluate(()=>window.__knowledgeWrites.length===0));
  check(width+" no runtime errors",errors.length===0);
  const overview=page.getByRole("tab",{name:"Visão Geral",exact:true});await overview.focus();await page.keyboard.press("Enter");
  check(width+" neighboring tab retained",await page.getByText("Base de conhecimento preservada",{exact:true}).isVisible());
  await page.close();
 }
 if(baseline)check("baseline reproduces actual overflow",measurements.some(m=>m.cards.some(c=>c.overflow.length)));
} finally {
 await writeFile(dir+"/results.json",JSON.stringify({baseline,base,checks,measurements},null,2));
 await browser.close();await server.close();
}
console.log(JSON.stringify({baseline,checks:checks.length,pass:true}));
