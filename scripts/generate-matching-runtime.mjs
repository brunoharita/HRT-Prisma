import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sources = ["web/src/domain/vacancy.ts", "web/src/domain/matchingScore.ts", "web/src/domain/semanticMatching.ts", "src/domain/semanticTrajectory.ts",
  "src/domain/educationClassification.ts", "web/src/domain/narrativeText.ts"];
// The browser service mixes persistence/SDK with this pure decoder. Extract its exact
// named declarations and existing ID helpers, not a separately maintained decoder.
const decoderSource = "web/src/infrastructure/supabase/personIngestionService.ts";
const idSource = "web/src/domain/reviewFieldLifecycle.ts";
async function declarations(path, names) {
  const text = await readFile(resolve(root, path), "utf8");
  const ast = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const found = names.map(name => ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name));
  if (found.some(node => !node)) throw new Error(`Decoder extraction contract changed: ${path}`);
  return found.map(node => node.getText(ast)).join("\n\n");
}
const extracted = new Map([
  [decoderSource, `import { preserveExplicitItemLineBreaks } from '../../domain/narrativeText.js';\nimport { resolveEducationClassification } from '../../../../src/domain/educationClassification.js';\nimport { legacyReviewEntityIdFromValue } from '../../domain/reviewFieldLifecycle.js';\n` + await declarations(decoderSource,
    ["decodeDraft", "decodeHistoricalTextList", "decodeReviewDraft", "decodeProfileDataForPresentation", "isRecord"])],
  [idSource, await declarations(idSource, ["legacyReviewEntityId", "legacyReviewEntityIdFromValue", "stableToken"])],
]);
const check = process.argv.slice(2).includes("--check");
if (process.argv.slice(2).some(arg => arg !== "--check")) throw new Error("Only --check is supported");
for (const source of [...sources, ...extracted.keys()]) {
  const input = extracted.get(source) ?? await readFile(resolve(root, source), "utf8");
  const transpiled = ts.transpileModule(input, { fileName: source,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, newLine: ts.NewLineKind.LineFeed, removeComments: false },
    reportDiagnostics: true,
  });
  if (transpiled.diagnostics?.some(item => item.category === ts.DiagnosticCategory.Error)) throw new Error(`Transpile failed: ${source}`);
  // Imports retain the source topology. No copied or independently maintained scoring rules.
  const output = `// Generated from ${source}; run node scripts/generate-matching-runtime.mjs. DO NOT EDIT.\n${transpiled.outputText}`;
  const destination = resolve(root, "supabase/functions/matching-trajectory/_generated", source.replace(/\.ts$/, ".js"));
  if (check) {
    const current = await readFile(destination, "utf8").catch(() => "");
    if (current.replace(/\r\n/g, "\n") !== output) throw new Error(`Matching runtime out of sync: ${source}`);
  } else {
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, output);
  }
}
console.log(`Matching runtime ${check ? "verified" : "generated"}: ${sources.length} source modules + ${extracted.size} exact decoder/helper extracts`);
