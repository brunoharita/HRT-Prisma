// Geometry regression with real pages and existing CSS variants; no production data or AI.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH ?? "playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PRISMA_BROWSER_PATH });
const evidence = "docs/qa/evidence/icon-centering";
await mkdir(evidence, { recursive: true });
const results = [];
const pages = [
  ...["/", "/profiles", "/vacancies", "/vacancies/new", "/knowledge", "/settings"].map(area => ({ area, base: "http://127.0.0.1:5587", path: "/visual-foundation.html?page=" + encodeURIComponent(area), ready: "h1" })),
  { area: "profile", base: "http://127.0.0.1:5586", path: "/person-unified.html?case=visual-option4", ready: ".prisma-profile-highlight" },
  { area: "kanban", base: "http://127.0.0.1:5697", path: "/position-follow-up.html", ready: ".pf-card" },
];
// Existing selector topologies for variants outside the page fixtures. These are CSS samples,
// not evidence that every authenticated route or hidden interaction was exercised.
const samples = [
  ["route", '<span class="prisma-route-icon">ICON</span>'],
  ["people-metric", '<span class="prisma-people-metric-icon">ICON</span>'],
  ["user-rules", '<div class="prisma-user-system-rules-icon">ICON</div>'],
  ["current-profile", '<span class="prisma-person-current-banner__icon">ICON</span>'],
  ["summary-metric", '<div class="prisma-person-summary-metric"><span>ICON</span></div>'],
  ["operation-metric", '<span class="prisma-operation-metric-icon">ICON</span>'],
  ["operation-legend", '<div class="prisma-operation-legend-item prisma-operation-legend-item--success"><span>ICON</span></div>'],
  ["operation-document", '<span class="prisma-operation-document-icon">ICON</span>'],
  ["journey", '<div class="prisma-journey-explainer"><article><span>ICON</span></article></div>'],
  ["clear-action", '<div class="prisma-person-action-center--clear">ICON</div>'],
  ["section", '<div class="prisma-person-section-label">ICON</div>'],
  ["action", '<div class="prisma-person-action-card__icon">ICON</div>'],
  ["person-stat", '<div class="prisma-person-stat"><span>ICON</span></div>'],
  ["subsection", '<div class="prisma-person-subsection-title">ICON</div>'],
  ["document-context", '<div class="prisma-person-document-context__header">ICON</div>'],
  ["canonical-section", '<section class="prisma-canonical-section"><header><div><span>ICON</span></div></header></section>'],
  ["education", '<span class="prisma-canonical-education__icon">ICON</span>'],
  ["search-welcome", '<span class="prisma-search-welcome-icon">ICON</span>'],
  ["verification-context", 'DIRECT'],
  ["verification-instruction", '<div class="prisma-m51b-instruction-list"><div><span>ICON</span></div></div>'],
  ["pending", '<span class="prisma-m72-pending-banner__icon">ICON</span>'],
  ["quick", '<div class="prisma-m72-quick-grid"><article><span>ICON</span></article></div>'],
  ["group", '<span class="prisma-m72-group-icon">ICON</span>'],
  ["recent-evidence", '<div class="prisma-m72-recent-evidence"><button><span>ICON</span></button></div>'],
  ["reading-metric", '<div class="prisma-m72-reading-metric"><span>ICON</span></div>'],
  ["highlight", '<span class="prisma-profile-highlight-icon">ICON</span>'],
  ["synthesis-axis", '<h3 class="prisma-synthesis-axis-title"><span>ICON</span></h3>'],
];
async function measure(page) {
  return page.evaluate(() => {
    const icons = [...document.querySelectorAll("svg")].flatMap(svg => {
      const glyph = svg.getBoundingClientRect(); if (!glyph.width || !glyph.height) return [];
      let element = svg.parentElement;
      for (let depth = 0; element && depth < 3; depth++, element = element.parentElement) {
        const css = getComputedStyle(element), box = element.getBoundingClientRect();
        if (element.textContent.trim() || box.width < 24 || box.width > 90 || box.height < 24 || box.height > 90 || css.backgroundColor === "rgba(0, 0, 0, 0)") continue;
        return [{ selector: element.className, sample: element.closest("[data-icon-sample]")?.getAttribute("data-icon-sample"),
          width: box.width, height: box.height, svgWidth: glyph.width, svgHeight: glyph.height, background: css.backgroundColor, radius: css.borderRadius,
          dx: +(glyph.x + glyph.width / 2 - box.x - box.width / 2).toFixed(3), dy: +(glyph.y + glyph.height / 2 - box.y - box.height / 2).toFixed(3) }];
      }
      return [];
    });
    return { icons, overflow: document.documentElement.scrollWidth > innerWidth + 1,
      values: [...document.querySelectorAll(".prisma-status-card .ant-statistic-content-value")].map(e => e.textContent),
      cards: document.querySelectorAll(".prisma-profile-highlight").length, axes: document.querySelectorAll(".prisma-synthesis-axes > *").length };
  });
}
try {
  for (const width of [1813, 768, 390, 320]) {
    for (const target of pages) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } }), errors = [], external = [];
      page.on("pageerror", e => errors.push(e.message));
      await page.route("**/*", r => r.request().url().startsWith(target.base + "/") ? r.continue() : (external.push(r.request().url()), r.abort()));
      await page.goto(target.base + target.path); await page.locator(target.ready).first().waitFor(); await page.waitForTimeout(450);
      const metrics = await measure(page);
      const checks = { iconsPresent: metrics.icons.length > 0, centered: metrics.icons.every(i => Math.abs(i.dx) <= 1 && Math.abs(i.dy) <= 1), noOverflow: !metrics.overflow, noRuntimeErrors: !errors.length, noExternalCalls: !external.length };
      // Flex layout can produce fractional pixels at tablet widths; preserve the 56px shape within 1px.
      if (target.area === "/") { checks.homeValues = metrics.values.join(",") === "24,6,18,0"; checks.homeShapes = metrics.icons.filter(i => i.selector === "ant-statistic-content-prefix").length === 4 && metrics.icons.filter(i => i.selector === "ant-statistic-content-prefix").every(i => Math.abs(i.width - 56) <= 1 && i.height === 56 && i.svgWidth === 32 && i.svgHeight === 32); }
      if (target.area === "profile") checks.profileContent = metrics.cards === 4 && metrics.axes === 8;
      if (width === 390 && target.area === "/") { await page.getByRole("button", { name: "Abrir navegação", exact: true }).click(); await page.getByRole("dialog").waitFor(); await page.keyboard.press("Escape"); await page.getByRole("dialog").waitFor({ state: "hidden" }); checks.menuWorks = true; }
      if ([1813, 390].includes(width) && ["/", "/profiles", "profile", "kanban"].includes(target.area)) await page.screenshot({ path: `${evidence}/${target.area === "/" ? "home" : target.area.replaceAll("/", "")}-${width}.png`, fullPage: true });
      results.push({ area: target.area, width, checks, metrics, errors, external });
      if (target.area === "/") {
        await page.evaluate(cases => {
          const icon = document.querySelector(".ant-statistic-content-prefix .anticon").outerHTML, main = document.createElement("section");
          main.id = "icon-audit-gallery"; main.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:20px;padding:20px;";
          for (const [name, html] of cases) { const sample = document.createElement("div"); sample.dataset.iconSample = name; sample.style.minWidth = "0"; sample.innerHTML = html === "DIRECT" ? icon.replace('class="anticon', 'class="prisma-m51b-context-icon anticon') : html.replace("ICON", icon); main.append(sample); }
          document.querySelector(".prisma-main-content").append(main);
        }, samples);
        const gallery = await measure(page), covered = gallery.icons.filter(i => i.sample);
        results.push({ area: "css-variants", width, checks: { allSamplesCovered: new Set(covered.map(i => i.sample)).size === samples.length, centered: covered.every(i => Math.abs(i.dx) <= 1 && Math.abs(i.dy) <= 1), noOverflow: !gallery.overflow }, metrics: { icons: covered } });
      }
      await page.close();
    }
  }
} finally { await browser.close(); }
await writeFile(`${evidence}/browser-results.json`, JSON.stringify(results, null, 2) + "\n");
const failures = results.filter(r => Object.values(r.checks).some(v => !v));
console.log(JSON.stringify({ scenarios: results.length, iconMeasurements: results.reduce((n, r) => n + r.metrics.icons.length, 0), failures }, null, 2));
assert.equal(failures.length, 0, "Icon centering regression failed");
