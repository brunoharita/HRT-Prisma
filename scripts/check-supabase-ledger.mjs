import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { migrationIdentity } from "./release-impact.mjs";

export async function checkLedger(root = process.cwd()) {
  const registry = JSON.parse(await readFile(resolve(root, "supabase/migration-ledger-map.json"), "utf8"));
  const localFiles = (await readdir(resolve(root, "supabase/migrations")))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const local = new Map(localFiles.map((file) => {
    const identity = migrationIdentity(file);
    return [identity.name, { ...identity, file }];
  }));
  const errors = [];
  const seenLocalVersions = new Set();
  const seenRemoteVersions = new Set();

  for (const entry of registry.entries) {
    const current = local.get(entry.name);
    if (!current) errors.push(`ledger entry without local migration: ${entry.name}`);
    else if (current.version !== entry.localVersion) errors.push(`local version drift for ${entry.name}: ${current.version} != ${entry.localVersion}`);
    if (seenLocalVersions.has(entry.localVersion)) errors.push(`duplicate local ledger version: ${entry.localVersion}`);
    if (seenRemoteVersions.has(entry.remoteVersion)) errors.push(`duplicate remote ledger version: ${entry.remoteVersion}`);
    seenLocalVersions.add(entry.localVersion);
    seenRemoteVersions.add(entry.remoteVersion);
  }

  for (const item of registry.localOnly) {
    const current = local.get(item.name);
    if (!current || current.version !== item.localVersion) errors.push(`local-only ledger drift: ${item.name}`);
  }
  const accountedNames = new Set([...registry.entries.map((item) => item.name), ...registry.localOnly.map((item) => item.name)]);
  const pendingLocal = [...local.values()].filter((item) => !accountedNames.has(item.name));
  if (registry.cliDbPushAllowed !== false) errors.push("cliDbPushAllowed must remain false until every historical divergence is proven equivalent");
  if (registry.projectRef !== "ioldpnqqvobprjiontre") errors.push("unexpected Supabase project ref in ledger registry");
  return {
    errors,
    summary: {
      mapped: registry.entries.length,
      localOnly: registry.localOnly.length,
      remoteOnly: registry.remoteOnly.length,
      pendingLocal: pendingLocal.map((item) => item.file),
      cliDbPushAllowed: registry.cliDbPushAllowed,
      verifiedAt: registry.verifiedAt,
    },
  };
}

export async function main(root = process.cwd()) {
  const result = await checkLedger(root);
  console.log(JSON.stringify(result.summary, null, 2));
  if (result.errors.length) {
    for (const error of result.errors) console.error(`ERROR: ${error}`);
    return 1;
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then((status) => { process.exitCode = status; }).catch((error) => {
    console.error(error.message); process.exitCode = 1;
  });
}
