/** Civil dates from resumes, independent of audit timestamps and time zones. */
export const RESUME_DATE_METHOD_VERSION = "resume-dates-1.0.0";

export interface ResumeDate {
  value: string;
  year: number;
  month: number;
  day: number;
  inferred: Array<"month" | "day">;
  originalText: string;
}

export interface ResumePeriod {
  value: string;
  originalText: string;
  start: ResumeDate | null;
  end: ResumeDate | null;
  current: boolean;
  isRange: boolean;
  methodVersion: typeof RESUME_DATE_METHOD_VERSION;
}

const months = [
  "jan(?:eiro|uary)?", "(?:fev(?:ereiro)?|feb(?:ruary)?)", "mar(?:co|ch)?",
  "(?:abr(?:il)?|apr(?:il)?)", "(?:mai(?:o)?|may)", "jun(?:ho|e)?", "jul(?:ho|y)?",
  "(?:ago(?:sto)?|aug(?:ust)?)", "(?:set(?:embro)?|sep(?:t(?:ember)?)?)",
  "(?:out(?:ubro)?|oct(?:ober)?)", "nov(?:embro|ember)?", "(?:dez(?:embro)?|dec(?:ember)?)",
];
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const currentPattern = /^(?:atual|presente|present|current|hoje|today|ate (?:o momento|hoje)|to date)$/;
const dayMs = 86_400_000;
const namedMonth = `(?:${months.join("|").replace("co|ch", "[cç]o|ch")})\\.?`;
const dateToken = `(?:\\d{4}-\\d{1,2}(?:-\\d{1,2})?|(?:\\d{1,2}[/-])?\\d{1,2}[/-]\\d{4}|(?:\\d{1,2}\\s+(?:de\\s+)?)?${namedMonth}(?:\\s+(?:de\\s+)?|[/-])\\d{4}|\\d{4})`;
export const RESUME_PERIOD_PATTERN = new RegExp(`\\b${dateToken}\\s*(?:a|at[eé]|to|[-–—])\\s*(?:atual|presente|present|current|hoje|today|${dateToken})\\b`, "i");

export function parseResumeDate(input: string, boundary: "single" | "start" | "end" = "single"): ResumeDate | null {
  const text = normalize(input).replace(/(?<=\d)\.(?=\d)/g, "/").replace(/\./g, "").replace(/\s+de\s+/g, " ").replace(/\s+/g, " ");
  let year: number;
  let month: number | undefined;
  let day: number | undefined;
  let match: RegExpMatchArray | null;
  if ((match = text.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/))) {
    year = Number(match[1]); month = Number(match[2]); day = match[3] ? Number(match[3]) : undefined;
  } else if ((match = text.match(/^(?:(\d{1,2})[/-])?(\d{1,2})[/-](\d{4})$/))) {
    year = Number(match[3]); month = Number(match[2]); day = match[1] ? Number(match[1]) : undefined;
  } else if ((match = text.match(/^(?:(\d{1,2})\s+)?([a-z]+)[ /-](\d{4})$/))) {
    year = Number(match[3]); month = months.findIndex((pattern) => new RegExp(`^${pattern}$`).test(match![2]!)) + 1;
    day = match[1] ? Number(match[1]) : undefined;
  } else if (/^\d{4}$/.test(text)) {
    year = Number(text);
  } else return null;
  if (year < 1000 || year > 9999 || (month !== undefined && (month < 1 || month > 12))) return null;
  const inferred: ResumeDate["inferred"] = [];
  if (month === undefined) { month = boundary === "end" ? 12 : 1; inferred.push("month"); }
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day === undefined) { day = boundary === "end" ? lastDay : 1; inferred.push("day"); }
  if (day < 1 || day > lastDay) return null;
  return { year, month, day, value: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`, inferred, originalText: input };
}

export function parseResumePeriod(input: string | null | undefined): ResumePeriod | null {
  if (!input?.trim()) return null;
  // LinkedIn appends a redundant duration; dates remain the authority for calculations.
  const text = input.trim().replace(/\s*\([^)]*\b(?:anos?|meses?|years?|months?)\b[^)]*\)\s*$/i, "").trim().replace(/^\((.*)\)$/, "$1").trim();
  const base = { originalText: input, methodVersion: RESUME_DATE_METHOD_VERSION } as const;
  if (currentPattern.test(normalize(text))) return { ...base, value: "Atual", start: null, end: null, current: true, isRange: false };
  const single = parseResumeDate(text);
  if (single) return { ...base, value: single.value, start: single, end: null, current: false, isRange: false };
  // Try each separator: hyphens inside ISO dates must not become range boundaries.
  for (const match of text.matchAll(/\s+(?:a|at[eé]|to)\s+|\s*[-–—]\s*/gi)) {
    const left = text.slice(0, match.index).trim();
    const right = text.slice(match.index! + match[0].length).trim();
    const start = parseResumeDate(left, "start");
    if (!start) continue;
    const current = currentPattern.test(normalize(right));
    const end = current ? null : parseResumeDate(right, "end");
    if (!current && !end) continue;
    if (end && civilDay(end) < civilDay(start)) return null;
    return { ...base, value: `${start.value} - ${current ? "Atual" : end!.value}`, start, end, current, isRange: true };
  }
  return null;
}

export function resumePeriodDurationDays(input: string | null | undefined, today = new Date()): number | null {
  const period = parseResumePeriod(input);
  if (!period?.isRange || !period.start || (!period.end && !period.current) || !Number.isFinite(today.getTime())) return null;
  const end = period.current
    ? Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / dayMs
    : civilDay(period.end!);
  const duration = end - civilDay(period.start);
  return duration < 0 ? null : duration;
}

function civilDay(date: ResumeDate): number { return Date.UTC(date.year, date.month - 1, date.day) / dayMs; }
