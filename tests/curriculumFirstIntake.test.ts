import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  extractResumeIdentity,
  hasMinimumResumeIdentity,
  normalizeResumePhone,
} from "../src/domain/resumeIdentity.js";

const migrationPath = "supabase/migrations/20260826114333_curriculum_first_resume_intake.sql";

test("extracts only explicit minimum identity and normalizes Brazilian phone", () => {
  const identity = extractResumeIdentity([{ pageNumber: 1, text: [
    "Mariana Costa Silva",
    "mariana.costa@example.com",
    "(14) 99999-8888",
    "EXPERIÊNCIA",
    "Analista de Dados em Empresa Exemplo",
  ].join("\n") }]);

  assert.deepEqual(identity, {
    fullName: "Mariana Costa Silva",
    email: "mariana.costa@example.com",
    phone: "+5514999998888",
    namePage: 1,
    emailPage: 1,
    phonePage: 1,
  });
  assert.equal(hasMinimumResumeIdentity(identity), true);
  assert.equal(normalizeResumePhone("+55 14 99999-8888"), "+5514999998888");
});

test("does not invent identity when the resume has only headings or a name without contact", () => {
  const unnamed = extractResumeIdentity([{ pageNumber: 1, text: "CURRÍCULO\nEXPERIÊNCIA\nFORMAÇÃO" }]);
  const nameOnly = extractResumeIdentity([{ pageNumber: 1, text: "Carlos Pereira\nEXPERIÊNCIA\nConsultor em Empresa" }]);

  assert.equal(unnamed.fullName, null);
  assert.equal(hasMinimumResumeIdentity(unnamed), false);
  assert.equal(nameOnly.fullName, "Carlos Pereira");
  assert.equal(hasMinimumResumeIdentity(nameOnly), false);
});

test("curriculum-first migration stages the PDF before Person and resolves once under tenant authorization", async () => {
  const [sql, completionFix] = await Promise.all([
    readFile(migrationPath, "utf8"),
    readFile("supabase/migrations/20260826125000_curriculum_first_idempotent_completion.sql", "utf8"),
  ]);

  assert.match(sql, /create table public\.resume_intakes/i);
  assert.match(sql, /unique \(organization_id, idempotency_key\)/i);
  assert.match(sql, /status public\.resume_intake_status not null/i);
  assert.match(sql, /resolved_person_id uuid/i);
  assert.match(sql, /resolved_document_id uuid/i);
  assert.match(sql, /create policy resume_intakes_select[\s\S]*array\['super_admin', 'owner', 'admin', 'recruiter'\]/i);
  assert.doesNotMatch(sql, /resume_intakes_select[\s\S]{0,300}'member'/i);
  assert.match(sql, /create or replace function public\.start_resume_intake[\s\S]*security definer[\s\S]*set search_path = ''/i);
  assert.match(sql, /create or replace function public\.identify_resume_intake/i);
  assert.match(sql, /create or replace function public\.resolve_resume_intake[\s\S]*for update/i);
  assert.match(sql, /resume intake was already resolved by another decision/i);
  assert.match(sql, /insert into public\.documents/i);
  assert.match(sql, /create or replace function public\.complete_resume_intake/i);
  assert.match(completionFix, /claimed\.status in \('ready_for_review', 'completed'\)/i);
  assert.doesNotMatch(sql, /text_content|quoted_text|reviewed_data|extracted_data/i);
});

test("curriculum-first UI makes import primary and keeps manual Person registration secondary", async () => {
  const [home, people, importer, service, styles] = await Promise.all([
    readFile("web/src/pages/HomePage.tsx", "utf8"),
    readFile("web/src/pages/PeoplePage.tsx", "utf8"),
    readFile("web/src/pages/ResumeImportPage.tsx", "utf8"),
    readFile("web/src/infrastructure/supabase/personIngestionService.ts", "utf8"),
    readFile("web/src/styles.css", "utf8"),
  ]);

  assert.match(home, /Importar currículo/);
  assert.match(people, /type="primary">Importar currículo/);
  assert.match(people, />Cadastrar pessoa</);
  assert.match(importer, /Possível cadastro existente/);
  assert.match(importer, /Precisamos identificar a Pessoa/);
  assert.match(importer, /Vincular à pessoa existente/);
  assert.match(importer, /Revisar perfil/);
  assert.match(importer, /Tentar novamente/);
  assert.match(service, /persistExtraction\(/);
  assert.match(service, /complete_resume_intake/);
  assert.match(styles, /\.prisma-duplicate-candidate > div > span[\s\S]*?color: var\(--prisma-text-secondary\)/);
  assert.match(styles, /\.prisma-duplicate-candidate \.ant-btn-primary[\s\S]*?color: #ffffff/);
});
