import type { PrismaProfileView } from "./canonicalProfile";
import type { SynthesisQuestionId } from "../../../src/domain/profileSynthesis";

/** Direct published fields, never inferred AI answers or verification. */
export function publishedSummarySections(profile?: PrismaProfileView): Record<SynthesisQuestionId, string[]> {
  const join = (values: Array<string | null | undefined>) => values.filter(x => typeof x === "string" && x.trim()).join(" · ");
  return {
    trajectory: profile?.experiences.map(x => join([x.role, x.organization, x.period])).filter(Boolean) ?? [],
    activities: profile?.experiences.map(x => x.description).filter((x): x is string => Boolean(x?.trim())) ?? [],
    contexts: [...new Set([...(profile?.experiences.map(x => x.organization).filter((x): x is string => Boolean(x?.trim())) ?? []), ...(profile?.about?.areasOfExpertise ?? [])])],
    competencies: profile?.competencyGroups.flatMap(x => x.values.map(v => v.originalTerm ?? v.label)) ?? [],
    results: profile?.about?.keyResults ?? [],
    education: [...(profile?.education.map(x => join([x.course, x.institution, x.period])).filter(Boolean) ?? []), ...(profile?.credentials?.certifications ?? [])],
    objective: profile?.about?.professionalObjective ? [profile.about.professionalObjective] : [],
    clarifications: [],
  };
}
