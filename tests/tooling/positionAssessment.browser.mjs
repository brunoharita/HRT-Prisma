import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH??'playwright');const browser=await chromium.launch({headless:true,executablePath:process.env.PRISMA_BROWSER_PATH});const base='http://127.0.0.1:5698',dir='docs/qa/evidence/position-assessment-v230/browser';await mkdir(dir,{recursive:true});const checks=[];const check=(name,value)=>{checks.push({name,pass:!!value});assert.ok(value,name);};
try{for(const width of [1448,390]){const page=await browser.newPage({viewport:{width,height:980}}),errors=[],network=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():(network.push(r.request().url()),r.abort()));
 for(const state of ['configuration','composition','review','invitation','portal','result']){
 await page.goto(`${base}/position-assessment.html?state=${state}`);await page.getByText(state==='portal'?'Questão 1 de 20':'Ana Martins').first().waitFor();
 if(state==='configuration'){await page.waitForTimeout(250);for(const checkbox of await page.getByRole('checkbox').all())await checkbox.check();}
 if(state==='composition')await page.getByText('Questões',{exact:true}).click();if(state==='review')await page.getByText('Revisão',{exact:true}).click();
 if(state==='result')await page.getByRole('tab',{name:'Atividade por questão',exact:true}).click();
 await page.waitForTimeout(250);check(`${state}/${width} no horizontal overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 if(state==='portal'){check(`${state}/${width} exactly five options`,await page.getByRole('radio').count()===5);check(`${state}/${width} no answer key or shell`,!(await page.locator('body').innerText()).includes('Correta')&&await page.locator('.ant-layout-sider').count()===0);await page.getByRole('radio').first().check();await page.waitForTimeout(180);check(`${state}/${width} autosave explicit choice`,await page.evaluate(()=>window.__assessmentFixture.calls.some(x=>x.action==='save')));}
 else check(`${state}/${width} no implicit generation or send`,await page.evaluate(()=>!window.__assessmentFixture.calls.some(x=>['generate','send','dispatch'].includes(x.action))));
 await page.screenshot({path:`${dir}/${state}-${width}.png`,fullPage:true});
 }
 await page.goto(`${base}/position-assessment.html?state=portal`);await page.getByRole('radio').first().waitFor();await page.evaluate(()=>window.__assessmentFixture.fail=true);await page.getByRole('radio').first().check();await page.waitForTimeout(200);check(`portal/${width} failed save keeps choice`,await page.getByRole('radio').first().isChecked());check(`portal/${width} failed save buffer retained`,await page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('prisma-pa-buffer:')&&JSON.parse(localStorage[k]).dirty)));
 await page.evaluate(()=>window.__assessmentFixture.fail=false);await page.getByRole('button',{name:'Retomar sincronização',exact:true}).click();await page.waitForTimeout(1400);check(`portal/${width} retry keeps selected response`,await page.getByRole('radio').first().isChecked());
 check(`browser/${width} no runtime exceptions`,errors.length===0);check(`browser/${width} no external requests`,network.length===0);await page.close();}
}finally{await writeFile(`${dir}/checks.json`,JSON.stringify(checks,null,2));await browser.close();}
console.log(JSON.stringify({pass:checks.filter(x=>x.pass).length,total:checks.length}));
