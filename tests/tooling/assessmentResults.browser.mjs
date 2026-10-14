import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH??'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.PRISMA_BROWSER_PATH});
const base='http://127.0.0.1:5792',dir=process.env.PRISMA_EVIDENCE_DIR??'docs/qa/evidence/assessment-results-executive/browser';
await mkdir(dir,{recursive:true});const checks=[];
const check=(name,value)=>{checks.push({name,pass:!!value});assert.ok(value,name);};
async function select(page,name,label){await page.getByRole('combobox',{name,exact:true}).click();await page.locator('.ant-select-dropdown:visible').getByText(label,{exact:true}).click();}
const calls=page=>page.evaluate(()=>window.__activityFixture.calls);
try{
 for(const width of [1448,768,390,320]){
  const page=await browser.newPage({viewport:{width,height:1080},timezoneId:'Asia/Tokyo'}),errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():(external.push(r.request().url()),r.abort()));
  await page.goto(base+'/assessment-activity.html?mode=visual');await page.locator('.assessment-saved-analysis>summary').waitFor();
  const stats=page.locator('.assessment-results-stats'),overview=page.locator('.assessment-results-panels');
  check(width+': approved whole-result values and five topic groups',(await stats.innerText()).includes('12 / 20')&&(await stats.innerText()).includes('18 min 40 s')&&await overview.locator('.assessment-results-group').count()===5);
  check(width+': light surface and primary blue result',await page.locator('.assessment-results').evaluate(el=>getComputedStyle(el).backgroundColor==='rgb(255, 255, 255)'));
  await page.screenshot({path:dir+'/overview-'+width+'.png',fullPage:true});
  await page.locator('.ant-segmented-item').filter({hasText:'Dificuldade'}).click();
  check(width+': difficulty has exact assigned counts',(await overview.innerText()).includes('6 / 8')&&(await overview.innerText()).includes('4 / 8')&&(await overview.innerText()).includes('2 / 4')&&(await overview.innerText()).includes('classificação da questão'));
  await page.screenshot({path:dir+'/difficulty-'+width+'.png',fullPage:true});
  await page.getByRole('button',{name:'Filtros',exact:true}).click();await select(page,'Filtrar dificuldade','Difícil');
  check(width+': scope explicit while overall result stays fixed',(await page.locator('.assessment-results-scope').innerText()).includes('4 de 20 questões')&&(await stats.innerText()).includes('12 / 20'));
  await select(page,'Mostrar','Perdas de foco');check(width+': focus aggregation follows selected difficulty',(await overview.innerText()).includes('4 registros')&&(await page.locator('.assessment-results-pattern').first().innerText()).includes('4 ocorrências · 2 questões'));
  await select(page,'Mostrar','Tempo sem foco registrado');check(width+': observed durations summed without response-time inference',(await overview.innerText()).includes('54 s'));
  await select(page,'Mostrar','Tempo de resposta · indisponível');check(width+': unavailable response time has no invented chart',await page.getByText('Tempo de resposta indisponível',{exact:true}).count()===1&&await overview.locator('.assessment-results-group').count()===0);
  await page.getByRole('button',{name:'Limpar filtros',exact:true}).click();await select(page,'Mostrar','Acertos');await page.locator('.ant-segmented-item').filter({hasText:'Assunto'}).click();
  await page.getByRole('button',{name:'Docker',exact:true}).click();
  check(width+': group drilldown preserves original question numbers',await page.getByRole('tab',{name:'Questões',exact:true}).getAttribute('aria-selected')==='true'&&(await page.locator('.assessment-results-questions').innerText()).includes('Questão 5 · Docker')&&(await page.locator('.assessment-results-questions').innerText()).includes('Questão 8 · Docker'));
  await page.locator('.assessment-results-questions details').nth(2).locator('summary').focus();await page.keyboard.press('Enter');
  const question=page.locator('.assessment-results-questions details').nth(2);
  check(width+': keyboard detail keeps all five options answer key explanation and provenance',(await question.innerText()).includes('Resposta: B')&&(await question.innerText()).includes('Correta: A')&&(await question.innerText()).includes('E · Alternativa E')&&(await question.innerText()).includes('versão fixture · método fixture'));
  await page.getByRole('tab',{name:'Visão geral',exact:true}).click();await page.locator('.assessment-results-pattern').first().getByRole('button').click();
  const surface=page.locator(width<=600?'.assessment-activity-mobile':'.assessment-activity-table');
  await surface.getByText(width<=600?'Questão 7':'Acontecimentos da questão 7',{exact:true}).waitFor();
  check(width+': pattern drilldown retains question7 and its two exact episodes',(await surface.innerText()).includes('20 segundos')&&(await surface.innerText()).includes('14 segundos')&&await surface.getByRole('button',{name:'Ocultar acontecimentos',exact:true}).count()===1);
  await page.getByRole('button',{name:'Voltar ao recorte atual',exact:true}).click();await page.getByRole('tab',{name:'Visão geral',exact:true}).click();
  check(width+': return preserves Docker filter',(await page.locator('.assessment-results-scope').innerText()).includes('Docker · 4 de 20 questões'));
  await page.getByRole('button',{name:'Limpar filtros',exact:true}).click();await page.getByRole('tab',{name:'Registros',exact:true}).click();
  check(width+': other signals and technical disclosure retained',(await surface.innerText()).includes('Seleç')&&(await surface.innerText()).includes('zoom'));
  await page.getByRole('tab',{name:'Visão geral',exact:true}).click();await page.locator('.assessment-saved-analysis>summary').click();
  check(width+': saved full-scope synthesis independent of filtering',(await page.locator('.assessment-analysis').innerText()).includes('20 questões')&&(await page.locator('.assessment-analysis').innerText()).includes('1 minuto e 32 segundos'));
  check(width+': all presentation actions have only one free load and no quote or paid call',(await calls(page)).length===1&&(await calls(page))[0].action==='assessment_activity_analysis_load');
  await page.getByText('Dados da aplicação e limites de interpretação',{exact:true}).click();check(width+': Brasília conclusion retained',(await page.locator('.assessment-results-origin').innerText()).includes('09:18:40'));
  check(width+': no overflow external calls or runtime errors',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)&&!errors.length&&!external.length);
  await page.goto(base+'/assessment-activity.html?mode=empty');await page.getByText('Não há padrões sustentados suficientes',{exact:false}).waitFor();
  check(width+': absent durations remain unavailable and no paid action',(await page.locator('.assessment-results-pattern').nth(1).innerText()).includes('Indisponível')&&await page.getByRole('button',{name:'Analisar atividade com IA',exact:true}).count()===0);
  await page.goto(base+'/assessment-activity.html?mode=started');await page.getByRole('heading',{name:'Resultado e atividade',exact:true}).waitFor();
  check(width+': incomplete attempt cannot become corrected performance',(await stats.innerText()).includes('Disponível após conclusão')&&!(await stats.innerText()).includes('15 / 20'));
  await page.goto(base+'/assessment-activity.html?mode=foreign');await page.getByText('Não foi possível confirmar o contexto do resultado.',{exact:false}).waitFor();
  check(width+': mismatched tenant does not expose results or query analysis',await page.locator('.assessment-results').count()===0&&(await calls(page)).length===0);
  await page.close();
  const reference=await browser.newPage({viewport:{width,height:1080}});
  await reference.setContent('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body style="margin:0;background:#fff"><main style="max-width:1000px;margin:24px auto">'+await readFile('docs/product/assessment-results-executive-reference.html','utf8')+'</main></body></html>');
  await reference.screenshot({path:dir+'/reference-'+width+'.png',fullPage:true});await reference.close();console.log('viewport '+width+' passed');
 }
}finally{await writeFile(dir+'/checks.json',JSON.stringify({checks,limitations:['Synthetic same-data reference; no authenticated production candidate or paid model','Reference icons use host Lucide in conversation; local comparison preserves layout and labels']},null,2));await browser.close();}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));
