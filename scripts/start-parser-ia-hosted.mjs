// KVM2 singleton. Public authorization remains exclusively in the existing gateway.
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createParserService, createParserHttpServer, loadParserSecret } from "./parser-ia-service.mjs";

export const HOSTED_PARSER_VERSION = "parser-ia-kvm2-1.0.0";
export const HOSTED_PARSER_PORT = 18787;
export const HOSTED_PARSER_HOST_HEADER_PORT = 8787;
export const HOSTED_PARSER_DIRECTORY = "/var/lib/prisma/parser-ia";
export const HOSTED_PARSER_LOCK_DIRECTORY = "/run/parser-ia/locks";
export const HOSTED_PARSER_SECRET = "/run/secrets/parser_ia_env";

export async function createHostedParser({ directory = HOSTED_PARSER_DIRECTORY, lockDirectory = HOSTED_PARSER_LOCK_DIRECTORY, secretPath = HOSTED_PARSER_SECRET, ...serviceOptions } = {}) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await mkdir(lockDirectory, { recursive: true, mode: 0o700 });
  return createParserService({ ...serviceOptions, directory, lockDirectory, keyProvider: () => loadParserSecret(secretPath) });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 2) {
    console.error("USAGE: node scripts/start-parser-ia-hosted.mjs");
    process.exitCode = 2;
  } else {
    process.umask(0o077);
    try {
      const server = createParserHttpServer(await createHostedParser(), HOSTED_PARSER_HOST_HEADER_PORT);
      server.requestTimeout = 150000;
      server.headersTimeout = 10000;
      server.on("error", () => { console.error("PARSER_HOSTED_LISTEN_FAILED"); process.exitCode = 1; });
      server.listen(HOSTED_PARSER_PORT, "127.0.0.1", () => console.log(`${HOSTED_PARSER_VERSION}: private loopback ready; no database writes.`));
    } catch {
      console.error("PARSER_HOSTED_START_FAILED");
      process.exitCode = 1;
    }
  }
}
