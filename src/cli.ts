import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DeterministicExtractionProvider } from "./ai/deterministicExtractor.js";
import { evaluateMatch } from "./ai/matching.js";
import { searchProfiles } from "./ai/search.js";
import { processResume } from "./application/processResume.js";
import type { Vacancy } from "./domain/types.js";
import { JsonTalentRepository } from "./infrastructure/jsonRepository.js";

async function demo(): Promise<void> {
  const organizationId = "10000000-0000-4000-8000-000000000001";
  const fixturePath = resolve("tests/golden/extraction/fixtures/cv-01-bi-industrial.txt");
  const storePath = resolve(".prisma-data", `demo-${Date.now()}.json`);
  const sourceText = await readFile(fixturePath, "utf8");
  const repository = new JsonTalentRepository(storePath);
  const provider = new DeterministicExtractionProvider();
  const processed = await processResume(repository, provider, {
    organizationId,
    filename: "cv-representativo-bi-industrial.txt",
    mediaType: "text/plain",
    sourceText,
  });
  if (!processed.ok) throw new Error(`Falha no documento: ${processed.document.failure?.reason ?? "desconhecida"}`);

  const profiles = await repository.listProfiles(organizationId);
  const evidence = await repository.listEvidence(organizationId);
  const inferences = await repository.listInferences(organizationId);
  const query = "Encontre pessoas com experiência em BI e ambiente industrial.";
  const results = searchProfiles({ query, profiles, evidence, inferences });
  const selected = results[0];
  if (!selected) throw new Error("A busca não retornou o currículo importado.");

  const vacancy: Vacancy = {
    id: randomUUID(),
    organizationId,
    roleName: "Analista de BI Industrial",
    requirements: [
      { id: "bi", label: "Business Intelligence", competency: "Business Intelligence", importance: "required", transferableCompetencies: ["Power BI", "Tableau"] },
      { id: "industry", label: "Contexto industrial", competency: "Industrial Operations", importance: "required", transferableCompetencies: [] },
      { id: "sql", label: "SQL", competency: "SQL", importance: "required", transferableCompetencies: [] },
      { id: "english", label: "Inglês", competency: "English", importance: "desired", transferableCompetencies: [] },
      { id: "python", label: "Python", competency: "Python", importance: "required", transferableCompetencies: [] },
    ],
  };
  const match = evaluateMatch({ profile: processed.profile, vacancy, evidence, inferences });
  await repository.saveMatch(match);
  const snapshot = await repository.snapshot(organizationId);

  const output = {
    state: "VERTICAL_SLICE_OK",
    importedDocument: {
      id: processed.document.id,
      status: processed.document.status,
      checksum: processed.document.checksum,
    },
    profile: {
      id: processed.profile.id,
      fullName: processed.profile.fullName,
      explicitCompetencies: processed.profile.competencies.filter((item) => item.classification === "explicit").map((item) => item.normalizedName),
      inferredCompetencies: processed.profile.competencies.filter((item) => item.classification === "inferred").map((item) => item.normalizedName),
      contexts: processed.profile.professionalContexts,
      uncertainties: processed.profile.uncertainties,
      notIdentified: processed.profile.notIdentified,
      versions: processed.profile.versions,
    },
    search: {
      query,
      result: {
        fullName: selected.fullName,
        matchedConcepts: selected.matchedConcepts,
        missingConcepts: selected.missingConcepts,
        explanation: selected.explanation,
        evidence: selected.evidence.map((item) => ({ fact: item.fact, source: item.locator })),
        confidence: selected.confidence,
      },
    },
    match: {
      role: vacancy.roleName,
      metRequirements: match.metRequirements,
      partiallyMetRequirements: match.partiallyMetRequirements,
      requirementsWithoutEvidence: match.requirementsWithoutEvidence,
      gaps: match.gaps,
      uncertainties: match.uncertainties,
      sufficiency: match.sufficiency,
      explanations: match.requirements.map((item) => ({ requirement: item.label, status: item.status, explanation: item.explanation })),
    },
    observability: snapshot.processingEvents,
    persistence: storePath,
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

const command = process.argv[2];
if (command !== "demo") {
  process.stderr.write("Uso: node dist/src/cli.js demo\n");
  process.exitCode = 1;
} else {
  await demo();
}
