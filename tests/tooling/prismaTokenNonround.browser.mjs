import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH??'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.PRISMA_BROWSER_PATH});
const base='http://127.0.0.1:5711',dir='docs/qa/evidence/tokens-nonround-rates/browser',checks=[];
const check=(name,pass)=>{checks.push({name,pass:!!pass});assert.ok(pass,name);};
await mkdir(dir,{recursive:true});
try{for(const width of [1448,390]){
 const page=await browser.newPage({viewport:{width,height:1024}}),errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():(external.push(r.request().url()),r.abort()));
 await page.goto(base+'/tokens-prisma.html?tariffs=nonround');
 await page.getByText('865.000',{exact:true}).first().waitFor();
 await page.getByText('Tabela de consumo',{exact:true}).click();
 for(const value of ['2.347','14.785','6.193'])check(width+': tariff '+value,(await page.locator('details').innerText()).includes(value));
 await page.getByRole('region',{name:'Cotações das ações'}).getByText(/46\.940 Tokens Prisma/).waitFor();
 for(const value of ['14.785','46.940','6.193'])check(width+': action quote '+value,(await page.getByRole('region',{name:'Cotações das ações'}).innerText()).includes(value+' Tokens Prisma'));
 check(width+': no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:dir+'/company-'+width+'.png',fullPage:true});
 await page.goto(base+'/tokens-prisma.html?tariffs=nonround&role=super');
 await page.getByRole('tab',{name:'Pacotes e preços',exact:true}).click();
 for(const value of ['2.347','14.785','6.193'])check(width+': super tariff '+value,(await page.locator('main').innerText()).includes(value));
 await page.screenshot({path:dir+'/super-'+width+'.png',fullPage:true});
 check(width+': no exceptions or external requests',errors.length===0&&external.length===0);
 await page.close();
}}finally{await writeFile(dir+'/checks.json',JSON.stringify({checks,limits:['Real components, synthetic transport. No paid AI or production mutations.']},null,2));await browser.close();}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));
