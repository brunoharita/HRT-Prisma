// Actual detail components with deterministic services; no real tenant or AI.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH ?? "playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PRISMA_BROWSER_PATH });
const base = "http://127.0.0.1:5701", evidence = "docs/qa/evidence/position-overview-v221", results = [];
await mkdir(evidence, { recursive: true });
const check = (name, value) => { results.push({ name, pass: Boolean(value) }); assert.ok(value, name); };
async function open(scenario = "normal", width = 1537) {
  const page = await browser.newPage({ viewport: { width, height: 1023 } });
  page.on("pageerror", error => { results.push({ name: "runtime", pass: false, error: error.message }); });
  await page.route("**/*", route => route.request().url().startsWith(base + "/") ? route.continue() : (results.push({ name: "unexpected-external-call", pass: false }), route.abort()));
  await page.goto(`${base}/position-overview.html?case=${scenario}`);
  await page.getByRole("heading", { name: scenario === "long" ? /Desenvolvedor backend/ : "Desenvolvedor backend", exact: scenario !== "long" }).waitFor();
  await page.waitForTimeout(100);
  return page;
}
async function calls(page) { return page.evaluate(() => window.__positionOverview.calls); }
async function lastNavigation(page) { return page.evaluate(() => window.__positionOverview.navigations.at(-1)); }
async function geometry(page) {
  return page.evaluate(() => {
    const main = document.querySelector(".prisma-position-reading").getBoundingClientRect(), side = document.querySelector(".prisma-position-context").getBoundingClientRect();
    const icons = [...document.querySelectorAll(".prisma-position-page-icon, .prisma-position-highlight-icon")].map(el => { const box = el.getBoundingClientRect(), svg = el.querySelector("svg").getBoundingClientRect(); return { dx: svg.x + svg.width / 2 - box.x - box.width / 2, dy: svg.y + svg.height / 2 - box.y - box.height / 2 }; });
    return { main: { x: main.x, y: main.y, width: main.width }, side: { x: side.x, y: side.y, width: side.width }, icons,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      accentWidth: getComputedStyle(document.querySelector(".prisma-position-highlight"), "::before").width,
      background: getComputedStyle(document.querySelector(".prisma-position-highlight")).backgroundColor,
      tabsBackground: getComputedStyle(document.querySelector(".prisma-position-tabs > .ant-tabs-nav")).backgroundColor };
  });
}
try {
  for (const width of [1813, 1537, 768, 390, 320]) {
    for (const scenario of ["normal", "empty", "long", "occupied", "pending", "ambiguous", "unresolved", "foreign", "stale", "unknown"]) {
      const page = await open(scenario, width), g = await geometry(page);
      check(`${scenario}/${width}: no overflow`, !g.overflow);
      check(`${scenario}/${width}: centered icons`, g.icons.length === 3 && g.icons.every(i => Math.abs(i.dx) <= 1 && Math.abs(i.dy) <= 1));
      check(`${scenario}/${width}: reference style`, g.accentWidth === "64px" && g.background === "rgb(237, 244, 255)" && g.tabsBackground === "rgb(255, 255, 255)");
      check(`${scenario}/${width}: composition`, width >= 1200 ? Math.abs(g.main.y - g.side.y) <= 1 && g.main.width > g.side.width * 2 : g.side.y > g.main.y && Math.abs(g.side.x - g.main.x) <= 1);
      check(`${scenario}/${width}: only initial reads`, (await calls(page)).join(",") === "load,history");
      if (["foreign", "stale", "unknown", "empty"].includes(scenario)) check(`${scenario}/${width}: no valid reference invented`, await page.getByText("Referência não registrada", { exact: true }).count() === 1);
      if (scenario === "pending") check(`${scenario}/${width}: pending visible and actionable`, await page.getByRole("button", { name: "Classificar requisitos" }).count() === 1 && await page.getByRole("heading", { name: "Para classificar", exact: true }).count() === 1);
      if (["ambiguous", "unresolved"].includes(scenario)) check(`${scenario}/${width}: review action visible`, await page.getByRole("button", { name: "Revisar associação", exact: true }).count() === 1);
      if (scenario === "occupied") check(`${scenario}/${width}: occupancy preserved`, await page.getByRole("button", { name: "Avaliar Pessoa atual", exact: true }).count() === 1 && await page.getByText("Ocupada por Pessoa sintética", { exact: true }).count() === 1 && await page.getByText("CLT", { exact: true }).count() === 1);
      if (scenario === "normal" && [1537, 390].includes(width)) await page.screenshot({ path: `${evidence}/overview-${width}.png`, fullPage: true });
      if (["long", "empty", "pending"].includes(scenario) && width === 390) await page.screenshot({ path: `${evidence}/${scenario}-${width}.png`, fullPage: true });
      results.push({ name: `geometry ${scenario}/${width}`, pass: true, geometry: g });
      await page.close();
    }
  }
  for (const width of [1537, 390]) {
    const page = await open("provenance", width);
    await page.getByText("Ver origem de APIs REST", { exact: true }).click();
    check(`origin/${width}: retained`, await page.getByText("O*NET · 31.0", { exact: true }).count() === 1);
    const referenceButton = page.getByRole("button", { name: "Ver referência e fontes", exact: true });
    await referenceButton.click(); const drawer = page.getByRole("dialog").filter({ hasText: "Referência e fontes da Posição" }); await drawer.waitFor();
    check(`drawer/${width}: complete taxonomy`, await drawer.getByText("Conhecimentos e habilidades relacionados", { exact: true }).count() === 1 && await drawer.getByText("Knowledge complementar da empresa", { exact: true }).count() === 1);
    check(`drawer/${width}: read only`, (await calls(page)).join(",") === "load,history");
    await drawer.getByRole("button", { name: "Por que o Prisma associou assim?" }).click();
    await page.getByRole("dialog").filter({ hasText: "Como o Prisma interpretou esta posição" }).waitFor();
    await page.waitForFunction(() => window.__positionOverview.calls.includes("taxonomy-history"));
    check(`explanation/${width}: history on demand`, (await calls(page)).filter(c => c === "taxonomy-history").length === 1);
    await page.keyboard.press("Escape"); await page.getByRole("dialog").filter({ hasText: "Como o Prisma interpretou esta posição" }).waitFor({ state: "hidden" }); await page.keyboard.press("Escape"); await drawer.waitFor({ state: "hidden" });
    check(`drawer/${width}: focus restored`, await referenceButton.evaluate(el => el === document.activeElement));
    await referenceButton.click(); await drawer.waitFor(); await drawer.getByRole("button", { name: /Corrigir associação/ }).click();
    check(`correction/${width}: edit route`, await lastNavigation(page) === "/vacancies/position-fixture/edit");
    await drawer.waitFor({ state: "hidden" });
    await page.getByRole("tab", { name: "Pessoas encontradas", exact: true }).focus(); await page.keyboard.press("Enter"); check(`people/${width}: direct route`, await lastNavigation(page) === "/vacancies/position-fixture/people");
    await page.getByRole("tab", { name: "Acompanhamento", exact: true }).focus(); await page.keyboard.press("Enter"); check(`follow-up/${width}: route`, await lastNavigation(page) === "/vacancies/position-fixture/follow-up");
    await page.getByRole("tab", { name: "Histórico", exact: true }).focus(); await page.keyboard.press("Enter"); check(`history/${width}: version`, await page.getByText(/Definição v6 ·/).count() === 1);
    await page.getByRole("tab", { name: "Visão geral", exact: true }).focus(); await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Mais ações", exact: true }).click(); await page.getByRole("menuitem", { name: "Excluir posição" }).click();
    const dialog = page.getByRole("dialog").filter({ hasText: "Excluir esta Posição?" }); await dialog.waitFor();
    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click(); check(`delete/${width}: cancellation`, !(await calls(page)).includes("cancel"));
    await page.getByRole("button", { name: "Mais ações", exact: true }).click(); await page.getByRole("menuitem", { name: "Excluir posição" }).click(); await dialog.waitFor(); await dialog.getByRole("button", { name: "Excluir posição", exact: true }).click();
    await page.waitForFunction(() => window.__positionOverview.navigations.at(-1) === "/vacancies"); check(`delete/${width}: existing cancel service`, (await calls(page)).filter(c => c === "cancel").length === 1);
    await page.close();
  }
  const invalid = await open("foreign"); await invalid.getByRole("button", { name: "Ver referência e fontes" }).click();
  check("foreign reference: no disclosure", await invalid.getByText("Software Developers", { exact: true }).count() === 0); await invalid.close();
  const failure = await open("delete-error"); await failure.getByRole("button", { name: "Mais ações" }).click(); await failure.getByRole("menuitem", { name: "Excluir posição" }).click();
  const confirmation = failure.getByRole("dialog").filter({ hasText: "Excluir esta Posição?" }); await confirmation.getByRole("button", { name: "Excluir posição", exact: true }).click();
  await failure.getByText("Falha sintética ao excluir a Posição.", { exact: true }).waitFor(); check("delete failure retains content/modal", await confirmation.isVisible() && await failure.getByRole("heading", { name: "Resumo da posição" }).count() === 1); await failure.close();
} finally {
  await browser.close(); await writeFile(`${evidence}/browser-results.json`, JSON.stringify(results, null, 2) + "\n");
}
const failures = results.filter(r => !r.pass);
console.log(JSON.stringify({ checks: results.length, failures }, null, 2)); assert.equal(failures.length, 0);
