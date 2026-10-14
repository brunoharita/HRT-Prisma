import assert from"node:assert/strict";import{createRequire}from"node:module";import{mkdir,writeFile}from"node:fs/promises";
const{chromium}=createRequire(import.meta.url)("C:/Users/Bruno/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"),b=await chromium.launch({headless:true,executablePath:process.env.PRISMA_BROWSER_PATH}),dir="docs/qa/evidence/selection-processes-v260/preservation",r=[];
await mkdir(dir,{recursive:true});const check=(name,value)=>{assert.ok(value,name);r.push({name,pass:true});};
try{
 const p=await b.newPage({viewport:{width:1448,height:980}});
 await p.goto("http://127.0.0.1:5697/position-follow-up.html");await p.getByRole("button",{name:"Marina Costa",exact:true}).waitFor();
 check("five full-width candidate stages preserved",await p.locator(".pf-column").count()===5);
 await p.screenshot({path:dir+"/kanban-1448.png",fullPage:true});
 await p.getByRole("tab",{name:"Histórico",exact:true}).click();check("process history stays distinct from Position history",!await p.locator(".pf-board").isVisible());
 await p.getByRole("tab",{name:"Candidatos",exact:true}).click();
 await p.getByText("Lista",{exact:true}).click();check("List and Kanban modes preserved",await p.locator(".ant-table").isVisible());
 await p.getByText("Kanban",{exact:true}).click();await p.getByRole("button",{name:"Marina Costa",exact:true}).click();await p.getByRole("dialog").waitFor();
 check("candidate details preserve human decision and interview controls",await p.getByRole("dialog").getByText("Decisão humana",{exact:false}).count()>0);
 await p.getByRole("dialog").getByRole("button",{name:"Close",exact:true}).click().catch(()=>p.keyboard.press("Escape"));
 for(const width of[390,320]){
  await p.setViewportSize({width,height:980});await p.goto("http://127.0.0.1:5697/position-follow-up.html");await p.getByRole("button",{name:"Marina Costa",exact:true}).waitFor({state:"attached"});
  check(`mobile ${width} preserves selected single Kanban column`,await p.locator(".pf-column:visible").count()===1);
  check(`mobile ${width} full page without overflow`,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.screenshot({path:dir+`/kanban-${width}.png`,fullPage:true});
 }
 await p.goto("http://127.0.0.1:5697/position-follow-up.html?case=member");await p.getByText("Você não tem acesso ao acompanhamento desta Posição.",{exact:true}).waitFor();check("member cannot inspect candidates",await p.locator(".pf-card").count()===0);
}finally{await b.close();await writeFile(dir+"/results.json",JSON.stringify(r,null,2));}
console.log(`PASS ${r.length} preserved browser checks`);
