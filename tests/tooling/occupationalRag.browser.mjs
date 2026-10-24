import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH??'playwright'),dir='docs/qa/evidence/occupational-rag-v320/browser',checks=[];
const browser=await chromium.launch({headless:true,channel:'msedge'});await mkdir(dir,{recursive:true});
const check=(name,value)=>{checks.push({name,pass:Boolean(value)});assert(value,name);};
try{
 for(const width of [1600,430]){
  const page=await browser.newPage({viewport:{width,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:5710/')?r.continue():r.abort());
  await page.goto('http://127.0.0.1:5710/occupational-rag.html');await page.getByRole('button',{name:'Acompanhar reconhecimento'}).click();
  await page.getByRole('button',{name:'Revisar proposta na empresa'}).waitFor();await page.screenshot({path:dir+`/${width}-recognition.png`,fullPage:true});
  check(width+' recognition topology',await page.locator('.occupational-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length===(innerWidth>1000?2:1)));
  await page.getByRole('button',{name:'Revisar proposta na empresa'}).click();
  check(width+' ambiguous proposal requires a human mode',await page.getByRole('button',{name:'Aprovar na empresa',exact:true}).isDisabled());
  await page.locator('.occupational-rag .ant-select').first().click();await page.getByText('Criar um conceito na empresa',{exact:true}).click();await page.screenshot({path:dir+`/${width}-company.png`,fullPage:true});
  check(width+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  check(width+' forms do not publish automatically',await page.evaluate(()=>window.__ragWrites.length===0));
  await page.getByRole('button',{name:'Aprovar na empresa',exact:true}).click();await page.getByText('Conhecimento local disponível',{exact:true}).waitFor();
  check(width+' explicit company decision sent once',await page.evaluate(()=>window.__ragWrites.length===1));
  await page.goto('http://127.0.0.1:5710/occupational-rag.html?scope=global');await page.getByText('Empresa demonstração',{exact:true}).last().waitFor();await page.getByRole('button',{name:'Aprovar na Base Global'}).waitFor();await page.screenshot({path:dir+`/${width}-global.png`,fullPage:true});
  check(width+' global only two decisions',await page.getByRole('button',{name:'Manter somente local'}).count()===1&&await page.getByRole('button',{name:'Rejeitar',exact:true}).count()===0);
  await page.getByRole('button',{name:'Aprovar na Base Global'}).click();check(width+' global optional reason',await page.evaluate(()=>window.__ragWrites.length===1));
  check(width+' global no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));check(width+' no browser exceptions',errors.length===0);await page.close();
 }
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5710/occupational-rag.html?state=failed');await page.getByRole('button',{name:'Acompanhar reconhecimento'}).click();await page.getByRole('button',{name:'Usar revisão manual'}).click();await page.getByText('Definição proposta',{exact:true}).waitFor();check('manual recovery works without model',await page.evaluate(()=>window.__ragWrites[0]==='manual'));await page.close();
}finally{await writeFile(dir+'/checks.json',JSON.stringify(checks,null,2));await browser.close();}
console.log(`${checks.length} browser checks PASS`);
