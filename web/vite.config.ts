import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
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
    port: mode === "qa" ? 5556 : 5555,
    strictPort: true,
    fs: {
      allow: [resolve(currentDirectory, "..")],
    },
  },
}));
