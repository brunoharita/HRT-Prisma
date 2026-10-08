import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({ root: "tests/ui", cacheDir: "../../tmp/vite-position-relation", publicDir: "../../web/public", plugins: [{ name: "synthetic-relation-transport", enforce: "pre", transform(_code, id) {
  if (id.replaceAll("\\", "/").endsWith("/infrastructure/supabase/client.ts")) return 'export {transport as supabase} from "../../../../tests/ui/position-follow-up/fixture";';
} }, react()], server: { host: "127.0.0.1", port: 5703, strictPort: true, fs: { allow: ["../.."] } } });
