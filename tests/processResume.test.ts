import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { DeterministicExtractionProvider } from "../src/ai/deterministicExtractor.js";
import { ProviderFailure, type ExtractionProvider } from "../src/ai/provider.js";
import { processResume } from "../src/application/processResume.js";
import { JsonTalentRepository } from "../src/infrastructure/jsonRepository.js";

const organizationId = "40000000-0000-4000-8000-000000000001";

test("processes a representative resume with evidence and provenance", async () => {
  const directory = await mkdtemp(join(tmpdir(), "prisma-test-"));
  try {
    const repository = new JsonTalentRepository(join(directory, "store.json"));
    const sourceText = await readFile(resolve("tests/golden/extraction/fixtures/cv-01-bi-industrial.txt"), "utf8");
    const result = await processResume(repository, new DeterministicExtractionProvider(), {
      organizationId,
      filename: "resume.txt",
      mediaType: "text/plain",
      sourceText,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.document.status, "processed");
    assert.ok(result.evidence.length >= 5);
    assert.ok(result.evidence.every((item) => item.organizationId === organizationId));
    assert.ok(result.evidence.every((item) => item.locator.quotedText.length > 0));
    assert.equal(new Set(result.profile.professionalContexts).size, result.profile.professionalContexts.length);
    assert.ok(result.profile.competencies.some((item) => item.normalizedName === "Business Intelligence" && item.classification === "inferred"));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("represents unsupported, review, and provider failure states without empty profiles", async () => {
  const directory = await mkdtemp(join(tmpdir(), "prisma-failures-"));
  try {
    const repository = new JsonTalentRepository(join(directory, "store.json"));
    const provider = new DeterministicExtractionProvider();
    const unsupported = await processResume(repository, provider, { organizationId, filename: "resume.pdf", mediaType: "application/pdf", sourceText: "%PDF representative" });
    assert.equal(unsupported.ok, false);
    assert.equal(unsupported.document.status, "unsupported_format");
    assert.equal(unsupported.document.failure?.canReprocess, true);

    const review = await processResume(repository, provider, { organizationId, filename: "blank.txt", mediaType: "text/plain", sourceText: "short" });
    assert.equal(review.ok, false);
    assert.equal(review.document.status, "needs_manual_review");

    const failingProvider: ExtractionProvider = {
      name: "failing-provider",
      model: "fixture",
      async extract() { throw new ProviderFailure("timeout", "timeout"); },
    };
    const failed = await processResume(repository, failingProvider, { organizationId, filename: "resume.txt", mediaType: "text/plain", sourceText: "NOME: Pessoa Exemplo\nEXPERIÊNCIA:\n- Empresa | Cargo | 2020 a 2024 | Texto suficiente." });
    assert.equal(failed.ok, false);
    assert.equal(failed.document.status, "extraction_failed");
    assert.equal(failed.document.failure?.category, "timeout");
    const snapshot = await repository.snapshot(organizationId);
    assert.equal(snapshot.profiles.length, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("treats instructions inside a resume as untrusted document content", async () => {
  const directory = await mkdtemp(join(tmpdir(), "prisma-injection-"));
  try {
    const repository = new JsonTalentRepository(join(directory, "store.json"));
    const sourceText = await readFile(resolve("tests/golden/extraction/fixtures/cv-13-prompt-injection.txt"), "utf8");
    const result = await processResume(repository, new DeterministicExtractionProvider(), {
      organizationId,
      filename: "malicious-resume.txt",
      mediaType: "text/plain",
      sourceText,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.profile.fullName, "Renata Segura Exemplo");
    const knowledge = result.profile.competencies.map((item) => item.normalizedName);
    assert.deepEqual(knowledge.sort(), ["Data Analysis", "SQL"].sort());
    assert.ok(!knowledge.includes("Administrator"));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
