import type { Evidence, Inference, ProfessionalProfile, SearchResult } from "../domain/types.js";
import { explainConfidence } from "./confidence.js";

interface QueryConceptRule {
  concept: string;
  pattern: RegExp;
}

const QUERY_RULES: QueryConceptRule[] = [
  { concept: "Power BI", pattern: /\bpower\s*bi\b/i },
  { concept: "Business Intelligence", pattern: /\b(business intelligence|\bbi\b)/i },
  { concept: "Industrial", pattern: /\b(ind[uú]stria|industrial|f[aá]brica|manufatura)\b/i },
  { concept: "Project Leadership", pattern: /\b(lideran[çc]a de projetos|liderar projetos|liderou projetos)\b/i },
  { concept: "Project Management", pattern: /\b(gest[aã]o de projetos|pmo|project management)\b/i },
  { concept: "SQL", pattern: /\bsql\b/i },
  { concept: "Data Analysis", pattern: /\b(an[aá]lise de dados|analytics)\b/i },
  { concept: "SAP", pattern: /\bsap\b/i },
  { concept: "Excel", pattern: /\bexcel\b/i },
  { concept: "Process Improvement", pattern: /\b(processos|bpm|lean|six sigma)\b/i },
];

export function parseNaturalLanguageQuery(query: string): string[] {
  return [...new Set(QUERY_RULES.filter((rule) => rule.pattern.test(query)).map((rule) => rule.concept))];
}

export function searchProfiles(input: {
  query: string;
  profiles: ProfessionalProfile[];
  evidence: Evidence[];
  inferences: Inference[];
}): SearchResult[] {
  const concepts = parseNaturalLanguageQuery(input.query);
  if (concepts.length === 0) return [];
  const evidenceById = new Map(input.evidence.map((item) => [item.id, item]));

  const results = input.profiles.flatMap((profile): SearchResult[] => {
    const explicit = new Map(
      profile.competencies
        .filter((item) => item.classification === "explicit")
        .map((item) => [item.normalizedName, item]),
    );
    const inferredForProfile = input.inferences.filter((item) => item.personId === profile.personId);
    const inferred = new Map(inferredForProfile.map((item) => [item.value, item]));
    const contexts = new Set(profile.professionalContexts);

    const matchedConcepts = concepts.filter(
      (concept) => explicit.has(concept) || inferred.has(concept) || contexts.has(concept),
    );
    if (matchedConcepts.length === 0) return [];

    const matchedEvidenceIds = new Set<string>();
    for (const concept of matchedConcepts) {
      explicit.get(concept)?.evidenceIds.forEach((id) => matchedEvidenceIds.add(id));
      inferred.get(concept)?.evidenceIds.forEach((id) => matchedEvidenceIds.add(id));
      input.evidence
        .filter((item) => item.personId === profile.personId && item.fact === concept)
        .forEach((item) => matchedEvidenceIds.add(item.id));
    }
    const evidence = [...matchedEvidenceIds]
      .map((id) => evidenceById.get(id))
      .filter((item): item is Evidence => item !== undefined);
    const matchingInferences = inferredForProfile.filter((item) => matchedConcepts.includes(item.value));
    const missingConcepts = concepts.filter((concept) => !matchedConcepts.includes(concept));

    return [{
      personId: profile.personId,
      profileId: profile.id,
      fullName: profile.fullName,
      matchedConcepts,
      missingConcepts,
      evidence,
      inferences: matchingInferences,
      explanation: `Encontrado por ${matchedConcepts.join(", ")}. ${missingConcepts.length > 0 ? `Sem evidência identificada para ${missingConcepts.join(", ")}.` : "Todos os conceitos consultados possuem suporte no perfil."}`,
      confidence: explainConfidence(evidence),
    }];
  });

  return results.sort((a, b) => {
    const byCoverage = b.matchedConcepts.length - a.matchedConcepts.length;
    if (byCoverage !== 0) return byCoverage;
    return a.fullName.localeCompare(b.fullName, "pt-BR");
  });
}
