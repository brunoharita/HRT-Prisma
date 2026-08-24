import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export const supabase = createClient<Database>(
  readEnv("VITE_SUPABASE_URL"),
  readEnv("VITE_SUPABASE_PUBLISHABLE_KEY"),
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

function readEnv(name: "VITE_SUPABASE_URL" | "VITE_SUPABASE_PUBLISHABLE_KEY"): string {
  const value = import.meta.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}.`);
  return value;
}
