// Development only: one process owns both loopback services.
import { createServer } from "vite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createParserHttpServer, loadParserSecret } from "./parser-ia-service.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
let web;
let parser;
async function close() {
  if (web) await web.close();
  if (parser?.listening) await new Promise((done) => parser.close(done));
}
try {
  await loadParserSecret();
  process.env.VITE_PARSER_IA_LOCAL = "true";
  parser = createParserHttpServer();
  parser.requestTimeout = 150000;
  parser.headersTimeout = 10000;
  await new Promise((done, reject) => {
    parser.once("error", reject);
    parser.listen(8787, "127.0.0.1", done);
  });
  web = await createServer({ configFile: resolve(root, "web/vite.config.ts"), server: { host: "localhost", port: 5555, strictPort: true } });
  await web.listen();
  console.log("Prisma com IA: http://localhost:5555/profiles/import");
  console.log("Uso local; banco Supabase configurado; limite de IA US$2 por ledger existente.");
  for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => { void close().then(() => process.exit(0)); });
} catch {
  console.error("Não foi possível iniciar o Prisma com IA. Confira a chave local e se as portas 5555/8787 estão livres.");
  await close();
  process.exitCode = 1;
}
