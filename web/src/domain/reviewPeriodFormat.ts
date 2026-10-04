import { parseResumeDate, parseResumePeriod } from "../../../src/domain/resumeDates.js";

export const REVIEW_FIELD_FORMAT_VERSION = "1.0.0";
export type ReviewPeriodProblem = "invalid_date" | "reversed" | "unrecognized" | "missing_start";
const current = /^(?:atual|presente|present|current|hoje|today|ate (?:o momento|hoje)|to date)$/;
const month = "(?:jan(?:eiro|uary)?|fev(?:ereiro)?|feb(?:ruary)?|mar(?:co|ch)?|abr(?:il)?|apr(?:il)?|mai(?:o)?|may|jun(?:ho|e)?|jul(?:ho|y)?|ago(?:sto)?|aug(?:ust)?|set(?:embro)?|sep(?:t(?:ember)?)?|out(?:ubro)?|oct(?:ober)?|nov(?:embro|ember)?|dez(?:embro)?|dec(?:ember)?)";
const dateShape = new RegExp(`^(?:\\d{4}-\\d{1,2}(?:-\\d{1,2})?|(?:\\d{1,2}[/-])?\\d{1,2}[/-](?:\\d{4}|\\d{2})|(?:\\d{1,2}\\s+)?${month}[ /-](?:\\d{4}|\\d{2})|\\d{4}|\\d{2})$`);
const normalized = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/(?<=\d)\.(?=\d)/g, "/").replace(/\./g, "").replace(/\s+de\s+/g, " ").replace(/\s+/g, " ").trim();

/** Presentation/approval diagnostic only. It never replaces or completes source dates. */
export function reviewPeriodProblem(input: string | null | undefined): ReviewPeriodProblem | null {
  if (!input?.trim() || input.trim().length > 160) return null; // Existing length gate reports oversized values.
  const text = normalized(input.trim().replace(/\s*\([^)]*\b(?:anos?|meses?|years?|months?)\b[^)]*\)\s*$/i, "").trim().replace(/^\((.*)\)$/, "$1"));
  // A complete date shape takes precedence over ISO internal range separators.
  if (dateShape.test(text) && !parseResumeDate(text)) return "invalid_date";
  const parsed = parseResumePeriod(input);
  if (parsed) return parsed.current && !parsed.start ? "missing_start" : null;
  for (const separator of text.matchAll(/\s+(?:a|ate|to)\s+|\s*[-–—]\s*/g)) {
    const left = text.slice(0, separator.index).trim();
    const right = text.slice(separator.index! + separator[0].length).trim();
    if (!dateShape.test(left) || !(dateShape.test(right) || current.test(right))) continue;
    const start = parseResumeDate(left, "start");
    const end = current.test(right) ? null : parseResumeDate(right, "end");
    if (!start || (!end && !current.test(right))) return "invalid_date";
    if (end && end.value.split("/").reverse().join("") < start.value.split("/").reverse().join("")) return "reversed";
  }
  return "unrecognized";
}

export const PERIOD_FORMAT_MESSAGES = {
  invalid_date: "Período: uma das datas não existe no calendário. Confira o dia, o mês e o ano; por exemplo, fevereiro não tem dia 31.",
  reversed: "Período: a data final está antes da inicial. Confira e corrija as duas datas.",
  unrecognized: "Não foi possível interpretar este período. Confira o texto no currículo; você pode usar, por exemplo, 2019–2023, 03/2022–Atual ou uma data completa. Se não houver informação suficiente, mantenha o que foi informado, sem inventar datas. Este aviso não impede salvar.",
  missing_start: "Foi informado apenas que o período é atual, sem a data inicial. Confira se o currículo informa quando começou; se não informar, mantenha esse dado ausente. Este aviso não impede salvar.",
} as const;
