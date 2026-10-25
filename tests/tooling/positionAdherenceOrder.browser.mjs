import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
const dir='docs/qa/evidence/position-relevance-v330/follow-up',checks=[];await mkdir(dir,{recursive:true});
const server=await createServer({configFile:'tests/ui/position-follow-up.vite.config.mts',server:{port:5854}});await server.listen();
const {chromium}=createRequire(import.meta.url)('C:/Users/Bruno/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');const browser=await chromium.launch({headless:true,channel:'msedge'});
const check=(name,value)=>{checks.push({name,pass:!!value});assert.ok(value,name);};
try{for(const width of [1448,390,320]){
 const page=await browser.newPage({viewport:{width,height:1080},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:5854/')?r.continue():r.abort());await page.goto('http://127.0.0.1:5854/position-follow-up.html');
 const lane=page.locator('[data-column="awaiting_evaluation"]');await lane.locator('.pf-card').first().waitFor();
 check(width+': stage retained and strongest first',JSON.stringify(await lane.locator('.pf-person').allTextContents())===JSON.stringify(['Marina Costa','Rafael Lima']));
 await page.getByText('Lista',{exact:true}).click();const surface=page.locator(width>1000?'.pf-desktop-list':'.pf-mobile-list');await surface.locator('.pf-person').first().waitFor();
 check(width+': list orders globally by saved adherence',JSON.stringify(await surface.locator('.pf-person').allTextContents())===JSON.stringify(['Joana Alves','Marina Costa','Pedro Santos','Rafael Lima']));
 check(width+': viewport contained',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:dir+`/${width}-list.png`,fullPage:true});check(width+': no runtime errors',errors.length===0);await page.close();
}}finally{await writeFile(dir+'/checks.json',JSON.stringify({checks},null,2)+'\n');await browser.close();await server.close();}console.log(JSON.stringify({checks:checks.length,pass:true}));
