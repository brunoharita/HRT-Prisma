import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const directory = resolve("dist/tests");
const files = (await readdir(directory, { recursive: true }))
  .filter((file) => file.endsWith(".test.js"))
  .map((file) => resolve(directory, file));
if (files.length === 0) {
  process.stderr.write("No compiled tests found.\n");
  process.exitCode = 1;
} else {
  const result = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
  process.exitCode = result.status ?? 1;
}
