import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { createParserService, safeParserError, PARSER_MODEL, PARSER_PROMPT_SHA } from "./parser-ia-service.mjs";
import { draftFacts } from "./linkedin-human-review.mjs";

const normalize = (value) => value.normalize("NFKC").replace(/&amp;/g, "&").replace(/[–—]/g, "-").replace(/[•▪●]/g, "").replace(/\s+/g, " ").trim();

// Mechanical comparison, not an invented semantic judge. Associations require
// unique matching anchors; ambiguous and unmatched groups remain explicit.
export function compareApprovedReference(reference, draft) {
  if (reference?.humanApproved !== true || !reference.approvedBy || !Array.isArray(reference.expectedFacts)) throw new Error("APPROVED_REFERENCE_REQUIRED");
  const expected = reference.expectedFacts;
  const observed = draftFacts(draft);
  const mapping = new Map();
  const groups = (facts, kind) => {
    const out = new Map();
    for (const fact of facts.filter((item) => item.field.startsWith(`${kind}.*.`))) {
      const id = fact.id.slice(0, fact.id.lastIndexOf("."));
      if (!out.has(id)) out.set(id, []);
      out.get(id).push(fact);
    }
    return [...out.values()];
  };
  const used = new Set();
  for (const kind of ["experiences", "education"]) {
    const anchors = kind === "experiences" ? ["role", "organization", "period"] : ["course", "institution", "period"];
    const actualGroups = groups(observed, kind);
    for (const target of groups(expected, kind)) {
      const supportedAnchors = target.filter((fact) => anchors.some((field) => fact.field === `${kind}.*.${field}`));
      const ranked = actualGroups.filter((group) => !used.has(group)).map((group) => ({ group, score: supportedAnchors.filter((truth) => group.some((fact) => fact.field === truth.field && normalize(fact.value) === normalize(truth.value))).length }));
      const best = Math.max(0, ...ranked.map((item) => item.score));
      const candidates = supportedAnchors.length >= 2 && best >= 2 ? ranked.filter((item) => item.score === best).map((item) => item.group) : [];
      if (candidates.length !== 1) continue;
      const match = candidates[0]; used.add(match);
      for (const truth of target) { const actual = match.find((fact) => fact.field === truth.field); if (actual) mapping.set(truth.id, actual); }
    }
  }
  const mappedIds = new Set([...mapping.values()].map((fact) => fact.id));
  for (const truth of expected.filter((fact) => !/^(experiences|education)\.\*\./.test(fact.field))) {
    const candidates = observed.filter((fact) => !mappedIds.has(fact.id) && fact.field === truth.field && normalize(fact.value) === normalize(truth.value));
    if (candidates.length === 1) { mapping.set(truth.id, candidates[0]); mappedIds.add(candidates[0].id); }
  }
  const rows = expected.map((truth) => { const actual = mapping.get(truth.id); return { expected: truth, observed: actual ?? null, status: !actual ? "unmatched_or_ambiguous" : normalize(truth.value) === normalize(actual.value) ? "normalized_exact_match" : "value_difference" }; });
  const matchedIds = new Set([...mapping.values()].map((fact) => fact.id));
  return { method: "unique-record-anchors-and-normalized-text-1.0.0", semanticApproval: false, spatialApproval: false, expectedFields: expected.length, observedFields: observed.length, exactMatches: rows.filter((row) => row.status === "normalized_exact_match").length, unmatchedOrAmbiguous: rows.filter((row) => row.status === "unmatched_or_ambiguous").length, valueDifferences: rows.filter((row) => row.status === "value_difference").length, extraOrUnassociated: observed.filter((fact) => !matchedIds.has(fact.id)).length, rows, extras: observed.filter((fact) => !matchedIds.has(fact.id)) };
}

export async function main(args) {
  const [runId, mode, selected] = args;
  if (!/^[a-z0-9-]{1,50}$/.test(runId ?? "") || !["--live", "--cached"].includes(mode) || (selected && !["evaluation-01", "evaluation-02", "evaluation-03"].includes(selected))) throw new Error("USAGE: benchmark-parser-ia.mjs run-id --live|--cached [evaluation-01|evaluation-02|evaluation-03]");
  const manifest = JSON.parse(await readFile(resolve("tmp/linkedin-evaluation/manifest.json"), "utf8"));
  const cases = manifest.cases.filter((item) => ["evaluation-01", "evaluation-02", "evaluation-03"].includes(item.id) && (!selected || item.id === selected));
  if (!cases.length) throw new Error("AUTHORIZED_CASES_MISSING");
  const references = { "evaluation-01": "diego", "evaluation-02": "ivan", "evaluation-03": "joao" };
  const prepared = [];
  for (const item of cases) {
    if (!item.authorizedLocal) throw new Error("LOCAL_AUTHORIZATION_MISSING");
    const reference = JSON.parse(await readFile(resolve(`tmp/linkedin-evaluation/human-review/${references[item.id]}.reference-approved.private.json`), "utf8"));
    const bytes = await readFile(item.path);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (sha256 !== item.sha256 || reference.sourceSha256 !== sha256 || !reference.humanApproved) throw new Error("REFERENCE_SOURCE_MISMATCH");
    prepared.push({ item, bytes, reference });
  }
  const output = resolve("tmp/m57-parser-ia/runs", runId);
  await mkdir(output, { recursive: false });
  const fileHashes = {};
  for (const path of ["web/src/domain/parserIa.ts", "scripts/parser-ia-service.mjs", "scripts/benchmark-parser-ia.mjs", "pnpm-lock.yaml"]) fileHashes[path] = createHash("sha256").update(await readFile(resolve(path))).digest("hex");
  await writeFile(resolve(output, "freeze.json"), JSON.stringify({ version: "parser-ia-1.0.0", model: PARSER_MODEL, promptSha256: PARSER_PROMPT_SHA, fileHashes, createdAt: new Date().toISOString(), cases: cases.map(({ id, sha256 }) => ({ id, sha256 })) }, null, 2));
  const parse = createParserService({ allowNetwork: mode === "--live" }); const reports = [];
  for (const { item, bytes, reference } of prepared) {
    console.log(JSON.stringify({ id: item.id, stage: "requesting_local_parser" }));
    try {
      const result = await parse({ bytes, sourceSha256: item.sha256, organizationId: "m57-authorized-local-evaluation" });
      const comparison = compareApprovedReference(reference, result.result.draft);
      const baselineSource = JSON.parse(await readFile(resolve(`tmp/linkedin-evaluation/runs/regression-v102/${item.id}.private.json`), "utf8"));
      if (baselineSource.source.sha256 !== item.sha256) throw new Error("PARSER_SOURCE_MISMATCH");
      const baselineComparison = compareApprovedReference(reference, baselineSource.baseline.draft);
      await writeFile(resolve(output, `${item.id}.private.json`), JSON.stringify({ result, comparison, baselineComparison }, null, 2));
      const { rows, extras, ...summary } = comparison;
      const { rows: baselineRows, extras: baselineExtras, ...baselineSummary } = baselineComparison;
      reports.push({ id: item.id, status: result.result.status, cached: result.cached, rejectedFields: result.result.rejected.length, model: result.result.provenance.model, inputTokens: result.result.provenance.inputTokens, outputTokens: result.result.provenance.outputTokens, costUpperUsd: result.result.provenance.costUsd, durationMs: result.result.provenance.durationMs, comparison: summary, baselineComparison: baselineSummary });
      console.log(JSON.stringify(reports.at(-1)));
    } catch (error) {
      reports.push({ id: item.id, status: "BLOCKED", reason: safeParserError(error) }); console.log(JSON.stringify(reports.at(-1)));
      if (["PARSER_KEY_REJECTED", "PARSER_RATE_LIMIT", "PARSER_BUDGET_EXHAUSTED", "PARSER_PROVIDER_FAILED"].includes(safeParserError(error))) break;
    }
  }
  await writeFile(resolve(output, "report.json"), JSON.stringify({ movement: "M5.7 Parser IA", reports, limitations: ["known_regression_cases_not_blind", "mechanical_comparison_not_human_semantic_approval", "not_supabase_or_hostinger_rollout"] }, null, 2));
  return reports.some((item) => item.status === "BLOCKED") ? 2 : 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await mkdir(resolve("tmp/m57-parser-ia/runs"), { recursive: true });
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }).catch(() => { console.error("M5.7 benchmark preparation failed; no private details logged."); process.exitCode = 2; });
}
