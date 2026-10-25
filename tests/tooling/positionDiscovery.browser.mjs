import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
const dir='docs/qa/evidence/position-relevance-v330/browser',checks=[];await mkdir(dir,{recursive:true});
const server=await createServer({configFile:'tests/ui/trajectory-activity.vite.config.mts',server:{port:5852}});await server.listen();
const {chromium}=createRequire(import.meta.url)('C:/Users/Bruno/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'}),check=(name,value)=>{checks.push({name,pass:!!value});assert.ok(value,name);};
try{for(const width of [1448,390,320]){
 const page=await browser.newPage({viewport:{width,height:1080},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:5852/')?r.continue():r.abort());
 await page.goto('http://127.0.0.1:5852/position-discovery.html');const recommendations=page.getByRole('region',{name:'Pessoas com trajetória pertinente'});await recommendations.waitFor();
 check(width+': generic Beatriz fixture absent',await page.getByRole('heading',{name:'Beatriz · cenário sintético',exact:true}).count()===0);
 check(width+': related Willian before lower-scored direct trajectory',JSON.stringify(await recommendations.getByRole('heading',{level:3}).allTextContents())===JSON.stringify(['Willian · cenário sintético','Outra trajetória direta']));
 const review=page.getByRole('region',{name:'Relação profissional a verificar'});check(width+': uncertainty is individual, not mixed with generic signals',(await review.innerText()).includes('Relação incerta')&&!(await review.innerText()).includes('Beatriz'));
 await recommendations.getByRole('checkbox',{name:'Comparar Willian · cenário sintético'}).click();check(width+': comparison remains explicit',await page.evaluate(()=>window.__positionDiscovery.events.includes('compare')));
 check(width+': original snapshots and scores unchanged',await page.evaluate(()=>JSON.stringify(window.__positionDiscovery.rows)===window.__positionDiscovery.before));
 check(width+': viewport contained',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:dir+`/${width}-recommendations.png`,fullPage:true});
 await page.goto('http://127.0.0.1:5852/position-discovery.html?manual=1');const manual=page.getByRole('region',{name:'Pessoas incluídas por decisão humana'});await manual.waitFor();check(width+': human inclusion is preserved separately',(await manual.innerText()).includes('Beatriz')&&await page.getByRole('region',{name:'Pessoas com trajetória pertinente'}).getByText('Beatriz',{exact:false}).count()===0);
 await page.screenshot({path:dir+`/${width}-human.png`,fullPage:true});check(width+': no runtime error',errors.length===0);await page.close();
}}finally{await writeFile(dir+'/checks.json',JSON.stringify({checks},null,2)+'\n');await browser.close();await server.close();}
console.log(JSON.stringify({checks:checks.length,pass:true}));
