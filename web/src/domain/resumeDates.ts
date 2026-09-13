import { parseResumePeriod } from "../../../src/domain/resumeDates.js";
import type { StructuredDraft } from "./personIngestion.js";

/** Uses the existing persisted uncertainty/evidence contract, without rewriting source facts. */
export function normalizeDraftPeriods(draft: StructuredDraft): StructuredDraft {
  const uncertainties = [...draft.uncertainties];
  const normalize = <T extends { id: string; period: string | null }>(item: T, label: string): T => {
    const parsed = parseResumePeriod(item.period);
    if (!parsed) return item;
    if (parsed.start?.inferred.length || parsed.end?.inferred.length) {
      const note = `${label}: período “${item.period}” padronizado para “${parsed.value}”; dias ou meses ausentes foram assumidos pela regra de datas.`;
      if (!uncertainties.includes(note)) uncertainties.push(note);
    }
    return parsed.value === item.period ? item : { ...item, period: parsed.value };
  };
  const experiences = draft.experiences.map((item, index) => normalize(item, `Experiência ${index + 1} (${item.role || item.organization || "sem título"})`));
  const education = draft.education.map((item, index) => normalize(item, `Formação ${index + 1} (${item.course || item.institution || "sem título"})`));
  return { ...draft, experiences, education, uncertainties };
}
