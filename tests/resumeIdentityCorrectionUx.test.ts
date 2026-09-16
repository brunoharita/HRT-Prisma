import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = "web/src/pages/ResumeImportPage.tsx";

test("identity correction reuses server identification and replaces matches only after success", async () => {
  const page = await readFile(pagePath, "utf8");
  const handler = page.slice(page.indexOf("async function handleIdentityReview"), page.indexOf("async function resolveIntake"));
  assert.match(handler, /Promise<boolean>/);
  assert.match(handler, /if \(!hasMinimumResumeIdentity\(nextIdentity\)\).*return false;/);
  assert.match(handler, /await personIngestionService\.identifyResumeIntake\(activeMembership\.organizationId, intake\.intakeId, intake\.storagePath, nextIdentity\)/);
  assert.match(handler, /setIdentity\(nextIdentity\); setIntake\(nextIntake\);\s+return true;/);
  assert.match(handler, /catch \(caught\).*return false;/);
  assert.doesNotMatch(handler, /resolveResumeIntake|create_new_person|publish/);
});

test("identity editor hides stale resolution choices and only closes on server success", async () => {
  const page = await readFile(pagePath, "utf8");
  const screen = page.slice(page.indexOf("function IdentityScreen"), page.indexOf("function IdentityForm"));
  assert.match(screen, /Corrigir identificação/);
  assert.match(screen, /hasMinimumIdentity && !editingIdentity/);
  assert.match(screen, /if \(await props\.onIdentityReview\(value\)\) setEditingIdentity\(false\)/);
  assert.match(screen, /!editingIdentity \? <PrismaCard className="prisma-journey-matches"/);
  assert.match(screen, /onCancel=\{editingIdentity \? \(\) => setEditingIdentity\(false\) : undefined\}/);
  assert.match(screen, /disabled=\{props\.busy \|\| !hasMinimumIdentity\} icon=\{<PlusOutlined \/>\} loading=\{props\.busy\} onClick=\{props\.onCreate\}/);
  // Existing name-only link remains possible; minimum name+contact is a creation rule.
  assert.match(screen, /disabled=\{props\.busy\}[^>]+onClick=\{\(\) => props\.onLink\(candidate\)\}/);
});

test("identity correction disables edits and cancellation while submitting and rejects whitespace names", async () => {
  const page = await readFile(pagePath, "utf8");
  const form = page.slice(page.indexOf("function IdentityForm"), page.indexOf("function ProcessingScreen"));
  assert.match(form, /<Form<IdentityFormValue> disabled=\{busy\}/);
  assert.match(form, /required: true, whitespace: true/);
  assert.match(form, /<Button disabled=\{busy\} onClick=\{onCancel\}>Cancelar correção/);
});
