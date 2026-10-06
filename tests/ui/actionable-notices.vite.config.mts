import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({ root: "tests/ui", cacheDir: "../../tmp/vite-notices-v2010", publicDir: false, plugins: [react()], server: { host: "127.0.0.1", port: 5592, strictPort: true, fs: { allow: ["../.."] } } });
