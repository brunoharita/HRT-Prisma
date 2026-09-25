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
  const raw = { experiences: [{ id: "experience_abcdefgh", role: "Backend developer", description: "Built APIs" }] };
  const context = prepareTrajectoryContext(raw, { title: "Backend developer" });
  const assessment: SemanticAssessment = { status: "complete", organizationId: "org", profileId: "profile", positionVersionId: "version",
    analysisId: "analysis", inputHash: "hash", modelVersion: "model", methodVersion: SEMANTIC_METHOD_VERSION, promptVersion: SEMANTIC_PROMPT_VERSION,
    context, reading: { items: context.entries.map(e => ({ id: e.id, activity: "backend_execution", quote: e.text })) } };
  const sources = {
    vacancy: { id: "vacancy", organizationId: "org", versionId: "version", version: 2, title: "Backend developer", area: "Software",
      requirements: [{ id: "requirement", stableId: "stable-api", label: "APIs", category: "technology", importance: "required", targetLevel: "advanced", relatedSignals: [] }] },
    candidate: { personId: "person", profileId: "profile", profileVersion: 3, profileData: raw, knowledge: [] },
    occupationReference: null, positionDecision: "confirmed",
    demonstratedEvidence: [{ id: "verified", competencyKey: "APIs", demonstratedLevel: "advanced", confidenceState: "high",
      verificationDefinitionVersion: "m51a-verification-definition-1.0.0", evaluationVersion: "m51b-assessment-evaluation-1.0.0", integrityRuleVersion: "m51b-integrity-ruleset-1.0.0", verifiedAt: "2026-09-25" }],
  };
  const evaluation = buildSnapshotEvaluation(sources, assessment)!;
  const requirements = evaluation.requirements as { stableId: string; status: string; evidence: { sourceId: string }[] }[];
  assert(requirements[0].stableId === "stable-api" && requirements[0].status === "met" && requirements[0].evidence[0].sourceId === "verified");
  assert(evaluation.positionDecision === "confirmed" && (evaluation.score as { score: number }).score === 100);
  const changed = buildSnapshotEvaluation({ ...sources, demonstratedEvidence: sources.demonstratedEvidence.map(e => ({ ...e, confidenceState: "reduced" })) }, assessment)!;
  assert((changed.score as { inputFingerprint: string }).inputFingerprint !== (evaluation.score as { inputFingerprint: string }).inputFingerprint,
    "changed demonstrated evidence must change the authoritative score fingerprint");
  assert(buildSnapshotEvaluation(sources, { ...assessment, status: "indeterminate" }) === null);
});
