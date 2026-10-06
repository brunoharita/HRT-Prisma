import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { writeFile } from "node:fs/promises";
export default defineConfig({ root: "tests/ui", cacheDir: "../../tmp/vite-profile-synthesis", publicDir: false, plugins: [{name:"synthetic-highlight-fault",enforce:"pre",transform(code,id){if(!id.replaceAll("\\", "/").endsWith("/ProfileHighlightCards.tsx"))return;return code.replace("const icons = { areas: <ApartmentOutlined />",'function SyntheticHighlightFault(): never { throw Error("synthetic-render-fault"); }\nconst icons = { areas: new URLSearchParams(location.search).get("case") === "cards-render" ? <SyntheticHighlightFault /> : <ApartmentOutlined />');}}, react(), { name: "synthesis-synthetic-report", configureServer(server) {
  server.middlewares.use("/qa-synthesis-report", (req, res) => {
    if (req.method !== "POST") { res.statusCode = 405; res.end(); return; } let body = "";
    req.on("data", chunk => { body += chunk; if (body.length > 10000) req.destroy(); });
    req.on("end", async () => { try { const value = JSON.parse(body); if (!["summary", "source", "pending", "failed", "previous", "insufficient", "refresh", "read-error", "render-error", "source-error", "word-limit", "retry", "previous-failed", "query-only", "partial-reference", "multiple-errors", "empty-overview", "section-render", "overview-render", "long-content", "source-switch", "keyboard", "origin-error", "cards-executive", "cards-source", "cards-failed", "cards-render"].includes(value.scenario) || ![1448,1416,390].includes(value.width)) throw Error("invalid"); await writeFile(`tmp/profile-synthesis-v208-ui-${value.scenario}-${value.width}.json`, JSON.stringify(value,null,2)); res.end("ok"); } catch { res.statusCode=400;res.end(); } });
  });
} }], server: { host: "127.0.0.1", port: 5585, strictPort: true, fs: { allow: ["../.."] } } });

