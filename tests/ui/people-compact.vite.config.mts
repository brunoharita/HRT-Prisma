import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execFileSync } from "node:child_process";
export default defineConfig({ root: "tests/ui", cacheDir: "../../tmp/vite-people-compact", publicDir: "../../web/public", plugins: [{ name: "synthetic-people-transport", enforce: "pre", transform(_code, id) {
  if (process.env.PRISMA_PEOPLE_BASELINE === "1") {
    const file = id.replaceAll("\\", "/");
    for (const path of ["web/src/pages/VacancyPages.tsx", "web/src/components/AddToPositionFollowUp.tsx", "web/src/styles.css"]) {
      if (file.endsWith("/" + path)) return execFileSync("git", ["show", "220b5034d951a83b9d353596604da5cdd856ff7c:" + path], { encoding: "utf8" });
    }
  }
  if (id.replaceAll("\\", "/").endsWith("/infrastructure/supabase/client.ts")) return 'export const supabase = {};';
} }, react()], server: { host: "127.0.0.1", port: 5711, strictPort: true, fs: { allow: ["../.."] } } });
