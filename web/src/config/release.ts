export const PRISMA_RELEASE = {
  productGeneration: 1,
  movement: 5,
  delivery: 10,
  version: "1.5.10",
  displayVersion: "v1.5.10",
} as const;

export const PRISMA_BUILD = {
  gitCommit: import.meta.env.VITE_PRISMA_GIT_COMMIT ?? "local",
} as const;
