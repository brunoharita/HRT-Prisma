export interface ResumeIdentitySource {
  pageNumber: number;
  text: string;
}

export interface ResumeIdentity {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  namePage: number | null;
  emailPage: number | null;
  phonePage: number | null;
}

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_PATTERN = /(?:\+?55\s*)?(?:\(?\d{2}\)?[\s.-]*)?(?:9\s*)?\d{4}[\s.-]*\d{4}\b/;
const HEADING_PATTERN = /^(curr[ií]culo|resume|resumo|perfil|dados pessoais|contato|objetivo|experi[eê]ncia|forma[cç][aã]o)\b/i;
const NAME_PATTERN = /^[\p{L}][\p{L}'’-]+(?:\s+(?:da|de|do|das|dos|e|[\p{L}][\p{L}'’-]+)){1,6}$/u;

export function extractResumeIdentity(pages: readonly ResumeIdentitySource[]): ResumeIdentity {
  const orderedPages = [...pages].sort((left, right) => left.pageNumber - right.pageNumber);
  let fullName: string | null = null;
  let email: string | null = null;
  let phone: string | null = null;
  let namePage: number | null = null;
  let emailPage: number | null = null;
  let phonePage: number | null = null;

  for (const page of orderedPages) {
    if (!email) {
      const match = page.text.match(EMAIL_PATTERN)?.[0];
      if (match) {
        email = normalizeResumeEmail(match);
        emailPage = page.pageNumber;
      }
    }
    if (!phone) {
      const match = page.text.match(PHONE_PATTERN)?.[0];
      if (match) {
        phone = normalizeResumePhone(match);
        phonePage = page.pageNumber;
      }
    }
    if (!fullName) {
      const candidates = page.text
        .split(/\r?\n|\s{3,}/)
        .map((value) => value.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, 18);
      const match = candidates.find(isPlausibleName);
      if (match) {
        fullName = normalizeResumeName(match);
        namePage = page.pageNumber;
      }
    }
    if (fullName && email && phone) break;
  }

  return { fullName, email, phone, namePage, emailPage, phonePage };
}

export function normalizeResumeName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeResumeEmail(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  return EMAIL_PATTERN.test(normalized) ? normalized : null;
}

export function normalizeResumePhone(value: string): string | null {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits.length >= 12 && digits.length <= 15 ? `+${digits}` : null;
}

export function hasMinimumResumeIdentity(identity: Pick<ResumeIdentity, "fullName" | "email" | "phone">): boolean {
  return Boolean(identity.fullName && (identity.email || identity.phone));
}

function isPlausibleName(value: string): boolean {
  if (value.length < 5 || value.length > 120 || HEADING_PATTERN.test(value)) return false;
  if (value.includes("@") || /\d/.test(value) || !NAME_PATTERN.test(value)) return false;
  const meaningfulWords = value.split(" ").filter((word) => !/^(da|de|do|das|dos|e)$/i.test(word));
  return meaningfulWords.length >= 2;
}
