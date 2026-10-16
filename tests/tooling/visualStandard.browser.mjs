// Real components and existing deterministic fixtures. No remote DB, auth or LLM.
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdir,writeFile,readFile,unlink} from "node:fs/promises";
import {resolve} from "node:path";
import {execFileSync} from "node:child_process";
import {createServer} from "vite";
const {chromium}=createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH??"C:/Users/Bruno/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const baseline=process.argv.includes("--baseline"),phase=baseline?"before":"after",dir="docs/qa/evidence/visual-standard-v280",checks=[],measures=[];
const browser=await chromium.launch({headless:true,channel:"msedge"}),servers=[];
await mkdir(dir+"/"+phase,{recursive:true});
const check=(name,value)=>{checks.push({name,pass:Boolean(value)});assert.ok(value,name);};
const groupFilter=process.env.PRISMA_VISUAL_GROUPS?.split(",");
const statesOnly=process.argv.includes("--states-only");
function fixtureStateSource(group){
 const empty={selection:'fixture.processes.splice(0);',followup:'fixture.data.entries=[];',documents:'ingestion.listDocumentOperations=async()=>[];',foundation:'visualVacancy.list=async()=>[];',tokens:'fixture.overview.lots=[];fixture.overview.movements=[];fixture.overview.orders=[];fixture.overview.available=0;fixture.overview.account.available=0;',bank:'workspace.items=[];workspace.proposals=[];workspace.gaps=[];workspace.requests=[];',person:'projection.associations=[];projection.normalization.items=[];'}[group];
 const error={foundation:'visualVacancy.list=async()=>{throw Error("Falha sintética de Posições.");};',person:'const read=repository.loadPersonProfile;repository.loadPersonProfile=async()=>({...await read(),professionalEvidence:null,professionalEvidenceError:"Falha sintética das evidências."});',followup:'const read=transport.rpc;transport.rpc=async(name,args)=>name==="get_position_follow_up"?{data:null,error:{code:"50000",message:"Synthetic read failure"}}:read(name,args);'}[group]??'fixture.fail=true;';
 return empty?`\nconst v280VisualState=new URLSearchParams(location.search).get("visual-state");if(v280VisualState==="empty"){${empty}}if(v280VisualState==="error"){${error}}`:"";
}
// New scenarios can still capture the exact baseline source after implementation.
const baselineFiles=new Set(baseline?execFileSync("git",["diff","--name-only","a33c3d4d7b779351855fbf173701925afe9e1033","--","web/src"],{encoding:"utf8"}).trim().split(/\r?\n/):[]);
const groups=[
 {name:"manual",config:"web/vite.config.ts",port:5810,path:"/visual-standard-qa.html?view=editor",ready:".prisma-review-tabs",tabs:".prisma-review-tabs [role=tab]",roles:{".prisma-extracted-surface > small":14,".prisma-reviewed-surface > small":14,".prisma-review-tabs .ant-tabs-tab":14}},
 {name:"selection",config:"tests/ui/selection-processes.vite.config.mts",port:5811,path:"/selection-processes.html",ready:".sp-process",tabs:".sp-detail [role=tab]",roles:{".sp-process":16,".sp-stage-row":16,".sp-stage-summary h3":20,".sp-detail h2":24,".sp-list .ant-segmented-item-label":14}},
 {name:"followup",config:"tests/ui/position-follow-up.vite.config.mts",port:5812,path:"/position-follow-up.html",ready:".pf-card",roles:{".pf-person":16,".pf-title":14,".pf-location":14,".pf-card-bottom > .ant-btn":14,".pf-score-notice":14,".ant-modal-confirm-title":24}},
 {name:"person",config:"tests/ui/person-unified.vite.config.mts",port:5813,path:"/person-unified.html?case=visual-option4",ready:".prisma-m72-tabs",roles:{".prisma-m81-subgroup-table td":16,".prisma-m81-table-link":16,".prisma-m72-filters > label":14,".prisma-m72-collapse-label small":14,".prisma-m72-metrics span":14}},
 {name:"foundation",config:"tests/ui/visual-foundation.vite.config.mts",port:5814,path:"/visual-foundation.html?page=/vacancies&fixture=visual-standard",ready:".prisma-vacancy-table-wrap td",roles:{".prisma-vacancy-table-wrap td":16}},
 {name:"documents",config:"tests/ui/operational-focus.vite.config.mts",port:5815,path:"/operational-focus.html?page=operations",ready:".prisma-operations-table",roles:{".prisma-operation-date":14,".prisma-operation-next-action":16}},
 {name:"tokens",config:"tests/ui/tokens-prisma.vite.config.mts",port:5816,path:"/tokens-prisma.html",ready:".tokens-wallet-layout",roles:{".tokens-source .ant-btn-link":14,".tokens-sources .ant-card-body > p":14}},
 {name:"bank",config:"tests/ui/question-bank.vite.config.mts",port:5817,path:"/question-bank.html",ready:".prisma-bank-row",roles:{".prisma-bank-stem":16,".prisma-bank-context":14,".prisma-bank-muted":14}},
];
async function capture(page,key,group){
 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(120);
 const m=await page.evaluate(roles=>{
  const visible=n=>n.getClientRects().length&&getComputedStyle(n).visibility!=="hidden";
  const read=selector=>[...document.querySelectorAll(selector)].filter(visible).map(n=>{const s=getComputedStyle(n);return {text:n.textContent.slice(0,110),size:s.fontSize,line:s.lineHeight,weight:s.fontWeight,color:s.color,vertical:s.verticalAlign};});
  return {roles:Object.fromEntries(Object.keys(roles).map(s=>[s,read(s)])),heads:read("h1,h2,h3,.ant-card-head-title,.ant-drawer-title,.ant-modal-title"),links:read(".prisma-reading .ant-btn-link:not(:disabled),.prisma-reading .prisma-m81-table-link,.prisma-reading .prisma-vacancy-title-link,.prisma-density-compact .pf-person"),tables:read(".prisma-content-standard td,.prisma-m81-subgroup-table td"),portalOverflow:[...document.querySelectorAll(".ant-drawer-body,.ant-modal-body")].filter(visible).some(n=>n.scrollWidth>n.clientWidth+1),overflow:document.documentElement.scrollWidth>innerWidth+1,overflowNodes:[...document.querySelectorAll("body *")].filter(visible).filter(n=>n.getBoundingClientRect().right>innerWidth+2).slice(-12).map(n=>({tag:n.tagName,cls:n.className,right:n.getBoundingClientRect().right})),text:document.querySelector("main")?.innerText??document.body.innerText};
 },group.roles);
 measures.push({key,...m});
 if(baseline)checks.push({name:key+" baseline overflow recorded",pass:!m.overflow});else check(key+" no page overflow",!m.overflow);
 if(!baseline){for(const [selector,items]of Object.entries(m.roles))if(items.length)check(key+" "+selector,items.every(i=>i.size===group.roles[selector]+"px"));
  if(m.tables.length)check(key+" table top",m.tables.every(i=>i.vertical==="top"));
  const prior=JSON.parse(await readFile(dir+"/before.json","utf8")).measures.find(x=>x.key===key);
  check(key+" substantive baseline",Boolean(prior)&&m.text.length>40);
  const normalize=text=>text.replace(/v2\.(?:7\.8|8\.0)/g,"VERSION").replace(/\s+/g," ").trim();
  check(key+" content preserved",normalize(prior.text)===normalize(m.text));
  check(key+" portal local reflow",!m.portalOverflow);
  if(m.links.length)check(key+" blue text links",m.links.every(i=>["rgb(21, 94, 239)","rgb(11, 78, 217)"].includes(i.color)));
  for(const [selector,items]of Object.entries(m.roles)){
   const secondary=[".prisma-operation-date",".prisma-m72-filters > label",".prisma-m72-collapse-label small",".prisma-m72-metrics span",".prisma-bank-context",".prisma-bank-muted"].includes(selector);
   const primary=[".prisma-operation-next-action",".prisma-bank-stem"].includes(selector);
   if(items.length&&(secondary||primary))check(key+" semantic text color "+selector,items.every(i=>i.color===(secondary?"rgb(83, 99, 125)":"rgb(16, 32, 58)")));
   if(items.length){const emphasis=[".pf-person",".prisma-bank-stem",".prisma-m81-table-link",".prisma-m72-filters > label",".prisma-m72-metrics span",".pf-card-bottom > .ant-btn",".tokens-source .ant-btn-link",".sp-stage-summary h3",".sp-detail h2",".ant-modal-confirm-title"].includes(selector);check(key+" semantic weight "+selector,items.every(i=>i.weight===(emphasis?"600":"400")));}
  }
 }
 const filename=key.normalize("NFD").replace(/[\u0300-\u036f]/g,"");
 await page.screenshot({path:dir+"/"+phase+"/"+filename+".png",fullPage:await page.getByRole("dialog").count()===0,animations:"disabled"});
}
async function keyboardTab(page,tab){const id=await tab.getAttribute("id");await tab.focus();await page.keyboard.press("Enter");await page.waitForFunction(id=>document.getElementById(id)?.getAttribute("aria-selected")==="true",id);if(!baseline)check("keyboard focus "+id,await tab.evaluate(n=>n===document.activeElement&&getComputedStyle(n).outlineStyle!=="none"));}
try{
 await writeFile("web/visual-standard-qa.html",`<html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root"></div><script type="module" src="/@fs/${resolve("tests/browser/manual-profile-v270.tsx").replaceAll("\\","/")}"></script></body></html>`);
 for(const group of groups.filter(g=>!groupFilter||groupFilter.includes(g.name))){
  console.log(phase,group.name);
  const fixtureDirectories={selection:"selection-processes",followup:"position-follow-up",person:"person-unified",foundation:"visual-foundation",documents:"operational-focus",tokens:"tokens-prisma",bank:"question-bank"};
  const plugins=[{name:"visual-baseline-source",enforce:"pre",transform(code,id){const file=id.replaceAll("\\","/").split("?")[0],relative=file.slice(file.indexOf("/web/src/")+1);if(baseline&&baselineFiles.has(relative))return execFileSync("git",["show","a33c3d4d7b779351855fbf173701925afe9e1033:"+relative],{encoding:"utf8"});if(group.name==="manual"&&file.endsWith("/infrastructure/supabase/client.ts"))return 'export const supabase={};';if(file.endsWith(`/tests/ui/${fixtureDirectories[group.name]}/fixture.ts`))return code+fixtureStateSource(group.name);}}];
  const server=await createServer({configFile:group.config,cacheDir:"tmp/vite-v280-visual-"+group.name,plugins,server:{host:"127.0.0.1",port:group.port,strictPort:true},logLevel:"error"});await server.listen();servers.push(server);
  for(const width of (process.env.PRISMA_VISUAL_WIDTHS??"1448,390").split(",").map(Number)){
   const p=await browser.newPage({viewport:{width,height:1000}}),errors=[],outbound=[];p.setDefaultTimeout(10000);
   p.setDefaultNavigationTimeout(30000);
   await p.emulateMedia({reducedMotion:"reduce"});
   p.on("pageerror",e=>errors.push(e.message));const base=`http://127.0.0.1:${group.port}`;
   await p.route("**/*",r=>r.request().url().startsWith(base+"/")?r.continue():(outbound.push(r.request().url()),r.abort()));
   await p.clock.install({time:new Date("2026-10-16T12:00:00Z")});
   await p.goto(base+group.path);await p.locator(group.ready).first().waitFor();
   if(!statesOnly){
   await capture(p,group.name+"-"+width,group);
   if(group.name==="selection"&&width===390){await p.locator(".sp-process").first().click();await p.locator(".sp-detail:visible").waitFor();await capture(p,"selection-detail-"+width,group);}
   if(group.tabs){const tabs=await p.locator(group.tabs).all();for(let i=0;i<tabs.length;i++){await keyboardTab(p,tabs[i]);await capture(p,group.name+"-tab"+i+"-"+width,group);}}
   if(group.name==="manual"){
    await p.goto(base+"/visual-standard-qa.html?view=baseline");await p.locator(group.ready).waitFor();await capture(p,"review-reference-"+width,group);
    await p.goto(base+"/visual-standard-qa.html?view=editor&state=empty");await p.locator(group.ready).waitFor();await capture(p,"manual-empty-"+width,group);
    await p.goto(base+"/visual-standard-qa.html?view=editor&state=error");await p.getByText(/Falha sintética recuperável/).first().waitFor({state:baseline?"attached":"visible"});await capture(p,"manual-error-"+width,group);
    await p.goto(base+"/visual-standard-qa.html?view=delta");await p.locator(".prisma-delta-page").waitFor();await capture(p,"delta-"+width,group);
    await p.goto(base+"/visual-standard-qa.html?view=start");await p.locator(".prisma-manual-profile-start").waitFor();await capture(p,"manual-start-"+width,group);
   }
   if(group.name==="person"){
    for(const label of ["Competências","Evidências","Documentos e revisões","Histórico"]){const target=p.locator(".prisma-m72-tabs button").filter({hasText:label});if(await target.count()){await target.click();await capture(p,"person-"+label.split(" ")[0]+"-"+width,group);
     if(label==="Competências"){
      await p.locator(".prisma-m72-concept-collapse .ant-collapse-header").first().click();
      await p.getByRole("button",{name:/Abrir detalhe do subagrupador/}).first().click();await p.locator(".prisma-m81-subgroup-table td").first().waitFor();await capture(p,"person-table-"+width,group);
      await p.locator(".prisma-m81-table-link").first().click();await p.locator(".prisma-m81-detail-heading").waitFor();await capture(p,"person-concept-"+width,group);
     }
    }}
   }
   if(group.name==="followup"){
    await p.locator(".pf-card-bottom > .ant-btn").first().click();await p.locator(".pf-drawer .ant-drawer-body").waitFor();await capture(p,"followup-drawer-"+width,group);
    const notes=p.getByLabel("Anotações e perguntas internas"),original=await notes.inputValue();await notes.fill(original+" Rascunho sintético");await p.locator(".pf-drawer .ant-drawer-close").click();await p.getByRole("button",{name:"Continuar editando",exact:true}).waitFor();await capture(p,"followup-confirm-"+width,group);
    await p.getByRole("button",{name:"Continuar editando",exact:true}).click();await p.getByRole("dialog",{name:"Descartar alterações não salvas?",exact:true}).waitFor({state:"hidden"});check("draft retained "+width,await notes.inputValue()===original+" Rascunho sintético");await notes.fill(original);await p.keyboard.press("Escape");await p.locator(".pf-drawer [role=dialog]").waitFor({state:"hidden"});
   }
   if(group.name==="tokens"&&width===390){await p.locator(".tokens-sources-mobile .ant-collapse-header").first().click();await capture(p,"tokens-source-open-"+width,group);}
   if(group.name==="documents"){await p.goto(base+"/operational-focus.html?page=document");await p.locator(".prisma-document-summary-grid").waitFor();await capture(p,"document-detail-"+width,group);}
   if(group.name==="bank"){
    await p.getByRole("button",{name:"Ver questão",exact:true}).first().click();const dialog=p.getByRole("dialog");await dialog.waitFor();await capture(p,"bank-drawer-"+width,group);
    if(!baseline)check("bank drawer title "+width,await dialog.locator(".ant-drawer-title").evaluate(e=>getComputedStyle(e).fontSize==="24px"));
    await p.keyboard.press("Escape");await dialog.waitFor({state:"hidden"});check("bank Escape "+width,true);
   }
   }
   if(statesOnly&&group.name!=="manual"){
    for(const state of ["empty","error"]){
     await p.goto(base+group.path+(group.path.includes("?")?"&":"?")+"visual-state="+state);
     if(group.name==="person") {await p.locator(".prisma-m72-tabs").waitFor();await p.locator(".prisma-m72-tabs button").filter({hasText:"Competências"}).click();}
     await p.locator((state==="empty"?".ant-empty":group.name==="person"?".ant-alert-warning":".ant-alert-error")+":visible").first().waitFor();
     await capture(p,group.name+"-"+state+"-"+width,group);
    }
    if(!baseline&&group.name==="foundation"){
     await p.goto(base+group.path);await p.locator(group.ready).first().waitFor();await p.getByLabel("Buscar Posições",{exact:true}).fill("Gerente");check("Position search "+width,await p.locator(".prisma-vacancy-table-wrap tbody tr").count()===1);await p.getByLabel("Buscar Posições",{exact:true}).fill("");await p.getByText("Ocupadas 1",{exact:true}).click();check("Position occupancy filter "+width,await p.locator(".prisma-vacancy-table-wrap tbody tr").count()===1);await p.locator(".prisma-vacancy-title-link").first().click();await p.getByRole("heading",{name:"Olá!",exact:true}).waitFor();check("Position navigation "+width,true);
    }
    if(!baseline&&group.name==="documents"){
     await p.goto(base+group.path);await p.locator(group.ready).first().waitFor();await p.locator(".prisma-operation-open").first().click();check("Document Person navigation "+width,await p.evaluate(()=>window.__operationalFixture.navigations.at(-1)==="/profiles/person-fixture"));await p.goto(base+"/operational-focus.html?page=document");await p.locator(".prisma-document-technical > summary").click();check("Document audit remains accessible "+width,await p.getByText("Documento ID",{exact:true}).isVisible());check("Document disclosure reads only "+width,await p.evaluate(()=>window.__operationalFixture.calls.every(x=>x.action.startsWith("read-"))));
    }
   }
   check(group.name+"/"+width+" no runtime errors",errors.length===0);check(group.name+"/"+width+" no external calls",outbound.length===0);await p.close();
  }
  await server.close();servers.pop();
 }
}finally{
 const previous=groupFilter?JSON.parse(await readFile(dir+"/"+phase+".json","utf8").catch(()=>'{"checks":[],"measures":[]}')):{checks:[],measures:[]};
 const keys=new Set(measures.map(x=>x.key));
 await writeFile(dir+"/"+phase+".json",JSON.stringify({checks:[...previous.checks.filter(x=>!checks.some(y=>y.name===x.name)),...checks],measures:[...previous.measures.filter(x=>!keys.has(x.key)),...measures],baseline:"a33c3d4d7b779351855fbf173701925afe9e1033",limits:["Synthetic fixtures, actual components; no authenticated production journey or real writes."]},null,2));
 await unlink("web/visual-standard-qa.html").catch(()=>{});for(const server of servers)await server.close();await browser.close();
}
console.log(JSON.stringify({phase,checks:checks.length,states:measures.length,pass:true}));
