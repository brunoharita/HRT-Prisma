import { createServer } from "node:http";
import { mkdirSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { Resend } from "resend";
import { Forwarder, Store, PATH } from "./forwarder.mjs";

export function createMailServer(forwarder, sha = "unknown") {
  const server = createServer(async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    if (request.method === "GET" && request.url === `${PATH}/health`) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ ok: true, sha, queue: forwarder.store.counts() })); return;
    }
    if (request.url !== PATH || request.method !== "POST") { response.writeHead(404); response.end(); return; }
    if (Number(request.headers["content-length"]) > 65536) { response.writeHead(413); response.end(); return; }
    let size = 0; const chunks = [];
    try {
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 65536) { response.writeHead(413); response.end(); return; }
        chunks.push(chunk);
      }
      const status = forwarder.ingest(Buffer.concat(chunks).toString("utf8"), request.headers);
      response.writeHead(status); response.end();
    } catch { response.writeHead(503); response.end(); }
  });
  server.requestTimeout = 10_000; server.headersTimeout = 10_000;
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.umask(0o077);
  let config;
  try {
    config = JSON.parse(readFileSync("/run/secrets/mail_forwarder_config", "utf8"));
    if (!/^re_[A-Za-z0-9_-]+$/.test(config.apiKey ?? "") || !config.webhookSecret?.startsWith("whsec_")) throw new Error();
  } catch { console.error("Protected mail configuration missing"); process.exit(1); }
  mkdirSync("/var/lib/hrt-mail", { recursive: true });
  const store = new Store("/var/lib/hrt-mail/receipts.sqlite");
  const forwarder = new Forwarder({ store, resend: new Resend(config.apiKey, { baseUrl: "https://api.resend.com" }), webhookSecret: config.webhookSecret });
  const server = createMailServer(forwarder, process.env.HRT_MAIL_SHA);
  const timer = setInterval(() => void forwarder.tick(), 2000);
  server.listen(3021, "0.0.0.0", () => console.log("HRT mail forwarder ready"));
  const shutdown = () => { clearInterval(timer); server.close(() => { store.close(); process.exit(0); }); };
  process.on("SIGTERM", shutdown); process.on("SIGINT", shutdown);
}
