import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdir,writeFile} from "node:fs/promises";
const {chromium}=createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH??"playwright");
const browser=await chromium.launch({headless:true,executablePath:process.env.PRISMA_BROWSER_PATH});
const base="http://127.0.0.1:5695",dir=process.env.PRISMA_SCORE_EVIDENCE??"docs/qa/evidence/stable-score-v214",results=[];await mkdir(dir,{recursive:true});
try{for(const width of [1280,390])for(const scenario of ["normal","member","partial"]){
 const p=await browser.newPage({viewport:{width,height:980}}),errors=[],external=[];
 p.on("pageerror",e=>errors.push(e.message));await p.route("**/*",r=>r.request().url().startsWith(base+"/")?r.continue():(external.push(r.request().url()),r.abort()));
 await p.goto(base+"/stable-score.html?case="+scenario);const cards=p.locator(".prisma-vacancy-match-card");
 await p.getByText("Pessoa Beta",{exact:true}).first().waitFor();
 await p.waitForTimeout(300);
 const checks={betaUnchanged:await p.getByText("61/100",{exact:true}).count()===1};
 if(scenario==="partial"){checks.partialNotice=await p.getByText("Há Pessoas com avaliação indisponível",{exact:true}).isVisible();checks.manualProfile=await p.getByRole("button",{name:"Consultar Pessoa Alfa"}).isVisible();checks.noInventedScore=await p.getByText("73/100",{exact:true}).count()===0;}
 else{
  checks.savedInitial=await p.getByText("73/100",{exact:true}).count()===1;
  await p.getByRole("button",{name:"Reabrir tela",exact:true}).click();await p.getByText("73/100",{exact:true}).waitFor();checks.reloadSame=true;
  if(scenario==="member")checks.noRecalculate=await p.getByRole("button",{name:"Recalcular score",exact:true}).count()===0;
  else{
   await p.getByRole("button",{name:"Revisar divergências",exact:true}).click();await p.getByRole("radio",{name:"Atuação direta",exact:true}).check();await p.getByRole("button",{name:"Salvar revisão",exact:true}).click();
   await p.getByText("78/100",{exact:true}).waitFor();checks.reviewOnlyAlfa=await p.getByText("61/100",{exact:true}).count()===1;
   const calls=await p.evaluate(()=>window.__stableFixture.calls);checks.reviewDoesNotReloadBeta=calls.filter(c=>c.profileId.endsWith("000000000007")).length===2;
   const alfa=p.locator(".prisma-vacancy-match-card").filter({hasText:"Pessoa Alfa"});
   await alfa.getByRole("button",{name:"Recalcular score",exact:true}).click();checks.loadingFeedback=await p.locator(".prisma-loading-feedback").isVisible();checks.priorWhileUpdating=await p.getByText("78/100",{exact:true}).count()===1;await p.getByText("82/100",{exact:true}).waitFor();checks.explicitOnlyAlfa=await p.getByText("61/100",{exact:true}).count()===1;
   await p.evaluate(()=>{window.__stableFixture.fail=true;});await alfa.getByRole("button",{name:"Recalcular score",exact:true}).click();await p.getByText("Atualização não concluída · resultado anterior preservado",{exact:true}).waitFor();checks.failureRetains82=await p.getByText("82/100",{exact:true}).count()===1;
  }
  await p.getByRole("button",{name:"Alternar comparação",exact:true}).click();await p.getByRole("heading",{name:"Comparar pessoas",exact:true}).waitFor();await p.getByText("Pessoa Beta",{exact:true}).first().waitFor();await p.getByText("61/100",{exact:true}).waitFor();checks.comparisonRetainsBeta=await p.getByText("61/100",{exact:true}).count()===1;checks.comparisonRetainsAlfa=await p.getByText(scenario==="normal"?"82/100":"73/100",{exact:true}).count()===1;
 }
 await p.screenshot({path:`${dir}/${scenario}-${width}.png`,fullPage:true});checks.noRuntimeErrors=errors.length===0;checks.noExternalCalls=external.length===0;
 results.push({width,scenario,checks,errors,external});await writeFile(dir+"/browser-results.json",JSON.stringify(results,null,2)+"\n");assert.ok(Object.values(checks).every(Boolean),JSON.stringify(results.at(-1)));await p.close();
}}finally{await browser.close();}console.log(JSON.stringify(results,null,2));
