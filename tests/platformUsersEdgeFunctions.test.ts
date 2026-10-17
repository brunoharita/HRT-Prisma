import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("platform-users function preserves owner memberships and returns phone fields for editing", async () => {
  const source = await readFile("supabase/functions/platform-users/index.ts", "utf8");

  assert.match(source, /phoneCountryIso2: user\.phone_country_iso2/);
  assert.match(source, /phoneNationalNumber: user\.phone_national_number/);
  assert.match(source, /rpc\("save_platform_user_v3"/);
  assert.match(source, /p_actor: actorContext\.actor\.auth_user_id/);
  assert.doesNotMatch(source, /async function rewriteOrganizationMemberships/);
});

test("operator-password-reset avoids mixed OR filters for identifier lookup", async () => {
  const source = await readFile("supabase/functions/operator-password-reset/index.ts", "utf8");

  assert.match(source, /normalized\.includes\("@"\)/);
  assert.match(source, /\.ilike\("email", normalized\)/);
  assert.match(source, /\.eq\("username", normalized\.toLowerCase\(\)\)/);
  assert.doesNotMatch(source, /\.or\(/);
});
