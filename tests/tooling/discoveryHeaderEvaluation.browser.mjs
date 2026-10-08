import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH ?? "playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PRISMA_BROWSER_PATH });
const base = "http://127.0.0.1:5703", dir = "docs/qa/evidence/discovery-header-evaluation", baseline = process.argv.includes("--baseline"), results = [];
await mkdir(dir, { recursive: true });
function check(name, value) { results.push({ name, pass: Boolean(value) }); assert.ok(value, name); }
async function open(width, state = "normal") {
  const page = await browser.newPage({ viewport: { width, height: 1003 } });
  page.on("pageerror", error => results.push({ name: "runtime", pass: false, error: error.message }));
  await page.route("**/*", route => route.request().url().startsWith(base + "/") ? route.continue() : (results.push({ name: "external", pass: false }), route.abort()));
  await page.goto(`${base}/position-relation.html?state=${state}`); await page.locator(".prisma-vacancy-match-card").waitFor(); return page;
}
const add = page => page.locator(".prisma-add-to-evaluation button").filter({ hasText: "Adicionar à avaliação" });
try {
  for (const width of baseline ? [1537, 390] : [1813, 1537, 1024, 768, 390, 320]) {
    const page = await open(width);
    if (!baseline) {
      const g = await page.evaluate(() => { const header = document.querySelector(".prisma-vacancy-match-identity"), score = header.querySelector(".prisma-score-summary").getBoundingClientRect(), cta = header.querySelector(".prisma-vacancy-match-action").getBoundingClientRect(), button = header.querySelector(".prisma-add-to-evaluation button"), b = button.getBoundingClientRect(), icon = button.querySelector(".ant-btn-icon").getBoundingClientRect(), svg = button.querySelector("svg").getBoundingClientRect(); return { score: { x: score.x, y: score.y, bottom: score.bottom, right: score.right }, cta: { x: cta.x, y: cta.y, right: cta.right, width: cta.width }, button: { width: b.width, height: b.height, clipped: button.scrollWidth > button.clientWidth + 1 }, overflow: document.documentElement.scrollWidth > innerWidth + 1, iconCentered: Math.abs(icon.x + icon.width / 2 - svg.x - svg.width / 2) < 1 && Math.abs(icon.y + icon.height / 2 - svg.y - svg.height / 2) < 1, primary: button.classList.contains("ant-btn-primary") }; });
      check(`${width}: one blue action in header`, await page.locator(".prisma-vacancy-match-identity .prisma-add-to-evaluation").count() === 1 && g.primary);
      check(`${width}: absent from Consultar`, await page.locator(".is-consult .prisma-add-to-evaluation").count() === 0);
      check(`${width}: no overflow or cut, comfortable size and centered icon`, !g.overflow && !g.button.clipped && g.button.height >= 40 && g.iconCentered);
      if (width > 1100) check(`${width}: CTA right beside Score`, g.cta.x >= g.score.right && Math.abs(g.cta.y - g.score.y) < 80);
      if (width <= 760) check(`${width}: CTA below Score and full width`, g.cta.y >= g.score.bottom && Math.abs(g.cta.width - g.button.width) < 2);
      check(`${width}: no passive inclusion`, (await page.evaluate(() => window.__followUpFixture.calls)).length === 0);
    }
    await page.screenshot({ path: `${dir}/${baseline ? "before" : "after"}-${width}.png`, fullPage: true });
    if (!baseline && width === 1537) await page.locator(".prisma-vacancy-match-identity").screenshot({ path: `${dir}/header-1537.png` });
    await page.close();
  }
  if (!baseline) {
    for (const state of ["long", "review", "member", "missing", "streaming"]) {
      const page = await open(390, state);
      check(`${state}: no overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      check(`${state}: action availability unchanged`, await page.locator(".prisma-add-to-evaluation").count() === (state === "member" ? 0 : 1));
      if (state === "review") check("review: existing action preserved", await page.getByRole("button", { name: "Revisar divergências", exact: true }).isVisible());
      await page.screenshot({ path: `${dir}/${state}-390.png`, fullPage: true }); await page.close();
    }
    const page = await open(1537), before = await page.evaluate(() => ({ score: document.querySelector(".prisma-score-summary").innerText, calls: window.__relationFixture.calls }));
    await page.evaluate(() => { window.__followUpFixture.hold = true; }); await add(page).dispatchEvent("click");
    await add(page).locator(".ant-btn-loading-icon").waitFor(); check("loading: continuous feedback in header", await add(page).evaluate(el => el.classList.contains("ant-btn-loading")));
    await page.evaluate(() => { window.__followUpFixture.fail = true; window.__followUpFixture.hold = false; });
    await page.getByRole("button", { name: "Tentar novamente", exact: true }).waitFor();
    check("failure: header/action/content retained", await add(page).isVisible() && await page.getByRole("heading", { name: "Rafael Lima", exact: true }).isVisible());
    await page.evaluate(() => { window.__followUpFixture.fail = false; }); await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
    const added = page.locator(".prisma-add-to-evaluation button").filter({ hasText: "Pessoa adicionada à avaliação" }); await added.waitFor();
    check("success: disabled confirmation and same add payload", await added.isDisabled() && await page.evaluate(() => window.__followUpFixture.calls.length === 2 && window.__followUpFixture.calls.every(c => c.args.p_action === "add" && c.args.p_payload.profileId && c.args.p_payload.positionId)));
    check("preservation: score, relation and comparison unchanged", before.score === await page.locator(".prisma-score-summary").innerText() && (await page.evaluate(() => window.__relationFixture.calls)).length === 0 && await page.locator("button").filter({ hasText: "Comparar selecionadas (0/2)" }).isDisabled());
    await page.getByRole("button", { name: "Abrir acompanhamento", exact: true }).click(); check("navigation: current person in current Position", (await page.evaluate(() => window.__relationFixture.navigations)).at(-1).includes("/follow-up/"));
    await page.screenshot({ path: `${dir}/added-1537.png`, fullPage: true }); await page.close();
    check("no runtime errors or external calls", results.every(r => r.pass));
  }
} finally { await writeFile(`${dir}/${baseline ? "baseline" : "browser-results"}.json`, JSON.stringify(results, null, 2)); await browser.close(); }
console.log(`${results.length} checks passed`);
