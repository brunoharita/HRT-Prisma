import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
 root: "tests/ui", envDir: "tests/ui", plugins: [react()],
 define: { "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("http://127.0.0.1:9"),
 "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("synthetic-local-only-not-a-key") },
 server: { host: "127.0.0.1", port: 5571, strictPort: true, fs: { allow: ["."] } }
});
