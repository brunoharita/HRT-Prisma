import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH ?? "playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PRISMA_BROWSER_PATH });
const base = "http://127.0.0.1:5699", dir = "docs/qa/evidence/navigation-back-v231", results = [];
await mkdir(dir, { recursive: true });
const check = (name, value) => { results.push({ name, pass: Boolean(value) }); assert.ok(value, name); };
const back = page => page.getByRole("button", { name: "Voltar à tela anterior", exact: true });
async function route(page, path) { await page.evaluate(path => window.__navigationFixture.navigate(path), path); await page.waitForFunction(path => location.pathname === path, path); }
async function ready(page) { await page.waitForFunction(() => window.__navigationFixture?.scopeValue === "session:user:recruiter:company-a" && history.state?.prismaNavigation?.scope === "session:user:recruiter:company-a"); }
async function returned(page, path) { await page.waitForFunction(path => location.pathname === path, path); await page.waitForTimeout(120); }
try {
  for (const width of [1448, 768, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 980 } }), errors = [], external = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", r => r.request().url().startsWith(base + "/") ? r.continue() : (external.push(r.request().url()), r.abort()));
    await page.goto(base + "/profiles/search"); await ready(page);
    check(`${width}: direct entry has no fabricated origin`, await back(page).isDisabled());
    await page.getByLabel("Filtro preservado").fill("Filtro sintético"); await page.evaluate(() => scrollTo(0, 420));
    await route(page, "/profiles/a/profile");
    const arrow = await back(page).boundingBox(), heading = await page.getByRole("heading", { level: 1 }).boundingBox();
    check(`${width}: arrow at upper left before heading`, arrow.x < 40 && arrow.y < heading.y);
    check(`${width}: no overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: `${dir}/profile-${width}.png`, fullPage: false });
    await back(page).click(); await returned(page, "/profiles/search");
    check(`${width}: original filter and scroll preserved`, await page.getByLabel("Filtro preservado").inputValue() === "Filtro sintético" && await page.evaluate(() => scrollY >= 400));
    await page.evaluate(() => history.forward()); await returned(page, "/profiles/a/profile");
    await page.reload(); await ready(page);
    check(`${width}: reload retains confirmed same-scope predecessor`, await back(page).isEnabled());
    await back(page).click(); await returned(page, "/profiles/search");
    check(`${width}: back after reload reaches exact predecessor`, new URL(page.url()).pathname === "/profiles/search");

    await page.goto(base + "/profiles/search"); await ready(page); await route(page, "/profiles/a/profile");
    await page.getByLabel("Rascunho").fill("Escolha humana"); await back(page).click();
    await page.getByRole("button", { name: "Continuar editando", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "detached" });
    check(`${width}: cancel arrow preserves URL and draft`, new URL(page.url()).pathname === "/profiles/a/profile" && await page.getByLabel("Rascunho").inputValue() === "Escolha humana");
    await back(page).evaluate(button => { button.click(); button.click(); }); await page.getByRole("button", { name: "Sair sem salvar", exact: true }).click(); await returned(page, "/profiles/search");
    await page.getByRole("dialog").waitFor({ state: "detached" });
    check(`${width}: confirmed arrow asks once and double click returns only once`, await page.getByRole("dialog").count() === 0 && new URL(page.url()).pathname === "/profiles/search");

    await route(page, "/profiles/a/profile"); await page.getByLabel("Rascunho").fill("Preservar");
    await page.evaluate(() => history.back()); await page.getByRole("button", { name: "Continuar editando", exact: true }).click(); await returned(page, "/profiles/a/profile");
    await page.getByRole("dialog").waitFor({ state: "detached" });
    check(`${width}: cancelling browser back also preserves draft`, await page.getByLabel("Rascunho").inputValue() === "Preservar");
    await page.evaluate(() => history.back()); await page.getByRole("button", { name: "Sair sem salvar", exact: true }).click(); await returned(page, "/profiles/search");
    await page.getByRole("dialog").waitFor({ state: "detached" });

    await page.getByRole("button", { name: "Alternar área" }).click();
    await page.getByRole("button", { name: "Próxima etapa" }).click();
    await page.getByRole("button", { name: "Próxima etapa" }).click();
    await back(page).click(); check(`${width}: internal steps return without pushing URL`, await page.getByTestId("step").innerText() === "Etapa 1" && new URL(page.url()).pathname === "/profiles/search");
    await back(page).click(); check(`${width}: second internal return reaches initial step`, await page.getByTestId("step").innerText() === "Etapa 0");
    await back(page).click(); check(`${width}: area returns to previous area`, await page.getByTestId("tab").innerText() === "Resumo");

    await route(page, "/profiles/a/profile");
    for (const scope of ["session:user:recruiter:company-b", "session:user:member:company-b", "new-session:user:member:company-b"]) {
      await page.evaluate(scope => window.__navigationFixture.scope(scope), scope);
      await page.waitForFunction(scope => history.state?.prismaNavigation?.scope === scope, scope);
      check(`${width}: ${scope} cannot return across scope`, await back(page).isDisabled());
    }
    check(`${width}: no exceptions or external requests`, errors.length === 0 && external.length === 0);
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 1448, height: 980 } });
  const graph = [
    ["/vacancies/p/people", "/profiles/a/profile"], ["/profiles/search", "/profiles/a/profile"],
    ["/profiles/a", "/profiles/a/edit"], ["/profiles/a/documents/d", "/profiles/a/documents/d/review/r"],
    ["/profiles/a/versions", "/profiles/a/reviews/r"], ["/vacancies/p", "/vacancies/p/follow-up"],
    ["/vacancies", "/vacancies/p/edit"], ["/vacancies/p/follow-up/a", "/vacancies/p/follow-up/a/assessment"],
    ["/matching/verification-needs/n/prepare", "/verifications/new/a"], ["/users", "/users/new"],
  ];
  for (const [origin, destination] of graph) {
    await page.goto(base + origin); await ready(page); await route(page, destination);
    await back(page).click(); await returned(page, origin);
    check(`route ${destination}: exact immediate origin ${origin}`, new URL(page.url()).pathname === origin);
  }
  await page.goto(base + "/profiles/search"); await ready(page); await route(page, "/profiles/a/edit");
  await page.getByRole("heading", { name: "Editar Pessoa", exact: true }).waitFor();
  await page.screenshot({ path: `${dir}/person-edit-1448.png`, fullPage: true });
  await page.getByRole("button", { name: "Ir para Pessoas", exact: true }).click(); await returned(page, "/profiles");
  check("actual PersonForm: fixed destination remains distinct", new URL(page.url()).pathname === "/profiles");
  await back(page).click(); await returned(page, "/profiles/a/edit");
  await page.goto(base + "/vacancies/p/follow-up/a"); await ready(page); await route(page, "/vacancies/p/follow-up/a/assessment");
  await page.getByRole("checkbox", { name: "Requisito sintético", exact: true }).check();
  await page.screenshot({ path: `${dir}/assessment-1448.png`, fullPage: true });
  await page.getByRole("button", { name: "Continuar para questões", exact: true }).click();
  await page.getByText("Compor questões", { exact: true }).waitFor(); await back(page).click();
  await page.getByText("Configurar avaliação", { exact: true }).waitFor();
  check("actual assessment: arrow returns to configuration without leaving route", new URL(page.url()).pathname.endsWith("/assessment"));
  await back(page).click(); await returned(page, "/vacancies/p/follow-up/a");
  check("actual assessment: next return reaches candidate context", new URL(page.url()).pathname === "/vacancies/p/follow-up/a");
  check("no implicit AI, invitation or dispatch", await page.evaluate(() => !window.__navigationFixture.calls.some(action => ["generate", "send", "dispatch"].includes(action))));
  await page.close();
} finally {
  await writeFile(`${dir}/browser-results.json`, JSON.stringify({ results, limits: ["Synthetic browser QA with real navigation/Page and PersonForm/PositionAssessment components; remaining route graph uses shared-page fixtures.", "No authenticated production candidate or backend action; no AI/email calls."] }, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ pass: results.filter(r => r.pass).length, total: results.length }));
