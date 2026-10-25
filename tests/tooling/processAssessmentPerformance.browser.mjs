import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH??'C:/Users/Bruno/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.PRISMA_BROWSER_PATH??'C:/Users/Bruno/AppData/Local/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe'});
const base=process.env.PRISMA_ASSESSMENT_ORDER_BASE??'http://127.0.0.1:5710',dir=process.env.PRISMA_ASSESSMENT_ORDER_EVIDENCE??'docs/qa/evidence/process-assessment-performance',checks=[];
await mkdir(dir,{recursive:true});
const check=(name,value)=>{checks.push({name,pass:!!value});assert.ok(value,name);};
try{
 for(const width of [1448,768,390,320]){
  const page=await browser.newPage({viewport:{width,height:1080}}),errors=[],external=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>route.request().url().startsWith(base+'/')?route.continue():(external.push(route.request().url()),route.abort()));
  await page.goto(base+'/process-assessment.html?state=performance');
  const card=page.locator('.process-results-card');await card.waitFor();
  const surface=card.locator(width>1000?'.process-results-desktop':'.process-results-mobile');
  const rows=width>1000?surface.locator('tbody tr'):surface.locator('.process-result-person');
  await page.waitForFunction(()=>!document.querySelector('.process-results-card')?.textContent.includes('Consultando…'));
  check(width+': same order on desktop and mobile',JSON.stringify(await rows.locator(width>1000?'.process-result-name':'h3').allTextContents())===JSON.stringify(['André Santos','Eduarda Alves','Beatriz Lima','Carolina Nunes','Diego Costa','Fábio Souza']));
  const carolina=rows.filter({hasText:'Carolina Nunes'}),beatriz=rows.filter({hasText:'Beatriz Lima'}),zero=rows.filter({hasText:'Diego Costa'}),pending=rows.filter({hasText:'Eduarda Alves'}),expired=rows.filter({hasText:'Fábio Souza'});
  check(width+': Prisma and assessment values remain independent',(await carolina.innerText()).includes('60 / 100')&&(await carolina.innerText()).includes('90%')&&(await carolina.innerText()).includes('18 de 20 acertos')&&(await beatriz.innerText()).includes('82 / 100')&&(await beatriz.innerText()).includes('60%'));
  check(width+': state and provenance preserved',(await carolina.innerText()).includes('nota anterior preservada')&&(await carolina.innerText()).includes('Provisória'));
  check(width+': real zero differs from unavailable',(await zero.innerText()).includes('0 / 100')&&(await zero.innerText()).includes('0%')&&(await pending.innerText()).includes('Sem resultado')&&(await expired.innerText()).includes('Não realizada · prazo encerrado')&&!(await expired.innerText()).includes('0%'));
  check(width+': result summary count',JSON.stringify(await card.locator('.process-results-overview strong').allTextContents())===JSON.stringify(['6','4','2']));
  check(width+': score request bound to same org position and explicit process',await page.evaluate(()=>window.__processFixture.calls.filter(c=>c.action==='score_load').every(c=>c.body.org===window.__processFixture.workspace.organizationId&&c.body.vacancyId===window.__processFixture.workspace.vacancyId&&c.body.processId===window.__processFixture.workspace.process.id)));
  await carolina.getByRole('button',{name:'Ver resultado e atividade',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Resultado e atividade',exact:true});await dialog.waitFor();check(width+': detailed result still opens correct person',(await dialog.innerText()).includes('Carolina Nunes')&&(await dialog.innerText()).includes('18 / 20'));await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  check(width+': invitation details progressively disclosed',!(await carolina.locator('.process-result-deliveries').getByText('Aceitação pelo provedor; entrega e abertura não verificadas.',{exact:true}).isVisible()));
  await carolina.locator('summary').click();check(width+': delivery caveat preserved',await carolina.getByText('Aceitação pelo provedor; entrega e abertura não verificadas.',{exact:true}).isVisible());await carolina.locator('summary').click();
  check(width+': no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});
  await page.screenshot({path:`${dir}/page-${width}.png`,fullPage:true,animations:'disabled'});
  const captureStyle=await page.addStyleTag({content:'.prisma-skip-link,.prisma-mobile-navigation-trigger{visibility:hidden!important}'});
  await card.screenshot({path:`${dir}/results-${width}.png`,animations:'disabled'});
  await captureStyle.evaluate(element=>element.remove());
  check(width+': consultation does not mutate or charge',await page.evaluate(()=>window.__processFixture.calls.every(c=>['load','score_load'].includes(c.action))));
  await page.evaluate(()=>window.__processFixture.scoreFailure=true);await page.getByRole('button',{name:'Atualizar',exact:true}).click();await surface.getByText('Consulta não concluída. Use Atualizar para tentar novamente.',{exact:true}).first().waitFor();
  check(width+': optional failure keeps completed results visible',(await carolina.innerText()).includes('90%')&&await carolina.getByRole('button',{name:'Ver resultado e atividade',exact:true}).isEnabled());
  await page.evaluate(()=>{window.__processFixture.scoreFailure=false;window.__processFixture.scoreWrongProcess=true;});await page.getByRole('button',{name:'Atualizar',exact:true}).click();await surface.getByText('Consulta não concluída. Use Atualizar para tentar novamente.',{exact:true}).first().waitFor();check(width+': other process response exposes no Prisma value',!(await carolina.innerText()).includes('60 / 100'));
  await page.evaluate(()=>window.__processFixture.scoreWrongProcess=false);await page.getByRole('button',{name:'Atualizar',exact:true}).click();await carolina.getByText('60',{exact:false}).first().waitFor();
  await pending.locator('summary').click();await pending.getByRole('button',{name:'Retomar envio',exact:true}).click();await page.waitForFunction(()=>window.__processFixture.calls.some(c=>c.action==='dispatch'));check(width+': explicit resume preserves callback',await page.evaluate(()=>window.__processFixture.calls.filter(c=>c.action==='dispatch').length===1));
  await pending.getByRole('button',{name:'Cancelar aplicação',exact:true}).click();await page.getByRole('dialog',{name:'Cancelar esta aplicação?',exact:true}).getByRole('button',{name:'Cancelar aplicação',exact:true}).click();await page.waitForFunction(()=>window.__processFixture.workspace.attempts.some(t=>t.status==='cancelled'));check(width+': explicit cancellation preserved',await page.evaluate(()=>window.__processFixture.calls.filter(c=>c.action==='cancel').length===1));
  check(width+': no runtime errors or external requests',!errors.length&&!external.length);await page.close();
 }
 const page=await browser.newPage({viewport:{width:1448,height:1000}});await page.route('**/*',route=>route.request().url().startsWith(base+'/')?route.continue():route.abort());await page.goto(base+'/process-assessment.html?state=performance-history');const card=page.locator('.process-results-card');await card.waitFor();check('historical process remains read-only with results',await card.getByRole('button',{name:'Cancelar aplicação',exact:true}).count()===0&&await card.getByRole('button',{name:'Retomar envio',exact:true}).count()===0&&(await card.innerText()).includes('18 de 20 acertos'));await page.close();
}finally{await writeFile(dir+'/browser-checks.json',JSON.stringify({checks,limits:['Real page and result modal; synthetic services; no authenticated human, email, database mutation or paid AI.']},null,2)+'\n');await browser.close();}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));
