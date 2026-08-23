import { defineConfig } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
  root: currentDirectory,
  envDir: resolve(currentDirectory, ".."),
  server: {
    port: mode === "qa" ? 5556 : 5555,
    strictPort: true,
    fs: {
      allow: [resolve(currentDirectory, "..")],
    },
  },
}));
