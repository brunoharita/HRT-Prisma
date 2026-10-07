// Real modal and Ant Design controls; synthetic adapter only, no database/users/AI.
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdir,writeFile} from "node:fs/promises";
const {chromium}=createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH??"playwright");
const browser=await chromium.launch({headless:true,executablePath:process.env.PRISMA_BROWSER_PATH});
const dir=process.env.PRISMA_REVIEW_HELP_EVIDENCE??"docs/qa/evidence/trajectory-review-help-v213",base=process.env.PRISMA_REVIEW_BASE??"http://127.0.0.1:5693";
await mkdir(dir,{recursive:true});
const results=[];
async function pageFor(width,query="") {
 const page=await browser.newPage({viewport:{width,height:993},hasTouch:width<500});
 const errors=[],external=[];
 page.on("pageerror",e=>errors.push(e.message));
 await page.route("**/*",route=>{if(!route.request().url().startsWith(base+"/")){external.push(route.request().url());return route.abort();}return route.continue();});
 await page.goto(base+"/trajectory-review-help.html"+query);
 return {page,errors,external};
}
const fixture=page=>page.evaluate(()=>window.__trajectoryReviewFixture);
async function helpReady(page,pop) {await pop.getByText("Impacto ao salvar",{exact:true}).waitFor();await page.waitForTimeout(250);}
async function finish(ctx,scenario,width,checks) {
 checks.noRuntimeErrors=ctx.errors.length===0;checks.noExternalCalls=ctx.external.length===0;
 results.push({scenario,width,checks,errors:ctx.errors,external:ctx.external});
 assert.ok(Object.values(checks).every(Boolean),scenario+" "+width+": "+JSON.stringify(checks));
 await ctx.page.close();
}
try {
 for(const width of [969,390,320]) {
  const ctx=await pageFor(width),p=ctx.page;
  await p.getByRole("button",{name:"Revisar divergências",exact:true}).click();
  const dialog=p.getByRole("dialog"),sections=p.locator(".prisma-trajectory-conflict-item"),first=sections.first();
  await first.waitFor();await p.waitForTimeout(250);
  const save=p.getByRole("button",{name:"Salvar revisão",exact:true});
  const checks={threeChoicesEach:await first.getByRole("radio").count()===3,noneSelected:await p.locator('input[type="radio"]:checked').count()===0,saveInitiallyDisabled:await save.isDisabled()};
  checks.visibleDescriptions=await first.locator(".prisma-trajectory-choice-option > p").count()===3;
  checks.describedRadios=await first.getByRole("radio").evaluateAll(radios=>radios.every(r=>{const id=r.getAttribute("aria-describedby");return id&&document.getElementById(id)?.textContent.length>20;}));
  checks.scopeAndSaveNotice=await p.getByText(/A escolha será aplicada ao salvar a revisão/).count()===1;
  checks.declarationIsNotExperience=await first.getByText(/Uma declaração não se transforma em experiência profissional/).count()===1;
  await p.screenshot({path:dir+"/after-top-"+width+".png"});
  await first.locator(".prisma-trajectory-human-choice").scrollIntoViewIfNeeded();
  await p.screenshot({path:dir+"/after-choice-"+width+".png"});
  const info=first.getByRole("button",{name:"Entender opção Função relacionada",exact:true});
  const pop=p.locator(".prisma-trajectory-choice-popover:visible");
  if(width>500){await info.hover();await helpReady(p,pop);checks.hoverHelp=true;await p.keyboard.press("Escape");await pop.waitFor({state:"hidden"});checks.hoverEscapeKeepsModal=await dialog.isVisible();await p.mouse.move(0,0);}
  await first.getByRole("radio",{name:"Função relacionada",exact:true}).focus();await p.keyboard.press("Tab");checks.tabReachesHelp=await info.evaluate(el=>el===document.activeElement);
  await helpReady(p,pop);checks.focusHelp=await info.getAttribute("aria-expanded")==="true";
  await info.press("Escape");await pop.waitFor({state:"hidden"});checks.escapeKeepsModal=await dialog.isVisible();
  await info.press("Enter");await helpReady(p,pop);checks.enterHelp=await pop.getByText(/Não comprova atuação direta/).count()===1;
  await info.press("Escape");await pop.waitFor({state:"hidden"});
  await p.getByText("Sua classificação para este trecho",{exact:true}).first().click();
  if(width<500)await info.tap();else await info.click();
  await helpReady(p,pop);
  checks.clickOrTouchHelp=true;
  const bounds=await pop.boundingBox();checks.popoverFits=Boolean(bounds&&bounds.x>=0&&bounds.x+bounds.width<=width);
  await p.screenshot({path:dir+"/help-open-"+width+".png"});
  await pop.getByRole("button",{name:"Fechar ajuda",exact:true}).click();await pop.waitFor({state:"hidden"});checks.closeHelpKeepsModal=await dialog.isVisible();
  checks.helpDoesNotChoose=await p.locator('input[type="radio"]:checked').count()===0;
  const before=await fixture(p);checks.helpDoesNotSaveOrRefresh=before.loads===1&&before.saves.length===0&&before.refreshes===0;
  checks.noOverflow=await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&[...document.querySelectorAll(".prisma-trajectory-conflict-item")].every(e=>e.scrollWidth<=e.clientWidth+1));
  const readings=await first.locator(".prisma-trajectory-reading-pair > div").evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y};}));
  checks.readingTopology=width<500?readings[0].x===readings[1].x&&readings[1].y>readings[0].y:readings[1].x>readings[0].x;
  const footer=await save.boundingBox();checks.footerAccessible=Boolean(footer&&footer.y>=0&&footer.y+footer.height<=993);
  await first.getByRole("radio",{name:"Função relacionada",exact:true}).check();checks.partialCannotSave=await save.isDisabled();
  await sections.nth(1).getByRole("radio",{name:"Não é possível determinar",exact:true}).check();checks.completeCanSave=await save.isEnabled();
  await save.click();await p.getByText("Revisão registrada sem conclusão",{exact:true}).waitFor();
  const uncertain=await fixture(p);checks.uncertainKeepsModal=await dialog.isVisible()&&uncertain.resolved===0;
  checks.exactUncertainPayload=JSON.stringify(uncertain.saves[0])===JSON.stringify([{id:"summary",choice:"first"},{id:"experience",choice:"cannot_determine"}]);
  await sections.nth(1).getByRole("radio",{name:"Atuação direta",exact:true}).check();await save.click();await dialog.waitFor({state:"hidden"});
  const done=await fixture(p);checks.resolvedUsesExistingCallback=done.resolved===1&&done.saves.length===2&&done.saves[1][1].choice==="first";
  await finish(ctx,"help-and-save",width,checks);
 }
 for(const scenario of ["unauthorized","legacy","excess","error"]) {
  const ctx=await pageFor(390,"?case="+scenario),p=ctx.page,checks={};
  if(scenario==="unauthorized")checks.noReviewButton=await p.getByRole("button",{name:"Revisar divergências",exact:true}).count()===0;
  else {await p.getByRole("button",{name:"Revisar divergências",exact:true}).click();await p.getByRole("alert").waitFor();checks.noChoices=await p.getByRole("radio").count()===0;checks.noSave=await p.getByRole("button",{name:"Salvar revisão",exact:true}).count()===0;}
  const state=await fixture(p);checks.noAutomaticSaveOrRefresh=state.saves.length===0&&state.refreshes===0;checks.loadAuthority=scenario==="unauthorized"?state.loads===0:state.loads===1;
  if(scenario==="legacy"){await p.getByRole("button",{name:"Fazer nova checagem com IA para revisão",exact:true}).click();await p.getByRole("button",{name:"Fazer nova checagem com IA para revisão",exact:true}).waitFor({state:"hidden"});checks.legacyOnlyExplicitRefresh=(await fixture(p)).refreshes===1;}
  await finish(ctx,scenario,390,checks);
 }
 for(let pair=0;pair<6;pair++) {
  const ctx=await pageFor(969,"?case=categories&pair="+pair),p=ctx.page;
  await p.getByRole("button",{name:"Revisar divergências",exact:true}).click();const section=p.locator(".prisma-trajectory-conflict-item");await section.waitFor();
  const checks={allThreeDescribed:await section.locator(".prisma-trajectory-choice-option > p").count()===3,noneSelected:await p.locator('input[type="radio"]:checked').count()===0};
  const help=section.getByRole("button",{name:/Entender opção/});
  for(let side=0;side<2;side++){await help.nth(side).scrollIntoViewIfNeeded();await help.nth(side).focus();const pop=p.locator(".prisma-trajectory-choice-popover:visible");await helpReady(p,pop);checks["category"+side]=(await pop.innerText()).length>100&&!(await pop.innerText()).includes("undefined");await help.nth(side).press("Escape");await pop.waitFor({state:"hidden"});}
  await finish(ctx,"categories-"+pair,969,checks);
 }
} finally {await browser.close();await writeFile(dir+"/browser-results.json",JSON.stringify(results,null,2)+"\n");}
console.log(JSON.stringify({scenarios:results.length,checks:results.reduce((sum,r)=>sum+Object.keys(r.checks).length,0),pass:results.every(r=>Object.values(r.checks).every(Boolean))}));
