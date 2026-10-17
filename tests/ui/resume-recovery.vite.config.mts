import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({ root: "tests/ui", cacheDir: "../../tmp/vite-resume-recovery", publicDir: "../../web/public", plugins: [{ name: "recovery-synthetic-boundaries", enforce: "pre", transform(_code, id) {
  const file = id.replaceAll("\\", "/");
  if (file.endsWith("/infrastructure/supabase/personIngestionService.ts")) return 'export {ingestion as personIngestionService} from "../../../../tests/ui/resume-recovery/fixture";';
  if (file.endsWith("/infrastructure/supabase/client.ts")) return 'export {supabase} from "../../../../tests/ui/resume-recovery/fixture";';
  if (file.endsWith("/infrastructure/parserIaClient.ts")) return 'export const parserIaEnabled=()=>true;';
}}, react()], server: { host: "127.0.0.1", port: 5732, strictPort: true, fs: { allow: ["../.."] } } });
