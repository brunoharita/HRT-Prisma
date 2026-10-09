import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH ?? "playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PRISMA_BROWSER_PATH });
const base = "http://127.0.0.1:5703", dir = "docs/qa/evidence/position-relation-clarity", results = [];
await mkdir(dir, { recursive: true });
const baseline = process.argv.includes("--baseline");
const comparisonOnly = process.argv.includes("--comparison-only");
function check(name, value) { results.push({ name, pass: Boolean(value) }); assert.ok(value, name); }
async function open(width, state = "normal") {
  const page = await browser.newPage({ viewport: { width, height: 1003 } });
  page.on("pageerror", error => results.push({ name: "runtime", pass: false, error: error.message }));
  await page.route("**/*", route => route.request().url().startsWith(base + "/") ? route.continue() : (results.push({ name: "external-call", pass: false }), route.abort()));
  await page.goto(`${base}/position-relation.html?state=${state}`);
  await page.getByRole("heading", { name: /Pessoas para Desenvolvedor backend/ }).waitFor();
  if (state !== "pending") await page.locator(".prisma-vacancy-match-card").waitFor();
  else await page.locator('[role="status"]').filter({ hasText: "Consultando Perfis" }).waitFor({ state: "detached" });
  return page;
}
const group = page => page.getByRole("region", { name: "Relação da trajetória com a Posição", exact: true });
// Ant Design adds its loading icon to the accessible name while pending.
const button = (page, name) => group(page).locator("button").filter({ hasText: name });
const confirm = "Confirmar relação com a Posição", dismiss = "Desconsiderar esta relação", curate = "Enviar relação à curadoria";
try {
  for (const width of comparisonOnly ? [] : baseline ? [1537, 390] : [1537, 768, 390, 320]) {
    const page = await open(width);
    if (!baseline) {
      check(`${width}: question uses real Position`, (await group(page).innerText()).includes("trabalho de Desenvolvedor backend?"));
      for (const text of ["Considero essa trajetória relacionada ao trabalho previsto.", "Não considero pertinente a associação apresentada neste caso.", "Proponho que a relação confirmada seja revisada para possível inclusão na Knowledge.", "Confirmar essa relação não significa atender aos requisitos nem aprovar a Pessoa no processo seletivo.", "Adicionar ao acompanhamento"]) check(`${width}: visible explanation: ${text}`, (await group(page).innerText()).includes(text));
      check(`${width}: curation requires confirmation`, await button(page, curate).isDisabled());
      check(`${width}: no passive mutations`, (await page.evaluate(() => window.__relationFixture.calls)).length === 0);
      const g = await page.evaluate(() => { const a = document.querySelector(".is-consult").getBoundingClientRect(), b = document.querySelector(".is-decision").getBoundingClientRect(); return { overflow: document.documentElement.scrollWidth > innerWidth + 1, consult: { x: a.x, y: a.y, right: a.right }, decision: { x: b.x, y: b.y }, clipped: [...document.querySelectorAll(".is-decision button")].some(el => el.scrollWidth > el.clientWidth + 2) }; });
      check(`${width}: no page overflow or clipped actions`, !g.overflow && !g.clipped);
      check(`${width}: original action topology preserved`, width > 760 ? g.decision.x >= g.consult.right : g.decision.y > g.consult.y);
    }
    await page.screenshot({ path: `${dir}/${baseline ? "before" : "after"}-${width}.png`, fullPage: true });
    await page.close();
  }
  if (!baseline) {
    if (!comparisonOnly) {
    for (const state of ["confirmed", "dismissed", "no-evidence", "long", "pending", "review"]) {
      const page = await open(390, state);
      if (state === "pending") check("pending: decision unavailable", await page.locator(".is-decision").count() === 0);
      else {
        check(`${state}: readable mobile`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        if (state === "confirmed") { check("confirmed: explicit relation status", await page.getByText("Relação com a Posição confirmada por você", { exact: true }).isVisible()); check("confirmed: confirmation disabled, curation available", await button(page, confirm).isDisabled() && await button(page, curate).isEnabled()); }
        if (state === "dismissed") { check("dismissed: explicit relation status", await page.getByText("Relação com a Posição desconsiderada por você", { exact: true }).isVisible()); check("dismissed: can reconsider, cannot curate", await button(page, dismiss).isDisabled() && await button(page, confirm).isEnabled() && await button(page, curate).isDisabled()); }
        if (state === "no-evidence") { await button(page, confirm).click(); await button(page, confirm).isDisabled(); await page.getByText("Relação com a Posição confirmada por você", { exact: true }).waitFor(); check("no-evidence: curation remains disabled after confirmation", await button(page, curate).isDisabled()); }
        if (state === "long") check("long: dynamic title preserved", (await group(page).innerText()).includes("plataformas de dados corporativos?"));
        if (state === "review") check("review: separate review action preserved", await page.getByRole("button", { name: "Revisar divergências", exact: true }).isVisible());
      }
      await page.screenshot({ path: `${dir}/${state}-390.png`, fullPage: true }); await page.close();
    }
    for (const width of [1537, 768]) {
      const review = await open(width, "review");
      check(`${width}: conflict review and contextual relation coexist`, await review.getByRole("button", { name: "Revisar divergências", exact: true }).isVisible() && await group(review).isVisible());
      check(`${width}: review layout has no overflow`, await review.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await review.screenshot({ path: `${dir}/review-${width}.png`, fullPage: true }); await review.close();
    }
    const page = await open(1537);
    await page.evaluate(() => { window.__relationFixture.hold = true; });
    await button(page, confirm).dispatchEvent("click");
    await button(page, confirm).locator(".ant-btn-loading-icon").waitFor();
    check("decision: loading stays visible", await button(page, confirm).evaluate(el => el.classList.contains("ant-btn-loading")));
    await page.evaluate(() => { window.__relationFixture.hold = false; });
    await page.getByText("Relação com a Posição confirmada por você", { exact: true }).waitFor();
    await button(page, confirm).locator(".ant-btn-loading-icon").waitFor({ state: "detached" });
    check("decision: explicit confirmed payload and refresh", JSON.stringify(await page.evaluate(() => window.__relationFixture.calls)) === JSON.stringify([{ name: "decision", decision: "confirmed" }, { name: "refresh" }]));
    check("decision: no Kanban mutation", (await page.evaluate(() => window.__followUpFixture.calls)).every(call => call.name === "get_position_follow_up"));
    await page.evaluate(() => { window.__relationFixture.hold = true; });
    await button(page, curate).dispatchEvent("click");
    await button(page, curate).locator(".ant-btn-loading-icon").waitFor();
    check("curation: loading", await button(page, curate).evaluate(el => el.classList.contains("ant-btn-loading")));
    await page.evaluate(() => { window.__relationFixture.hold = false; });
    await button(page, curate).locator(".ant-btn-loading-icon").waitFor({ state: "detached" });
    check("curation: reuses separate proposal handler", (await page.evaluate(() => window.__relationFixture.calls)).at(-1).name === "curation");
    await button(page, dismiss).click(); await page.getByText("Relação com a Posição desconsiderada por você", { exact: true }).waitFor();
    check("dismiss: unchanged contextual payload", (await page.evaluate(() => window.__relationFixture.calls)).some(c => c.decision === "dismissed"));
    await button(page, dismiss).locator(".ant-btn-loading-icon").waitFor({ state: "detached" });
    await page.evaluate(() => { window.__relationFixture.fail = true; }); await button(page, confirm).click();
    await page.getByText("Falha sintética ao registrar a relação.", { exact: true }).waitFor();
    check("failure: relation and content preserved", await page.getByText("Relação com a Posição desconsiderada por você", { exact: true }).isVisible());
    await page.evaluate(() => { window.__relationFixture.fail = false; }); await button(page, confirm).click(); await page.getByText("Relação com a Posição confirmada por você", { exact: true }).waitFor();
    check("failure: explicit retry succeeds", true);
    await page.getByRole("button", { name: "Adicionar ao acompanhamento", exact: true }).click(); await page.getByRole("button", { name: "Pessoa adicionada ao acompanhamento", exact: true }).waitFor();
    check("Kanban: separate human inclusion", (await page.evaluate(() => window.__followUpFixture.calls)).some(call => call.args.p_action === "add"));
    check("comparison: no implicit selection", await page.locator("button").filter({ hasText: "Comparar selecionadas (0/2)" }).isDisabled());
    await page.getByRole("button", { name: "Acompanhamento", exact: true }).click(); check("Kanban: navigation preserved", (await page.evaluate(() => window.__relationFixture.navigations)).at(-1).endsWith("/follow-up"));
    await page.close();
    }
    for (const width of [1537, 390]) {
      const compare = await browser.newPage({ viewport: { width, height: 1003 } });
      await compare.route("**/*", route => route.request().url().startsWith(base + "/") ? route.continue() : (results.push({ name: "external-call", pass: false }), route.abort()));
      await compare.goto(`${base}/position-relation.html?state=compare`);
      await compare.getByText("Relação com a Posição confirmada por você", { exact: true }).waitFor();
      check(`${width}: contextual labels also clear in comparison`, await compare.getByText("Relação com a Posição desconsiderada por você", { exact: true }).isVisible());
      check(`${width}: comparison labels readable without overflow`, await compare.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      check(`${width}: comparison relation tags fit viewport and show complete text`, await compare.locator(".prisma-position-decision-tag").evaluateAll(tags => tags.length === 2 && tags.every(tag => { const r = tag.getBoundingClientRect(); return r.right <= innerWidth && tag.scrollWidth <= tag.clientWidth + 1; })));
      check(`${width}: comparison avatars preserve circular shape`, await compare.locator(".prisma-match-person > :first-child").evaluateAll(avatars => avatars.length === 2 && avatars.every(avatar => { const r = avatar.getBoundingClientRect(); return Math.abs(r.width - r.height) < 1; })));
      await compare.screenshot({ path: `${dir}/comparison-${width}.png`, fullPage: true }); await compare.close();
    }
    check("no runtime errors or external calls", results.every(item => item.pass));
  }
} finally { await writeFile(`${dir}/${baseline ? "baseline" : comparisonOnly ? "comparison-regression" : "browser-results"}.json`, JSON.stringify(results, null, 2)); await browser.close(); }
console.log(`${results.length} checks passed`);
