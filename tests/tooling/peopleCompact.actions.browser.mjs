import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH ?? "playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PRISMA_BROWSER_PATH });
const results = [], check = (name, pass) => { results.push({ name, pass }); assert.ok(pass, name); };
try {
  const p = await browser.newPage({ viewport: { width: 1448, height: 1024 } });
  await p.route("**/*", r => r.request().url().startsWith("http://127.0.0.1:5711/") ? r.continue() : r.abort());
  await p.goto("http://127.0.0.1:5711/people-compact.html");
  await p.getByText("Já está no acompanhamento", { exact: true }).waitFor();
  await p.getByRole("button", { name: "Ver cálculo do score", exact: true }).first().click();
  await p.getByText("Como o score foi calculado", { exact: true }).waitFor();
  check("explicit score drawer: original dimensions and provenance retained", await p.getByText("Versões usadas", { exact: true }).isVisible());
  check("score consultation records evaluation explicitly, never recalculates", (await p.evaluate(() => window.__peopleFixture.calls)).some(c => c.name === "evaluate") && !(await p.evaluate(() => window.__peopleFixture.calls)).some(c => c.name === "recalculate"));
  await p.locator(".ant-drawer-close").click(); await p.locator(".ant-drawer-open").waitFor({ state: "detached" });
  await p.getByRole("checkbox", { name: "Comparar Diego Reis", exact: true }).check();
  await p.getByRole("checkbox", { name: "Comparar Pessoa exemplo 1", exact: true }).check();
  check("two deliberate selections enable comparison", await p.getByRole("button", { name: /Comparar selecionadas \(2\/2\)/ }).isEnabled());
  await p.getByRole("checkbox", { name: "Comparar Pessoa exemplo 2", exact: true }).click();
  check("third selection does not replace either human choice", await p.getByRole("checkbox", { name: "Comparar Diego Reis", exact: true }).isChecked() && await p.getByRole("checkbox", { name: "Comparar Pessoa exemplo 1", exact: true }).isChecked() && !await p.getByRole("checkbox", { name: "Comparar Pessoa exemplo 2", exact: true }).isChecked());
  await p.getByRole("button", { name: /Comparar selecionadas \(2\/2\)/ }).click();
  check("comparison receives selected person identities", (await p.evaluate(() => window.__peopleFixture.navigations)).at(-1).endsWith("/compare/22000000-0000-0000-0000-000000000010/22000000-0000-0000-0000-000000000011"));
  await writeFile("docs/qa/evidence/people-compact-v234/action-results.json", JSON.stringify(results, null, 2));
  console.log(`PASS: ${results.length} score/comparison preservation checks`);
} finally { await browser.close(); }
