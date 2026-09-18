import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "tests/ui",
  publicDir: "../../web/public",
  envDir: "tests/ui",
  plugins: [react()],
  server: { host: "127.0.0.1", port: 5572, strictPort: true, fs: { allow: ["../.."] } },
});
