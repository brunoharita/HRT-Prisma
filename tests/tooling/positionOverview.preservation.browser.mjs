import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {writeFile} from "node:fs/promises";
const {chromium}=createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH??"playwright");
const browser=await chromium.launch({headless:true,executablePath:process.env.PRISMA_BROWSER_PATH});
const dir="docs/qa/evidence/position-overview-v221", results=[];
const check=(name,value)=>{results.push({name,pass:Boolean(value)});assert.ok(value,name);};
async function pageFor(url,width=1537){const p=await browser.newPage({viewport:{width,height:1023}});p.on("pageerror",e=>results.push({name:"runtime",pass:false,error:e.message}));const origin=new URL(url).origin;await p.route("**/*",r=>r.request().url().startsWith(origin+"/")?r.continue():(results.push({name:"unexpected external request",pass:false}),r.abort()));await p.goto(url);return p;}
try{
  for(const width of [1813,1280,1024,768,390,320]){
    const p=await pageFor("http://127.0.0.1:5701/position-overview.html?shell",width);await p.getByRole("heading",{name:"Resumo da posição",exact:true}).waitFor();
    check(`shell/${width}: no page overflow`,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    check(`shell/${width}: all primary actions visible`,await p.getByRole("button",{name:"Encontrar pessoas",exact:true}).isVisible()&&await p.getByRole("button",{name:"Editar posição",exact:true}).isVisible());
    if(width===1813||width===390)await p.screenshot({path:`${dir}/shell-${width}.png`,fullPage:true});await p.close();
  }
  for(const width of [1537,390]){
    const p=await pageFor("http://127.0.0.1:5586/person-unified.html?case=visual-option4",width);await p.locator(".prisma-profile-highlight").first().waitFor();
    const g=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,icons:[...document.querySelectorAll(".prisma-profile-highlight-icon")].map(el=>{const a=el.getBoundingClientRect(),b=el.querySelector("svg").getBoundingClientRect();return{dx:b.x+b.width/2-a.x-a.width/2,dy:b.y+b.height/2-a.y-a.height/2};})}));
    check(`Profile/${width}: four original centered highlights`,g.icons.length===4&&g.icons.every(i=>Math.abs(i.dx)<=1&&Math.abs(i.dy)<=1)&&!g.overflow);
    check(`Profile/${width}: six original navigation areas preserved`,await p.locator(".prisma-m72-tabs > button").count()===6);await p.screenshot({path:`${dir}/profile-preserved-${width}.png`,fullPage:true});await p.close();
  }
  const baseline=await pageFor("http://127.0.0.1:5702/position-overview.html");await baseline.getByRole("heading",{name:"Desenvolvedor backend",exact:true}).waitFor();
  await baseline.screenshot({path:`${dir}/before-1537.png`,fullPage:true});check("baseline: old references precede tabs",await baseline.getByText("Referência ocupacional Prisma",{exact:true}).count()===1);await baseline.close();
  const p=await pageFor("http://127.0.0.1:5701/position-overview.html?case=slow");await p.getByRole("status").filter({hasText:"Carregando Posição"}).waitFor();check("pending load: skeleton and no provisional actions",await p.locator(".ant-skeleton").count()>0&&await p.getByRole("button",{name:"Encontrar pessoas",exact:true}).count()===0);await p.getByRole("heading",{name:"Resumo da posição",exact:true}).waitFor();check("load settlement: feedback clears",await p.getByRole("status").count()===0);
  for(const [name,route] of [["Editar posição","edit"],["Encontrar pessoas","people"],["Abrir acompanhamento","follow-up"]]){await p.getByRole("button",{name,exact:true}).click();check(`${name}: existing route`,await p.evaluate(()=>window.__positionOverview.navigations.at(-1))===`/vacancies/position-fixture/${route}`);}
  check("navigation never triggers interpretation",(await p.evaluate(()=>window.__positionOverview.calls)).join(",")==="load,history");await p.getByRole("heading",{name:"Resumo da posição",exact:true}).click();await p.waitForTimeout(400);await p.screenshot({path:`${dir}/overview-reference-1537.png`});await p.close();
  const error=await pageFor("http://127.0.0.1:5701/position-overview.html?case=load-error");await error.getByText("Falha sintética ao consultar a Posição.",{exact:true}).waitFor();check("load error: no false empty data and recovery",await error.getByRole("heading",{name:"Resumo da posição",exact:true}).count()===0&&await error.getByRole("button",{name:"Voltar às posições",exact:true}).count()===1&&await error.getByRole("status").count()===0);await error.close();
  for(const scenario of ["foreign","stale","unknown"]){const invalid=await pageFor(`http://127.0.0.1:5701/position-overview.html?case=${scenario}`);await invalid.getByRole("button",{name:"Ver referência e fontes"}).click();await invalid.getByRole("dialog").waitFor();check(`${scenario}: drawer does not expose invalid snapshot`,await invalid.getByText("Software Developers",{exact:true}).count()===0);await invalid.close();}
  const failure=await pageFor("http://127.0.0.1:5701/position-overview.html?case=delete-error");await failure.getByRole("button",{name:"Mais ações",exact:true}).click();await failure.getByRole("menuitem",{name:"Excluir posição"}).click();const dialog=failure.getByRole("dialog");await dialog.getByRole("button",{name:"Excluir posição",exact:true}).click();await failure.getByText("Falha sintética ao excluir a Posição.",{exact:true}).waitFor();check("failed deletion retains confirmation and position",await dialog.isVisible()&&await failure.getByRole("heading",{name:"Resumo da posição",exact:true}).count()===1);await failure.evaluate(()=>{window.__positionOverview.failDelete=false;});await dialog.getByRole("button",{name:"Excluir posição",exact:true}).click();await failure.waitForFunction(()=>window.__positionOverview.navigations.at(-1)==="/vacancies");check("failed deletion can retry explicitly",await failure.evaluate(()=>window.__positionOverview.calls.filter(c=>c==="cancel").length)===2);await failure.close();
}finally{await browser.close();await writeFile(`${dir}/preservation-results.json`,JSON.stringify(results,null,2)+"\n");}
console.log(JSON.stringify({checks:results.length,failures:results.filter(r=>!r.pass)},null,2));assert.equal(results.filter(r=>!r.pass).length,0);
