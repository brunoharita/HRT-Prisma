import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { writeFile } from "node:fs/promises";
export default defineConfig({ root: "tests/ui", cacheDir: "../../tmp/vite-evidence-v209", publicDir: false, plugins: [react(), { name: "evidence-link-report", configureServer(server) {
  server.middlewares.use("/qa-evidence-report", (req, res) => { let body="";req.on("data", chunk=>{body+=chunk;if(body.length>12000)req.destroy();}); req.on("end", async()=>{try{const report=JSON.parse(body);if(!['single','multiple','remove','failure','credential'].includes(report.scenario)||![1416,390].includes(report.width))throw Error('Invalid');await writeFile(`tmp/evidence-v209-${report.scenario}-${report.width}.json`,JSON.stringify(report,null,2));res.end('ok');}catch{res.statusCode=400;res.end();}}); });
} }], server: { host: "127.0.0.1", port: 5586, strictPort: true, fs: { allow: ["../.."] } } });
