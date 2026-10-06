import { EDUCATION_LEVEL_LABELS, EDUCATION_QUALIFICATION_LABELS, type EducationLevel } from "../../../src/domain/educationClassification.js";
import { parseResumePeriod, type ResumeDate, type ResumePeriod } from "../../../src/domain/resumeDates.js";
import type { PrismaProfileView } from "./canonicalProfile.js";
import type { StructuredEducation, StructuredExperience } from "./personIngestion.js";

export const PROFILE_HIGHLIGHTS_METHOD = "published-profile-highlights-1.0.1";
type Value = { text: string; detail?: string };
export interface ProfileHighlight {
  id: "areas" | "position" | "education" | "organizations";
  title: string; headline?: string; values: Value[]; context?: string;
  additional?: { title: string; values: Value[] };
  note: string; sources: Array<{ label: string; text: string }>;
}
const clean = (value: string | null | undefined) => typeof value === "string" ? value.trim() : "";
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim();
const unique = (values: Array<string | null | undefined>) => {
  const seen = new Set<string>();
  return values.map(clean).filter(value => { const key = normalize(value); if (!value || seen.has(key)) return false; seen.add(key); return true; });
};
const ranks: Record<EducationLevel, number> = { unknown: 0, complementary: 0, secondary: 1, technical: 2, undergraduate: 3, postgraduate: 4 };
const qualifiedRanks: Record<string, number> = { specialization: 1, mba: 1, master: 2, doctorate: 3, postdoctorate: 4 };
const supported = (item: StructuredEducation, dimension: "status" | "level" | "qualification") => item.classificationReviewed === true || ["explicit", "human"].includes(item.classificationSources?.[dimension] ?? item.classificationOrigin ?? "unknown");
const month = (date: { year: number; month: number }) => date.year * 12 + date.month - 1;
const referenceMonth = (date: Date) => Number.isFinite(date.getTime()) ? date.getFullYear() * 12 + date.getMonth() : NaN;
const future = (date: ResumeDate | null, today: Date) => Boolean(date && (month(date) > referenceMonth(today) || !date.inferred.includes("day") && month(date) === referenceMonth(today) && date.day > today.getDate()));
function window(period: ResumePeriod | null, today: Date): [number, number] | null {
  const reference = referenceMonth(today);
  if (!Number.isFinite(reference) || !period?.isRange || !period.start || period.start.inferred.includes("month") || (!period.current && (!period.end || period.end.inferred.includes("month")))) return null;
  const start = month(period.start), end = period.current ? reference : month(period.end!) + 1;
  return future(period.start, today) || future(period.end, today) || end < start ? null : [start, end];
}
/** Monthly approximation; closed periods include their last reported month. No gaps or double counting. */
export function documentedMonths(periods: Array<string | null>, today = new Date()): number | null {
  if (!periods.length) return null;
  const intervals = periods.map(value => window(parseResumePeriod(clean(value)), today));
  if (intervals.some(x => !x)) return null;
  const sorted = (intervals as Array<[number, number]>).sort((a, b) => a[0] - b[0]);
  let total = 0; let [start, end] = sorted[0]!;
  for (const [nextStart, nextEnd] of sorted.slice(1)) {
    if (nextStart <= end) end = Math.max(end, nextEnd);
    else { total += end - start; start = nextStart; end = nextEnd; }
  }
  return total + end - start;
}
export function approximateDuration(months: number | null): string {
  if (months === null) return "Duração não determinada: faltam datas com mês e ano válidos.";
  if (months < 1) return "Menos de 1 mês documentado";
  const years = Math.floor(months / 12), remainder = months % 12;
  return "Aproximadamente " + [years ? `${years} ${years === 1 ? "ano" : "anos"}` : "", remainder ? `${remainder} ${remainder === 1 ? "mês" : "meses"}` : ""].filter(Boolean).join(" e ");
}
function explicitlyMentions(item: StructuredExperience, area: string): boolean {
  return [item.role, item.description].some(value => clean(value).split(/[.!?;\n]/).some(sentence => {
    const text = ` ${normalize(sentence)} `;
    return text.includes(` ${normalize(area)} `) && !/\b(nao|sem|nenhum|nenhuma|ausencia)\b/.test(text);
  }));
}
/** Read-only derivation from the approved Profile: no provider, persisted association or mutation. */
export function profileHighlights(profile?: PrismaProfileView, today = new Date()): ProfileHighlight[] {
  const areas = unique(profile?.about?.areasOfExpertise ?? []), experiences = profile?.experiences ?? [], reference = referenceMonth(today);
  const dated = experiences.map(item => ({ item, period: parseResumePeriod(clean(item.period)) }));
  const chronologyKnown = dated.length > 0 && Number.isFinite(reference) && dated.every(x => x.period?.isRange && x.period.start && !x.period.start.inferred.includes("month") && (x.period.current || x.period.end && !x.period.end.inferred.includes("month")) && !future(x.period.start, today) && !future(x.period.end, today));
  const current = dated.filter(x => x.period?.current);
  const key = (entry: typeof dated[number], ongoing: boolean) => ongoing ? month(entry.period!.start!) : month(entry.period!.end!);
  const pool = current.length ? current : dated;
  const last = chronologyKnown ? Math.max(...pool.map(x => key(x, current.length > 0))) : NaN;
  const recent = chronologyKnown ? pool.filter(x => key(x, current.length > 0) === last) : dated;
  const remainder = chronologyKnown ? dated.filter(x => !recent.includes(x)) : [];
  const otherCurrent = remainder.filter(x => x.period?.current), otherPool = otherCurrent.length ? otherCurrent : remainder;
  const otherKey = (entry: typeof dated[number]) => key(entry, otherCurrent.length > 0);
  const otherLast = otherPool.length ? Math.max(...otherPool.map(otherKey)) : NaN;
  const others = otherPool.filter(x => otherKey(x) === otherLast);
  const previous = others.length > 0 && others.every(x => !x.period!.current && recent.every(y => month(x.period!.end!) < month(y.period!.start!)));
  const experienceValue = (item: StructuredExperience): Value => ({ text: clean(item.role) || "Cargo não informado", detail: [clean(item.organization), clean(item.period), approximateDuration(documentedMonths([item.period], today))].filter(Boolean).join(" · ") });
  const latestAreas = chronologyKnown ? areas.filter(area => recent.some(x => explicitlyMentions(x.item, area))) : [];
  const context = chronologyKnown && !latestAreas.length ? recent.map(x => clean(x.item.description).split(/(?<=[.!?])\s+|\n/)[0]).filter(Boolean).join("\n") : "";
  const sourcesOf = (items: StructuredExperience[]) => items.map(item => ({ label: [item.role || "Experiência", item.organization].filter(Boolean).join(" · "), text: [item.period, item.description || item.role].filter(Boolean).join("\n") }));
  const areaSources = sourcesOf(experiences.filter(item => latestAreas.some(area => explicitlyMentions(item, area))));
  const education = profile?.education ?? [];
  const completed = education.filter(x => x.status === "completed" && supported(x, "status") && x.level && ranks[x.level] > 0 && supported(x, "level"));
  const qualificationsKnown = completed.filter(x => x.level === "postgraduate").every(x => supported(x, "qualification") && qualifiedRanks[x.qualification ?? ""]);
  const rank = (x: StructuredEducation) => ranks[x.level!] * 10 + (x.level === "postgraduate" && qualificationsKnown ? qualifiedRanks[x.qualification ?? ""] ?? 0 : 0);
  const highestRank = Math.max(...completed.map(rank)), highest = completed.filter(x => rank(x) === highestRank);
  const educationHeadline = unique(highest.map(x => ["undergraduate", "postgraduate"].includes(x.level!) && supported(x, "qualification") && x.qualification && !["unknown", "other"].includes(x.qualification) ? EDUCATION_QUALIFICATION_LABELS[x.qualification] : EDUCATION_LEVEL_LABELS[x.level!])).join(" · ");
  const uncertain = education.some(x => x.status === "unknown" || !x.status || x.status === "completed" && (!supported(x, "status") || !x.level || !supported(x, "level") || ranks[x.level] === 0));
  const organizations = unique(experiences.map(x => x.organization)), generalAreas = areas.filter(x => !latestAreas.includes(x));
  return [
    { id: "areas", title: "Áreas da experiência mais recente", values: latestAreas.map(text => ({ text, detail: "Atuação documentada: " + approximateDuration(documentedMonths(experiences.filter(x => explicitlyMentions(x, text)).map(x => x.period), today)).replace(/^Aproximadamente /, "aproximadamente ") })), ...(context ? { context } : {}), ...(generalAreas.length ? { additional: { title: "Áreas gerais declaradas no Perfil", values: generalAreas.map(text => ({ text })) } } : {}), note: latestAreas.length ? "Menções explícitas nas experiências; períodos sobrepostos contados uma vez." : chronologyKnown ? "A área ainda não foi vinculada com segurança a esta experiência. Tempo na área não determinado." : "Sem períodos suficientes para identificar a experiência mais recente e sua área.", sources: [...areaSources, ...(!latestAreas.length ? sourcesOf(recent.map(x => x.item)) : []), ...(areas.length ? [{ label: "Áreas gerais do Perfil", text: areas.join(" · ") }] : [])] },
    { id: "position", title: chronologyKnown ? current.length ? "Posição mais recente em andamento" : "Posição mais recente registrada" : "Experiências profissionais", values: recent.map(x => experienceValue(x.item)), ...(others.length ? { additional: { title: otherCurrent.length ? "Outra posição em andamento" : previous ? "Posição anterior" : "Outra experiência recente", values: others.map(x => experienceValue(x.item)) } } : {}), note: chronologyKnown ? "Períodos do Perfil publicado; “Atual” é informação declarada." : experiences.length ? "Há períodos incompletos ou futuros; a sequência não pode ser definida com segurança." : "Nenhuma experiência profissional foi informada.", sources: sourcesOf([...recent, ...others].map(x => x.item)) },
    { id: "education", title: uncertain ? "Maior formação com conclusão confirmada" : "Maior formação concluída", ...(highest.length ? { headline: educationHeadline } : {}), values: highest.map(x => ({ text: clean(x.course) || "Formação publicada", detail: [clean(x.institution), clean(x.period)].filter(Boolean).join(" · ") })), note: highest.length ? uncertain ? "Há outros registros sem informação suficiente sobre nível ou conclusão." : "Conclusão informada no Perfil aprovado" : education.length ? "Os registros disponíveis não confirmam uma formação concluída." : "Nenhuma formação foi informada.", sources: highest.map(x => ({ label: x.course || "Formação publicada", text: [x.institution, x.period, "Conclusão confirmada na revisão publicada"].filter(Boolean).join("\n") })) },
    { id: "organizations", title: "Empresas da trajetória", ...(organizations.length ? { headline: `${organizations.length} ${organizations.length === 1 ? "organização" : "organizações"}` } : {}), values: organizations.map(text => ({ text })), note: organizations.length ? "Organizações distintas das experiências publicadas" : "As organizações das experiências ainda não foram informadas.", sources: experiences.filter(x => clean(x.organization)).map(x => ({ label: x.organization!, text: [x.role, x.period].filter(Boolean).join(" · ") })) },
  ];
}
