import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdir,writeFile} from "node:fs/promises";
const {chromium}=createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH ?? "playwright");
const browser=await chromium.launch({headless:true,channel:"msedge"});
const dir="docs/qa/evidence/people-typography-v276",baseline=process.argv.includes("--baseline"),checks=[];
await mkdir(dir,{recursive:true});
const check=(name,value)=>{checks.push({name,pass:Boolean(value)});assert.ok(value,name);};
try {
  for(const width of [1448,390]){
    const page=await browser.newPage({viewport:{width,height:1000}});
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    await page.route("**/*",r=>r.request().url().startsWith("http://127.0.0.1:5715/") ? r.continue() : r.abort());
    await page.goto("http://127.0.0.1:5715/tests/browser/people-typography-v276.html");
    const row=page.getByRole("row").filter({hasText:"Ana Exemplo"});
    await row.waitFor({timeout:10000});
    if(!baseline){
      const cells=await row.locator("td").evaluateAll(nodes=>nodes.map(n=>{
        const el=n.querySelector(".prisma-person-primary-copy strong,.prisma-directory-concept,.prisma-directory-cell > span") ?? n;
        const s=getComputedStyle(el),range=document.createRange();range.selectNodeContents(el);const r=range.getClientRects()[0];
        return {size:s.fontSize,weight:s.fontWeight,line:s.lineHeight,top:r.top,vertical:getComputedStyle(n).verticalAlign};
      }));
      check(width+" primary size and line",cells.every(c=>c.size==="14px"&&c.line==="20px"));
      check(width+" name only emphasis",cells[0].weight==="600"&&cells.slice(1).every(c=>c.weight==="400"));
      check(width+" top alignment",cells.every(c=>c.vertical==="top")&&Math.max(...cells.map(c=>c.top))-Math.min(...cells.map(c=>c.top))<1);
      const secondary=await row.locator(".prisma-person-primary-copy small,.prisma-directory-cell > small").evaluateAll(ns=>ns.map(n=>({size:getComputedStyle(n).fontSize,line:getComputedStyle(n).lineHeight,top:n.getBoundingClientRect().top})));
      check(width+" secondary typography",secondary.every(s=>s.size==="12px"&&s.line==="18px"));
      check(width+" secondary alignment",Math.abs(secondary[0].top-secondary[1].top)<1);
      const missing=page.getByRole("row").filter({hasText:"Denise Exemplo"});
      check(width+" missing primary size",await missing.locator(".prisma-person-missing").evaluateAll(ns=>ns.length>=3&&ns.every(n=>getComputedStyle(n).fontSize==="14px"&&getComputedStyle(n).fontWeight==="400")));
      const badge=page.getByRole("row").filter({hasText:"Carlos Exemplo"}).locator(".prisma-directory-label-tail");
      check(width+" badge attached to last word",await badge.evaluate(n=>{const text=n.firstChild,r=document.createRange();r.selectNodeContents(text);return r.getBoundingClientRect().bottom>=n.querySelector("small").getBoundingClientRect().top;}));
      await badge.locator("..").hover();
      await page.getByRole("tooltip").filter({hasText:"Agrupamento sugerido por IA"}).waitFor({timeout:5000});
      check(width+" provenance accessible",true);
      await page.mouse.move(0,0);await page.locator("body").click({position:{x:2,y:2}});
      await page.getByRole("tooltip").waitFor({state:"hidden",timeout:5000});
      await page.locator(".ant-table-content,.ant-table-body").evaluateAll(ns=>ns.forEach(n=>{n.scrollLeft=0;}));
      check(width+" no runtime errors",errors.length===0);
    }
    await page.screenshot({path:dir+"/"+(baseline?"before":"after")+"-"+width+".png",fullPage:true});
    await page.close();
  }
} finally {await writeFile(dir+"/"+(baseline?"baseline":"typography")+".json",JSON.stringify(checks,null,2));await browser.close();}
console.log(JSON.stringify({baseline,checks:checks.length,pass:true}));
