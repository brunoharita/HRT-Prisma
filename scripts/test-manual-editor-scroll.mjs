import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdir,writeFile,unlink} from "node:fs/promises";
import {resolve} from "node:path";
const {chromium}=createRequire(import.meta.url)("C:/Users/Bruno/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const dir="docs/qa/evidence/manual-editor-scroll-v273",baseline=process.argv.includes("--baseline");
await mkdir(dir,{recursive:true});const entry=resolve("tests/browser/manual-profile-v270.tsx").replaceAll("\\","/");
await writeFile("web/manual-scroll-qa.html",`<html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root"></div><script type="module" src="/@fs/${entry}"></script></body></html>`);
const browser=await chromium.launch({headless:true,executablePath:"C:/Users/Bruno/AppData/Local/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe"});
const results=[],errors=[],outbound=[];
try {
 for(const width of baseline?[1448]:[2232,1448,390]) {
  const page=await browser.newPage({viewport:{width,height:900}});page.on("pageerror",e=>errors.push(e.message));
  await page.route("**/*",route=>{const host=new URL(route.request().url()).hostname;if(!["127.0.0.1","localhost"].includes(host)){outbound.push(host);return route.abort();}return route.continue();});
  for(const state of baseline?["update"]:["update","full"]) {
   await page.goto(`http://127.0.0.1:5717/manual-scroll-qa.html?view=editor&state=${state}`);
   await page.getByRole("tab",{name:"Resumo",exact:true}).waitFor();
   const section=page.locator('.prisma-review-structured-pane summary').filter({hasText:"Posicionamento profissional"});
   if(!await section.evaluate(el=>el.parentElement.open))await section.click();
   const field=page.locator('[data-review-field-path="areasOfExpertise"]');
   if(baseline){await page.mouse.move(width/2,650);await page.mouse.wheel(0,1800);}else await field.scrollIntoViewIfNeeded();
   const geometry=await field.evaluate(el=>{const rect=el.getBoundingClientRect(),clipped=[];for(let p=el.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),b=p.getBoundingClientRect();if(["hidden","clip"].includes(s.overflowY)&&rect.bottom>b.bottom+1)clipped.push(p.className);}return {clipped,bottom:rect.bottom,viewport:innerHeight,visible:rect.bottom<=innerHeight+1&&rect.top>=0,pageWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth};});
   const frame=await page.locator('.prisma-review-split').evaluate(el=>({height:el.clientHeight,scrollHeight:el.scrollHeight,overflow:getComputedStyle(el).overflowY,width:el.clientWidth}));
   results.push({width,state,...geometry,frame});
   await page.screenshot({path:`${dir}/${baseline?"before":"after"}-${state}-${width}.png`,fullPage:false});
   if(baseline){assert.ok(geometry.clipped.length>0,"baseline must reproduce clipped editor");continue;}
   assert.deepEqual(geometry.clipped,[]);assert.equal(geometry.visible,true);assert.ok(geometry.pageWidth<=width+1);
   await field.getByRole("combobox").fill("Tecnologia da informação");await field.getByRole("combobox").press("Enter");
   await page.getByRole("button",{name:"Salvar rascunho",exact:true}).click();
   await page.waitForFunction(()=>window.qa.saved?.areasOfExpertise.includes("Tecnologia da informação"));
   assert.equal(await page.evaluate(()=>window.qa.publications),0);
   await page.getByRole("button",{name:/Comparar com o perfil atual/}).waitFor({state:"visible",timeout:5000});
  }
  if(!baseline){await page.goto("http://127.0.0.1:5717/manual-scroll-qa.html?view=baseline&state=update");await page.getByRole("tab",{name:"Resumo",exact:true}).waitFor();
   const frame=await page.locator('.prisma-review-split').evaluate(el=>({overflow:getComputedStyle(el).overflowY,height:el.clientHeight,manual:Boolean(el.closest('.prisma-review-page--manual'))}));assert.equal(frame.manual,false);assert.equal(frame.overflow,"hidden");results.push({width,preservedNonManual:frame});}
  await page.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(outbound,[]);
}finally{await writeFile(`${dir}/${baseline?"baseline":"checks"}.json`,JSON.stringify({results,errors,outbound},null,2));await browser.close();await unlink("web/manual-scroll-qa.html");}
console.log(JSON.stringify(results));
