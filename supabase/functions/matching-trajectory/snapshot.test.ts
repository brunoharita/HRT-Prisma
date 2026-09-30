import { decodeProfileDataForPresentation as decode } from "./_generated/web/src/infrastructure/supabase/personIngestionService.js";
import { buildSnapshotEvaluation } from "./snapshot.ts";
import { prepareTrajectoryContext, SEMANTIC_METHOD_VERSION, SEMANTIC_PROMPT_VERSION, type SemanticAssessment } from "../../../src/domain/semanticTrajectory.ts";

function assert(value: unknown, message = "assertion failed"): asserts value { if (!value) throw new Error(message); }

Deno.test("generated decoder retains exact empty UI defaults", () => {
  const profile = decode(null);
  assert(profile.professionalTitle === null && profile.summary === null && profile.identity.fullName === null);
  assert(profile.contact.email === null && profile.contact.city === null);
  for (const field of ["areasOfExpertise", "experiences", "education", "competencies", "certifications", "languages", "toolsAndTechnologies", "professionalContexts", "customSections", "keyResults", "uncertainties", "notIdentified"] as const) {
    assert(Array.isArray(profile[field]) && profile[field].length === 0, field);
  }
});
Deno.test("generated decoder preserves historical lists, qualifiers, filtering and deduplication", () => {
  const profile = decode({ competencies: [{ normalizedName: "SQL" }, " SQL ", null],
    languages: [{ language: "Português", proficiency: "Avançado" }],
    certifications: [{ title: "Certification", issuer: "Issuer" }], toolsAndTechnologies: [{ technology: "PostgreSQL" }],
    professionalContexts: [{ context: "Logística" }], areasOfExpertise: ["Software", 12] });
  assert(JSON.stringify(profile.competencies) === '["SQL"]');
  assert(profile.languages[0] === "Português · Avançado" && profile.certifications[0] === "Certification · Issuer");
  assert(profile.toolsAndTechnologies[0] === "PostgreSQL" && profile.professionalContexts[0] === "Logística");
  assert(JSON.stringify(profile.areasOfExpertise) === '["Software"]');
});
Deno.test("generated decoder reuses stable legacy IDs and preserves canonical IDs/narrative boundaries", () => {
  const raw = { experiences: [{ role: "Developer", organization: "Example", period: "2020", description: "Built APIs • Wrote tests" }],
    education: [{ course: "Ciência da Computação", institution: "Example school" }] };
  const a = decode(raw), b = decode(raw);
  assert(a.experiences[0].id === b.experiences[0].id && a.experiences[0].id.startsWith("experience_legacy"));
  assert(a.education[0].id === b.education[0].id && a.education[0].id.startsWith("education_legacy"));
  assert(a.experiences[0].description.includes("\n• "));
  const canonical = decode({ experiences: [{ ...raw.experiences[0], id: "experience_abcdefgh" }] });
  assert(canonical.experiences[0].id === "experience_abcdefgh");
  assert(a.education[0].level && a.education[0].qualification && a.education[0].classificationMethodVersion);
});
Deno.test("snapshot uses active demonstrated evidence and exact stable requirement identity", () => {
  const raw = { experiences: [{ id: "experience_abcdefgh", role: "Backend developer", period: "01/2020 - 09/2026", description: "Built APIs" }] };
  const context = prepareTrajectoryContext(raw, { title: "Backend developer" });
  const assessment: SemanticAssessment = { status: "complete", organizationId: "org", profileId: "profile", positionVersionId: "version",
    analysisId: "analysis", inputHash: "hash", modelVersion: "model", methodVersion: SEMANTIC_METHOD_VERSION, promptVersion: SEMANTIC_PROMPT_VERSION,
    context, reading: { items: context.entries.map(e => ({ id: e.id, activity: "backend_execution", quote: e.text })) } };
  const sources = {
    vacancy: { id: "vacancy", organizationId: "org", versionId: "version", version: 2, title: "Backend developer", area: "Software",
      requirements: [{ id: "requirement", stableId: "stable-api", label: "APIs", category: "technology", importance: "required", targetLevel: "advanced", relatedSignals: [] }] },
    candidate: { personId: "person", profileId: "profile", profileVersion: 3, profileData: raw, knowledge: [] },
    occupationReference: null, positionDecision: null,
    demonstratedEvidence: [{ id: "verified", competencyKey: "APIs", demonstratedLevel: "advanced", confidenceState: "high",
      verificationDefinitionVersion: "m51a-verification-definition-1.0.0", evaluationVersion: "m51b-assessment-evaluation-1.0.0", integrityRuleVersion: "m51b-integrity-ruleset-1.0.0", verifiedAt: "2026-09-25" }],
  };
  const evaluation = buildSnapshotEvaluation(sources, assessment)!;
  const requirements = evaluation.requirements as { stableId: string; status: string; evidence: { sourceId: string }[] }[];
  assert(requirements[0].stableId === "stable-api" && requirements[0].status === "met" && requirements[0].evidence[0].sourceId === "verified");
  assert(evaluation.positionDecision === null && (evaluation.score as { score: number }).score === 100);
  const changed = buildSnapshotEvaluation({ ...sources, demonstratedEvidence: sources.demonstratedEvidence.map(e => ({ ...e, confidenceState: "reduced" })) }, assessment)!;
  assert((changed.score as { inputFingerprint: string }).inputFingerprint !== (evaluation.score as { inputFingerprint: string }).inputFingerprint,
    "changed demonstrated evidence must change the authoritative score fingerprint");
  assert(buildSnapshotEvaluation(sources, { ...assessment, status: "indeterminate" }) === null);
});

Deno.test("server snapshot accepts abbreviated historical execution and excludes current leadership", () => {
  for (const period of ["Jun/08 - Nov/12", "Jun/2008 - Nov/2012"]) {
    const raw = { experiences: [
      { id: "experience_leadership", role: "Diretor de tecnologia", period: "Jan/25 - Atual", description: "Lidero equipes de software." },
      { id: "experience_execution", role: "Desenvolvedor de software", period, description: "Desenvolvi sistemas." },
    ] };
    const context = prepareTrajectoryContext(raw, { title: "Desenvolvedor backend" });
    const assessment: SemanticAssessment = { status: "complete", organizationId: "org", profileId: "profile", positionVersionId: "version",
      analysisId: "analysis", inputHash: "hash", modelVersion: "synthetic", methodVersion: SEMANTIC_METHOD_VERSION, promptVersion: SEMANTIC_PROMPT_VERSION,
      context, reading: { items: context.entries.map(e => ({ id: e.id, activity: e.id === "e1" ? "software_execution" : "software_leadership", quote: e.text })) } };
    const sources = {
      vacancy: { id: "vacancy", organizationId: "org", versionId: "version", version: 1, title: "Desenvolvedor backend", area: "Software", requirements: [] },
      candidate: { personId: "person", profileId: "profile", profileVersion: 1, profileData: raw, knowledge: [] },
      occupationReference: { conceptId: "software", canonicalLabel: "Desenvolvedor de sistemas de tecnologia da informação",
        aliases: ["Desenvolvedor de software"], relations: [] }, positionDecision: null, demonstratedEvidence: [],
    };
    const before = JSON.stringify(sources);
    const evaluation = buildSnapshotEvaluation(sources, assessment, "2026-09-27");
    assert(evaluation !== null, period);
    const score = evaluation.score as { dimensions: { key: string; earnedPoints: number; determined: boolean }[] };
    assert(score.dimensions.find(item => item.key === "duration")?.earnedPoints === 7);
    assert(score.dimensions.find(item => item.key === "recency")?.earnedPoints === 0);
    assert(score.dimensions.every(item => item.determined));
    assert(JSON.stringify(sources) === before, "source facts must not be rewritten");
    raw.experiences[1].period = "Nov/12 - Jun/08";
    assert(buildSnapshotEvaluation(sources, assessment, "2026-09-27") === null, "invalid dates must still prevent snapshot");
  }
});
