import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { DeterministicExtractionProvider } from "../src/ai/deterministicExtractor.js";
import { processResume } from "../src/application/processResume.js";
import { JsonTalentRepository } from "../src/infrastructure/jsonRepository.js";

test("repository reads never cross organization boundaries", async () => {
  const directory = await mkdtemp(join(tmpdir(), "prisma-isolation-"));
  try {
    const repository = new JsonTalentRepository(join(directory, "store.json"));
    const sourceText = await readFile(resolve("tests/golden/extraction/fixtures/cv-02-tableau-retail.txt"), "utf8");
    const organizationA = "50000000-0000-4000-8000-000000000001";
    const organizationB = "50000000-0000-4000-8000-000000000002";
    const result = await processResume(repository, new DeterministicExtractionProvider(), { organizationId: organizationA, filename: "a.txt", mediaType: "text/plain", sourceText });
    assert.equal(result.ok, true);
    assert.equal((await repository.listProfiles(organizationA)).length, 1);
    assert.equal((await repository.listProfiles(organizationB)).length, 0);
    assert.equal((await repository.listEvidence(organizationB)).length, 0);
    assert.equal((await repository.snapshot(organizationB)).documents.length, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
