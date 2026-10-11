import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH??'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.PRISMA_BROWSER_PATH}),dir='docs/qa/evidence/operational-focus-v241/detail',checks=[];
await mkdir(dir,{recursive:true});const check=(name,pass)=>{checks.push({name,pass:!!pass});assert.ok(pass,name);};
try{for(const width of [1448,390,320]){
 const p=await browser.newPage({viewport:{width,height:980}}),errors=[],external=[];
 p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:5697/')?r.continue():(external.push(r.request().url()),r.abort()));
 await p.goto('http://127.0.0.1:5697/position-follow-up.html');await p.getByRole('button',{name:'Marina Costa',exact:true}).waitFor({state:'attached'});
 check(`${width}: compact counters retain 4, 1, 0`,await p.locator('.pf-metrics strong').allTextContents().then(values=>values.join(',')==='4,1,0')&&await p.locator('.pf-metrics').evaluate(el=>el.getBoundingClientRect().height<(innerWidth<600?135:95)));
 await p.evaluate(()=>{const f=window.__followUpFixture,entry=f.data.entries.find(e=>e.fullName==='Marina Costa');f.data.history=[{id:'synthetic-history',entryId:entry.id,action:'details',actor:'Bruno',at:'2026-10-08T16:00:00Z',before:{details:{nextAction:'Revisar perfil',assignee:null}},after:{details:{nextAction:'Agendar conversa',assignee:f.data.operators[0].id,interview:{at:'2026-10-08T16:00:00Z',timezone:'America/New_York',participants:'Pessoa sintética',status:'scheduled'}}}}];});
 await p.getByRole('button',{name:'Atualizar acompanhamento',exact:true}).click();await p.waitForTimeout(400);
 if(width<600){await p.getByRole('combobox',{name:'Coluna do Kanban',exact:true}).click();await p.locator('.ant-select-dropdown:visible').getByText('Selecionadas para acompanhamento (2)',{exact:true}).click();}
 await p.getByRole('button',{name:'Marina Costa',exact:true}).click();const primary=p.getByRole('dialog',{name:'Marina Costa',exact:true});await primary.waitFor();
 check(`${width}: operational fields primary and full analysis secondary`,await primary.getByLabel('Próxima ação',{exact:true}).isVisible()&&await primary.getByRole('button',{name:'Consultar análise e evidências',exact:true}).isVisible()&&!await primary.getByText('Análise, fontes e versões',{exact:true}).isVisible());
 await primary.getByLabel('Próxima ação',{exact:true}).fill('Rascunho preservado');
 const writes=()=>p.evaluate(()=>window.__followUpFixture.calls.filter(c=>c.name.startsWith('mutate_')).length);
 await primary.getByRole('button',{name:'Consultar análise e evidências',exact:true}).click();const analysis=p.getByRole('dialog',{name:'Análise e evidências',exact:true});await analysis.waitFor();
 check(`${width}: analysis sources and versions available without mutations`,await analysis.getByText('Análise, fontes e versões',{exact:true}).isVisible()&&await writes()===0);
 await p.screenshot({path:`${dir}/analysis-${width}.png`,fullPage:true});await analysis.getByRole('button',{name:'Fechar',exact:true}).click();await analysis.waitFor({state:'hidden'});
 check(`${width}: analysis preserves operational draft`,await primary.getByLabel('Próxima ação',{exact:true}).inputValue()==='Rascunho preservado');
 await primary.getByRole('button',{name:'Histórico deste acompanhamento',exact:true}).click();const history=p.getByRole('dialog',{name:'Histórico deste acompanhamento',exact:true});await history.waitFor();
 check(`${width}: readable author and changed fields`,await history.getByText('Próxima ação',{exact:true}).isVisible()&&await history.getByText('Anterior: Revisar perfil',{exact:true}).isVisible()&&await history.getByText('Registrado: Agendar conversa',{exact:true}).isVisible()&&await history.getByText('Registrado: Bruno',{exact:true}).isVisible());
 check(`${width}: interview history respects recorded timezone`,await history.getByText(/Registrado: Agendada.*12:00:00.*America\/New_York/).isVisible());
 check(`${width}: raw audit initially closed`,!await history.locator('pre').isVisible());await history.locator('summary').click();
 check(`${width}: original before and after snapshots retained`,await history.locator('pre').innerText().then(text=>text.includes('"anterior"')&&text.includes('"registrado"')&&text.includes('Agendar conversa'))&&await writes()===0);
 await p.screenshot({path:`${dir}/history-${width}.png`,fullPage:true});await history.getByRole('button',{name:'Fechar',exact:true}).click();await history.waitFor({state:'hidden'});
 check(`${width}: history preserves draft and score`,await primary.getByLabel('Próxima ação',{exact:true}).inputValue()==='Rascunho preservado'&&await p.evaluate(()=>window.__followUpFixture.data.entries.find(e=>e.fullName==='Marina Costa').score)===78);
 check(`${width}: no errors external requests or overflow`,!errors.length&&!external.length&&await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await p.waitForTimeout(350);await primary.locator(".ant-drawer-body").evaluate(el=>el.scrollTop=0);await p.waitForTimeout(100);await p.screenshot({path:`${dir}/detail-${width}.png`,fullPage:true});await p.close();
}}finally{await writeFile(`${dir}/checks.json`,JSON.stringify({checks,limits:['Synthetic history and original follow-up components; no actual user mutations.']},null,2));await browser.close();}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));
