import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function declaration(path: string, name: string) {
  const source = readFileSync(path, "utf8");
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const node = ast.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === name);
  assert.ok(node, `${name} must exist in ${path}`);
  return ts.transpileModule(node.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
}

function pagedSupabase(rows: Record<string, unknown>[], reportedCount = rows.length, failedOffset = -1) {
  const offsets: number[] = [];
  const builder = {
    select: () => builder, eq: () => builder, in: () => builder, order: () => builder,
    range: async (from: number, to: number) => {
      offsets.push(from);
      return { data: rows.slice(from, to + 1), count: reportedCount, error: from === failedOffset ? { message: "synthetic failure" } : null };
    },
  };
  return { client: { from: () => builder }, offsets };
}

const observations = declaration("web/src/infrastructure/supabase/profileDiscoveryService.ts", "loadPublishedKnowledgeObservations");
const demonstrated = declaration("web/src/infrastructure/supabase/vacancyService.ts", "loadDemonstratedEvidence");

test("100 profiles with over 1000 Knowledge observations retain every tenant-scoped observation", async () => {
  const rows = Array.from({ length: 1205 }, (_, index) => ({ id: `observation-${index}`, profile_id: `profile-${index % 100}` }));
  const { client, offsets } = pagedSupabase(rows);
  const load = new Function("supabase", "throwIfError", "KNOWLEDGE_OBSERVATION_PAGE_SIZE", `${observations}; return loadPublishedKnowledgeObservations;`)(
    client, (error: unknown) => { if (error) throw new Error("unavailable"); }, 500);
  const result = await load("organization", Array.from({ length: 100 }, (_, index) => `profile-${index}`));
  assert.equal(result.length, 1205);
  assert.deepEqual(offsets, [0, 500, 1000]);
});

test("partial Knowledge observations fail closed instead of silently changing triage", async () => {
  const { client } = pagedSupabase(Array.from({ length: 500 }, (_, index) => ({ id: `${index}` })), 501);
  const load = new Function("supabase", "throwIfError", "KNOWLEDGE_OBSERVATION_PAGE_SIZE", `${observations}; return loadPublishedKnowledgeObservations;`)(
    client, (error: unknown) => { if (error) throw new Error("unavailable"); }, 500);
  await assert.rejects(load("organization", ["profile"]), /incompleta/);
});

test("demonstrated evidence is paged for 100 people and partial reads stay provisional", async () => {
  const rows = Array.from({ length: 1205 }, (_, index) => ({ id: `evidence-${index}`, person_id: `person-${index % 100}`,
    competency_key: "synthetic", demonstrated_level: "basic", confidence_state: "adequate", valid_until: null }));
  const first = pagedSupabase(rows);
  const loadFirst = new Function("supabase", `${demonstrated}; return loadDemonstratedEvidence;`)(first.client);
  const complete = await loadFirst("organization", Array.from({ length: 100 }, (_, index) => `person-${index}`));
  assert.equal([...complete.byPerson.values()].reduce((total: number, items: unknown[]) => total + items.length, 0), 1205);
  assert.equal(complete.dependency, null);
  assert.deepEqual(first.offsets, [0, 500, 1000]);

  const partial = pagedSupabase(rows, rows.length, 500);
  const loadPartial = new Function("supabase", `${demonstrated}; return loadDemonstratedEvidence;`)(partial.client);
  const unavailable = await loadPartial("organization", ["person-1"]);
  assert.equal(unavailable.byPerson.size, 0);
  assert.match(unavailable.dependency, /provisório/);
});
