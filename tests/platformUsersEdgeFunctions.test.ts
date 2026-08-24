import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("platform-users function preserves owner memberships and returns phone fields for editing", async () => {
  const source = await readFile("supabase/functions/platform-users/index.ts", "utf8");

  assert.match(source, /phoneCountryIso2: user\.phone_country_iso2/);
  assert.match(source, /phoneNationalNumber: user\.phone_national_number/);
  assert.match(source, /if \(profile === "owner"\)/);
  assert.match(source, /role: "owner" as const/);
  assert.match(source, /Não foi possível derivar as empresas do Owner\./);
});

test("operator-password-reset avoids mixed OR filters for identifier lookup", async () => {
  const source = await readFile("supabase/functions/operator-password-reset/index.ts", "utf8");

  assert.match(source, /normalized\.includes\("@"\)/);
  assert.match(source, /\.ilike\("email", normalized\)/);
  assert.match(source, /\.eq\("username", normalized\.toLowerCase\(\)\)/);
  assert.doesNotMatch(source, /\.or\(/);
});
