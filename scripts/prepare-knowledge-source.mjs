import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { buildKnowledgeSourceSqlBatches, prepareCboSource, prepareEscoSource } from "../dist/src/knowledge/sourceIngestion.js";

const [sourceArg, directory, externalVersion, releaseDate, outputDirectory] = process.argv.slice(2);
if (!sourceArg || !directory || !externalVersion || !releaseDate || !outputDirectory) {
  throw new Error("Uso: node scripts/prepare-knowledge-source.mjs <cbo|esco> <diretorio> <versao> <data-lancamento> <saida>");
}
const downloadedAt = new Date().toISOString();
const packageData = sourceArg.toLowerCase() === "cbo"
  ? await prepareCboSource({ directory, externalVersion, releaseDate, downloadedAt })
  : sourceArg.toLowerCase() === "esco"
    ? await prepareEscoSource({ directory, externalVersion, releaseDate, downloadedAt })
    : (() => { throw new Error("Fonte suportada: cbo ou esco"); })();
const sql = buildKnowledgeSourceSqlBatches(packageData, 250);
await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(path.join(outputDirectory, "manifest.json"), `${JSON.stringify(packageData.manifest, null, 2)}\n`, "utf8"),
  ...sql.stageBatchSql.map((batch, index) => writeFile(path.join(outputDirectory, `stage-${String(index + 1).padStart(4, "0")}.sql`), `${batch}\n`, "utf8")),
  writeFile(path.join(outputDirectory, "finalize-and-diff.sql"), `${sql.finalizeAndDiffSql}\n`, "utf8"),
  writeFile(path.join(outputDirectory, "publish.sql"), `${sql.publishSqlTemplate}\n`, "utf8"),
]);
console.log(JSON.stringify({ source: packageData.sourceName, version: packageData.externalVersion, counts: packageData.manifest.counts, batches: sql.stageBatchSql.length, outputDirectory }, null, 2));
