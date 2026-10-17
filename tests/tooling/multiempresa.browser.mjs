import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdir,writeFile,readFile} from "node:fs/promises";
import {createServer} from "vite";
const dir=process.env.PRISMA_BROWSER_EVIDENCE_DIR??"docs/qa/evidence/v3m0-multiempresa",checks=[];await mkdir(dir,{recursive:true});
const recoveryOnly=process.argv.includes("--recovery-only");
if(recoveryOnly){const previous=JSON.parse(await readFile(dir+"/browser.json","utf8"));checks.push(...previous.checks.filter(c=>!["failed mutation preserves editor","cancelled departure retains unsaved changes","explicit discard closes editor"].includes(c.name)));}
if(process.argv.includes("--regression-only")){const previous=JSON.parse(await readFile(dir+"/browser.json","utf8"));checks.push(...previous.checks.slice(0,previous.checks.findIndex(c=>/^\d+ super_admin /.test(c.name))));}
const check=(name,pass)=>{checks.push({name,pass:Boolean(pass)});assert.ok(pass,name);};
const server=await createServer({configFile:"tests/ui/visual-foundation.vite.config.mts",cacheDir:"tmp/vite-v3m0",server:{port:5847},plugins:[{name:"multiempresa-fixture",enforce:"pre",transform(_code,id){if(id.replaceAll("\\","/").endsWith("/infrastructure/supabase/organizationAdministrationService.ts"))return 'export {organizationAdministrationService} from "../../../../tests/ui/multiempresa/service";';}}]});await server.listen();
const {chromium}=createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH??"playwright");
const browser=await chromium.launch({headless:true,channel:"msedge"});
try{
 if(process.argv.includes("--sorting"))for(const width of [1448,390,320]){
  const p=await browser.newPage({viewport:{width,height:1200},reducedMotion:"reduce"}),errors=[];p.on("pageerror",e=>errors.push(e.message));
  await p.goto("http://127.0.0.1:5847/multiempresa.html?profile=super_admin&visual=1&sorting=1");await p.locator("details[open]").waitFor();
  const expected={Nome:["Grupo principal","HRT Solutions","VCI Brasil"],"Data de criação":["Grupo principal","VCI Brasil","HRT Solutions"],"Data de atualização":["HRT Solutions","VCI Brasil","Grupo principal"]};
  const companies={Nome:["Prisma","Prisma QA Beta"],"Data de criação":["Prisma QA Beta","Prisma"],"Data de atualização":["Prisma","Prisma QA Beta"]};
  for(const criterion of Object.keys(expected)){
   await p.getByRole("combobox",{name:"Ordenar por",exact:true}).selectOption({label:criterion});

   for(const direction of ["asc","desc"]){
    const current=await p.getByRole("button",{name:"Ordem crescente",exact:true}).count()?"asc":"desc";
    if(current!==direction)await p.getByRole("button",{name:current==="asc"?"Ordem crescente":"Ordem decrescente",exact:true}).click();
    const names=await p.locator("summary strong").allTextContents();check(width+" "+criterion+" "+direction+" groups",JSON.stringify(names)===JSON.stringify(direction==="asc"?expected[criterion]:[...expected[criterion]].reverse()));
    const namesInGroup=await p.locator("details[open] tbody td:first-child strong").allTextContents();check(width+" "+criterion+" "+direction+" inherited companies",JSON.stringify(namesInGroup)===JSON.stringify(direction==="asc"?companies[criterion]:[...companies[criterion]].reverse()));
    check(width+" "+criterion+" "+direction+" same open group",await p.locator("details[open] summary strong").textContent()==="Grupo principal");
   }
  }
  await p.getByRole("button",{name:"Atualizar",exact:true}).click();check(width+" refresh retains date ordering",JSON.stringify(await p.locator("summary strong").allTextContents())===JSON.stringify([...expected["Data de atualização"]].reverse()));
  await p.getByRole("searchbox").fill("Prisma QA Beta");check(width+" search retains sort and direction",await p.getByRole("button",{name:"Ordem decrescente"}).count()===1&&await p.locator(".prisma-organization-sort-date").first().textContent().then(t=>t.startsWith("Atualização:")));
  await p.getByRole("searchbox").fill("");
  check(width+" no implicit mutation from sorting",await p.evaluate(()=>window.__calls.length===0));
  check(width+" sorting controls and records contained",await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&[...document.querySelectorAll("details[open] .ant-table-content")].every(e=>e.scrollWidth<=e.clientWidth+1)));
  check(width+" sorting no runtime exception",errors.length===0);
  await p.screenshot({path:`${dir}/sorting-${width}.png`,fullPage:true});
  const selector=p.getByRole("combobox",{name:"Ordenar por",exact:true});await selector.focus();await selector.press("ArrowUp");check(width+" keyboard changes sorting",await selector.inputValue()==="createdAt");
  await p.locator("summary").filter({hasText:"HRT Solutions"}).click();await p.getByRole("button",{name:"Cadastrar Owner",exact:true}).click();check(width+" Owner contextual route preserved",await p.evaluate(()=>window.__navigation==="/organizations/group-b/owner/new"));
  await p.close();
 }
 if(process.argv.includes("--accordion"))for(const width of [1448,1024,390,320]){
  const p=await browser.newPage({viewport:{width,height:1200},reducedMotion:"reduce"}),errors=[];p.on("pageerror",e=>errors.push(e.message));
  await p.goto("http://127.0.0.1:5847/multiempresa.html?profile=super_admin&visual=1");
  const cards=p.locator(".prisma-organization-group"),summaries=cards.locator("summary");await cards.first().waitFor();
  check(width+" first open and all summaries visible",await cards.count()===3&&await p.locator("details[open]").count()===1&&await summaries.nth(2).isVisible());
  await p.screenshot({path:`${dir}/accordion-${width}.png`,fullPage:true});
  if(width===1448||width===390){
   await p.locator(".prisma-organization-groups").screenshot({path:`${dir}/delivered-groups-${width}.png`});
   const reference=await browser.newPage({viewport:{width,height:1200}});await reference.setContent(await readFile(dir+"/reference.html","utf8"));
   await reference.locator("#pgux-panel-2").evaluate(e=>e.hidden=false);
   const bounds=await p.locator(".prisma-organization-groups").boundingBox();
   await reference.addStyleTag({content:`#pgux-panel-2 .pgux-product{padding:0;width:${bounds.width}px;max-width:100%;color-scheme:light;} body{margin:0}`});
   await reference.locator("#pgux-panel-2 .pgux-accordions").screenshot({path:`${dir}/reference-groups-${width}.png`});await reference.close();
  }
  await summaries.nth(1).click();check(width+" exclusive disclosure",await p.locator("details[open]").count()===1&&await cards.nth(1).getAttribute("open")!==null);
  await p.screenshot({path:`${dir}/draft-${width}.png`,fullPage:true});
  await p.getByRole("button",{name:"Atualizar",exact:true}).click();check(width+" refresh preserves open group",await cards.nth(1).getAttribute("open")!==null);
  await p.getByRole("button",{name:"Cadastrar Owner",exact:true}).click();check(width+" contextual Owner route",await p.evaluate(()=>window.__navigation==="/organizations/group-b/owner/new"));
  await summaries.nth(1).focus();await p.keyboard.press("Enter");check(width+" keyboard collapses all",await p.locator("details[open]").count()===0);
  await p.keyboard.press("Space");check(width+" keyboard opens",await p.locator("details[open]").count()===1);
  const search=p.getByRole("searchbox");await search.fill("VCI - Bauru");check(width+" company search reveals group",await cards.count()===1&&await cards.first().getAttribute("open")!==null&&await p.getByText("VCI - Bauru",{exact:true}).isVisible());
  await search.fill("sem resultado");await p.getByText("Nenhuma empresa disponível neste escopo.").waitFor();check(width+" empty result",await cards.count()===0);
  await search.fill("");check(width+" search clears to first group",await cards.count()===3&&await cards.first().getAttribute("open")!==null);
  check(width+" disclosure and search do not mutate",await p.evaluate(()=>window.__calls.length===0));
  check(width+" no horizontal overflow",await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&[...document.querySelectorAll("details[open] .ant-table-content")].every(e=>e.scrollWidth<=e.clientWidth+1)));
  if(width<580)check(width+" mobile stacked companies",await cards.first().locator("tbody tr").first().evaluate(e=>getComputedStyle(e).display)==="grid");
  check(width+" no runtime exception",errors.length===0);await p.close();
 }
 for(const width of recoveryOnly?[]:[1448,390,320])for(const profile of ["super_admin","owner","recruiter","member"]){
  const p=await browser.newPage({viewport:{width,height:1000},reducedMotion:"reduce"}),errors=[];p.on("pageerror",e=>errors.push(e.message));
  await p.route("**/*",r=>r.request().url().startsWith("http://127.0.0.1:5847/")?r.continue():r.abort());
  await p.goto(`http://127.0.0.1:5847/multiempresa.html?profile=${profile}`);const tag=width+" "+profile;
  if(profile==="member"){
   await p.getByText("Área do usuário comum",{exact:true}).waitFor();check(tag+" common has no company selector",await p.getByRole("combobox",{name:"Empresa ativa"}).count()===0);check(tag+" common has no administration",await p.getByRole("heading",{name:"Grupos e empresas"}).count()===0);
  }else{
   await p.getByRole("heading",{name:"Grupos e empresas",exact:true}).waitFor();await p.getByText("Owner sintético",{exact:false}).waitFor();
   check(tag+" visible groups scoped",await p.getByText("Grupo Independente",{exact:true}).count()===(profile==="super_admin"?1:0));
   check(tag+" company list scoped",await p.getByText("Empresa Aurora",{exact:true}).count()===(profile==="recruiter"?0:1));
   check(tag+" only Super creates groups",await p.getByRole("button",{name:/Novo grupo$/}).count()===(profile==="super_admin"?1:0));
   check(tag+" group governance scoped",await p.getByRole("button",{name:"Administrar grupo",exact:true}).count()===(profile==="recruiter"?0:1));
   check(tag+" no implicit mutations",await p.evaluate(()=>window.__calls.length===0));
   await p.getByRole("button",{name:/Nova empresa$/}).first().click();await p.getByLabel("Nome da empresa",{exact:true}).fill("Empresa criada explicitamente");
   await p.getByRole("button",{name:"Salvar",exact:true}).click();await p.getByText("Empresa criada explicitamente",{exact:true}).waitFor();
   const calls=await p.evaluate(()=>window.__calls);check(tag+" explicit creation scoped and versioned",calls.length===1&&calls[0].groupId==="group-a"&&calls[0].input.revision===1&&calls[0].action==="create_company");
   check(tag+" shared state refreshed",await p.evaluate(()=>window.__refreshed===1));
   check(tag+" capacity full disables creation",!(await p.getByRole("button",{name:/Nova empresa$/}).first().isEnabled()));
   await p.locator("details[open] tbody tr").filter({hasText:"Empresa Horizonte"}).getByRole("button",{name:"Acessos",exact:true}).click();await p.getByText("Usuário comum sintético",{exact:true}).waitFor();
   await p.getByRole("button",{name:"Vincular",exact:true}).click();await p.getByRole("button",{name:"Confirmar",exact:true}).click();await p.getByText("Alteração registrada.",{exact:true}).waitFor();
   check(tag+" membership action explicit",await p.evaluate(()=>window.__calls.some(c=>c.action==="save_link"&&c.organizationId==="company-a"&&c.input.userId==="user-b"&&c.input.linked===true)));
   await p.getByRole("button",{name:"Atualizar",exact:true}).click();
   await p.screenshot({path:`${dir}/${profile}-${width}.png`,fullPage:true});
  }
  check(tag+" viewport contained",await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));check(tag+" no runtime exception",errors.length===0);await p.close();
 }
 const p=await browser.newPage();await p.goto("http://127.0.0.1:5847/multiempresa.html?profile=recruiter&fail=1");await p.getByRole("button",{name:/Nova empresa$/}).click();await p.getByLabel("Nome da empresa",{exact:true}).fill("Rascunho preservado");await p.getByRole("button",{name:"Salvar",exact:true}).click();await p.getByText("Falha sintética. Os dados confirmados foram preservados.",{exact:true}).last().waitFor();
 await p.getByRole("button",{name:"Tentar salvar novamente",exact:true}).click();await p.getByRole("button",{name:"Tentar salvar novamente",exact:true}).waitFor({state:"visible"});
 check("failed mutation preserves editor",await p.getByLabel("Nome da empresa",{exact:true}).inputValue()==="Rascunho preservado");
 await p.getByRole("button",{name:"Cancelar",exact:true}).click();await p.getByRole("button",{name:"Continuar editando",exact:true}).click();
 check("cancelled departure retains unsaved changes",await p.getByLabel("Nome da empresa",{exact:true}).inputValue()==="Rascunho preservado");
 await p.getByRole("button",{name:"Cancelar",exact:true}).click();await p.getByRole("button",{name:"Sair sem salvar",exact:true}).click();
 await p.getByLabel("Nome da empresa",{exact:true}).waitFor({state:"detached"});
 check("explicit discard closes editor",await p.getByLabel("Nome da empresa",{exact:true}).count()===0);await p.close();
}finally{await writeFile(dir+"/browser.json",JSON.stringify({checks},null,2));await browser.close();await server.close();}
console.log(JSON.stringify({checks:checks.length,pass:true}));
