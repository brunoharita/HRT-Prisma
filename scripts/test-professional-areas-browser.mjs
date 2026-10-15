import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdir,writeFile,unlink} from "node:fs/promises";
import {resolve} from "node:path";
const{chromium}=createRequire(import.meta.url)("C:/Users/Bruno/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const dir="docs/qa/evidence/professional-areas-v274/browser";await mkdir(dir,{recursive:true});
const entry=resolve("tests/browser/manual-profile-v270.tsx").replaceAll("\\","/");
await writeFile("web/professional-areas-qa.html",`<html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root"></div><script type="module" src="/@fs/${entry}"></script></body></html>`);
const browser=await chromium.launch({headless:true,executablePath:"C:/Users/Bruno/AppData/Local/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe"});
const results=[],errors=[],outbound=[];
try{
 for(const width of [1448,390]){
  const p=await browser.newPage({viewport:{width,height:1000}});p.on("pageerror",e=>errors.push(e.message));
  await p.route("**/*",route=>{const host=new URL(route.request().url()).hostname;if(!["127.0.0.1","localhost"].includes(host)){outbound.push(host);return route.abort();}return route.continue();});
  await p.goto("http://127.0.0.1:5717/professional-areas-qa.html?view=knowledge");
  await p.getByRole("button",{name:/Nova área da empresa/}).click();
  const modal=p.getByRole("dialog");await modal.getByLabel("Nome da área").fill("Operações de RH");await modal.getByLabel("Descrição").fill("Gestão operacional de recursos humanos");
  await modal.getByRole("button",{name:"Salvar área",exact:true}).click();await p.getByText("Operações de RH",{exact:true}).waitFor();
  await p.getByRole("row").filter({hasText:"Operações de RH"}).getByRole("button",{name:"Editar",exact:true}).click();
  await modal.getByLabel("Nome da área").fill("Operações de Pessoas");await modal.getByRole("button",{name:"Salvar área",exact:true}).click();await p.getByText("Operações de Pessoas",{exact:true}).waitFor();await modal.waitFor({state:"hidden"});
  await p.screenshot({path:`${dir}/knowledge-local-${width}.png`,fullPage:true});results.push({width,localCreateEdit:true});
  await p.goto("http://127.0.0.1:5717/professional-areas-qa.html?view=knowledge&global=yes");await p.getByRole("button",{name:"Revisar contribuição",exact:true}).click();
  await p.getByRole("combobox",{name:"Destino da contribuição"}).click();await p.getByText("Recursos Humanos",{exact:true}).last().click();
  await p.getByRole("textbox",{name:"Motivo da decisão de área"}).fill("Área equivalente à referência global existente");await p.screenshot({path:`${dir}/curation-${width}.png`,fullPage:true});
  await p.getByRole("button",{name:"Associar à área global",exact:true}).click();await p.waitForFunction(()=>document.body.dataset.areaDecision==="recorded");results.push({width,globalCuration:true});
  await p.goto("http://127.0.0.1:5717/professional-areas-qa.html?view=editor&state=update");await p.getByRole("tab",{name:"Resumo",exact:true}).waitFor();
  const section=p.locator(".prisma-review-structured-pane summary").filter({hasText:"Posicionamento profissional"});if(!await section.evaluate(el=>el.parentElement.open))await section.click();
  const select=p.getByRole("combobox",{name:"Área profissional padronizada",exact:true});await select.scrollIntoViewIfNeeded();await select.click();await select.fill("HRBP");
  await p.getByText("Recursos Humanos",{exact:true}).last().click();await p.getByText("Escolha do gestor",{exact:true}).waitFor();await select.press("Escape");await p.locator(".prisma-professional-area-field").evaluate(el=>el.scrollIntoView({block:"start"}));
  await p.screenshot({path:`${dir}/profile-selection-${width}.png`,fullPage:false});
  await p.getByRole("button",{name:"Salvar rascunho",exact:true}).click();await p.waitForFunction(()=>window.qa.saved?.professionalAreaIds?.[0]==="area-rh");
  const saved=await p.evaluate(()=>({ids:window.qa.saved.professionalAreaIds,original:window.qa.saved.areasOfExpertise,publications:window.qa.publications}));assert.deepEqual(saved.ids,["area-rh"]);assert.equal(saved.publications,0);
  await p.getByRole("button",{name:/Comparar com o perfil atual/}).click();await p.getByText("Áreas profissionais padronizadas",{exact:true}).last().waitFor();assert.equal(await p.getByRole("combobox",{name:"Ação para Áreas profissionais padronizadas"}).count(),0);
  await p.screenshot({path:`${dir}/comparison-${width}.png`,fullPage:true});
  results.push({width,selectByAlias:true,draftSave:true,comparison:true,originalPreserved:saved.original,publicationCount:0});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,"page overflow");await p.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(outbound,[]);
}finally{await writeFile(`${dir}/checks.json`,JSON.stringify({results,errors,outbound},null,2));await browser.close();await unlink("web/professional-areas-qa.html");}
console.log(JSON.stringify(results));
