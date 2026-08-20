import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { DeterministicExtractionProvider } from "../src/ai/deterministicExtractor.js";
import { searchProfiles } from "../src/ai/search.js";
import { processResume } from "../src/application/processResume.js";
import { JsonTalentRepository } from "../src/infrastructure/jsonRepository.js";

test("vertical slice imports, persists, retrieves, and explains a representative resume", async () => {
  const directory = await mkdtemp(join(tmpdir(), "prisma-vertical-"));
  try {
    const organizationId = "70000000-0000-4000-8000-000000000001";
    const repository = new JsonTalentRepository(join(directory, "store.json"));
    const sourceText = await readFile(resolve("tests/golden/extraction/fixtures/cv-01-bi-industrial.txt"), "utf8");
    const processed = await processResume(repository, new DeterministicExtractionProvider(), { organizationId, filename: "resume.txt", mediaType: "text/plain", sourceText });
    assert.equal(processed.ok, true);
    if (!processed.ok) return;
    const snapshot = await repository.snapshot(organizationId);
    assert.equal(snapshot.documents[0]?.status, "processed");
    assert.equal(snapshot.profiles.length, 1);
    assert.ok(snapshot.evidence.length > 0);
    const results = searchProfiles({ query: "Encontre pessoas com experiência em BI", profiles: snapshot.profiles, evidence: snapshot.evidence, inferences: snapshot.inferences });
    assert.equal(results[0]?.personId, processed.person.id);
    assert.ok((results[0]?.evidence.length ?? 0) > 0);
    assert.match(results[0]?.explanation ?? "", /Encontrado por/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
