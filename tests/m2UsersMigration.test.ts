import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("M2-A migration creates groups, platform users, audit, and username-based contracts", async () => {
  const sql = await readFile("supabase/migrations/20260824113000_m2_users_people.sql", "utf8");

  assert.match(sql, /create table public\.organization_groups/i);
  assert.match(sql, /create table public\.platform_users/i);
  assert.match(sql, /create table public\.platform_user_audit_events/i);
  assert.match(sql, /create type public\.platform_user_status as enum/i);
  assert.match(sql, /create type public\.platform_credential_mode as enum/i);
  assert.match(sql, /check \(username = lower\(username\)\)/i);
  assert.match(sql, /private\.is_reserved_username/i);
  assert.match(sql, /alter table public\.organizations add column group_id uuid/i);
  assert.match(sql, /organization_memberships_member_one_org_idx/i);
  assert.match(sql, /platform_users_select_self/i);
  assert.match(sql, /organization_groups_select/i);
});

test("M2-A migration keeps authorization off user metadata and keeps anon revoked", async () => {
  const sql = await readFile("supabase/migrations/20260824113000_m2_users_people.sql", "utf8");

  assert.doesNotMatch(sql, /user_metadata/i);
  assert.doesNotMatch(sql, /auth\.role\s*\(/i);
  assert.match(sql, /revoke all on all tables in schema public from anon/i);
  assert.match(sql, /grant select on public\.organization_groups, public\.organizations, public\.organization_memberships, public\.platform_users to authenticated/i);
});
