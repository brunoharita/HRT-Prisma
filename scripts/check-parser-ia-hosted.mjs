// Readiness only: no document, credential in HTTP, provider call or persistence.
import { request } from "node:http";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function checkHostedParser(port = 18787, timeoutMs = 2500) {
  return new Promise((done) => {
    const req = request({ hostname: "127.0.0.1", port, path: "/readiness", method: "POST", headers: {
      Host: "127.0.0.1:8787", Origin: "http://127.0.0.1:5555", "X-Prisma-Local-Parser": "1", "Content-Type": "application/json",
    } }, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; if (body.length > 1024) req.destroy(); });
      res.on("end", () => {
        try {
          const result = JSON.parse(body);
          done(res.statusCode === 200 && result.version === "parser-ia-readiness-1.0.0"
            && ((result.state === "available" && result.reason === "ready") || (result.state === "busy" && result.reason === "worker_busy")));
        } catch { done(false); }
      });
      res.on("error", () => done(false));
      res.on("aborted", () => done(false));
    });
    const timer = setTimeout(() => req.destroy(), timeoutMs);
    req.on("close", () => clearTimeout(timer));
    req.on("error", () => done(false));
    req.end("{}");
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = await checkHostedParser() ? 0 : 1;
}
