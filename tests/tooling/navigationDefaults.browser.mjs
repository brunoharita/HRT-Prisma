import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdir,writeFile} from "node:fs/promises";
const {chromium}=createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH??"playwright");
const b=await chromium.launch({headless:true,channel:"msedge"}),dir="docs/qa/evidence/navigation-defaults-v277",checks=[];
await mkdir(dir,{recursive:true});
const check=(name,value)=>{checks.push({name,pass:Boolean(value)});console.log(name,value);assert.ok(value,name);};
const stable=async p=>{await p.waitForTimeout(250);await p.waitForFunction(()=>document.querySelector(".sp-workspace")?.getAttribute("aria-busy")==="false",null,{timeout:10000});};
try{
 for(const width of [1448,390]){
  const p=await b.newPage({viewport:{width,height:1000}}),errors=[];
  p.setDefaultTimeout(8000);p.on("pageerror",e=>{errors.push(e.message);console.log("PAGEERROR",e.message);});
  await p.route("**/*",r=>/^http:\/\/127.0.0.1:(5706|5587)\//.test(r.request().url())?r.continue():r.abort());
  await p.goto("http://127.0.0.1:5706/selection-processes.html");await stable(p);
  check(width+" process option order",(await p.locator(".ant-segmented-item-label").allTextContents()).join("|")==="Em andamento (2)|Encerrados (1)|Todos (3)");
  check(width+" initial active",await p.getByRole("radio",{name:"Em andamento (2)",exact:true}).isChecked()&&await p.locator(".sp-process").count()===2);
  await p.getByText("Encerrados (1)",{exact:true}).click();await stable(p);
  check(width+" closed available",await p.locator(".sp-process").count()===1);
  await p.locator(".sp-process").click();await stable(p);
  check(width+" selected closed preserved",await p.locator(".sp-detail h2").innerText().then(t=>t.includes("Assistente administrativo")));
  if(width===390){await p.getByRole("button",{name:"Processos seletivos",exact:true}).click();await stable(p);}
  check(width+" remembered explicit selection",await p.getByRole("radio",{name:"Encerrados (1)",exact:true}).isChecked());
  await p.goto("http://127.0.0.1:5706/selection-processes.html");
  await stable(p);await p.getByText("Todos (3)",{exact:true}).click();await stable(p);
  check(width+" all available",await p.locator(".sp-process").count()===3);
  if(width===1448){
   await p.getByRole("button",{name:"Novo processo",exact:true}).click();
   await p.getByRole("radio",{name:"Analista de qualidade",exact:true}).check();
   await p.getByRole("button",{name:"Criar processo seletivo",exact:true}).click();await stable(p);
   check("created process returns active",await p.getByRole("radio",{name:"Em andamento (3)",exact:true}).isChecked());
   await p.goto("http://127.0.0.1:5706/selection-processes.html?selected=26000000-0000-0000-0000-000000000004");await stable(p);
   check("closed deep link with active list",await p.getByRole("radio",{name:"Em andamento (2)",exact:true}).isChecked()&&(await p.locator(".sp-detail h2").innerText()).includes("Assistente administrativo"));
   await p.goto("http://127.0.0.1:5706/selection-processes.html");await stable(p);
  } else {await p.getByText("Em andamento (2)",{exact:true}).click();await stable(p);}
  await p.evaluate(()=>window.__selectionFixture.processes.splice(0,2));
  await p.getByRole("button",{name:"Atualizar processos",exact:true}).click();await stable(p);
  check(width+" zero active remains active",await p.getByRole("radio",{name:"Em andamento (0)",exact:true}).isChecked()&&await p.locator(".sp-process").count()===0);
  check(width+" no status writes",await p.evaluate(()=>window.__selectionFixture.calls.every(c=>c.name.startsWith("get_"))));
  await p.screenshot({path:dir+"/processes-"+width+".png",fullPage:true});
  for(const scope of ["global","local"]){
   await p.goto("http://127.0.0.1:5587/navigation-defaults.html?scope="+scope);
   await p.getByRole("tab",{name:"Visão Geral",exact:true}).waitFor();
   check(width+" "+scope+" knowledge order",(await p.locator(".ant-tabs-nav [role=tab]").allTextContents()).slice(0,2).join("|")==="Visão Geral|Áreas profissionais");
   check(width+" "+scope+" overview active",await p.getByRole("tab",{name:"Visão Geral",exact:true}).getAttribute("aria-selected")==="true");
   await p.getByRole("tab",{name:"Áreas profissionais",exact:true}).click();
   check(width+" "+scope+" area accessible",await p.getByRole("tab",{name:"Áreas profissionais",exact:true}).getAttribute("aria-selected")==="true");
   if(scope==="global")await p.screenshot({path:dir+"/knowledge-"+width+".png",fullPage:true});
  }
  check(width+" no runtime errors",errors.length===0);await p.close();
 }
}finally{await writeFile(dir+"/browser.json",JSON.stringify(checks,null,2));await b.close();}
console.log(JSON.stringify({checks:checks.length,pass:true}));
