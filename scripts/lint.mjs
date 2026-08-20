import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const ignored = new Set([".git", ".prisma-data", "dist", "node_modules", "tmp"]);
const acceptedExtensions = [".ts", ".mjs", ".md", ".sql", ".json"];
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    if (ignored.has(entry.name)) return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walk(path);
    return acceptedExtensions.some((extension) => entry.name.endsWith(extension)) ? [path] : [];
  }));
  return nested.flat();
}
const files = await walk(".");
const errors = [];
for (const file of files) {
  const text = await readFile(file, "utf8");
  text.split(/\r?\n/).forEach((line, index) => {
    if (/\s+$/.test(line)) errors.push(`${file}:${index + 1}: trailing whitespace`);
    if (/\t/.test(line)) errors.push(`${file}:${index + 1}: tab character`);
  });
  if (file.startsWith("src/") && /\bTODO\b/.test(text)) errors.push(`${file}: critical TODO left in runtime source`);
  if (file.startsWith("src/") && /service[_-]?role/i.test(text)) errors.push(`${file}: service-role reference prohibited in runtime source`);
}
if (errors.length > 0) {
  process.stderr.write(`${errors.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`lint passed (${files.length} files)\n`);
}
