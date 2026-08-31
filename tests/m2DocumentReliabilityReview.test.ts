import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = "supabase/migrations/20260824190000_m2c_document_reliability_review.sql";

test("M2-C makes document operations idempotent and serializes version allocation", async () => {
  const [sql, ingestionSql] = await Promise.all([
    readFile(migrationPath, "utf8"),
    readFile("supabase/migrations/20260824150653_m2b_people_ingestion.sql", "utf8"),
  ]);

  assert.match(sql, /unique \(organization_id, operation_type, idempotency_key\)/i);
  assert.match(sql, /idempotency key was already used for another request/i);
  assert.match(sql, /from public\.people person[\s\S]*for update/i);
  assert.match(sql, /from public\.documents document[\s\S]*for update/i);
  assert.match(sql, /unique index professional_profiles_one_current_idx[\s\S]*where superseded_at is null/i);
  assert.match(ingestionSql, /unique \(organization_id, document_id, attempt_number\)/i);
});

test("M2-C persists retry attempts, immutable extraction, review revisions, and field changes", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(sql, /retry_of_attempt_id uuid/i);
  assert.match(sql, /create table public\.profile_reviews/i);
  assert.match(sql, /extracted_data jsonb not null/i);
  assert.match(sql, /create table public\.profile_review_revisions/i);
  assert.match(sql, /create table public\.profile_review_changes/i);
  assert.match(sql, /field_path text not null check/i);
  assert.match(sql, /review_conflict/i);
  assert.match(sql, /profile_base_conflict/i);
  assert.match(sql, /processing_base_conflict/i);
});

test("M2-C critical mutations use locked-down RPCs and fail closed outside reviewer roles", async () => {
  const sql = await readFile(migrationPath, "utf8");
  const functions = [
    "register_person_document",
    "record_document_failure",
    "persist_person_extraction",
    "start_profile_review",
    "save_profile_review",
    "approve_profile_review",
  ];

  assert.match(sql, /array\['super_admin', 'owner', 'admin', 'recruiter'\]/i);
  assert.doesNotMatch(sql, /array\[[^\]]*'member'/i);
  assert.match(sql, /auth\.uid\(\)[\s\S]*authenticated session required/i);
  assert.match(sql, /revoke insert, update, delete on public\.professional_profiles from authenticated/i);
  assert.match(sql, /revoke insert, update, delete on public\.profile_reviews from authenticated/i);
  for (const functionName of functions) {
    assert.match(sql, new RegExp(`create(?: or replace)? function public\\.${functionName}[\\s\\S]*?security definer[\\s\\S]*?set search_path = ''`, "i"));
    assert.match(sql, new RegExp(`grant execute on function public\\.${functionName}`, "i"));
  }
});

test("M2-C audit events contain operational references without document text or full profile payload", async () => {
  const sql = await readFile(migrationPath, "utf8");
  const eventWrites = sql.match(/insert into public\.person_ingestion_events[\s\S]*?\);/gi) ?? [];

  assert.ok(eventWrites.length >= 5);
  for (const eventWrite of eventWrites) {
    assert.doesNotMatch(eventWrite, /text_content|quoted_text|reviewed_data|extracted_data|p_draft|p_pages\b/i);
  }
});

test("M2-C exposes four local flows under Pessoas without adding a global navigation item", async () => {
  const [application, people, operations, detail, review, versions] = await Promise.all([
    readFile("web/src/app/PrismaApplication.tsx", "utf8"),
    readFile("web/src/pages/PeoplePage.tsx", "utf8"),
    readFile("web/src/pages/DocumentOperationsPage.tsx", "utf8"),
    readFile("web/src/pages/DocumentDetailPage.tsx", "utf8"),
    readFile("web/src/pages/ProfileReviewPage.tsx", "utf8"),
    readFile("web/src/pages/ProfileVersionsPage.tsx", "utf8"),
  ]);

  assert.match(application, /profileView === "operations"/);
  assert.match(application, /profileView === "document"/);
  assert.match(application, /profileView === "review"/);
  assert.match(application, /profileView === "versions"/);
  assert.match(people, /Processamento e revisões/);
  assert.match(operations, /Aguardando revisão/);
  assert.match(detail, /Tentativas de processamento/);
  assert.match(review, /Extraído: preservado/);
  assert.match(versions, /Compare versões aprovadas/);
  assert.doesNotMatch(application, /label: "Processamento e revisões"/);
});

test("M2-C operations table preserves readable person and document columns", async () => {
  const [operations, styles] = await Promise.all([
    readFile("web/src/pages/DocumentOperationsPage.tsx", "utf8"),
    readFile("web/src/styles.css", "utf8"),
  ]);

  assert.match(operations, /title: "Pessoa"[\s\S]*?width: 280/);
  assert.match(operations, /title: "Documento"[\s\S]*?width: 270/);
  assert.match(operations, /prisma-operation-person-copy/);
  assert.match(operations, /prisma-operation-document-copy/);
  assert.match(operations, /tableLayout="fixed"/);
  assert.match(operations, /Mostrando \$\{range\[0\]\} a \$\{range\[1\]\}/);
  assert.match(styles, /\.prisma-operation-person-copy strong[\s\S]*?-webkit-line-clamp: 2/);
  assert.match(styles, /\.prisma-operation-document[\s\S]*?grid-template-columns: 34px minmax\(0, 1fr\)/);
  assert.match(styles, /\.prisma-operations-table \.ant-table-tbody > tr > td[\s\S]*?vertical-align: middle/);
});

test("M2-C returns to the processing list only after a successful approval", async () => {
  const review = await readFile("web/src/pages/ProfileReviewPage.tsx", "utf8");
  const approvalHandler = review.match(/async function handleApprove\(\)[\s\S]*?\n  }/)?.[0] ?? "";

  assert.match(approvalHandler, /await personIngestionService\.approveProfileReview[\s\S]*?onNavigate\("\/profiles\/processes"\)/);
  assert.match(approvalHandler, /catch \(caught\)[\s\S]*?setError/);
  assert.doesNotMatch(approvalHandler, /await refresh\(\)/);
});
