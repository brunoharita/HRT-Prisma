import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdir,writeFile,unlink} from "node:fs/promises";
import {resolve} from "node:path";
const {chromium}=createRequire(import.meta.url)("C:/Users/Bruno/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const dir="docs/qa/evidence/people-taxonomy-v272/browser",entry=resolve("tests/browser/people-directory-v272.tsx").replaceAll("\\","/");
await mkdir(dir,{recursive:true});await writeFile("web/people-directory-qa.html",`<html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root"></div><script type="module" src="/@fs/${entry}"></script></body></html>`);
const browser=await chromium.launch({headless:true,executablePath:"C:/Users/Bruno/AppData/Local/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe"});
const results=[],errors=[],outbound=[];
try {
 for(const width of [1448,390]) {
  const page=await browser.newPage({viewport:{width,height:1000}});page.on("pageerror",e=>errors.push(e.message));
  await page.route("**/*",async route=>{const url=new URL(route.request().url());if(!["127.0.0.1","localhost"].includes(url.hostname)){outbound.push(url.hostname);return route.abort();}return route.continue();});
  await page.goto("http://127.0.0.1:5717/people-directory-qa.html");await page.getByText("Ana Exemplo",{exact:true}).waitFor();
  assert.equal(await page.getByRole("columnheader",{name:"Área(s) profissional(is)",exact:true}).count(),1);
  assert.equal(await page.getByText("Original: Gerente de TI",{exact:true}).count(),1);
  assert.equal(await page.getByText("Original: Analista de RH",{exact:true}).count(),0);
  await page.screenshot({path:`${dir}/people-${width}.png`,fullPage:true});
  await page.getByRole("combobox",{name:"Período da atuação"}).click();await page.getByText("Trajetória completa",{exact:true}).click();
  await page.getByRole("combobox",{name:"Filtrar área profissional"}).click();await page.getByText("Recursos Humanos",{exact:true}).last().click();
  await page.getByRole("combobox",{name:"Filtrar função profissional"}).click();await page.getByText("Gerente de TI",{exact:true}).last().click();
  await page.getByText("Ana Exemplo",{exact:true}).waitFor();assert.equal(await page.getByText("Carlos Exemplo",{exact:true}).count(),0);
  results.push({width,profileAreaAndScopedFunction:true});
  await page.getByRole("button",{name:"Limpar filtros",exact:true}).first().click();await page.getByText("Ana Exemplo",{exact:true}).waitFor();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,"page overflow; table may scroll internally");
  await page.goto("http://127.0.0.1:5717/people-directory-qa.html?state=unavailable");await page.getByText("Carlos Exemplo",{exact:true}).waitFor();assert.ok(await page.getByText("Agrupamento indisponível",{exact:true}).count());
  await page.getByRole("button",{name:/Ana Exemplo/}).click();assert.equal(await page.evaluate(()=>document.body.dataset.navigation),"/profiles/one");
  results.push({width,fallback:true,navigation:true});await page.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(outbound,[]);
} finally {await writeFile(`${dir}/checks.json`,JSON.stringify({results,errors,outbound},null,2));await browser.close();await unlink("web/people-directory-qa.html");}
console.log(JSON.stringify(results));
