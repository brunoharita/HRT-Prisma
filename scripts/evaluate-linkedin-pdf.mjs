import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { readLinkedInPdf } from "./linkedin-pdf-source.mjs";
import { buildExternalProposal } from "./linkedin-external-proposal.mjs";
import { draftFacts, humanReviewTemplate } from "./linkedin-human-review.mjs";
import { buildAdaptiveExtraction } from "../dist/web/src/domain/adaptiveResumeExtraction.js";
import { evaluateLinkedInPdf, LINKEDIN_EVALUATION_VERSION } from "../dist/web/src/domain/linkedinPdfEvaluation.js";

export function validateManifest(manifest) {
  if (manifest?.version !== 1 || !Array.isArray(manifest.cases) || !manifest.cases.length || manifest.cases.length > 5) throw new Error("INVALID_MANIFEST");
  const ids = new Set();
  const hashes = new Set();
  for (const item of manifest.cases) {
    if (!/^[a-z0-9-]{1,32}$/.test(item.id) || !/^[a-f0-9]{64}$/i.test(item.sha256) || !["adjustment", "evaluation", "regression"].includes(item.split) || typeof item.path !== "string" || item.authorizedLocal !== true) throw new Error("INVALID_CASE");
    if (ids.has(item.id) || hashes.has(item.sha256.toLowerCase())) throw new Error("DUPLICATE_CASE");
    ids.add(item.id); hashes.add(item.sha256.toLowerCase());
  }
  return manifest;
}

export function inventory(draft) {
  return Object.fromEntries(["experiences", "education", "certifications", "languages", "competencies"].map((key) => [key, draft[key].length]));
}

export async function main(args) {
  const [manifestPath, runId] = args;
  if (args.length !== 2 || !/^[a-z0-9-]{1,64}$/.test(runId)) throw new Error("USAGE: pnpm run benchmark:linkedin -- <private-manifest.json> <run-id>");
  const manifest = validateManifest(JSON.parse(await readFile(resolve(manifestPath), "utf8")));
  // Hash before accessing held-out data; freeze covers source loader, baseline dependencies and prototype.
  const files = ["web/src/domain/linkedinPdfEvaluation.ts", "web/src/domain/personIngestion.ts", "web/src/domain/adaptiveResumeExtraction.ts", "web/src/domain/reviewFieldLifecycle.ts", "web/src/domain/documentRecordPatterns.ts", "web/src/domain/customProfileSections.ts", "src/domain/educationClassification.ts", "src/domain/resumeIdentity.ts", "scripts/linkedin-pdf-source.mjs", "scripts/evaluate-linkedin-pdf.mjs", "scripts/linkedin-human-review.mjs", "scripts/linkedin-external-proposal.mjs", "pnpm-lock.yaml"];
  const hash = createHash("sha256");
  for (const file of files) { hash.update(file); hash.update(await readFile(file)); }
  const implementationSha256 = hash.digest("hex");
  const output = resolve("tmp/linkedin-evaluation/runs", runId);
  await mkdir(resolve("tmp/linkedin-evaluation/runs"), { recursive: true });
  await mkdir(output); // Refuse overwrite of any prior run or human reference.
  for (const file of files) {
    const target = resolve(output, "frozen-source", file);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, await readFile(file));
  }
  await writeFile(resolve(output, "freeze.json"), JSON.stringify({ implementationSha256, version: LINKEDIN_EVALUATION_VERSION, files, frozenAt: new Date().toISOString(), cases: manifest.cases.map(({ id, split, sha256 }) => ({ id, split, sha256 })) }, null, 2));
  const cases = [];
  for (const item of manifest.cases) {
    try {
      const sourceStarted = performance.now();
      const source = await readLinkedInPdf(item.path, item.sha256);
      const sourceMs = performance.now() - sourceStarted;
      const baselineStarted = performance.now();
      const baseline = buildAdaptiveExtraction(source.baselinePages);
      const baselineMs = performance.now() - baselineStarted;
      const localStarted = performance.now();
      const local = evaluateLinkedInPdf(source.pages, source.links);
      const localMs = performance.now() - localStarted;
      // Original bytes are never copied to the repository; source derivatives stay in ignored tmp.
      await writeFile(resolve(output, `${item.id}.private.json`), JSON.stringify({ sourcePath: item.path, source, baseline, local }, null, 2));
      for (const [route, extraction] of [["baseline", baseline], ["local", local]]) {
        await writeFile(resolve(output, `${item.id}.${route}.review.private.json`), JSON.stringify({ reference: humanReviewTemplate(source.sha256, implementationSha256), observedFacts: draftFacts(extraction.draft), proposedEvidence: extraction.fieldEvidence }, null, 2));
      }
      const localGpt = buildExternalProposal({ route: "local-gpt", source, local });
      // Keep full-PDF payload generation separate: this report records a plan, not a transmission.
      await writeFile(resolve(output, `${item.id}.external-proposal.private.json`), JSON.stringify({ localGpt, pdfGpt: { status: "DRAFT_NOT_AUTHORIZED_FOR_TRANSMISSION", sourceSha256: source.sha256, dataScope: "full_pdf_including_personal_data", model: "gpt-5.6-luna", store: false, proposedBudgetUsd: 2 } }, null, 2));
      const unchanged = createHash("sha256").update(await readFile(item.path)).digest("hex") === source.sha256;
      if (!unchanged) throw new Error("SOURCE_CHANGED_DURING_RUN");
      cases.push({ id: item.id, split: item.split, sha256: source.sha256, originalUnchanged: unchanged, pages: source.pageCount, nativeSufficientPages: source.nativeSufficientPages, links: source.links.length, recognized: local.recognized, baseline: inventory(baseline.draft), local: inventory(local.draft), unassignedLines: local.unassigned.length, sourceMs, baselineMs, localMs, external: { localGpt: "NOT TESTED", pdfGpt: "NOT TESTED" }, semanticQuality: { status: "NOT TESTED", reason: "human_reference_missing", correctFieldRate: null, correctionTimeMs: null, evidenceCorrectRate: null } });
      console.log(JSON.stringify({ id: item.id, status: "local_extraction_recorded", pages: source.pageCount }));
    } catch (error) {
      const allowed = ["INVALID_PDF", "SOURCE_HASH_MISMATCH", "PAGE_LIMIT", "SOURCE_CHANGED_DURING_RUN"];
      cases.push({ id: item.id, split: item.split, status: "BLOCKED", reason: allowed.includes(error.message) ? error.message : "LOCAL_EXTRACTION_FAILED" });
      // Never echo vendor messages, content, source path or personal data.
    }
  }
  const report = { version: LINKEDIN_EVALUATION_VERSION, implementationSha256, generatedAt: new Date().toISOString(), cases, conclusion: "PARTIAL", limitations: ["counts_are_not_quality", "human_reference_missing", "external_not_executed", "not_integrated_into_product", "not_qa_or_production"] };
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ report: `tmp/linkedin-evaluation/runs/${runId}/report.json`, cases: cases.length, status: "PARTIAL" }));
  return cases.some((item) => item.status === "BLOCKED") ? 2 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }).catch(() => { console.error("EVALUATION_BLOCKED: confira argumentos, manifesto autorizado e pasta de saída nova."); process.exitCode = 2; });
}
