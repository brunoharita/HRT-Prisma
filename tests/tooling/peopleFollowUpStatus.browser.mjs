import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH ?? "playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PRISMA_BROWSER_PATH });
const base = process.env.PRISMA_PEOPLE_BASE_URL ?? "http://127.0.0.1:5711";
const dir = process.env.PRISMA_PEOPLE_EVIDENCE ?? "docs/qa/evidence/follow-up-active-tag";
const baseline = process.argv.includes("--baseline"), results = [];
await mkdir(dir, { recursive: true });
function check(name, value) { results.push({ name, pass: Boolean(value) }); assert.ok(value, name); }
try {
  for (const width of [1448, 390]) for (const state of ["normal", "closed"]) {
    const page = await browser.newPage({ viewport: { width, height: 1024 } });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.route("**/*", route => route.request().url().startsWith(base + "/") ? route.continue() : (errors.push("external request"), route.abort()));
    await page.goto(`${base}/people-compact.html?state=${state}`);
    const card = page.locator(".prisma-vacancy-match-card").first();
    await card.getByRole("button", { name: "Abrir acompanhamento", exact: true }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    const snapshot = await page.locator(".prisma-vacancy-match-card").evaluateAll(cards => cards.map(card => {
      const copy = card.cloneNode(true);
      copy.querySelectorAll(".prisma-candidate-follow-up-status .ant-tag-green").forEach(n => n.remove());
      const rect = card.getBoundingClientRect();
      return { text: copy.textContent, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }));
    const label = `${state}-${width}`;
    await page.screenshot({ path: `${dir}/${baseline ? "before" : "after"}-${label}.png`, fullPage: true });
    if (baseline) await writeFile(`${dir}/baseline-${label}.json`, JSON.stringify(snapshot, null, 2));
    else {
      const before = JSON.parse(await readFile(`${dir}/baseline-${label}.json`, "utf8"));
      if (state === "normal") assert.deepEqual(snapshot, before, `${label}: active cards unchanged`);
      else {
        assert.deepEqual(snapshot.map(({ text, x, width }) => ({ text, x, width })), before.map(({ text, x, width }) => ({ text, x, width })), `${label}: other content and horizontal geometry unchanged`);
        const delta = snapshot[0].height - before[0].height;
        check(`${label}: removing tag only contracts linked card vertically`, delta <= 0 && snapshot[0].y === before[0].y && snapshot.slice(1).every((c, i) => c.height === before[i + 1].height && Math.abs(c.y - before[i + 1].y - delta) < 0.01));
        results.push({ name: `${label}: natural vertical reflow`, heightDelta: delta });
      }
      check(`${label}: other card content and layout preserved`, true);
      check(`${label}: green tag only for active process`, await card.getByText("Já está no acompanhamento", { exact: true }).count() === (state === "normal" ? 1 : 0));
      check(`${label}: process identification retained`, await card.getByText(state === "closed" ? "Processo atual · encerrado" : "Processo atual", { exact: true }).isVisible());
      check(`${label}: unlinked person has no membership tag`, await page.locator(".prisma-vacancy-match-card").nth(1).getByText("Já está no acompanhamento", { exact: true }).count() === 0);
      await card.getByRole("button", { name: "Abrir acompanhamento", exact: true }).click();
      check(`${label}: historical/current access retains exact process and person`, (await page.evaluate(() => window.__peopleFixture.navigations)).at(-1) === "/vacancies/22000000-0000-0000-0000-000000000001/follow-up/processes/22000000-0000-0000-0000-000000000005/22000000-0000-0000-0000-000000000010");
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await page.waitForFunction(() => window.__peopleFixture.calls.filter(c => c.name === "load-follow-up").length === 2);
      await page.waitForTimeout(120);
      check(`${label}: focus reload retains state without writes or AI`, (await page.evaluate(() => window.__peopleFixture.calls)).every(c => c.name === "load-follow-up") && await card.getByText("Já está no acompanhamento", { exact: true }).count() === (state === "normal" ? 1 : 0));
      check(`${label}: responsive without overflow or runtime/external errors`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1) && errors.length === 0);
    }
    await page.close();
  }
  await writeFile(`${dir}/${baseline ? "baseline-results" : "browser-results"}.json`, JSON.stringify(results, null, 2));
  console.log(baseline ? "Baseline captured: active/closed, desktop/mobile" : `PASS: ${results.length} targeted preservation checks`);
} finally { await browser.close(); }
