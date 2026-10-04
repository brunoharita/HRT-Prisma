import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { writeFile } from "node:fs/promises";
export default defineConfig({ root: "tests/ui", cacheDir: "../../tmp/vite-review-format", publicDir: false, plugins: [react(), {
  name: "local-synthetic-review-report", configureServer(server) {
    server.middlewares.use("/qa-report", (request, response) => {
      if (request.method !== "POST") { response.statusCode = 405; response.end(); return; }
      let body = "";
      request.on("data", (data) => { body += data; if (body.length > 10000) request.destroy(); });
      request.on("end", async () => {
        try {
          const report = JSON.parse(body);
          if (!["run", "error", "warning"].includes(report.scenario) || !Number.isInteger(report.width)) throw Error("Invalid synthetic report");
          await writeFile(`tmp/review-format-${report.scenario}-${report.width}.json`, JSON.stringify(report, null, 2));
          response.end("ok");
        } catch { response.statusCode = 400; response.end(); }
      });
    });
  },
}], server: { host: "127.0.0.1", port: 5583, strictPort: true, fs: { allow: ["../.."] } } });
