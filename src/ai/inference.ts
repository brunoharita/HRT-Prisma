import { randomUUID } from "node:crypto";
import type { Evidence, Inference } from "../domain/types.js";
import { CURRENT_VERSIONS } from "../domain/versions.js";

interface InferenceRule {
  sources: string[];
  target: string;
  rationale: string;
}

const RULES: InferenceRule[] = [
  {
    sources: ["Power BI", "Tableau", "Qlik"],
    target: "Business Intelligence",
    rationale: "Ferramenta de BI explicitamente associada ao perfil.",
  },
  {
    sources: ["SQL", "Python", "ETL"],
    target: "Data Analysis",
    rationale: "Tecnologia de manipulação ou análise de dados explicitamente mencionada.",
  },
  {
    sources: ["SAP"],
    target: "ERP",
    rationale: "SAP explicitamente mencionado como tecnologia empresarial.",
  },
];

export function deriveInferences(input: {
  organizationId: string;
  personId: string;
  explicitCompetencies: Array<{ normalizedName: string; evidenceIds: string[] }>;
  evidence: Evidence[];
}): Inference[] {
  const evidenceById = new Map(input.evidence.map((item) => [item.id, item]));
  const explicitNames = new Set(input.explicitCompetencies.map((item) => item.normalizedName));

  return RULES.flatMap((rule) => {
    if (explicitNames.has(rule.target)) return [];
    const supporting = input.explicitCompetencies.filter((item) => rule.sources.includes(item.normalizedName));
    if (supporting.length === 0) return [];
    const evidenceIds = [...new Set(supporting.flatMap((item) => item.evidenceIds))].filter((id) => evidenceById.has(id));
    return [{
      id: randomUUID(),
      organizationId: input.organizationId,
      personId: input.personId,
      type: "competency" as const,
      value: rule.target,
      rationale: rule.rationale,
      evidenceIds,
      inferenceVersion: CURRENT_VERSIONS.inferenceVersion,
      createdAt: new Date().toISOString(),
    }];
  });
}
