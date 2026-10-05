import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { writeFile } from "node:fs/promises";
export default defineConfig({ root: "tests/ui", cacheDir: "../../tmp/vite-profile-synthesis", publicDir: false, plugins: [react(), { name: "synthesis-synthetic-report", configureServer(server) {
  server.middlewares.use("/qa-synthesis-report", (req, res) => {
    if (req.method !== "POST") { res.statusCode = 405; res.end(); return; } let body = "";
    req.on("data", chunk => { body += chunk; if (body.length > 10000) req.destroy(); });
    req.on("end", async () => { try { const value = JSON.parse(body); if (!["summary", "source", "pending", "failed", "previous", "insufficient", "refresh"].includes(value.scenario) || ![1416,390].includes(value.width)) throw Error("invalid"); await writeFile(`tmp/profile-synthesis-ui-${value.scenario}-${value.width}.json`, JSON.stringify(value,null,2)); res.end("ok"); } catch { res.statusCode=400;res.end(); } });
  });
} }], server: { host: "127.0.0.1", port: 5585, strictPort: true, fs: { allow: ["../.."] } } });
