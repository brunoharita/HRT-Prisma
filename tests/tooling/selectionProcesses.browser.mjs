import assert from"node:assert/strict";import{createRequire}from"node:module";import{mkdir,writeFile}from"node:fs/promises";
const{chromium}=createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH??"C:/Users/Bruno/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const browser=await chromium.launch({headless:true,executablePath:process.env.PRISMA_BROWSER_PATH}),base="http://127.0.0.1:5706",dir="docs/qa/evidence/selection-processes-v260/browser",results=[];
await mkdir(dir,{recursive:true});
const id=n=>`26000000-0000-0000-0000-${String(n).padStart(12,"0")}`;
async function check(name,value){results.push({name,pass:Boolean(value)});await writeFile(dir+"/results.json",JSON.stringify(results,null,2));assert.ok(value,name);}
async function stable(p){await p.waitForTimeout(300);await p.waitForFunction(()=>document.querySelector(".sp-workspace")?.getAttribute("aria-busy")==="false");}
const errors=[],external=[];
try{
 const p=await browser.newPage({viewport:{width:1448,height:980}});
 p.on("pageerror",e=>errors.push(e.message));await p.route("**/*",r=>r.request().url().startsWith(base+"/")?r.continue():(external.push(r.request().url()),r.abort()));
 await p.goto(base+"/selection-processes.html");await stable(p);
 await check("menu has separate Positions and Selection processes",await p.getByRole("link",{name:"Posições",exact:true}).count()===1&&await p.getByRole("link",{name:"Processos seletivos",exact:true}).count()===1);
 await check("three processes and five real stage counts",await p.locator(".sp-process").count()===3&&(await p.locator(".sp-stage-row strong").allTextContents()).join(",")==="4,3,2,2,1");
 const list=await p.locator(".sp-list").boundingBox(),detail=await p.locator(".sp-detail").boundingBox();
 await check("desktop master-detail preserves approximately 38/62 split",list.x<detail.x&&Math.abs(list.width/(list.width+detail.width)-.38)<.025);
 await p.screenshot({path:dir+"/desktop-1448.png",fullPage:true});
 await p.getByText("Encerrados (1)",{exact:true}).click();await stable(p);await check("status filters server-backed closed process",await p.locator(".sp-process").count()===1);
 await p.getByText("Todos (3)",{exact:true}).click();await stable(p);
 await p.getByRole("textbox",{name:"Buscar processo ou Posição"}).fill("financeiro");await stable(p);await check("search matches Position without AI",await p.locator(".sp-process").count()===1&&await p.locator(".sp-process").innerText().then(x=>x.includes("Analista financeiro")));
 await p.getByRole("textbox",{name:"Buscar processo ou Posição"}).fill("");await stable(p);
 await p.getByRole("button",{name:/Assistente administrativo · Processo 01/}).click();await stable(p);
 await check("closed process exposes occupancy independently and disables preparation",await p.locator(".sp-detail").getByText("Posição ocupada",{exact:true}).count()===1&&await p.getByRole("button",{name:"Preparar avaliação",exact:true}).isDisabled());
 await check("occupied Position prevents reopen control",await p.getByRole("button",{name:"Reabrir processo",exact:true}).isDisabled());
 await p.getByRole("button",{name:/Desenvolvedor backend · Processo 01/}).click();await stable(p);
 await p.getByRole("tab",{name:"Histórico",exact:true}).click();await p.getByText("Pessoa operadora",{exact:false}).last().waitFor();
 await check("history uses explicit current process identity",await p.evaluate(()=>window.__selectionFixture.calls.some(c=>c.name==="get_position_follow_up_process"&&c.args.p_process_id.endsWith("000000000002"))));
 await p.getByRole("tab",{name:"Avaliação",exact:true}).click();await p.getByRole("button",{name:"Consultar avaliação do processo",exact:true}).click();
 await check("assessment links explicit cycle",await p.evaluate(()=>window.__selectionFixture.navigations.at(-1).includes("/processes/26000000-0000-0000-0000-000000000002/assessment")));
 await p.goto(base+"/selection-processes.html");await stable(p);
 await p.getByRole("button",{name:"Novo processo",exact:true}).click();await p.getByRole("radio",{name:"Analista de qualidade"}).waitFor();
 await check("empty process cannot be created without choosing eligible Position",await p.getByRole("button",{name:"Criar processo seletivo",exact:true}).isDisabled());
 await p.getByRole("radio",{name:"Analista de qualidade"}).check();await p.getByRole("button",{name:"Criar processo seletivo",exact:true}).click();await stable(p);
 await p.getByRole("heading",{name:"Analista de qualidade · Processo 01",exact:true}).waitFor();
 await check("explicit creation starts empty and sends stable request ID",await p.evaluate(()=>{const c=window.__selectionFixture.calls.find(c=>c.name==="start_position_selection_process");return Boolean(c?.args.p_request_id)&&c.args.p_process_id===null&&window.__selectionFixture.processes.at(-1).candidates===0;}));
 await p.screenshot({path:dir+"/created-empty.png",fullPage:true});
 await p.goto(base+"/selection-processes.html");await stable(p);
 await p.getByRole("button",{name:"Encerrar processo",exact:true}).click();await p.getByRole("button",{name:"Encerrar processo",exact:true}).last().click();await stable(p);
 await p.getByRole("button",{name:"Reabrir processo",exact:true}).waitFor();
 await check("close mutation is explicit and preserves Position occupancy",await p.evaluate(()=>window.__selectionFixture.calls.some(c=>c.name==="mutate_position_follow_up_process"&&c.args.p_action==="close_process")&&window.__selectionFixture.processes[0].occupancy==="vacant"));
 await p.evaluate(()=>window.__selectionFixture.fail=true);await p.getByRole("button",{name:"Atualizar processos",exact:true}).click();await p.getByRole("button",{name:"Tentar novamente",exact:true}).waitFor();
 await check("read failure preserves last confirmed rows",await p.locator(".sp-process").count()===3);
 await p.evaluate(()=>window.__selectionFixture.fail=false);await p.getByRole("button",{name:"Tentar novamente",exact:true}).click();await stable(p);
 await check("reads and filters invoke no provider or commercial RPC",await p.evaluate(()=>window.__selectionFixture.calls.every(c=>!c.name.includes("analysis")&&!c.name.includes("tokens")&&!c.name.includes("generate"))));
 for(const width of[768,390,320]){
  await p.setViewportSize({width,height:980});await p.goto(base+"/selection-processes.html");await stable(p);
  await check(`no page overflow at ${width}px`,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.screenshot({path:dir+`/list-${width}.png`,fullPage:true});
  if(width<768){
   await check(`mobile ${width} opens list without compressed detail`,!await p.locator(".sp-detail").isVisible());
   await p.getByRole("button",{name:/Desenvolvedor backend · Processo 01/}).click();await stable(p);
   await check(`mobile ${width} sequential detail hides list`,!await p.locator(".sp-list").isVisible()&&await p.locator(".sp-detail").isVisible());
   await check(`mobile detail no overflow ${width}`,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await p.screenshot({path:dir+`/detail-${width}.png`,fullPage:true});
   await p.getByRole("button",{name:"Processos seletivos",exact:true}).click();await stable(p);
   await check(`mobile ${width} return restores list`,await p.locator(".sp-list").isVisible());
  }
 }
 await p.goto(base+"/selection-processes.html?case=position");await p.getByRole("button",{name:"Criar processo seletivo",exact:true}).waitFor();
 await p.getByRole("button",{name:"Criar processo seletivo",exact:true}).click();await p.getByRole("radio",{name:"Analista de qualidade"}).waitFor();
 await check("creation from Position preselects its eligible identity",await p.getByRole("radio",{name:"Analista de qualidade"}).isChecked());
 await p.goto(base+"/selection-processes.html?selected="+id(999));await p.getByRole("button",{name:"Tentar novamente",exact:true}).waitFor();
 await check("unknown process identity fails closed without another process detail",await p.locator(".sp-detail h2").count()===0);
 await p.goto(base+"/selection-processes.html?case=member");await p.getByText("Você não tem acesso aos processos seletivos.",{exact:true}).waitFor();
 await check("member has no operational queries",await p.evaluate(()=>window.__selectionFixture.calls.length===0));
 await check("no external calls or runtime errors",errors.length===0&&external.length===0);
}finally{await browser.close();}
console.log(`PASS ${results.length} browser assertions`);
