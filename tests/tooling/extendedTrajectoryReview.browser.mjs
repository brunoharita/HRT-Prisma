import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdir,writeFile} from "node:fs/promises";
const {chromium}=createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH??"playwright");
const browser=await chromium.launch({headless:true,executablePath:process.env.PRISMA_BROWSER_PATH});
const base=process.env.PRISMA_REVIEW_BASE??"http://127.0.0.1:5693",dir="docs/qa/evidence/extended-trajectory-review",results=[];
let activePage;
await mkdir(dir,{recursive:true});
try {for(const width of (process.env.PRISMA_REVIEW_FOCUSED?[320]:[1280,390,320]))for(const count of (process.env.PRISMA_REVIEW_FOCUSED?[6]:[1,5,6,21])) {
  console.log(`Checking ${width}/${count}`);
  const p=await browser.newPage({viewport:{width,height:980}}),errors=[],external=[];
  activePage=p;
  p.on("pageerror",e=>errors.push(e.message));await p.route("**/*",r=>r.request().url().startsWith(base+"/")?r.continue():(external.push(r.request().url()),r.abort()));
  await p.goto(`${base}/trajectory-review-help.html?case=count&count=${count}`);
  const checks={},dialog=p.getByRole("dialog"),items=p.locator(".prisma-trajectory-conflict-item"),state=()=>p.evaluate(()=>window.__trajectoryReviewFixture);
  await p.getByRole("button",{name:"Revisar divergências",exact:true}).click();await dialog.waitFor();
  if(count>5) {
    await p.getByText(`${count} itens divergentes para revisar`,{exact:true}).waitFor();checks.promptBeforeChoices=await items.count()===0;
    await p.waitForTimeout(300);await p.screenshot({path:`${dir}/confirm-${count}-${width}.png`});
    await p.getByRole("button",{name:"Não, manter cálculo",exact:true}).click();await dialog.waitFor({state:"hidden"});await p.waitForTimeout(300);
    checks.declineNoMutation=(await state()).saves.length===0&&(await state()).resolved===0&&(await state()).refreshes===0;
    await p.getByRole("button",{name:"Revisar divergências",exact:true}).click();await p.getByRole("button",{name:"Sim, revisar itens",exact:true}).click();
  }
  await items.first().waitFor();checks.expectedPageSize=await items.count()===(count>5?1:count);checks.noneSelected=await p.locator('input[type="radio"]:checked').count()===0;
  const save=p.getByRole("button",{name:"Salvar revisão",exact:true});checks.saveDisabled=await save.isDisabled();
  for(let i=0;i<count;i++) {
    const section=count>5?items.first():items.nth(i);
    await section.getByRole("radio",{name:"Função relacionada",exact:true}).check();
    if(count>5&&i===0) {
      await p.locator(".ant-pagination-next").click();await p.getByRole("region",{name:"Item 2 para revisão"}).waitFor();
      await p.locator(".ant-pagination-prev").click();await p.getByRole("region",{name:"Item 1 para revisão"}).waitFor();
      checks.backPreservesChoice=await items.getByRole("radio",{name:"Função relacionada",exact:true}).isChecked();
    }
    if(i<count-1) {checks.partialDisabled=(checks.partialDisabled??true)&&await save.isDisabled();if(count>5)await p.locator(".ant-pagination-next").click();}
  }
  checks.noSaveFromNavigation=(await state()).saves.length===0&&(await state()).refreshes===0&&(await state()).resolved===0;
  checks.allCanSave=await save.isEnabled();checks.noOverflow=await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&[...document.querySelectorAll('.prisma-trajectory-conflict-item')].every(e=>e.scrollWidth<=e.clientWidth+1));
  if(count>5){await p.waitForTimeout(300);await p.screenshot({path:`${dir}/last-${count}-${width}.png`});}
  await save.click();await dialog.waitFor({state:"hidden"});const final=await state();
  checks.completePayload=final.saves.length===1&&final.saves[0].length===count&&new Set(final.saves[0].map(i=>i.id)).size===count&&final.saves[0].every(i=>i.choice==="first");checks.oneResolvedCallback=final.resolved===1;
  checks.noRuntimeErrors=errors.length===0;checks.noExternalCalls=external.length===0;results.push({width,count,checks,errors,external});assert.ok(Object.values(checks).every(Boolean),JSON.stringify(results.at(-1)));await p.close();
}
for(const scenario of ["uncertain","saveError"]){
  console.log(`Checking ${scenario}`);
  const p=await browser.newPage({viewport:{width:390,height:980}}),errors=[],external=[];
  activePage=p;
  p.on("pageerror",e=>errors.push(e.message));await p.route("**/*",r=>r.request().url().startsWith(base+"/")?r.continue():(external.push(r.request().url()),r.abort()));
  await p.goto(`${base}/trajectory-review-help.html?case=count&count=6&saveDelay=1${scenario==="saveError"?'&saveError=1':''}`);
  await p.getByRole("button",{name:"Revisar divergências",exact:true}).click();await p.getByRole("button",{name:"Sim, revisar itens",exact:true}).click();
  const items=p.locator('.prisma-trajectory-conflict-item'),save=p.getByRole('button',{name:'Salvar revisão',exact:true});
  for(let i=0;i<6;i++){await items.getByRole('radio',{name:i===5&&scenario==='uncertain'?'Não é possível determinar':'Função relacionada',exact:true}).check();if(i<5)await p.locator('.ant-pagination-next').click();}
  await save.click();await p.locator('.prisma-loading-feedback').waitFor({state:'visible'});
  // Ant Design disables the pagination action on the item, not its decorative inner button.
  await p.locator('.ant-pagination-prev').evaluate(element=>element.click());await p.waitForTimeout(50);
  const checks={savingVisible:true,choicesDisabled:await items.getByRole('radio').first().isDisabled(),paginationDisabled:await p.getByRole('region',{name:'Item 6 para revisão',exact:true}).count()===1};
  await p.evaluate(()=>window.__trajectoryReviewFixture.finishSave());
  await p.getByText(scenario==='uncertain'?'Revisão registrada sem conclusão':'Falha sintética ao salvar revisão.',{exact:true}).waitFor();
  await p.locator('.prisma-loading-feedback').waitFor({state:'hidden'});
  checks.keepsDialog=await p.getByRole('dialog').isVisible();checks.keepsCalculation=await p.getByText('Cálculo anterior preservado para demonstração.',{exact:true}).count()===1;
  checks.noResolvedCallback=await p.evaluate(()=>window.__trajectoryReviewFixture.resolved===0);checks.choicePreserved=await items.getByRole('radio',{name:scenario==='uncertain'?'Não é possível determinar':'Função relacionada',exact:true}).isChecked();checks.retryEnabled=await save.isEnabled();
  checks.noRuntimeErrors=errors.length===0;checks.noExternalCalls=external.length===0;results.push({scenario,width:390,count:6,checks,errors,external});assert.ok(Object.values(checks).every(Boolean),JSON.stringify(results.at(-1)));await p.close();
}
}catch(error){if(activePage&&!activePage.isClosed()){await activePage.screenshot({path:'output/extended-review-failure.png'});await writeFile('output/extended-review-failure.txt',await activePage.locator('body').innerText());}throw error;}finally{await browser.close();await writeFile(dir+"/browser-results.json",JSON.stringify(results,null,2)+'\n');}
console.log(`PASS ${results.length} scenarios`);
