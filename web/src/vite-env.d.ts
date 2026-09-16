interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_PRISMA_GIT_COMMIT?: string;
  readonly VITE_DOCUMENT_INTELLIGENCE_MODE?: string;
  readonly VITE_DOCUMENT_INTELLIGENCE_TIMEOUT_MS?: string;
  readonly VITE_PARSER_IA_LOCAL?: string;
  readonly VITE_PARSER_IA_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
