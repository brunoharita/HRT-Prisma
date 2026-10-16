import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdir,writeFile} from "node:fs/promises";
const {chromium}=createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH??"playwright");
const browser=await chromium.launch({headless:true,channel:"msedge"}),dir="docs/qa/evidence/knowledge-ux-v278",checks=[],measurements=[];
await mkdir(dir,{recursive:true});
const check=(name,value)=>{checks.push({name,pass:Boolean(value)});assert.ok(value,name);};
try{
 for(const width of [1448,390])for(const scope of ["global","local"])for(const state of ["data","empty"]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];
  page.setDefaultTimeout(8000);page.on("pageerror",e=>{errors.push(e.message);console.log("PAGEERROR",e.message);});
  await page.route("**/*",r=>r.request().url().startsWith("http://127.0.0.1:5587/")?r.continue():r.abort());
  await page.goto("http://127.0.0.1:5587/knowledge-cohesion.html?scope="+scope+"&state="+state);
  await page.getByRole("tab",{name:"Visão Geral",exact:true}).waitFor();
  const tabs=await page.locator(".ant-tabs-nav [role=tab]").allTextContents();
  for(let i=0;i<tabs.length;i++){
   const label=tabs[i],tab=page.getByRole("tab",{name:label,exact:true});
   const tabId=await tab.getAttribute("id");await tab.focus();await page.keyboard.press("Enter");
   await page.waitForFunction(id=>document.getElementById(id)?.getAttribute("aria-selected")==="true",tabId,{timeout:5000});
   const pane=page.getByRole("tabpanel");await pane.waitFor();await page.waitForTimeout(90);
   const m=await pane.evaluate(root=>{
    const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=="hidden";
    const read=selector=>[...root.querySelectorAll(selector)].filter(visible).map(e=>{const s=getComputedStyle(e);return {size:s.fontSize,line:s.lineHeight,weight:s.fontWeight,family:s.fontFamily};});
    return {family:getComputedStyle(root).fontFamily,heads:read(".ant-table-thead > tr > th"),cells:read(".ant-table-tbody > tr > td"),sections:read("h2,h3,h4,h5,.ant-card-head-title"),details:read("small,.ant-typography-secondary,.ant-form-item-extra,.ant-form-item-label > label"),buttons:read(".ant-btn:not(.ant-btn-link)"),primaryLinks:read("td .ant-btn-link"),body:read("p:not(.ant-typography-secondary)"),overflow:document.documentElement.scrollWidth>innerWidth+1};
   });
   const key=width+"/"+scope+"/"+state+"/"+label;console.log(key);
   check(key+" table roles",m.heads.every(x=>x.size==="14px"&&x.line==="20px"&&x.weight==="600")&&m.cells.every(x=>x.size==="16px"&&x.line==="24px"&&x.weight==="400"));
   check(key+" one font family",[...m.heads,...m.cells,...m.sections,...m.details,...m.body].every(x=>x.family===m.family));
   check(key+" shared text roles",m.sections.every(x=>x.size==="20px"&&x.line==="28px"&&x.weight==="600")&&m.details.every(x=>x.size==="14px"&&x.line==="20px")&&m.body.every(x=>x.size==="16px"&&x.line==="24px"));
   check(key+" controls and reflow",m.buttons.every(x=>x.size==="14px")&&m.primaryLinks.every(x=>x.size==="16px"&&x.line==="24px")&&!m.overflow);
   measurements.push({key,...m});
   await page.screenshot({path:dir+"/"+width+"-"+scope+"-"+state+"-"+i+".png",fullPage:true});
   if(state==="data"&&label==="Áreas profissionais"){
    await page.getByRole("button",{name:/Nova área/}).click();
    const dialog=page.getByRole("dialog");await dialog.waitFor();
    check(key+" modal shared scope",await dialog.locator("..").evaluate(e=>Boolean(e.closest(".prisma-content-standard"))));
    await page.getByLabel("Nome da área",{exact:true}).fill("Área fictícia sem salvar");
    await page.getByRole("button",{name:"Cancelar",exact:true}).click();
    check(key+" cancel preserves data",await pane.getByText("Recursos Humanos",{exact:true}).count()===1);
   }
   if(state==="data"&&["Base global de conhecimento","Conhecimento da empresa","Base Prisma"].includes(label)){
    const concept=scope==="local"&&label==="Conhecimento da empresa"?"Gestão de processos":"Planejamento estratégico";
    await pane.getByRole("button",{name:concept,exact:true}).click();
    const dialog=page.getByRole("dialog");await dialog.waitFor();
    check(key+" drawer shared hierarchy",await dialog.locator(".ant-drawer-title").evaluate(e=>getComputedStyle(e).fontSize==="20px")&&await dialog.locator(".ant-descriptions-item-content").first().evaluate(e=>getComputedStyle(e).fontSize==="16px"));
    await page.keyboard.press("Escape");await dialog.waitFor({state:"hidden"});
   }
  }
  check(width+"/"+scope+"/"+state+" all tabs tested",tabs.length===8);
  check(width+"/"+scope+"/"+state+" reads only",await page.evaluate(()=>window.__knowledgeWrites.length===0));
  check(width+"/"+scope+"/"+state+" no runtime errors",errors.length===0);
  await page.close();
 }
 for(const width of [1448,390]){
  const p=await browser.newPage({viewport:{width,height:1000}});
  await p.goto("http://127.0.0.1:5587/knowledge-cohesion.html?state=error");
  const error=p.getByText("Falha sintética de consulta",{exact:true});await error.waitFor();
  check(width+" error hierarchy",await error.evaluate(e=>getComputedStyle(e).fontSize==="16px"));
  check(width+" retry available",await p.getByRole("button",{name:"Tentar novamente",exact:true}).count()===1);
  await p.screenshot({path:dir+"/error-"+width+".png",fullPage:true});await p.close();
 }
 // An unrelated page does not acquire the opt-in content scope.
 const outside=await browser.newPage();
 await outside.goto("http://127.0.0.1:5587/visual-foundation.html?page=/profiles");
 await outside.getByRole("heading",{name:"Pessoas",exact:true}).waitFor();
 check("scope isolated from People",await outside.locator(".prisma-content-standard").count()===0);await outside.close();
}finally{
 await writeFile(dir+"/checks.json",JSON.stringify(checks,null,2));
 await writeFile(dir+"/roles.json",JSON.stringify(measurements,null,2));
 await browser.close();
}
console.log(JSON.stringify({checks:checks.length,tabs:measurements.length,pass:true}));
