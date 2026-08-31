import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  currentProfileLabel,
  isReviewableDocument,
  presentDocument,
} from "../web/src/domain/documentPresentation.js";
import type { CurrentProfileSummary, PersonDocumentTimelineItem, ProcessingAttemptView } from "../web/src/domain/personIngestion.js";

const currentProfile: CurrentProfileSummary = {
  id: "profile-v1",
  profileVersion: 1,
  sourceDocumentId: "document-v1",
  approvedAt: "2026-08-29T10:00:00.000Z",
  createdAt: "2026-08-29T10:00:00.000Z",
};

test("keeps the approved profile independent from a later document that requires review", () => {
  const document = makeDocument({ reviewState: "ready_for_review", latestAttempt: makeAttempt("structured") });

  assert.equal(currentProfileLabel(currentProfile), "Perfil v1 aprovado");
  assert.deepEqual(presentDocument(document), {
    state: "requires_review",
    label: "Requer revisão",
    description: "Conteúdo recuperado, revisão humana necessária.",
    nextAction: "Revisar nova importação",
    tone: "review",
    requiresAction: true,
  });
  assert.equal(isReviewableDocument(document), true);
});

test("classifies only execution errors as technical failure", () => {
  const failed = makeDocument({ reviewState: "not_ready", latestAttempt: makeAttempt("failed_extraction") });
  const partial = makeDocument({ reviewState: "ready_for_review", latestAttempt: makeAttempt("structured") });

  assert.equal(presentDocument(failed).state, "technical_failure");
  assert.equal(presentDocument(failed).nextAction, "Reprocessar ou substituir arquivo");
  assert.equal(presentDocument(partial).state, "requires_review");
});

test("does not invent a pending import and treats invalidation as an archived history", () => {
  assert.equal(presentDocument(null).state, "none");
  assert.equal(presentDocument(null).label, "Sem nova importação");
  assert.equal(presentDocument(makeDocument({ reviewState: "invalidated" })).state, "discarded");
});

test("people, operations, hub, and review source preserve navigation and entity boundaries", async () => {
  const [people, operations, hub, review] = await Promise.all([
    readFile("web/src/pages/PeoplePage.tsx", "utf8"),
    readFile("web/src/pages/DocumentOperationsPage.tsx", "utf8"),
    readFile("web/src/pages/PersonWorkspacePage.tsx", "utf8"),
    readFile("web/src/pages/ProfileReviewPage.tsx", "utf8"),
  ]);

  assert.match(people, /const personPath = \(personId: string\) => `\/profiles\/\$\{personId\}`/);
  assert.doesNotMatch(people, /personPath[\s\S]{0,120}\/edit/);
  assert.match(people, /title: "Perfil atual"/);
  assert.match(people, /title: "Última importação"/);
  assert.match(operations, /title: "Status do documento"/);
  assert.match(operations, /title: "Perfil atual"/);
  assert.match(operations, /currentProfileLabel\(document\.currentProfile\)/);
  assert.match(hub, /Revisar nova importação/);
  assert.match(hub, /Nenhuma nova versão de perfil foi criada/);
  assert.match(hub, /Descartar nova importação/);
  assert.match(review, /Não identificamos automaticamente uma experiência profissional neste currículo/);
  assert.match(review, /Selecionar área no currículo/);
  assert.match(review, /Adicionar experiência manualmente/);
  assert.match(hub, /const canReview = isReviewableDocument\(latestDocument\)/);
  assert.doesNotMatch(hub, /canReview[\s\S]{0,100}experiences\.length/);
});

test("discard operation is tenant-authorized, audit-only, and never mutates the current profile", async () => {
  const sql = await readFile("supabase/migrations/20260831022615_invalidate_document_review.sql", "utf8");
  const guardSql = await readFile("supabase/migrations/20260831025456_invalidate_document_review_approved_guard.sql", "utf8");

  assert.match(sql, /create or replace function public\.invalidate_document_review/i);
  assert.match(sql, /security definer[\s\S]*set search_path = ''/i);
  assert.match(sql, /private\.require_document_reviewer\(p_organization_id\)/i);
  assert.match(sql, /approved document cannot be invalidated/i);
  assert.match(sql, /set state = 'invalidated', invalidated_at = now\(\)/i);
  assert.match(sql, /set review_state = 'invalidated'/i);
  assert.match(sql, /document_review_invalidated/i);
  assert.match(sql, /'history_preserved', true/i);
  assert.match(sql, /'profile_unchanged', true/i);
  assert.doesNotMatch(sql, /update public\.professional_profiles/i);
  assert.doesNotMatch(sql, /delete from/i);
  assert.match(sql, /revoke all on function public\.invalidate_document_review[\s\S]*from public, anon/i);
  assert.match(sql, /grant execute on function public\.invalidate_document_review[\s\S]*to authenticated/i);
  assert.match(guardSql, /v_document\.status = 'approved' or v_document\.review_state = 'approved'/i);
  assert.match(guardSql, /v_document\.person_id is null[\s\S]*document is not linked to a person/i);
  assert.doesNotMatch(guardSql, /update public\.professional_profiles/i);
  assert.doesNotMatch(guardSql, /delete from/i);
});

function makeDocument(overrides: Partial<PersonDocumentTimelineItem> = {}): PersonDocumentTimelineItem {
  return {
    id: "document-v2",
    filename: "curriculo.pdf",
    sourceType: "resume_pdf",
    documentVersion: 2,
    byteSize: 1000,
    pageCount: 2,
    status: "ready_for_review",
    reviewState: "ready_for_review",
    createdAt: "2026-08-30T10:00:00.000Z",
    processedAt: "2026-08-30T10:01:00.000Z",
    profileVersion: null,
    isLegacyUnstored: false,
    latestAttempt: makeAttempt("structured"),
    ...overrides,
  };
}

function makeAttempt(state: ProcessingAttemptView["state"]): ProcessingAttemptView {
  return {
    id: "attempt-v2",
    attemptNumber: 1,
    state,
    currentMethod: "deterministic",
    pagesNative: 2,
    pagesOcr: 0,
    usefulCharacterCount: 1000,
    failureCode: state.startsWith("failed") ? "fixture_failure" : null,
    failureMessage: state.startsWith("failed") ? "Falha sintética" : null,
    startedAt: "2026-08-30T10:00:00.000Z",
    completedAt: "2026-08-30T10:01:00.000Z",
  };
}
