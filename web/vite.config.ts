import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: currentDirectory,
  envDir: resolve(currentDirectory, ".."),
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 900,
    rolldownOptions: {
      output: {
        manualChunks(moduleId) {
          if (moduleId.includes("/node_modules/.pnpm/react@") || moduleId.includes("/node_modules/.pnpm/react-dom@")) {
            return "react-vendor";
          }
          if (moduleId.includes("/node_modules/.pnpm/antd@") || moduleId.includes("/node_modules/.pnpm/@ant-design+")) {
            return "antd-vendor";
          }
          if (moduleId.includes("/node_modules/.pnpm/@supabase+")) {
            return "supabase-vendor";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5555,
    strictPort: true,
    fs: {
      allow: [resolve(currentDirectory, "..")],
    },
    proxy: {
      "/document-intelligence-vl": {
        target: "http://127.0.0.1:8081",
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/document-intelligence-vl/, ""),
      },
      "/document-intelligence": {
        target: "http://127.0.0.1:8080",
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/document-intelligence/, ""),
      },
    },
  },
});
