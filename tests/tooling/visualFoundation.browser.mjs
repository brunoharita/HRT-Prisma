// Real components, deterministic adapters; no live users, database or AI.
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdir,writeFile} from "node:fs/promises";
const {chromium}=createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH??"playwright");
const browser=await chromium.launch({headless:true,executablePath:process.env.PRISMA_BROWSER_PATH});
const evidence="docs/qa/evidence/visual-option4-v211";
await mkdir(evidence,{recursive:true});
const results=[];
try {
 for(const width of (process.env.PRISMA_VISUAL_WIDTHS??"1516,768,390,320").split(",").map(Number)) {
  for(const area of ["/","/profiles","/vacancies","/vacancies/new","/knowledge","/settings"]) {
   const page=await browser.newPage({viewport:{width,height:1037}});
   const errors=[],external=[];
   page.on("pageerror",e=>errors.push(e.message));
   await page.route("**/*",route=>{if(!route.request().url().startsWith("http://127.0.0.1:5587/")){external.push(route.request().url());return route.abort();}return route.continue();});
   await page.goto("http://127.0.0.1:5587/visual-foundation.html?page="+encodeURIComponent(area));
   await page.waitForSelector("h1");await page.waitForTimeout(650);
   const measures=await page.evaluate(()=>{
    const title=document.querySelector("h1"),icon=document.querySelector(".prisma-page-icon");
    const values=[...document.querySelectorAll(".ant-statistic-content-value")].map(e=>({text:e.textContent,size:parseFloat(getComputedStyle(e).fontSize)}));
    return {overflow:document.documentElement.scrollWidth>innerWidth+1,titleSize:parseFloat(getComputedStyle(title).fontSize),iconWidth:icon?.getBoundingClientRect().width,values};
   });
   const checks={noRuntimeErrors:errors.length===0,noExternalCalls:external.length===0,noHorizontalOverflow:!measures.overflow,pageTitleAtLeast30:measures.titleSize>=30,substantialPageIcon:measures.iconWidth>=56};
   if(area==="/"){checks.factualMetrics=measures.values.map(v=>v.text).join(",")==="24,6,18,0";checks.metricHierarchy=measures.values.every(v=>v.size>=28);}
   if(width===1516||width===390)await page.screenshot({path:evidence+"/area-"+(area.replaceAll("/","-")||"home")+"-"+width+".png",fullPage:true});
   if(area==="/profiles"){await page.getByRole("button",{name:/Importar currículo/}).click();await page.waitForTimeout(200);checks.actionWorks=(await page.locator("h1").innerText())==="Olá!";}
   if(area==="/settings"){await page.getByRole("tab",{name:"Geral",exact:true}).click();checks.tabWorks=await page.getByText("Configurações gerais ainda não estão disponíveis nesta área.",{exact:true}).count()===1;}
   if(width===390){await page.getByRole("button",{name:"Abrir navegação",exact:true}).click();const dialog=page.getByRole("dialog");await dialog.waitFor({state:"visible"});await page.waitForTimeout(600);checks.mobileMenu=await dialog.count()===1;await page.keyboard.press("Tab");await page.keyboard.press("Escape");await dialog.waitFor({state:"hidden"});checks.menuEscape=await page.getByRole("dialog").count()===0;}
   results.push({area,width,checks,measures,errors,external});
   console.log(area,width,checks);
   await page.close();
  }
 }
 for(const width of [1516,390,320]) {
  const page=await browser.newPage({viewport:{width,height:1037}});
  await page.clock.install({time:new Date("2026-10-06T12:00:00Z")});
  await page.goto("http://127.0.0.1:5586/person-unified.html?case=visual-option4");
  await page.waitForSelector(".prisma-profile-highlight");await page.waitForTimeout(600);
  const measures=await page.evaluate(()=>{
   const first=document.querySelector(".prisma-profile-highlight"),icon=first.querySelector(".prisma-profile-highlight-icon"),value=first.querySelector("strong"),label=first.querySelector("h3");
   return {background:getComputedStyle(first).backgroundColor,iconWidth:icon.getBoundingClientRect().width,iconHeight:icon.getBoundingClientRect().height,iconSize:parseFloat(getComputedStyle(icon).fontSize),valueSize:parseFloat(getComputedStyle(value).fontSize),labelSize:parseFloat(getComputedStyle(label).fontSize),radius:getComputedStyle(first).borderRadius,overflow:document.documentElement.scrollWidth>innerWidth+1,cards:document.querySelectorAll(".prisma-profile-highlight").length,axes:document.querySelectorAll(".prisma-synthesis-axes > *").length};
  });
  const checks={tonalCards:measures.background==="rgb(237, 244, 255)",icon56:measures.iconWidth===56&&measures.iconHeight===56,icon32:measures.iconSize===32,primaryValue25:measures.valueSize===25,label14:measures.labelSize===14,hierarchy:measures.valueSize/measures.labelSize>1.7,radius16:measures.radius==="16px",noOverflow:!measures.overflow,contentPreserved:measures.cards===4&&measures.axes===8};
  await page.screenshot({path:evidence+"/person-"+width+".png",fullPage:true});
  if(width===1516)await page.screenshot({path:evidence+"/person-same-viewport.png"});
  results.push({area:"person",width,checks,measures});console.log("person",width,checks);await page.close();
 }
}finally{await browser.close();}
await writeFile(evidence+"/visual-results.json",JSON.stringify(results,null,2)+"\n");
assert.ok(results.every(r=>Object.values(r.checks).every(Boolean)),"Visual regression failed: "+JSON.stringify(results.filter(r=>Object.values(r.checks).some(v=>!v))));
