import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdir,writeFile} from "node:fs/promises";
const {chromium}=createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH ?? "playwright");
const browser=await chromium.launch({headless:true,channel:"msedge"});
const dir="docs/qa/evidence/people-columns-v275";
await mkdir(dir,{recursive:true});
const checks=[];
const check=(name,value)=>{checks.push({name,pass:Boolean(value)});assert.ok(value,name);};
try {
  for(const width of [1448,390]){
    const page=await browser.newPage({viewport:{width,height:1000}});
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    await page.route("**/*",route=>route.request().url().startsWith("http://127.0.0.1:5715/") ? route.continue() : route.abort());
    await page.goto("http://127.0.0.1:5715/tests/browser/people-columns-v275.html");
    const row=page.getByRole("row").filter({hasText:"Ana Exemplo"});
    await row.waitFor();
    check(width+" six columns",await page.locator("thead th").count()===6);
    check(width+" header order",(await page.locator("thead th").allTextContents()).join("|")==="Pessoa|Área Profissional|Função/Cargo|Última empresa|Cidade|Data do Perfil");
    check(width+" original latest job",await row.getByRole("cell",{name:"Gerente de TI",exact:true}).count()===1);
    check(width+" one company",!(await row.textContent()).includes("Empresa Alfa") && (await row.textContent()).includes("Empresa Beta"));
    check(width+" city and publication", (await row.textContent()).includes("Bauru") && (await row.textContent()).includes("14/10/2026"));
    check(width+" no grouping noise",!(/Sem função agrupada|Original:|Última importação/.test(await page.locator("body").innerText())));
    await page.getByRole("combobox",{name:"Filtrar área profissional",exact:true}).click();
    await page.getByTitle("Recursos Humanos",{exact:true}).click();
    await page.getByRole("combobox",{name:"Filtrar área profissional",exact:true}).click();
    await page.getByTitle("Todas as áreas",{exact:true}).click();
    check(width+" all areas restores results",await page.getByRole("row").filter({hasText:"Carlos Exemplo"}).count()===1);
    await page.getByRole("combobox",{name:"Filtrar cargo",exact:true}).click();
    await page.getByTitle("Gerente de TI",{exact:true}).click();
    check(width+" original role filter",await page.getByRole("row").filter({hasText:"Carlos Exemplo"}).count()===0);
    await page.getByRole("combobox",{name:"Filtrar cargo",exact:true}).click();
    await page.getByTitle("Todos os cargos",{exact:true}).click();
    check(width+" all roles restores results",await page.getByRole("row").filter({hasText:"Carlos Exemplo"}).count()===1);
    await page.getByRole("button",{name:"Limpar filtros",exact:true}).click();
    await page.getByText("Filtros",{exact:true}).click();
    check(width+" clear removes operational restriction",(await page.locator(".prisma-people-filters").innerText()).includes("Ativas e arquivadas"));
    await page.getByText("Filtros",{exact:true}).click();
    await page.screenshot({path:dir+"/people-"+width+".png",fullPage:true});
    await page.getByRole("button",{name:/Ana Exemplo/}).click();
    check(width+" navigation",await page.locator("body").getAttribute("data-navigation")==="/profiles/one");
    check(width+" no runtime errors",errors.length===0);
    await page.close();
  }
} finally {await writeFile(dir+"/browser.json",JSON.stringify(checks,null,2));await browser.close();}
console.log(JSON.stringify({checks:checks.length,pass:true}));
