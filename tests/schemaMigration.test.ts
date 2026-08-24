import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("migration enables RLS and tenant ownership on every public table", async () => {
  const sql = await readFile("supabase/migrations/20260820200810_initial_prisma_schema.sql", "utf8");
  const tables = [...sql.matchAll(/create table public\.([a-z_]+)\s*\(/g)].map((match) => match[1]).filter((name): name is string => Boolean(name));
  assert.ok(tables.length >= 15);
  for (const table of tables) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security;`));
    if (table !== "organizations") {
      const definition = sql.match(new RegExp(`create table public\\.${table} \\(([\\s\\S]*?)\\n\\);`))?.[1] ?? "";
      assert.match(definition, /organization_id uuid not null/);
    }
  }
  assert.doesNotMatch(sql, /auth\.role\s*\(/i);
  assert.doesNotMatch(sql, /user_metadata/i);
  assert.match(sql, /to authenticated/i);
  assert.match(sql, /revoke all on all tables in schema public from anon/i);
  assert.match(sql, /foreign key \(organization_id, person_id\)/i);
  assert.doesNotMatch(sql, /on delete set null\s*[,;]/i);
});

test("security hardening removes direct execution of the RLS event trigger", async () => {
  const sql = await readFile(
    "supabase/migrations/20260824021143_harden_rls_auto_enable_permissions.sql",
    "utf8",
  );

  assert.match(sql, /to_regprocedure\('public\.rls_auto_enable\(\)'\)/i);
  assert.match(
    sql,
    /revoke execute on function public\.rls_auto_enable\(\) from public, anon, authenticated/i,
  );
});
