import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH ?? "playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PRISMA_BROWSER_PATH });
const base = process.env.PRISMA_PEOPLE_BASE_URL ?? "http://127.0.0.1:5711", dir = "docs/qa/evidence/people-compact-v234", results = [];
const baseline = process.argv.includes("--baseline");
const visualOnly = process.argv.includes("--visual-only");
await mkdir(dir, { recursive: true });
function check(name, value) { results.push({ name, pass: Boolean(value) }); assert.ok(value, name); }
async function open(width, state = "normal") {
  const page = await browser.newPage({ viewport: { width, height: 1024 } });
  page.on("pageerror", error => results.push({ name: "runtime", pass: false, error: error.message }));
  await page.route("**/*", r => r.request().url().startsWith(base + "/") ? r.continue() : (results.push({ name: "external-call", pass: false }), r.abort()));
  await page.goto(`${base}/people-compact.html?state=${state}`);
  await page.locator(state === "compare" ? ".prisma-vacancy-compare-people" : ".prisma-vacancy-match-card").first().waitFor();
  return page;
}
const card = p => p.locator(".prisma-vacancy-match-card").first();
const calls = p => p.evaluate(() => window.__peopleFixture.calls);
try {
  if (baseline) {
    for (const width of [1448, 390]) { const p = await open(width); await p.screenshot({ path: `${dir}/before-${width}.png`, fullPage: true }); results.push({ width, baseline: await card(p).boundingBox() }); await p.close(); }
  } else {
    for (const width of [1536, 1448, 768, 390, 320]) {
      const p = await open(width);
      await card(p).getByText("Já está no acompanhamento", { exact: true }).waitFor();
      check(`${width}: current membership and correct primary action`, await card(p).getByRole("button", { name: "Abrir acompanhamento", exact: true }).isVisible() && await card(p).getByText("Processo atual", { exact: true }).isVisible());
      check(`${width}: no duplicate add action for current member`, await card(p).getByRole("button", { name: "Adicionar ao acompanhamento", exact: true }).count() === 0);
      check(`${width}: following cards collapsed by default`, await p.getByRole("button", { name: "Expandir Pessoa exemplo 1", exact: true }).getAttribute("aria-expanded") === "false");
      check(`${width}: single aggregated read and no passive writes`, (await calls(p)).length === 1 && (await calls(p))[0].name === "load-follow-up");
      check(`${width}: no overflow`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      check(`${width}: avatar preserved on desktop and mobile`, await card(p).locator(".prisma-vacancy-avatar").isVisible());
      check(`${width}: human review is collapsed independently`, await card(p).locator(".prisma-candidate-review").evaluate(n => !n.open));
      await p.screenshot({ path: `${dir}/after-${width}.png`, fullPage: true });
      await p.screenshot({ path: `${dir}/after-${width}-viewport.png`, fullPage: false });
      const geometry = await card(p).evaluate(n => {
        const b = x => { const r = x.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
        return { card: b(n), identity: b(n.querySelector(".prisma-vacancy-match-identity")), toolbar: b(n.querySelector(".prisma-candidate-toolbar")), score: b(n.querySelector(".prisma-score-summary")), requirements: b(n.querySelector(".prisma-candidate-requirements")), trajectory: b(n.querySelector(".prisma-candidate-explanation")), review: b(n.querySelector(".prisma-candidate-review")) };
      });
      check(`${width}: reference topology header -> toolbar -> requirements -> explanation -> review`, geometry.identity.y < geometry.toolbar.y && geometry.toolbar.y < geometry.requirements.y && geometry.requirements.y < geometry.trajectory.y && geometry.trajectory.y < geometry.review.y);
      check(`${width}: score is in identity and follow-up outside score`, await card(p).locator(".prisma-score-summary button").count() === 0);
      results.push({ width, geometry });
      await card(p).locator(".prisma-candidate-review > summary").click();
      const region = card(p).getByRole("region", { name: "Relação da trajetória com a Posição", exact: true });
      check(`${width}: contextual human controls retained`, await region.getByRole("button", { name: "Confirmar relação com a Posição", exact: true }).isEnabled() && await region.getByRole("button", { name: "Enviar relação à curadoria", exact: true }).isDisabled());
      check(`${width}: expanding causes no write`, (await calls(p)).length === 1);
      await card(p).locator(".prisma-candidate-more-requirements > summary").click();
      check(`${width}: all missing requirements remain accessible`, await card(p).getByText("Kubernetes", { exact: true }).isVisible());
      await card(p).getByRole("button", { name: "Abrir acompanhamento", exact: true }).click();
      check(`${width}: explicit current cycle navigation`, (await p.evaluate(() => window.__peopleFixture.navigations)).at(-1).includes("/follow-up/processes/22000000-0000-0000-0000-000000000005/"));
      await p.close();
    }
    if (!visualOnly) {
    for (const state of ["empty", "archived", "closed", "missing", "long", "pending", "review", "confirmed", "dismissed", "contextual", "member"]) {
      const p = await open(390, state); await p.waitForTimeout(180);
      check(`${state}: no overflow`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      if (["empty", "archived"].includes(state)) check(`${state}: no archived membership mistaken for current`, await card(p).getByText("Já está no acompanhamento", { exact: true }).count() === 0 && await card(p).getByRole("button", { name: "Adicionar ao acompanhamento", exact: true }).isEnabled());
      if (state === "closed") { await p.getByRole("button", { name: "Expandir Pessoa exemplo 1", exact: true }).click(); check("closed: adding new person is disabled", await p.locator(".prisma-vacancy-match-card").nth(1).getByRole("button", { name: "Adicionar ao acompanhamento", exact: true }).isDisabled()); }
      if (state === "pending") check("pending: no false human conclusion for unfinished candidate", await p.locator(".prisma-vacancy-match-card").filter({ has: p.getByRole("heading", { name: "Diego Reis", exact: true }) }).count() === 0);
      if (state === "review") { await card(p).locator(".prisma-candidate-review > summary").click(); check("review: divergence action retained", await card(p).getByRole("button", { name: "Revisar divergências", exact: true }).isVisible()); }
      if (["confirmed", "dismissed"].includes(state)) { await card(p).locator(".prisma-candidate-review > summary").click(); check(`${state}: persisted decision gates retained`, await card(p).getByRole("button", { name: state === "confirmed" ? "Confirmar relação com a Posição" : "Desconsiderar esta relação", exact: true }).isDisabled()); }
      if (state === "member") check("member: no privileged follow-up read or add", (await calls(p)).length === 0 && await card(p).getByRole("button", { name: /acompanhamento/i }).count() === 0);
      await p.screenshot({ path: `${dir}/${state}-390.png`, fullPage: true }); await p.close();
    }
    const p = await open(390, "loading");
    check("loading: unknown membership never becomes absence", await card(p).getByRole("button", { name: "Consultar acompanhamento…", exact: true }).isDisabled() && await card(p).getByText("Já está no acompanhamento", { exact: true }).count() === 0);
    await p.evaluate(() => { window.__peopleFixture.hold = false; window.__peopleFixture.fail = true; });
    await p.getByText("Falha sintética na consulta de acompanhamento.", { exact: true }).waitFor();
    check("failure: existing discovery remains consultable", await card(p).getByRole("button", { name: "Ver perfil", exact: true }).isEnabled());
    check("failure: add stays blocked until read succeeds", await card(p).getByRole("button", { name: "Consultar acompanhamento…", exact: true }).isDisabled());
    await p.evaluate(() => { window.__peopleFixture.fail = false; });
    await p.getByRole("button", { name: "Consultar acompanhamento novamente", exact: true }).click();
    await card(p).getByText("Já está no acompanhamento", { exact: true }).waitFor();
    check("retry: membership recovered", (await calls(p)).filter(c => c.name === "load-follow-up").length === 2);
    await p.evaluate(() => window.__peopleFixture.remount()); await card(p).getByText("Já está no acompanhamento", { exact: true }).waitFor();
    check("return: persisted membership reloaded", (await calls(p)).filter(c => c.name === "load-follow-up").length === 3);
    await p.evaluate(() => window.dispatchEvent(new Event("focus"))); await p.waitForTimeout(150);
    check("window return: membership read only", (await calls(p)).filter(c => c.name === "load-follow-up").length === 4 && (await calls(p)).every(c => c.name === "load-follow-up"));
    await p.close();
    const add = await open(390, "empty");
    const addButton = card(add).getByRole("button", { name: "Adicionar ao acompanhamento", exact: true }); await addButton.waitFor(); await addButton.isEnabled();
    await add.evaluate(() => { window.__peopleFixture.mutateFail = true; }); await addButton.click();
    await card(add).getByText("Falha sintética na inclusão.", { exact: true }).waitFor();
    check("add failure: no success invented", await card(add).getByText("Já está no acompanhamento", { exact: true }).count() === 0);
    await add.evaluate(() => { window.__peopleFixture.mutateFail = false; }); await card(add).getByRole("button", { name: "Tentar novamente", exact: true }).click();
    await card(add).getByText("Já está no acompanhamento", { exact: true }).waitFor();
    check("add success: immediate membership update and open action", await card(add).getByRole("button", { name: "Abrir acompanhamento", exact: true }).isVisible()); await add.close();
    const existing = await open(390); await card(existing).getByText("Já está no acompanhamento", { exact: true }).waitFor();
    await existing.getByRole("button", { name: "Expandir Pessoa exemplo 1", exact: true }).click();
    const second = existing.locator(".prisma-vacancy-match-card").nth(1);
    await second.getByRole("button", { name: "Adicionar ao acompanhamento", exact: true }).click();
    await second.getByText("Já está no acompanhamento", { exact: true }).waitFor();
    check("existing process: inclusion carries explicit cycle and tenant", (await calls(existing)).some(c => c.name === "add-follow-up" && c.args[0] === "22000000-0000-0000-0000-000000000003" && c.args[6] === "22000000-0000-0000-0000-000000000005")); await existing.close();
    const race = await open(390, "loading");
    await race.evaluate(() => { window.__peopleFixture.switchScope("other-company", "other-position"); });
    await race.waitForTimeout(100); await race.evaluate(() => { window.__peopleFixture.hold = false; });
    await race.waitForTimeout(250);
    check("scope race: stale original tenant data ignored", await card(race).getByText("Já está no acompanhamento", { exact: true }).count() === 0);
    check("scope race: new tenant/position read", (await calls(race)).some(c => c.name === "load-follow-up" && c.args.organization === "other-company" && c.args.position === "other-position")); await race.close();
    const actions = await open(1448); await card(actions).getByText("Já está no acompanhamento", { exact: true }).waitFor();
    await card(actions).getByRole("button", { name: "Ver perfil", exact: true }).click();
    check("profile: original route retained", (await actions.evaluate(() => window.__peopleFixture.navigations)).at(-1).endsWith("/profile"));
    await card(actions).locator(".prisma-candidate-review > summary").click();
    await card(actions).getByRole("button", { name: "Confirmar relação com a Posição", exact: true }).click();
    await card(actions).getByText("Relação com a Posição confirmada por você", { exact: true }).waitFor();
    check("human decision: explicit handler and no follow-up write", (await calls(actions)).some(c => c.name === "decision" && c.args === "confirmed") && !(await calls(actions)).some(c => c.name === "add-follow-up"));
    await card(actions).getByRole("button", { name: "Enviar relação à curadoria", exact: true }).click();
    await card(actions).getByRole("button", { name: "Recalcular score", exact: true }).click();
    check("curation/recalculation: explicit handlers retained", (await calls(actions)).some(c => c.name === "curation") && (await calls(actions)).some(c => c.name === "recalculate"));
    await actions.close();
    for (const width of [1448, 390]) { const compare = await open(width, "compare"); check(`${width}: comparison CSS preserved`, await compare.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await compare.screenshot({ path: `${dir}/compare-${width}.png`, fullPage: true }); await compare.close(); }
    }
    check("no runtime/external failures", results.every(r => r.pass !== false));
  }
  await writeFile(`${dir}/${baseline ? "baseline" : visualOnly ? "visual-results" : "browser-results"}.json`, JSON.stringify(results, null, 2));
  console.log(`PASS: ${results.filter(r => r.pass).length} checks; ${baseline ? "baseline" : "responsive/functional/negative"}`);
} finally { await browser.close(); }
