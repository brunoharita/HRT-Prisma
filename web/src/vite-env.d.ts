interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_PRISMA_GIT_COMMIT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
