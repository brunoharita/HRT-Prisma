import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH??'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.PRISMA_BROWSER_PATH});
const dir='docs/qa/evidence/assessment-results-executive/integration',base='http://127.0.0.1:5710',checks=[];await mkdir(dir,{recursive:true});
const check=(name,value)=>{checks.push({name,pass:!!value});assert.ok(value,name);};
try{for(const width of [1448,768,390,320]){
 const page=await browser.newPage({viewport:{width,height:1080}}),errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():(external.push(r.request().url()),r.abort()));
 await page.goto(base+'/process-assessment.html?state=bank');await page.getByRole('button',{name:'Montar avaliação',exact:true}).waitFor();
 check(width+': configuration default controls preserved',await page.getByRole('spinbutton',{name:'Quantidade de questões',exact:true}).inputValue()==='20'&&await page.getByRole('spinbutton',{name:'Duração em minutos',exact:true}).inputValue()==='60');
 await page.getByRole('button',{name:'Montar avaliação',exact:true}).click();await page.waitForFunction(()=>window.__processFixture.workspace.assessment?.questions.length===20);
 check(width+': montage still reuses bank without paid generation or sending',await page.evaluate(()=>!window.__processFixture.calls.some(c=>['generate','send_batch','dispatch'].includes(c.action))));
 await page.goto(base+'/process-assessment.html?state=issued');await page.getByRole('button',{name:'Ver resultado e atividade',exact:true}).first().click();const dialog=page.getByRole('dialog',{name:'Resultado e atividade',exact:true});await dialog.getByRole('heading',{name:'Resultado e atividade',exact:true}).waitFor();
 check(width+': actual modal retains person context result and unavailable legacy duration',(await dialog.innerText()).includes('Rafael Lima')&&(await dialog.locator('.assessment-results-stats').innerText()).includes('20 / 20')&&(await dialog.locator('.assessment-results-stats').innerText()).includes('Indisponível'));
 await dialog.getByRole('tab',{name:'Questões',exact:true}).click();await dialog.locator('.assessment-results-questions summary').first().click();check(width+': actual process result retains immutable five options',(await dialog.locator('.assessment-results-questions details').first().innerText()).includes('E · Alternativa E'));
 await dialog.getByRole('tab',{name:'Registros',exact:true}).click();check(width+': actual modal keeps activity and partial-evidence limits',(await dialog.innerText()).includes('não comprovam consulta externa')&&(await dialog.innerText()).includes('Nenhum registro'));
 await dialog.getByRole('tab',{name:'Visão geral',exact:true}).click();await page.screenshot({path:dir+'/modal-'+width+'.png',fullPage:true});
 check(width+': no modal overflow with keyboard close available',await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1)&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});check(width+': closing preserves application status with no sends or cancellation',await page.evaluate(()=>window.__processFixture.workspace.attempts[0].status==='submitted'&&!window.__processFixture.calls.some(c=>['send_batch','cancel','dispatch','generate'].includes(c.action))));
 check(width+': no runtime errors or external requests',!errors.length&&!external.length);await page.close();
}}
finally{await writeFile(dir+'/checks.json',JSON.stringify({checks,limitations:['Synthetic process/client and local browser; no authenticated real candidate or paid action']},null,2));await browser.close();}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));
