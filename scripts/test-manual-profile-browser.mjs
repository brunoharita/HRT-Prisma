import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
const { chromium } = createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH ?? "C:/Users/Bruno/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const base = process.env.PRISMA_MANUAL_QA_URL ?? "http://127.0.0.1:5717", dir = "docs/qa/evidence/manual-profile-v270/browser";
const browser = await chromium.launch({ headless: true, executablePath: process.env.PRISMA_BROWSER_PATH ?? "C:/Users/Bruno/AppData/Local/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe" });
await mkdir(dir, { recursive: true });
const entry = resolve("tests/browser/manual-profile-v270.tsx").replaceAll("\\", "/");
await writeFile("web/manual-profile-qa.html", `<html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root"></div><script type="module" src="/@fs/${entry}"></script></body></html>`);
const results = [], errors = [], outbound = [];
const onlyPeople = process.argv.includes("--people-only");
const reviewOnly = process.argv.includes("--review-only");
const check = (name, pass) => { results.push({ name, pass: Boolean(pass) }); assert.ok(pass, name); };
let currentPage;
async function page(view, state = "full", width = 1448, role = "recruiter") {
  const p = await browser.newPage({ viewport: { width, height: 1000 } }); currentPage = p; p.setDefaultTimeout(12000);
  p.on("pageerror", e => errors.push(e.message));
  await p.route("**/*", route => route.request().url().startsWith(base + "/") ? route.continue() : (outbound.push(new URL(route.request().url()).origin), route.abort()));
  await p.goto(`${base}/manual-profile-qa.html?view=${view}&state=${state}&role=${role}`);
  return p;
}
async function capture(p, name) {
  await p.evaluate(() => document.fonts.ready);
  check(name + " no horizontal page overflow", await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await p.screenshot({ path: `${dir}/${name}.png`, fullPage: true, animations: "disabled" });
}
async function tab(p, label) {
  const target = p.getByRole("tab", { name: label });
  if (await target.isVisible() && await target.evaluate(n => { const r = n.getBoundingClientRect(); return r.x >= 0 && r.right <= innerWidth; })) await target.click();
  else {
    await p.locator(".prisma-review-tabs .ant-tabs-nav-more").click();
    await p.locator(".ant-tabs-dropdown").getByText(label, { exact: true }).click();
  }
}
try {
  for (const width of onlyPeople ? [] : [1448, 390, 320]) {
    for (const state of ["empty", "full", "error"]) {
      const p = await page("editor", state, width);
      if (state === "error") await p.getByText(/Falha sintética recuperável/).first().waitFor();
      else await p.getByRole("tab", { name: "Resumo", exact: true }).waitFor();
      check(`${width}/${state} manual has no visible document pane`, await p.locator(".prisma-review-document-pane:visible").count() === 0);
      if (state !== "error") check(`${width}/${state} all six review sections preserved`, await p.locator(".prisma-review-tabs [role=tab]").count() === 6);
      if (state === "empty") {
        check(`${width} empty optional sections collapsed`, await p.getByRole("textbox").count() === 1);
        await p.getByRole("button", { name: /Comparar com o perfil atual$/ }).click();
        await p.locator(".prisma-review-page > .ant-alert .ant-alert-title").waitFor();
        check(`${width} validation error stays readable`, await p.locator(".prisma-review-page > .ant-alert .ant-alert-title").evaluate(n => n.getBoundingClientRect().width > 120));
        check(`${width} partial never automatically publishes`, await p.evaluate(() => window.qa.publications === 0));
      }
      await capture(p, `editor-${state}-${width}`); await p.close();
    }
    const baseline = await page("baseline", "full", width);
    await baseline.getByRole("tab", { name: "Resumo", exact: true }).waitFor();
    check(`${width} reference and manual preserve six tabs`, await baseline.locator(".prisma-review-tabs [role=tab]").count() === 6);
    await capture(baseline, `reference-editor-${width}`); await baseline.close();

    const p = await page("editor", "empty", width);
    await p.getByRole("tab", { name: "Resumo", exact: true }).waitFor();
    await p.locator("summary").filter({ hasText: /^Posicionamento profissional$/ }).click();
    await p.getByRole("textbox", { name: "Cargo ou título profissional", exact: true }).fill("Analista declarado");
    await p.getByRole("button", { name: /Salvar rascunho$/ }).first().click();
    await p.waitForFunction(() => window.qa.saved?.professionalTitle === "Analista declarado");
    check(`${width} partial saved without requiring all sections`, await p.evaluate(() => window.qa.publications === 0 && window.qa.saved.contact.email === null));
    await tab(p, /^Experiência/);
    await p.getByRole("button", { name: /Adicionar experiência$/ }).click();
    await p.getByRole("textbox", { name: "Empresa", exact: true }).fill("Empresa declarada A");
    await p.getByRole("textbox", { name: "Cargo", exact: true }).fill("Analista");
    await p.getByRole("button", { name: /Adicionar experiência$/ }).click();
    await p.getByRole("textbox", { name: "Empresa", exact: true }).fill("Empresa declarada B");
    await p.getByRole("textbox", { name: "Cargo", exact: true }).fill("Especialista");
    await p.getByRole("button", { name: /Salvar rascunho$/ }).first().click();
    await p.waitForFunction(() => window.qa.saved?.experiences.length === 2);
    check(`${width} repeated structured records keep manual source and no fake evidence`, await p.evaluate(() => window.qa.saved.experiences.every(x => x.source === "human" && x.page === null && x.evidenceText === "")));
    await capture(p, `manual-lists-${width}`);
    await tab(p, "Outros");
    check(`${width} empty tools and contexts remain editable`, (await p.locator("body").innerText()).includes("Ferramentas e tecnologias") && (await p.locator("body").innerText()).includes("Contextos profissionais"));
    await p.getByRole("button", { name: /Criar área personalizada$/ }).click();
    await p.getByRole("textbox", { name: "Nome da seção manual", exact: true }).fill("Projetos declarados");
    await p.getByRole("textbox", { name: "Primeiro registro manual", exact: true }).fill("Projeto estruturado A");
    await p.getByRole("button", { name: "Adicionar seção", exact: true }).click();
    await p.getByRole("button", { name: /Salvar rascunho$/ }).first().click();
    await p.waitForFunction(() => window.qa.saved?.customSections.length === 1);
    await tab(p, "Resumo");
    const contact = p.locator("summary").filter({ hasText: /^Contato e localização/ });
    if (!await p.getByRole("textbox", { name: "E-mail", exact: true }).isVisible()) await contact.click();
    await p.getByRole("textbox", { name: "E-mail", exact: true }).fill("manual@example.invalid");
    await p.getByRole("button", { name: /Salvar rascunho$/ }).first().click();
    await p.waitForFunction(() => window.qa.saved?.contact.email === "manual@example.invalid");
    await p.getByRole("button", { name: /Comparar com o perfil atual$/ }).click();
    await p.locator(".prisma-delta-page").waitFor();
    check(`${width} explicit comparison precedes publication`, await p.evaluate(() => window.qa.publications === 0 && window.qa.navigation.endsWith("/delta")));
    await capture(p, `comparison-${width}`);
    await p.getByRole("button", { name: /Publicar/ }).first().click();
    await p.waitForFunction(() => window.qa.publications === 1);
    check(`${width} only explicit human publication invokes writer`, await p.evaluate(() => window.qa.publications === 1));
    await p.close();

    const rates = await page("rates", "full", width);
    await rates.getByText("Tarifas atuais", { exact: true }).waitFor();
    check(`${width} rates default open and future hidden`, await rates.getByText("14.785", { exact: true }).isVisible() && !await rates.getByText("19.019", { exact: true }).isVisible());
    await rates.getByText("Histórico de tarifas", { exact: true }).click();
    check(`${width} future explicitly scheduled and history retained`, await rates.getByText("Programada", { exact: true }).isVisible() && await rates.getByText("10.001", { exact: true }).isVisible());
    await capture(rates, `rates-${width}`); await rates.close();
  }
  for (const width of onlyPeople ? [] : [1448, 390]) {
    const start = await page("start", "duplicate", width);
    await start.getByLabel("Nome completo", { exact: true }).fill("Pessoa nova sintética");
    await start.getByRole("button", { name: "Verificar e abrir editor", exact: true }).click();
    await start.getByRole("button", { name: "Abrir cadastro existente", exact: true }).waitFor();
    check(`${width} duplicate suggestion requires human choice`, await start.evaluate(() => !window.qa.calls.includes("start-manual")));
    await capture(start, `duplicates-${width}`);
    await start.getByRole("button", { name: /Conferi: criar outra Pessoa/ }).click();
    await start.getByRole("tab", { name: "Resumo", exact: true }).waitFor();
    check(`${width} explicit new Person opens structured editor`, await start.evaluate(() => window.qa.calls.filter(x => x === "start-manual").length === 1));
    await start.close();
    if (reviewOnly) continue;
    const employee = await page("person", "full", width);
    await employee.getByRole("radio", { name: "Não", exact: true }).waitFor();
    check(`${width} employee is exactly binary`, await employee.getByRole("radio").count() === 2);
    await employee.getByRole("radio", { name: "Não", exact: true }).check();
    await capture(employee, `employee-${width}`);
    await employee.getByRole("button", { name: /Salvar Pessoa$/ }).click();
    await employee.waitForFunction(() => window.qa.personSaved?.isActiveEmployee === false);
    check(`${width} employee false is passed as boolean`, await employee.evaluate(() => window.qa.personSaved.isActiveEmployee === false));
    await employee.close();
    const workspace = await page("workspace", "update", width);
    await workspace.getByRole("button", { name: /Atualizar perfil manualmente$/ }).waitFor();
    check(`${width} confirmed employee discreetly indicated`, await workspace.getByText("Funcionário ativo da empresa", { exact: true }).isVisible());
    check(`${width} draft can be resumed from Person`, await workspace.getByRole("button", { name: "Continuar preenchimento", exact: true }).isVisible());
    await capture(workspace, `workspace-${width}`); await workspace.close();
  }
  for (const width of reviewOnly ? [] : [1448, 390, 320]) {
    const p = await page("people", "full", width);
    await p.getByText("Pessoa não confirmada", {exact:true}).waitFor();
    check(`${width} manual and PDF entries accessible together`, await p.getByRole("button",{name:/Preencher manualmente$/}).isVisible() && await p.getByRole("button",{name:/Importar currículo$/}).isVisible());
    await p.getByRole("button", {name:/Filtros$/}).click();
    await p.getByRole("combobox",{name:"Filtrar funcionário ativo"}).click();
    await p.locator(".ant-select-dropdown").getByText("Funcionário ativo: Sim",{exact:true}).click();
    check(`${width} employee Yes filter selects only confirmed`, await p.locator("tbody tr[data-row-key]").count() === 1 && await p.getByText("Pessoa manual sintética",{exact:true}).isVisible());
    await p.getByRole("combobox",{name:"Filtrar funcionário ativo"}).click();
    await p.locator(".ant-select-dropdown").getByText("Funcionário ativo: Não",{exact:true}).click();
    check(`${width} No filter includes legacy absence administratively`, await p.locator("tbody tr[data-row-key]").count() === 2 && await p.getByText("Pessoa legado",{exact:true}).isVisible());
    await capture(p,`people-filter-${width}`); await p.close();
  }
  for (const width of [1448,390]) {
    const loading=await page("editor","loading",width);
    check(`${width} loading never shows a false empty form`, await loading.getByRole("tab",{name:"Resumo",exact:true}).count()===0);
    await capture(loading,`loading-${width}`); await loading.getByRole("tab",{name:"Resumo",exact:true}).waitFor(); await loading.close();
    const failed=await page("editor","save-error",width);
    await failed.getByRole("textbox",{name:"Cargo ou título profissional",exact:true}).fill("Alteração preservada após falha");
    await failed.getByRole("button",{name:/Salvar rascunho$/}).first().click();
    await failed.locator(".prisma-review-page > .ant-alert-error").waitFor();
    check(`${width} save failure preserves typed draft and published authority`, await failed.getByRole("textbox",{name:"Cargo ou título profissional",exact:true}).inputValue()==="Alteração preservada após falha" && await failed.evaluate(()=>window.qa.publications===0));
    await capture(failed,`save-error-${width}`); await failed.close();
    const rates=await page("rates","full",width);await rates.getByText("Histórico de tarifas",{exact:true}).click();await capture(rates,`rates-${width}`);await rates.close();
  }
  check("no client runtime errors", errors.length === 0);
  check("manual lifecycle makes zero external network/AI/token calls", outbound.length === 0);
} catch (error) {
  if (currentPage && !currentPage.isClosed()) await currentPage.screenshot({ path: `${dir}/failure.png`, fullPage: true }).catch(() => undefined);
  throw error;
} finally {
  await writeFile(`${dir}/${onlyPeople ? "people-checks" : "checks"}.json`, JSON.stringify({ results, errors, outbound, limits: "Synthetic local browser transport; database authority separately verified in SQL." }, null, 2) + "\n");
  await browser.close(); await unlink("web/manual-profile-qa.html");
}
console.log(`PASS ${results.length} browser assertions`);
