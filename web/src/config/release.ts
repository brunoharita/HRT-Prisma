export { PRISMA_RELEASE } from "./releaseRegistry";

export const PRISMA_BUILD = {
  gitCommit: import.meta.env.VITE_PRISMA_GIT_COMMIT ?? "local",
} as const;
