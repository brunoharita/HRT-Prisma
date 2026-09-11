import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { extname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { PaddleDocumentIntelligenceProvider } from "../dist/web/src/infrastructure/paddleDocumentIntelligenceProvider.js";
import { safeDocumentIntelligenceFailure } from "../dist/web/src/domain/documentIntelligence.js";

const values = process.argv.slice(2);
const fileArguments = values.flatMap((value, index) => value === "--file" && values[index + 1] ? [values[index + 1]] : []);
const endpoint = argument("--endpoint") ?? "http://127.0.0.1:8080/layout-parsing";
const timeoutMs = boundedNumber(argument("--timeout-ms"), 30_000, 300_000, 240_000);

if (fileArguments.length === 0) {
  process.stderr.write("Informe ao menos um arquivo explicitamente autorizado com --file.\n");
  process.exit(2);
}
if (!isLoopback(endpoint)) {
  process.stderr.write("O probe aceita somente endpoints locais em loopback.\n");
  process.exit(2);
}

const provider = new PaddleDocumentIntelligenceProvider({ structureEndpoint: endpoint, timeoutMs });
const results = [];
for (const fileArgument of fileArguments) {
  const bytes = new Uint8Array(await readFile(resolve(fileArgument)));
  const mimeType = mimeFromExtension(fileArgument);
  const route = mimeType === "application/pdf" ? "structure" : "vision";
  const startedAt = performance.now();
  try {
    const document = await provider.analyze({ bytes, mimeType, route });
    results.push({
      caseId: createHash("sha256").update(bytes).digest("hex").slice(0, 12),
      outcome: "success",
      route,
      elapsedMs: Math.round(performance.now() - startedAt),
      pageCount: document.pages.length,
      blockCount: document.pages.reduce((total, page) => total + page.blocks.length, 0),
      lineCount: document.pages.reduce((total, page) => total + page.lines.length, 0),
      nonEmptyPageCount: document.pages.filter((page) => page.text.trim().length >= 120).length,
      provider: document.provenance.provider,
      providerVersion: document.provenance.providerVersion,
      model: document.provenance.model,
      modelVersion: document.provenance.modelVersion,
    });
  } catch (error) {
    results.push({
      caseId: createHash("sha256").update(bytes).digest("hex").slice(0, 12),
      outcome: "failure",
      route,
      elapsedMs: Math.round(performance.now() - startedAt),
      ...safeDocumentIntelligenceFailure(error),
    });
  }
}

const summary = {
  contractVersion: "paddle-runtime-probe-1.0.0",
  endpointClass: "loopback",
  timeoutMs,
  caseCount: results.length,
  successCount: results.filter((result) => result.outcome === "success").length,
  results,
};
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (summary.successCount !== summary.caseCount) process.exitCode = 1;

function argument(name) {
  const index = values.indexOf(name);
  return index >= 0 ? values[index + 1] : undefined;
}

function boundedNumber(raw, minimum, maximum, fallback) {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? Math.round(parsed) : fallback;
}

function mimeFromExtension(path) {
  const extension = extname(path).toLowerCase();
  if (extension === ".pdf") return "application/pdf";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  throw new Error("Formato não suportado. Use PDF, PNG ou JPEG.");
}

function isLoopback(url) {
  try {
    const host = new URL(url).hostname;
    return host === "127.0.0.1" || host === "localhost" || host === "::1";
  } catch {
    return false;
  }
}
