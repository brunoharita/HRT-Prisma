// Synthetic browser regression; no network services, real people or LLM calls.
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdir,writeFile} from "node:fs/promises";
const {chromium}=createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH ?? "playwright");
const browser=await chromium.launch({headless:true,executablePath:process.env.PRISMA_BROWSER_PATH});
const url=process.env.PRISMA_PERSON_QA_URL ?? "http://127.0.0.1:5586/person-unified.html";
const evidence="docs/qa/evidence/person-unified-v210";
await mkdir(evidence,{recursive:true});
const reports=[];
try {
 for(const [scenario,width] of [["reference",2048],["reference",1024],["reference",390],["long",390],["member",1448],["recruiter",1448],["clean",1448],["operations-failure",1448],["analysis-failure",1448],["document-failure",1448],["not-requested",1448],["no-profile",390],["source-failure",1448],["archived",1448],["dirty",1448]]) {
  const page=await browser.newPage({viewport:{width,height:1000}});
  const errors=[];page.on("pageerror",err=>{errors.push(err.message);console.error(scenario,err.message);});
  const external=[];await page.route("**/*",route=>{if(!route.request().url().startsWith("http://127.0.0.1:5586/")) {external.push(route.request().url());return route.abort();}return route.continue();});
  await page.clock.install({time:new Date("2026-10-06T12:00:00Z")});
  await page.goto(`${url}?case=${scenario}`);await page.waitForSelector("h1");await page.waitForTimeout(700);
  const checks={};const check=(name,value)=>{checks[name]=Boolean(value);};
  check("singleIdentity",await page.locator("h1").count()===1);
  check("noHorizontalOverflow",await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  check("noExternalCalls",external.length===0);
  if(scenario!=="no-profile") {
   await page.waitForSelector(".prisma-synthesis-axes");
   check("sixIntegratedTabs",await page.locator(".prisma-m72-tabs > button").count()===6);
   check("eightOpenAnalyses",await page.locator(".prisma-synthesis-axes > *").count()===8);
   check("fourHighlights",await page.locator(".prisma-profile-highlight").count()===4);
   check("noIntermediateProfileButton",!await page.getByRole("button",{name:"Ver perfil",exact:true}).count());
  }
  if(scenario==="reference") {
   check("precisePendingDestination",await page.getByRole("button",{name:"Corrigir período",exact:true}).count()===1);
   const layout=await page.evaluate(()=>{const main=document.querySelector(".prisma-person-reading-main").getBoundingClientRect();const rail=document.querySelector(".prisma-person-reading-rail").getBoundingClientRect();const pending=document.querySelector(".prisma-person-reading-pending").getBoundingClientRect();const cards=[...document.querySelectorAll(".prisma-profile-highlight")].map(x=>x.getBoundingClientRect());return {ratio:main.width/(main.width+rail.width),columns:new Set(cards.map(x=>Math.round(x.x))).size,mainY:main.y,pendingY:pending.y};});
   check("responsiveHighlightColumns",layout.columns===(width===2048?4:width===1024?2:1));
   check("readingRailRatio",width!==2048 || layout.ratio>=.70 && layout.ratio<=.73);
   check("narrowPendingBeforeReading",width===2048 || layout.pendingY<layout.mainY);
   check("allNarrativeParagraphs",await page.locator(".prisma-synthesis-narrative .prisma-synthesis-statement").count()===3);
   check("qualificationsPreserved",await page.locator(".is-education").innerText().then(x=>x.includes("MBA")&&x.includes("Especialização")));
   await page.screenshot({path:`${evidence}/reference-${width}.png`,fullPage:true});
   await page.getByRole("button",{name:/Mostrar fontes/}).click();
   check("sourcesDoNotGenerate",await page.evaluate(()=>window.__PERSON_QA.calls.source===0&&window.__PERSON_QA.calls.request===0));
   await page.getByRole("button",{name:/Consultar fonte:/}).first().click();await page.waitForSelector("blockquote");
   check("sourceLazy",await page.evaluate(()=>window.__PERSON_QA.calls.source===1));
   check("analysisPreservedWithSource",await page.locator(".prisma-synthesis-axes > *").count()===8);
   await page.getByRole("button",{name:"Fechar fontes",exact:true}).click();await page.waitForTimeout(400);
   await page.getByRole("button",{name:/Ver resumo original do currículo/}).click();
   check("originalSummary",await page.getByText("Resumo original do currículo, preservado integralmente.",{exact:false}).count()>0);
   await page.getByRole("button",{name:"Voltar à leitura",exact:true}).click();await page.waitForTimeout(400);
   await page.locator(".prisma-m72-tabs").getByRole("button",{name:"Perfil completo",exact:true}).click();
   check("completeProfileRecords",await page.getByText("Inglês",{exact:true}).count()>0 && await page.getByText("Projeto sintético preservado.",{exact:true}).count()>0);
   await page.locator(".prisma-m72-tabs").getByRole("button",{name:"Documentos e revisões",exact:true}).click();
   check("documentContextPreserved",await page.getByRole("button",{name:/Corrigir Pessoa vinculada/}).count()>0 && await page.getByRole("button",{name:/Excluir documento/}).count()>0);
   await page.locator(".prisma-m72-tabs").getByRole("button",{name:"Histórico",exact:true}).click();
   check("operationalAuditAccessible",await page.getByRole("button",{name:"Consultar operações e auditoria",exact:true}).count()>0);
   await page.locator(".prisma-m72-tabs").getByRole("button",{name:"Resumo",exact:true}).click();await page.waitForSelector(".prisma-synthesis-axes");
   await page.getByRole("button",{name:"Corrigir período",exact:true}).click();await page.waitForTimeout(200);
   check("reviewFieldContext",await page.evaluate(()=>window.__PERSON_QA.calls.navigations.at(-1)?.includes("/documents/doc2/review/")&&Boolean(sessionStorage.getItem("prisma.review-focus.review-fixture"))));
   check("tabChangesDoNotGenerate",await page.evaluate(()=>window.__PERSON_QA.calls.request===0&&window.__PERSON_QA.calls.retry===0));
  }
  if(scenario==="dirty") {
   await page.getByRole("button",{name:/Nova importação/}).click();await page.getByRole("textbox",{name:"Texto profissional manual"}).fill("Texto ainda não salvo, preservado ao cancelar a saída.");
   await page.locator(".prisma-m72-tabs").getByRole("button",{name:"Resumo",exact:true}).click();
   check("dirtyConfirmation",await page.getByText("Sair sem salvar?",{exact:true}).count()>0);
   await page.getByRole("button",{name:"Continuar editando",exact:true}).click();await page.waitForTimeout(400);
   check("dirtyTextPreserved",await page.getByRole("textbox",{name:"Texto profissional manual"}).inputValue()==="Texto ainda não salvo, preservado ao cancelar a saída.");
  }
  if(scenario==="long") {check("longTextComplete",await page.getByText(/Trecho integral adicional 8:/).count()===8);await page.screenshot({path:`${evidence}/long-${width}.png`,fullPage:true});}
  if(scenario==="member") {
   check("noOperationalReads",await page.evaluate(()=>window.__PERSON_QA.calls.workspace===0&&window.__PERSON_QA.calls.versions===0));
   check("noOperationalControls",await page.getByRole("button",{name:/Nova importação/}).count()===0&&await page.getByRole("button",{name:"Mais ações",exact:true}).count()===0);
   check("noPrivateContact",!(await page.locator("body").innerText()).includes("private@example.invalid"));
  }
  if(scenario==="recruiter")check("curationAuthorityPreserved",await page.getByRole("button",{name:"Revisar competências",exact:true}).count()===0);
  if(scenario==="clean")check("noArtificialPending",await page.locator(".prisma-person-reading-pending").count()===0);
  if(scenario==="operations-failure") {check("profileSurvivesOperationsFailure",await page.locator(".prisma-synthesis-axes > *").count()===8);check("railFailureExplicit",await page.locator(".prisma-person-reading-rail").getByText("Não foi possível consultar documentos e operações.",{exact:true}).count()>0);await page.locator(".prisma-m72-tabs").getByRole("button",{name:"Documentos e revisões",exact:true}).click();check("optionalFailureExplicit",await page.getByText("Não foi possível consultar documentos e operações.",{exact:true}).count()>0);await page.locator(".prisma-m72-tabs").getByRole("button",{name:"Histórico",exact:true}).click();check("historyFailureExplicit",await page.getByText("Não foi possível consultar documentos e operações.",{exact:true}).count()>0);}
  if(scenario==="analysis-failure")check("publishedFallback",await page.getByText("Gestão de Negócios",{exact:true}).count()>0);
  if(scenario==="document-failure")check("publishedProfileSurvivesDocumentFailure",await page.getByText(/O Perfil v3 continua vigente/).count()>0);
  if(scenario==="not-requested")check("noAutomaticGeneration",await page.evaluate(()=>window.__PERSON_QA.calls.request===0&&window.__PERSON_QA.calls.retry===0));
  if(scenario==="no-profile")check("honestEmptyState",await page.getByText("Ainda não existe Perfil publicado para esta Pessoa.",{exact:true}).count()>0&&await page.getByRole("button",{name:/Nova importação/}).count()>0);
  if(scenario==="source-failure") {await page.getByRole("button",{name:/Mostrar fontes/}).click();await page.getByRole("button",{name:/Consultar fonte:/}).first().click();await page.waitForTimeout(150);check("localizedSourceFailure",await page.getByRole("button",{name:"Tentar novamente",exact:true}).count()>0&&await page.locator(".prisma-synthesis-axes > *").count()===8);check("sanitizedFailure",!(await page.locator("body").innerText()).includes("private diagnostic"));}
  if(scenario==="archived")check("archivedOperationsDisabled",await page.getByRole("button",{name:/Nova importação/}).isDisabled()&&await page.getByRole("button",{name:/Criar revisão/}).isDisabled());
  check("noRuntimeError",errors.length===0);
  reports.push({scenario,width,checks,errors});console.log(`${scenario}/${width}: ${Object.values(checks).every(Boolean)?"PASS":"FAIL"}`);
  await page.close();
 }
 await writeFile(`${evidence}/browser-results.json`,JSON.stringify(reports,null,2)+"\n");
 assert.ok(reports.every(report=>Object.values(report.checks).every(Boolean)),JSON.stringify(reports.filter(report=>Object.values(report.checks).includes(false))));
}finally {await browser.close();}
