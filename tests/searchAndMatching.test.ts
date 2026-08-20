import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { DeterministicExtractionProvider } from "../src/ai/deterministicExtractor.js";
import { evaluateMatch } from "../src/ai/matching.js";
import { searchProfiles } from "../src/ai/search.js";
import { processResume } from "../src/application/processResume.js";
import type { Vacancy } from "../src/domain/types.js";
import { JsonTalentRepository } from "../src/infrastructure/jsonRepository.js";

test("search uses structured facts and inference and matching exposes no-evidence gaps", async () => {
  const directory = await mkdtemp(join(tmpdir(), "prisma-search-"));
  try {
    const organizationId = "60000000-0000-4000-8000-000000000001";
    const repository = new JsonTalentRepository(join(directory, "store.json"));
    const sourceText = await readFile(resolve("tests/golden/extraction/fixtures/cv-01-bi-industrial.txt"), "utf8");
    const processed = await processResume(repository, new DeterministicExtractionProvider(), { organizationId, filename: "resume.txt", mediaType: "text/plain", sourceText });
    assert.equal(processed.ok, true);
    if (!processed.ok) return;
    const evidence = await repository.listEvidence(organizationId);
    const inferences = await repository.listInferences(organizationId);
    const results = searchProfiles({ query: "Pessoas com experiência em BI e ambiente industrial", profiles: [processed.profile], evidence, inferences });
    assert.equal(results.length, 1);
    assert.deepEqual(results[0]?.missingConcepts, []);
    assert.ok((results[0]?.evidence.length ?? 0) > 0);

    const vacancy: Vacancy = {
      id: "60000000-0000-4000-8000-000000000099",
      organizationId,
      roleName: "BI Industrial",
      requirements: [
        { id: "bi", label: "BI", competency: "Business Intelligence", importance: "required", transferableCompetencies: ["Power BI"] },
        { id: "english", label: "Inglês fluente", competency: "English fluency", importance: "required", transferableCompetencies: [] },
        { id: "english-present", label: "Inglês informado", competency: "English", importance: "desired", transferableCompetencies: [] },
      ],
    };
    const match = evaluateMatch({ profile: processed.profile, vacancy, evidence, inferences });
    assert.equal(match.requirements.find((item) => item.requirementId === "bi")?.status, "partially_met");
    assert.equal(match.requirements.find((item) => item.requirementId === "english")?.status, "no_evidence");
    assert.equal(match.requirements.find((item) => item.requirementId === "english-present")?.status, "met");
    assert.equal(match.gaps.length, 1);
    assert.equal(match.sufficiency, "insufficient_evidence");
    assert.match(match.gaps[0] ?? "", /sem evidência identificada/i);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("matching rejects cross-organization evaluation", () => {
  assert.throws(() => evaluateMatch({
    profile: {
      id: "p", organizationId: "org-a", personId: "person", fullName: "Pessoa", experiences: [], education: [], certifications: [], languages: [], toolsAndTechnologies: [], competencies: [], professionalContexts: [], evidenceIds: [], inferenceIds: [], uncertainties: [], notIdentified: [],
      versions: { extractionVersion: "1", inferenceVersion: "1", embeddingVersion: "1", matchingVersion: "1", promptVersion: "1", modelVersion: "1" }, createdAt: new Date().toISOString(),
    },
    vacancy: { id: "v", organizationId: "org-b", roleName: "Role", requirements: [] },
    evidence: [], inferences: [],
  }), /Cross-organization/);
});
