import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH??'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.PRISMA_BROWSER_PATH});
const dir='docs/qa/evidence/assessment-question-timeline/browser',checks=[];
await mkdir(dir,{recursive:true});
const check=(name,pass)=>{checks.push({name,pass:!!pass});assert.ok(pass,name);};
try{
 for(const width of [1448,390]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[],outside=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>/^http:\/\/127\.0\.0\.1:(5792|5698)\//.test(r.request().url())?r.continue():(outside.push(r.request().url()),r.abort()));
  await page.goto('http://127.0.0.1:5792/assessment-activity.html?mode=timeline');
  await page.getByRole('tab',{name:'Registros',exact:true}).click();
  const surface=page.locator(width<600?'.assessment-activity-mobile':'.assessment-activity-table');
  await surface.getByRole('button',{name:'Ver acontecimentos',exact:true}).first().click();
  const timeline=surface.getByRole('region',{name:'Linha do tempo da questão 1',exact:true});
  await timeline.getByText('Primeira escolha observada:',{exact:false}).waitFor();
  check(width+': focus interval ordered by start before later point event',JSON.stringify(await timeline.locator('.assessment-event').evaluateAll(nodes=>nodes.map(n=>n.dataset.eventId)))===JSON.stringify(['30','31','32','33','34']));
  const text=await timeline.innerText();
  check(width+': final answer outcome and choice transition together',text.includes('Resposta final da aplicação')&&text.includes('Resposta correta')&&text.includes('Primeira escolha observada: Alternativa B')&&text.includes('Escolha alterada de Alternativa B')&&text.includes('para Alternativa A'));
  check(width+': intervals and partial observation limits explicit',text.includes('09:26:01 a 09:26:04')&&text.includes('não garantem observação contínua')&&text.includes('Isso não confirma que foi lida'));
  await page.screenshot({path:dir+'/timeline-'+width+'.png',fullPage:true});
  await page.goto('http://127.0.0.1:5792/assessment-activity.html?mode=cache');
  await page.getByRole('tab',{name:'Registros',exact:true}).click();
  await surface.getByRole('button',{name:'Ver acontecimentos',exact:true}).first().click();
  check(width+': legacy timeline remains explicitly incomplete',(await surface.innerText()).includes('Registro parcial: sem marco de exibição da questão e primeira escolha'));
  check(width+': review is read-only and has no paid calls',await page.evaluate(()=>window.__activityFixture.calls.every(x=>x.action==='assessment_activity_analysis_load')));
  await page.screenshot({path:dir+'/legacy-'+width+'.png',fullPage:true});
  await page.goto('http://127.0.0.1:5698/position-assessment.html?state=portal');
  await page.getByRole('radio').first().waitFor();
  const q=await page.evaluate(()=>window.__assessmentFixture.portal.questions[0]);
  await page.getByRole('radio').nth(1).check();await page.getByRole('radio').first().check();
  await page.waitForFunction(()=>window.__assessmentFixture.calls.some(x=>x.action==='events'&&x.body.events.some(e=>e.kind==='answer_changed')));
  const received=await page.evaluate(()=>window.__assessmentFixture.calls.filter(x=>x.action==='events').flatMap(x=>x.body.events));
  const selected=received.find(e=>e.kind==='answer_selected'),changed=received.find(e=>e.kind==='answer_changed');
  check(width+': collector records first display and correct version',received.some(e=>e.kind==='question_displayed'&&e.questionInstanceId===q.id&&e.questionVersion===q.version));
  check(width+': first and changed choices carry official IDs only',selected?.values.optionId===q.options[1].id&&selected.values.previousOptionId===null&&changed?.values.previousOptionId===q.options[1].id&&changed.values.optionId===q.options[0].id&&selected.method==='position-assessment-response-timeline-1.0.0');
  await page.getByRole('button',{name:'Revisar avaliação',exact:true}).click();
  const reviewCount=await page.evaluate(()=>window.__assessmentFixture.calls.filter(x=>x.action==='events').flatMap(x=>x.body.events).filter(e=>e.kind==='question_displayed').length);
  check(width+': review has no active question content',await page.locator('[data-assessment-question]').count()===0);
  const buffered=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('prisma-pa-buffer:')).flatMap(k=>JSON.parse(localStorage[k]).events));
  check(width+': review does not emit another display',reviewCount===1&&!buffered.some(e=>e.kind==='question_displayed'));
  check(width+': responsive and no external traffic or runtime errors',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)&&errors.length===0&&outside.length===0);
  await page.close();
 }
}finally{await writeFile(dir+'/checks.json',JSON.stringify({checks,limits:['Synthetic local QA only; no production participant or paid IA','Legacy data stays partial; deterministic reconstruction of observed events only']},null,2));await browser.close();}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));
