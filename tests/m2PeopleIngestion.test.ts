import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildDeterministicDraft,
  isNativeTextSufficient,
  processManualText,
  validateAndProcessPdf,
  type ExtractedPage,
} from "../web/src/domain/personIngestion.js";

test("M2-B rejects insufficient manual text and preserves explicit missing fields", () => {
  assert.throws(() => processManualText("texto curto"), /120 caracteres úteis/i);

  const neutralText = "Profissional com atuação documentada em operações e melhoria contínua. ".repeat(4);
  const result = processManualText(neutralText);

  assert.equal(result.page.origin, "manual_text");
  assert.equal(result.draft.experiences.length, 0);
  assert.equal(result.draft.summary, null);
  assert.ok(result.draft.notIdentified.includes("experiências estruturáveis"));
});

test("M2-B structures only explicit facts and keeps page provenance", () => {
  const page: ExtractedPage = {
    pageNumber: 2,
    text: "Desenvolvedor Full Stack em Tech Solutions 2021 - Atual  Bacharel em Ciência da Computação - Universidade Prisma  React TypeScript SQL Inglês",
    origin: "native_pdf",
    usefulCharacterCount: 120,
    method: "pdfjs",
    methodVersion: "fixture-v1",
  };
  const draft = buildDeterministicDraft([page]);

  assert.equal(draft.experiences[0]?.role, "Desenvolvedor Full Stack");
  assert.equal(draft.experiences[0]?.page, 2);
  assert.ok(draft.competencies.includes("React"));
  assert.ok(draft.competencies.includes("TypeScript"));
  assert.ok(draft.languages.includes("Inglês"));
  assert.equal(draft.uncertainties.length, 0);
});

test("M2-B native sufficiency is deterministic", () => {
  assert.equal(isNativeTextSufficient("abc 123"), false);
  assert.equal(isNativeTextSufficient("Experiência profissional comprovada com desenvolvimento de sistemas, processos, dados e governança. ".repeat(2)), true);
});

test("M2-B rejects a file whose signature is not PDF before parsing or OCR", async () => {
  const file = new File(["not-a-pdf%%EOF"], "curriculo.pdf", { type: "application/pdf" });
  await assert.rejects(() => validateAndProcessPdf(file), /assinatura do arquivo não corresponde a um PDF/i);
});

test("M2-B migration keeps documents private, versioned, and inaccessible to members", async () => {
  const sql = await readFile("supabase/migrations/20260824150653_m2b_people_ingestion.sql", "utf8");

  assert.match(sql, /values \('person-documents', 'person-documents', false, 15728640/i);
  assert.match(sql, /create unique index documents_person_version_idx/i);
  assert.match(sql, /is_legacy_unstored boolean not null default false/i);
  assert.match(sql, /is_legacy_unstored and actor_auth_user_id is null/i);
  assert.match(sql, /documents_reject_new_legacy_unstored/i);
  assert.match(sql, /create table public\.document_processing_attempts/i);
  assert.match(sql, /create table public\.document_page_extractions/i);
  assert.match(sql, /create table public\.extraction_drafts/i);
  assert.match(sql, /create table public\.person_ingestion_events/i);
  assert.match(sql, /private\.storage_object_organization_id\(name\)/i);

  const rawAccessPolicies = sql.match(/create policy (?:processing_attempts|page_extractions|extraction_drafts|person_documents)[\s\S]*?(?=create policy|grant select|drop policy|$)/gi) ?? [];
  assert.ok(rawAccessPolicies.length >= 4);
  for (const policy of rawAccessPolicies) assert.doesNotMatch(policy, /'member'/i);
});

test("M2-B routes members to profile-only UI instead of ingestion workspace", async () => {
  const application = await readFile("web/src/app/PrismaApplication.tsx", "utf8");
  const peoplePage = await readFile("web/src/pages/PeoplePage.tsx", "utf8");

  assert.match(application, /activeMembership\.role === "member"[\s\S]*?<PersonProfilePage/);
  assert.match(peoplePage, /activeMembership\.role !== "member"/);
  assert.match(peoplePage, /listPeople\(activeMembership\.organizationId, deferredSearch, canManagePeople\)/);
});

test("M2-B persists extraction output through one invoker-rights transaction", async () => {
  const sql = await readFile("supabase/migrations/20260824155000_m2b_atomic_extraction_rpc.sql", "utf8");
  const service = await readFile("web/src/infrastructure/supabase/personIngestionService.ts", "utf8");

  assert.match(sql, /create or replace function public\.persist_person_extraction/i);
  assert.match(sql, /security invoker/i);
  assert.match(sql, /document does not belong to the organization and person/i);
  assert.match(sql, /grant execute on function public\.persist_person_extraction[\s\S]*to authenticated/i);
  assert.doesNotMatch(sql, /security definer/i);
  assert.match(service, /supabase\.rpc\("persist_person_extraction"/i);
});
