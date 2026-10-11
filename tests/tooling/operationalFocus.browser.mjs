import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH??'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.PRISMA_BROWSER_PATH});
const dir=process.env.PRISMA_OPERATIONAL_EVIDENCE??'docs/qa/evidence/operational-focus-v241',base='http://127.0.0.1:5780',checks=[];
const sourcesOnly=process.argv.includes('--sources-only'),comparisonOnly=process.argv.includes('--comparison-only');
await mkdir(`${dir}/after`,{recursive:true});
async function check(name,pass){checks.push({name,pass:!!pass});console.log(`${pass?"PASS":"FAIL"}: ${name}`);assert.ok(pass,name);}
async function open(name,width=1448,role='super_admin'){
 const p=await browser.newPage({viewport:{width,height:980}}),errors=[],external=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():(external.push(r.request().url()),r.abort()));
 await p.goto(`${base}/operational-focus.html?page=${name}&role=${role}`);
 await p.waitForSelector('h1, .ant-modal');await p.waitForTimeout(400);
 p.errors=errors;p.external=external;return p;
}
async function close(p,name,width){
 await check(`${name}/${width}: no external requests or runtime errors`,!p.errors.length&&!p.external.length);
 await check(`${name}/${width}: no document horizontal overflow`,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await p.screenshot({path:`${dir}/after/${name}-${width}.png`,fullPage:true});await p.close();
}
async function writes(p){return p.evaluate(()=>window.__operationalFixture.calls.filter(c=>!c.action.startsWith('read-')).length);}
try{
 if(!sourcesOnly&&!comparisonOnly)for(const width of [1448,390,320]){
  let p=await open('home',width);
  await check(`${width}: only operational home metrics`,await p.locator('.ant-statistic').count()===3&&!(await p.locator('body').innerText()).includes('M8')&&!await p.getByText('Bases de conhecimento',{exact:true}).count());
  await p.getByRole('button',{name:'Como o Prisma trabalha',exact:true}).focus();await p.keyboard.press('Enter');
  await p.getByRole('dialog').getByText('Decisão humana',{exact:true}).waitFor();
  await check(`${width}: product help by keyboard without writes`,await writes(p)===0);
  await p.keyboard.press('Escape');await p.getByRole('dialog').waitFor({state:'hidden'});await p.waitForTimeout(350);await close(p,'home',width);
  p=await open('settings',width);
  await check(`${width}: legacy opens actual structure without placeholders`,await p.getByRole('tab',{name:'Estrutura de competências',exact:true}).getAttribute('aria-selected')==='true'&&!await p.getByText('Editar estrutura',{exact:true}).count()&&!await p.getByRole('tab',{name:'Geral',exact:true}).count());
  await p.locator('summary').filter({hasText:'Tecnologias e ferramentas'}).click();
  await p.getByText('Recursos técnicos usados no trabalho.',{exact:true}).waitFor();
  await check(`${width}: definitions and examples remain consultable`,await p.getByText('APIs, SQL',{exact:false}).isVisible());
  await close(p,'settings',width);
  p=await open('document',width);
  await check(`${width}: document pending review remains immediate`,await p.getByText('Situação atual',{exact:true}).isVisible()&&await p.getByRole('button',{name:'Revisar perfil',exact:true}).isVisible());
  await check(`${width}: document diagnostics initially secondary`,!await p.getByText('Documento ID',{exact:true}).isVisible());
  await p.locator('summary').filter({hasText:'Detalhes técnicos e histórico'}).focus();await p.keyboard.press('Enter');
  await check(`${width}: document identifier attempts and audit remain accessible`,await p.getByText('Documento ID',{exact:true}).isVisible()&&await p.getByText('Tentativas de processamento',{exact:true}).isVisible()&&await p.getByText('Auditoria operacional',{exact:false}).isVisible());
  await check(`${width}: expansion has no document writes`,await writes(p)===0);await close(p,'document',width);
  p=await open('operations',width);
  await check(`${width}: legend initially secondary`,!await p.getByText('Documento e tentativa',{exact:true}).isVisible());
  await p.locator('summary').filter({hasText:'Entender os estados'}).click();
  await check(`${width}: legend can expand without writes`,await p.locator('details').getAttribute('open')!==null&&await writes(p)===0);
  await close(p,'operations',width);
  p=await open('verification',width);
  await p.getByRole('button',{name:'Abrir verificação de Marina Costa',exact:true}).click();const dialog=p.getByRole('dialog');
  await dialog.getByText('Resultado inconclusivo',{exact:true}).waitFor();
  await check(`${width}: verification result and limitations remain primary`,await dialog.getByText('Resultado bruto',{exact:true}).isVisible()&&await dialog.getByText(/Não constituem prova de conduta ou fraude/).isVisible());
  await check(`${width}: verification method initially secondary`,!await dialog.getByText('synthetic-assessment-1',{exact:true}).isVisible());
  await dialog.locator('summary').filter({hasText:'Método e histórico'}).click();
  await check(`${width}: verification provenance and timeline remain accessible`,await dialog.getByText('synthetic-assessment-1',{exact:true}).isVisible()&&await dialog.getByText('Convite gerado',{exact:true}).isVisible()&&await writes(p)===0);
  await close(p,'verification',width);
  p=await open('bank',width);
  await p.locator('.prisma-m51c-navigation button').filter({hasText:/Revisão$/}).click();await p.getByRole('button',{name:'Revisar',exact:true}).click();
  await check(`${width}: bank similarity immediate and diagnostics closed`,await p.getByText('23%',{exact:true}).isVisible()&&!await p.getByText('fake-deterministic',{exact:true}).isVisible());
  await p.locator('summary').filter({hasText:'Origem e detalhes técnicos'}).click();
  await check(`${width}: bank provenance remains accessible without approval`,await p.getByText('fake-deterministic',{exact:true}).isVisible()&&await p.getByText('fingerprint-synthetic-12345',{exact:true}).isVisible()&&await writes(p)===0);
  if(width===1448){await p.getByRole('button',{name:/Aprovar$/}).click();await p.waitForFunction(()=>window.__operationalFixture.calls.some(c=>c.action==='review-proposal'));await check('explicit human approval invokes original writer exactly once',await writes(p)===1);}
  await close(p,'bank',width);
  p=await open('classification',width,'admin');
  await check(`${width}: contextual group choice is not preselected`,await p.getByRole('button',{name:'Salvar grupo',exact:true}).isDisabled());
  await p.locator('summary').filter({hasText:'Entender os grupos'}).click();
  await check(`${width}: group help reuses definitions without selection or writes`,await p.getByText('Recursos técnicos usados no trabalho.',{exact:true}).isVisible()&&await p.getByRole('button',{name:'Salvar grupo',exact:true}).isDisabled()&&await writes(p)===0);
  await close(p,'classification',width);
 }
 if(!sourcesOnly&&!comparisonOnly){
 const member=await open('home',390,'member');await check('member has no import action',!await member.getByRole('button',{name:'Importar currículo',exact:true}).count());await close(member,'member-home',390);
 const company=await open('knowledge',390,'admin');await company.getByRole('tab',{name:'Estrutura de competências',exact:true}).click();await check('company has structure without source mutation controls',await company.getByText('Tecnologias e ferramentas',{exact:true}).isVisible()&&!await company.getByRole('button',{name:'Checar agora',exact:true}).count());await close(company,'company-knowledge',390);
 }
 if(!comparisonOnly){
 const p=await open('knowledge',1448);await p.getByRole('tab',{name:'Fontes',exact:true}).click();await p.getByRole('button',{name:'Checar agora',exact:true}).waitFor();
 await check('source monitoring moved with unresolved status and no automatic checks',await p.getByRole('button',{name:'Resolver pendências',exact:true}).isVisible()&&await writes(p)===0);
 await p.getByRole('button',{name:'Resolver pendências',exact:true}).click();await check('source resolution retains steps without publication',await p.getByRole('dialog').isVisible()&&await writes(p)===0);await p.getByRole('dialog').getByRole('button',{name:'Revisar versão da fonte',exact:true}).click();await p.getByRole('dialog',{name:'Revisar versão · CBO',exact:true}).waitFor();await check('source resolution opens existing review without automatic publication',await p.getByRole('dialog').getByRole('button',{name:'Publicar versão',exact:true}).isVisible()&&await writes(p)===0);await p.keyboard.press('Escape');await p.waitForTimeout(500);await check('source dialogs close back to monitoring',await p.getByRole('dialog').count()===0);
 await p.evaluate(()=>{window.__operationalFixture.fail=true;window.__operationalFixture.hold=true;});await p.getByRole('button',{name:'Checar agora',exact:true}).click();
 await check('checking shows continuous loading and preserves prior source',await p.locator('.prisma-knowledge-health-card .ant-btn-loading').count()===1&&await p.getByText('2025-06-06',{exact:true}).isVisible());
 await p.evaluate(()=>window.__operationalFixture.hold=false);await p.getByText('Não foi possível checar esta base. O estado anterior foi preservado.',{exact:true}).waitFor();await p.waitForTimeout(400);
 await check('failed source check preserves card and explicit retry',await p.getByRole('button',{name:'Checar agora',exact:true}).isVisible()&&await p.getByText('2025-06-06',{exact:true}).isVisible()&&await writes(p)===1);
 await p.evaluate(()=>window.__operationalFixture.fail=false);await p.getByRole('button',{name:'Checar agora',exact:true}).click();await p.waitForFunction(()=>window.__operationalFixture.calls.filter(c=>c.action==='check-source').length===2);await p.waitForTimeout(500);await close(p,'source-monitor',1448);
 }
 // Same synthetic datasets/viewports as the saved baseline, using the actual existing page harnesses.
 if(!sourcesOnly)for(const width of [1448,390])for(const [name,url,ready] of [['home','http://127.0.0.1:5587/visual-foundation.html','Olá!'],['person','http://127.0.0.1:5586/person-unified.html','Marina'],['follow-up','http://127.0.0.1:5697/position-follow-up.html','Marina Costa']]){
  const p=await browser.newPage({viewport:{width,height:980}});await p.goto(url);await p.getByText(ready,{exact:false}).first().waitFor();await p.waitForTimeout(1000);await p.screenshot({path:`${dir}/after/comparison-${name}-${width}.png`,fullPage:true});await check(`${name}/${width}: comparison no overflow`,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.close();
 }
}catch(error){for(const p of browser.contexts().flatMap(c=>c.pages())){console.error((await p.locator('body').innerText()).slice(-1700));await p.screenshot({path:`${dir}/failure.png`,fullPage:true});}throw error;}
finally{await writeFile(`${dir}/${sourcesOnly?'source-checks':comparisonOnly?'comparison-checks':'operational-checks'}.json`,JSON.stringify({checks,limits:['Actual components with deterministic synthetic services; no production candidate data or external AI/email.']},null,2));await browser.close();}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));
