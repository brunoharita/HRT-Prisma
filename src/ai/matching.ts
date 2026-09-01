import { randomUUID } from "node:crypto";
import type {
  Evidence,
  Inference,
  MatchEvaluation,
  ProfessionalProfile,
  RequirementAssessment,
  Vacancy,
} from "../domain/types.js";
import { CURRENT_VERSIONS } from "../domain/versions.js";
import { evaluateEvidenceSufficiency } from "../domain/competencyVerification.js";
import { explainConfidence } from "./confidence.js";

export function evaluateMatch(input: {
  profile: ProfessionalProfile;
  vacancy: Vacancy;
  evidence: Evidence[];
  inferences: Inference[];
}): MatchEvaluation {
  if (input.profile.organizationId !== input.vacancy.organizationId) {
    throw new Error("Cross-organization matching is not allowed.");
  }

  const evidenceById = new Map(input.evidence.map((item) => [item.id, item]));
  const explicit = new Map(input.profile.competencies.map((item) => [item.normalizedName, item]));
  const inferred = new Map(
    input.inferences.filter((item) => item.personId === input.profile.personId).map((item) => [item.value, item]),
  );

  const requirements: RequirementAssessment[] = input.vacancy.requirements.map((requirement) => {
    const directSignal = explicit.get(requirement.competency);
    const directInference = inferred.get(requirement.competency);
    const languageSignal = requirement.competency === "English"
      ? input.profile.languages.find((item) => /^(ingl[eê]s|english)$/i.test(item.language))
      : undefined;
    const transferable = requirement.transferableCompetencies.find(
      (competency) => explicit.has(competency) || inferred.has(competency),
    );
    const ids = new Set<string>(directSignal?.evidenceIds ?? directInference?.evidenceIds ?? languageSignal?.evidenceIds ?? []);
    if (transferable) {
      explicit.get(transferable)?.evidenceIds.forEach((id) => ids.add(id));
      inferred.get(transferable)?.evidenceIds.forEach((id) => ids.add(id));
    }
    const evidence = [...ids]
      .map((id) => evidenceById.get(id))
      .filter((item): item is Evidence => item !== undefined);
    const relevantInferences = [directInference, transferable ? inferred.get(transferable) : undefined]
      .filter((item): item is Inference => item !== undefined);

    const buildVerificationSufficiency = (status: RequirementAssessment["status"], evidenceCount: number) => {
      if (!requirement.targetLevel || !requirement.criticality) return undefined;
      return evaluateEvidenceSufficiency({
        organizationId: input.profile.organizationId,
        personId: input.profile.personId,
        competencyKey: requirement.competency,
        targetLevel: requirement.targetLevel,
        criticality: requirement.criticality,
        documentaryEvidenceStrength: evidenceCount >= 2 || status === "met" ? "strong" : evidenceCount === 1 ? "limited" : "none",
        hasContextualEvidence: input.profile.professionalContexts.length > 0,
        hasHumanConfirmedEvidence: false,
        hasDemonstratedEvidence: false,
        policyRequirement: requirement.verificationPolicyRequirement ?? "optional",
        definitionAvailable: true,
      });
    };

    if (directSignal?.classification === "explicit" || languageSignal) {
      return {
        requirementId: requirement.id,
        label: requirement.label,
        importance: requirement.importance,
        status: "met",
        evidence,
        inferences: relevantInferences,
        explanation: languageSignal
          ? `Requisito atendido por idioma explicitamente informado: ${languageSignal.language} (${languageSignal.proficiency ?? "nível não identificado"}).`
          : `Requisito atendido por menção explícita de ${requirement.competency}.`,
        confidence: explainConfidence(evidence),
        ...optionalVerification(buildVerificationSufficiency("met", evidence.length)),
      };
    }
    if (directInference || transferable) {
      const basis = directInference ? `inferência rastreável de ${requirement.competency}` : `competência transferível ${transferable ?? "não identificada"}`;
      return {
        requirementId: requirement.id,
        label: requirement.label,
        importance: requirement.importance,
        status: "partially_met",
        evidence,
        inferences: relevantInferences,
        explanation: `Requisito parcialmente atendido por ${basis}; requer validação humana.`,
        confidence: explainConfidence(evidence),
        ...optionalVerification(buildVerificationSufficiency("partially_met", evidence.length)),
      };
    }
    return {
      requirementId: requirement.id,
      label: requirement.label,
      importance: requirement.importance,
      status: "no_evidence",
      evidence: [],
      inferences: [],
      explanation: `Não foi identificada evidência para ${requirement.competency}; isto não prova ausência da competência.`,
      confidence: explainConfidence([]),
      ...optionalVerification(buildVerificationSufficiency("no_evidence", 0)),
    };
  });

  const metRequirements = requirements.filter((item) => item.status === "met").map((item) => item.label);
  const partiallyMetRequirements = requirements.filter((item) => item.status === "partially_met").map((item) => item.label);
  const requirementsWithoutEvidence = requirements.filter((item) => item.status === "no_evidence").map((item) => item.label);
  const gaps = requirements
    .filter((item) => item.importance === "required" && item.status === "no_evidence")
    .map((item) => `Requisito obrigatório sem evidência identificada: ${item.label}.`);
  const transferableCompetencies = input.vacancy.requirements.flatMap((requirement) =>
    requirement.transferableCompetencies.filter((competency) => explicit.has(competency) || inferred.has(competency)),
  );
  const sufficiency = requirements.some(
    (item) => item.importance === "required" && item.status === "no_evidence",
  ) ? "insufficient_evidence" as const : "sufficient_evidence" as const;

  return {
    id: randomUUID(),
    organizationId: input.profile.organizationId,
    personId: input.profile.personId,
    vacancyId: input.vacancy.id,
    requirements,
    metRequirements,
    partiallyMetRequirements,
    requirementsWithoutEvidence,
    gaps,
    transferableCompetencies: [...new Set(transferableCompetencies)],
    uncertainties: [...input.profile.uncertainties, ...requirementsWithoutEvidence.map((label) => `A competência relacionada a ${label} não foi identificada.`)],
    sufficiency,
    matchingVersion: CURRENT_VERSIONS.matchingVersion,
    createdAt: new Date().toISOString(),
  };
}

function optionalVerification(
  verificationSufficiency: RequirementAssessment["verificationSufficiency"] | undefined,
): Pick<RequirementAssessment, "verificationSufficiency"> | Record<string, never> {
  return verificationSufficiency ? { verificationSufficiency } : {};
}
