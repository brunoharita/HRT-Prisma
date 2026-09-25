// Use the same pinned Supabase import as the existing Edge Functions.
// deno-lint-ignore no-import-prefix
import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import { handleMatchingTrajectory } from "./handler.ts";

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error("BACKEND_CONFIGURATION_UNAVAILABLE");
  return value;
}

Deno.serve(request => handleMatchingTrajectory(request, {
  env: name => Deno.env.get(name),
  authenticate: async bearer => {
    const client = createClient(required("SUPABASE_URL"), required("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: bearer } }, auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.getUser();
    return error || !data.user ? null : { id: data.user.id, client };
  },
  service: () => createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }),
  fetch,
}));
