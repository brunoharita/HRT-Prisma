import type { ExtractionDraft } from "../domain/types.js";
import { classifyEducationRecord } from "../domain/educationClassification.js";
import type { ExtractionProvider, ExtractionRequest, ExtractionResponse } from "./provider.js";

interface TextBlock {
  id: string;
  text: string;
  section: string;
}

interface CompetencyRule {
  normalizedName: string;
  pattern: RegExp;
}

const COMPETENCY_RULES: CompetencyRule[] = [
  { normalizedName: "Power BI", pattern: /\bpower\s*bi\b/i },
  { normalizedName: "Business Intelligence", pattern: /\bbusiness intelligence\b|(?<!power )\bbi\b/i },
  { normalizedName: "SQL", pattern: /\bsql\b/i },
  { normalizedName: "Tableau", pattern: /\btableau\b/i },
  { normalizedName: "Qlik", pattern: /\bqlik(?:view| sense)?\b/i },
  { normalizedName: "SAP", pattern: /\bsap\b/i },
  { normalizedName: "Python", pattern: /\bpython\b/i },
  { normalizedName: "Project Management", pattern: /\b(gest[aã]o de projetos|project management|pmo)\b/i },
  { normalizedName: "Project Leadership", pattern: /\b(lider(?:ei|ou|an[çc]a)|coordenei|coordena[çc][aã]o).{0,30}(projet|implant)/i },
  { normalizedName: "Process Improvement", pattern: /\b(melhoria de processos|lean|six sigma|bpm)\b/i },
  { normalizedName: "Data Analysis", pattern: /\b(an[aá]lise de dados|analis(?:ou|ando|a) dados|data analysis|analytics)\b/i },
  { normalizedName: "ETL", pattern: /\betl\b/i },
  { normalizedName: "Excel", pattern: /\bexcel\b/i },
  { normalizedName: "JavaScript", pattern: /\b(java ?script|typescript|node\.?(?:js)?)\b/i },
  { normalizedName: "Recruiting", pattern: /\b(recrutamento|recruiting|talent acquisition)\b/i },
  { normalizedName: "Industrial Operations", pattern: /\b(opera[çc][aã]o industrial|ch[aã]o de f[aá]brica|manufatura)\b/i },
];

const CONTEXT_RULES: CompetencyRule[] = [
  { normalizedName: "Industrial", pattern: /\b(ind[uú]stria|industrial|manufatura|f[aá]brica)\b/i },
  { normalizedName: "Construction", pattern: /\b(constru[çc][aã]o|obra|engenharia civil)\b/i },
  { normalizedName: "Retail", pattern: /\b(varejo|loja|retail)\b/i },
  { normalizedName: "Healthcare", pattern: /\b(sa[uú]de|hospital|healthcare)\b/i },
  { normalizedName: "Technology", pattern: /\b(tecnologia|software|sistemas|ti)\b/i },
  { normalizedName: "Logistics", pattern: /\b(log[ií]stica|supply chain|armaz[eé]m)\b/i },
];

const SECTION_ALIASES: Array<[RegExp, string]> = [
  [/^(resumo|objetivo|perfil|summary)\s*:?$/i, "summary"],
  [/^(experi[eê]ncia(?: profissional)?|hist[oó]rico profissional|experience)\s*:?$/i, "experience"],
  [/^(compet[eê]ncias|habilidades|skills|tecnologias)\s*:?$/i, "competencies"],
  [/^(educa[çc][aã]o|forma[çc][aã]o(?: acad[eê]mica)?|education)\s*:?$/i, "education"],
  [/^(certifica[çc][oõ]es|certifications)\s*:?$/i, "certifications"],
  [/^(idiomas|languages)\s*:?$/i, "languages"],
];

function cleanBullet(value: string): string {
  return value.replace(/^\s*[-*•]\s*/, "").trim();
}

function toBlocks(sourceText: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  let section = "header";
  for (const [index, rawLine] of sourceText.split(/\r?\n/).entries()) {
    const text = rawLine.trim();
    if (!text) continue;
    const sectionMatch = SECTION_ALIASES.find(([pattern]) => pattern.test(text));
    if (sectionMatch) {
      section = sectionMatch[1];
      continue;
    }
    blocks.push({ id: `line-${index + 1}`, text, section });
  }
  return blocks;
}

function uniqueByValue<T extends { value: string; sourceBlockId: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.value.toLocaleLowerCase("pt-BR")}:${item.sourceBlockId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseExperience(block: TextBlock): ExtractionDraft["experiences"][number] | null {
  const parts = cleanBullet(block.text).split("|").map((part) => part.trim());
  if (parts.length < 3) return null;
  const [organization, role, period, ...descriptionParts] = parts;
  if (!organization || !role || !period) return null;
  const dates = period.split(/\s+(?:a|até|to)\s+/i).map((part) => part.trim());
  return {
    organization,
    role,
    startDate: dates[0] ?? null,
    endDate: dates[1] ?? null,
    description: descriptionParts.join(" | ") || "Descrição não identificada.",
    sourceBlockId: block.id,
  };
}

function parseEducation(block: TextBlock): ExtractionDraft["education"][number] | null {
  const parts = cleanBullet(block.text).split("|").map((part) => part.trim());
  const [institution, course, status] = parts;
  if (!institution || !course) return null;
  const classification = classifyEducationRecord({ course, status: status || null, originalText: block.text });
  return {
    institution,
    ...classification,
    course: classification.course ?? course,
    sourceBlockId: block.id,
  };
}

function parseLanguage(block: TextBlock): ExtractionDraft["languages"][number] | null {
  const parts = cleanBullet(block.text).split("|").map((part) => part.trim());
  const [language, proficiency] = parts;
  if (!language) return null;
  return { language, proficiency: proficiency || null, sourceBlockId: block.id };
}

export class DeterministicExtractionProvider implements ExtractionProvider {
  public readonly name = "local-rules";
  public readonly model = "deterministic-local-1.0.0";

  public async extract(request: ExtractionRequest): Promise<ExtractionResponse> {
    const blocks = toBlocks(request.sourceText);
    const nameBlock = blocks.find((block) => /^(nome|name)\s*:/i.test(block.text));
    const fullName = nameBlock?.text.replace(/^(nome|name)\s*:\s*/i, "").trim() || null;

    const experiences = blocks
      .filter((block) => block.section === "experience")
      .map(parseExperience)
      .filter((value): value is NonNullable<typeof value> => value !== null);

    const education = blocks
      .filter((block) => block.section === "education")
      .map(parseEducation)
      .filter((value): value is NonNullable<typeof value> => value !== null);

    const languages = blocks
      .filter((block) => block.section === "languages")
      .map(parseLanguage)
      .filter((value): value is NonNullable<typeof value> => value !== null);

    const certifications = blocks
      .filter((block) => block.section === "certifications")
      .map((block) => ({ value: cleanBullet(block.text), sourceBlockId: block.id }));

    const explicitCompetencies = uniqueByValue(
      blocks.flatMap((block) =>
        COMPETENCY_RULES.filter((rule) => rule.pattern.test(block.text)).map((rule) => ({
          value: rule.normalizedName,
          sourceBlockId: block.id,
          context: block.section === "experience" ? cleanBullet(block.text) : null,
        })),
      ),
    );

    const professionalContexts = uniqueByValue(
      blocks.flatMap((block) =>
        CONTEXT_RULES.filter((rule) => rule.pattern.test(block.text)).map((rule) => ({
          value: rule.normalizedName,
          sourceBlockId: block.id,
        })),
      ),
    );

    const notIdentified: string[] = [];
    if (education.length === 0) notIdentified.push("education");
    if (languages.length === 0) notIdentified.push("languages");
    if (certifications.length === 0) notIdentified.push("certifications");

    const uncertainties: string[] = [];
    if (!fullName) uncertainties.push("A identidade básica não foi identificada com segurança.");
    if (experiences.length === 0) uncertainties.push("Nenhuma experiência foi extraída no formato estruturado esperado.");

    const draft: ExtractionDraft = {
      fullName,
      experiences,
      education,
      certifications,
      languages,
      explicitCompetencies,
      professionalContexts,
      customSections: [],
      uncertainties,
      notIdentified,
    };

    return {
      draft,
      usage: {
        provider: this.name,
        model: this.model,
        inputTokens: null,
        outputTokens: null,
        estimatedCostUsd: 0,
      },
    };
  }
}

export const deterministicCompetencyRules = COMPETENCY_RULES.map((rule) => rule.normalizedName);
