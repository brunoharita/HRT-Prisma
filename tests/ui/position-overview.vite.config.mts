import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
export default defineConfig({ root: "tests/ui", cacheDir: "../../tmp/vite-position-overview-v221", publicDir: "../../web/public", plugins: [{
  name: "position-overview-synthetic-services", enforce: "pre", transform(_code, id) {
    const file = id.replaceAll("\\", "/"), fixture = '"../../../../tests/ui/position-overview/fixture"';
    if (file.endsWith("/infrastructure/supabase/vacancyService.ts")) return `export {service as vacancyService} from ${fixture};export const workspaceOrganizationId=()=>"org-fixture";`;
    if (file.endsWith("/infrastructure/supabase/positionTaxonomyService.ts")) return `export {taxonomyService as positionTaxonomyService} from ${fixture};`;
    if (file.endsWith("/infrastructure/supabase/client.ts")) return `export {transport as supabase} from ${fixture};`;
    if (process.env.PRISMA_POSITION_BASELINE === "1" && file.endsWith("/pages/VacancyPages.tsx")) return readFileSync("output/position-overview-before.tsx", "utf8");
  },
}, react()], server: { host: "127.0.0.1", port: 5701, strictPort: true, fs: { allow: ["../.."] } } });
