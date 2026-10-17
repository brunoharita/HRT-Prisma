import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH ?? "playwright");
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const dir = "docs/qa/evidence/resume-recovery-v311/browser";
await mkdir(dir, { recursive: true });
const checks = [], errors = [];
function check(name, result) { checks.push({name, pass:!!result}); assert.ok(result, name); }
try {
  for (const width of [1448, 390, 320]) {
    const page = await browser.newPage({ viewport: {width, height:1000} });
    page.on("pageerror", e => errors.push(e.message));
    async function open(mode) {
      await page.goto(`http://127.0.0.1:5732/resume-recovery.html?case=${mode}`);
      await page.getByRole("heading", {name:"Currículo sintético.pdf", exact:true}).waitFor();
    }
    const resume = () => page.getByRole("button", {name:/Retomar importação com IA$/});
    await open("loading");
    check(`${width}: both actions wait for preview`, await resume().count() === 2 && await resume().first().isDisabled() && await resume().last().isDisabled());
    await page.evaluate(()=>{window.__recovery.releaseQuote();window.__recovery.mode="success";});
    await resume().first().waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('button')].filter(b=>b.textContent.includes('Retomar importação com IA')).every(b=>!b.disabled));
    check(`${width}: preview is visible before action`, (await page.getByLabel("Consumo da retomada").innerText()).includes("10.000") && await page.evaluate(()=>window.__recovery.resumeCalls)===0);
    check(`${width}: no horizontal overflow`, await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:`${dir}/ready-${width}.png`, fullPage:true});
    const before = await page.evaluate(()=>window.__recovery.quoteCalls);
    await page.getByRole("button",{name:"Atualizar consumo",exact:true}).click();
    await page.waitForFunction(n=>window.__recovery.quoteCalls>n,before);
    await page.waitForFunction(() => [...document.querySelectorAll('button')].filter(b=>b.textContent.includes('Retomar importação com IA')).every(b=>!b.disabled));
    check(`${width}: refresh does not start or persist`, await page.evaluate(()=>window.__recovery.resumeCalls===0&&window.__recovery.mutations.length===0));
    await resume().first().evaluate(button=>{const buttons=[...document.querySelectorAll('button')].filter(b=>b.textContent.includes('Retomar importação com IA')); button.click(); buttons.at(-1).click();});
    await page.waitForFunction(()=>window.__recovery.succeeded);
    check(`${width}: duplicate clicks share one recovery`, await page.evaluate(()=>window.__recovery.resumeCalls===1&&window.__recovery.confirmed.length===1));
    check(`${width}: same intake completes without publication`, await page.evaluate(()=>JSON.stringify(window.__recovery.mutations)==='["persist","complete"]'));
    await open("expires");
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b=>b.textContent.includes('Retomar importação com IA')&&!b.disabled));
    await page.getByText("A previsão de consumo está indisponível ou expirou. Atualize antes de retomar.",{exact:true}).waitFor();
    check(`${width}: expiry disables both without reload`, await resume().first().isDisabled()&&await resume().last().isDisabled());
    await page.evaluate(()=>{window.__recovery.mode="success";});
    await page.getByRole("button",{name:"Atualizar consumo",exact:true}).click();
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b=>b.textContent.includes('Retomar importação com IA')&&!b.disabled));
    check(`${width}: expired quote recovers on refresh`, await resume().first().isEnabled());
    for (const mode of ["insufficient","error"]) {
      await open(mode);
      await page.getByText(mode==="error"?"O uso de Tokens Prisma desta empresa está suspenso. Consulte o administrador.":"Saldo insuficiente de Tokens Prisma. Consulte o administrador da empresa.",{exact:true}).waitFor();
      check(`${width}: ${mode} blocks both actions`, await resume().first().isDisabled()&&await resume().last().isDisabled());
      check(`${width}: ${mode} never calls AI`, await page.evaluate(()=>window.__recovery.resumeCalls===0&&window.__recovery.mutations.length===0));
      await page.evaluate(()=>{window.__recovery.mode="success";});
      await page.getByRole("button",{name:"Atualizar consumo",exact:true}).click();
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b=>b.textContent.includes('Retomar importação com IA')&&!b.disabled));
      check(`${width}: ${mode} recovers without reloading page`, await resume().last().isEnabled());
    }
    await open("failure");
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b=>b.textContent.includes('Retomar importação com IA')&&!b.disabled));
    await resume().last().click();
    await page.getByText("Falha técnica simulada. O documento e o Perfil vigente permanecem preservados.",{exact:true}).waitFor();
    await page.waitForFunction(()=>window.__recovery.quoteCalls>=2);
    check(`${width}: failed retry refreshes consumption without persisting`, await page.evaluate(()=>window.__recovery.resumeCalls===1&&window.__recovery.mutations.length===0));
    await page.evaluate(()=>{window.__recovery.mode="success";});
    await resume().last().click();
    await page.waitForFunction(()=>window.__recovery.succeeded);
    check(`${width}: new deliberate retry is possible`, await page.evaluate(()=>window.__recovery.resumeCalls===2));
    for (const mode of ["approved","contract"]) {
      await open(mode);
      check(`${width}: ${mode} has no recovery or quote`, await resume().count()===0&&await page.evaluate(()=>window.__recovery.quoteCalls===0));
    }
    await page.close();
  }
  check("no browser runtime errors", errors.length===0);
  await writeFile(`${dir}/checks.json`,JSON.stringify({checks,errors},null,2));
  console.log(`Recovery browser: ${checks.length} checks PASS`);
} finally { await browser.close(); }
