import type {
  CustomProfileSection,
  CustomProfileSectionFormat,
  StructuredDraft,
} from "./personIngestion.js";

export const CUSTOM_PROFILE_SECTION_CONTRACT_VERSION = "1.0.0";
export const CUSTOM_PROFILE_SECTION_METHOD_VERSION = "prisma-custom-section-learning-v1";
export const CUSTOM_PROFILE_SECTION_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{7,79}$/;

export interface LearnedCustomSectionDefinition {
  sectionKey: string;
  displayName: string;
  normalizedName: string;
  format: CustomProfileSectionFormat;
  confirmationCount: number;
  methodVersion: string;
}

const RESERVED_SECTION_NAMES = new Set([
  "certificacoes",
  "competencias",
  "competencias chave",
  "educacao",
  "experiencia",
  "experiencia profissional",
  "formacao",
  "formacao academica",
  "idiomas",
  "incertezas",
  "nao identificados",
  "pendencias de interpretacao",
  "informacoes nao localizadas",
  "resumo",
  "resumo profissional",
]);

export function normalizeCustomSectionName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[:|]+$/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

export function validateCustomSectionName(name: string, sections: CustomProfileSection[], ignoredId?: string): string | null {
  const trimmed = name.trim();
  const normalized = normalizeCustomSectionName(trimmed);
  if (trimmed.length < 2 || trimmed.length > 80) return "Use um nome entre 2 e 80 caracteres.";
  if (!normalized) return "Informe um nome reconhecível para a área.";
  if (RESERVED_SECTION_NAMES.has(normalized)) return "Este nome pertence a uma área canônica do Prisma.";
  if (sections.some((section) => section.id !== ignoredId && normalizeCustomSectionName(section.name) === normalized)) {
    return "Já existe uma área personalizada com este nome.";
  }
  return null;
}

export function createCustomSectionId(name: string, existingIds: string[] = []): string {
  const base = stableCustomSectionKey(name);
  if (!existingIds.includes(base)) return base;
  let suffix = 2;
  while (existingIds.includes(`${base}_${suffix}`)) suffix += 1;
  return `${base}_${suffix}`;
}

export function createCustomSectionItemId(existingIds: string[] = []): string {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replace(/-/g, "")
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  let candidate = `item_${random}`.slice(0, 80);
  while (existingIds.includes(candidate)) candidate = `${candidate.slice(0, 72)}_${Math.random().toString(36).slice(2, 8)}`;
  return candidate;
}

export function createCustomSection(input: {
  draft: StructuredDraft;
  name: string;
  format: CustomProfileSectionFormat;
  value: string;
  source: CustomProfileSection["source"];
  sectionId?: string;
  itemId?: string;
}): { draft: StructuredDraft; fieldPath: string } {
  if (input.draft.customSections.length >= 50) throw new Error("O perfil atingiu o limite de 50 áreas personalizadas.");
  if (!input.value.trim() || input.value.trim().length > 4000) throw new Error("O conteúdo deve ter entre 1 e 4.000 caracteres.");
  const validationError = validateCustomSectionName(input.name, input.draft.customSections);
  if (validationError) throw new Error(validationError);
  const sectionId = input.sectionId ?? createCustomSectionId(input.name, input.draft.customSections.map((section) => section.id));
  const itemId = input.itemId ?? createCustomSectionItemId();
  const section: CustomProfileSection = {
    id: sectionId,
    name: input.name.trim(),
    format: input.format,
    source: input.source,
    items: [{ id: itemId, value: input.value.trim() }],
  };
  return {
    draft: { ...input.draft, customSections: [...input.draft.customSections, section] },
    fieldPath: customSectionItemFieldPath(sectionId, itemId),
  };
}

export function addCustomSectionItem(draft: StructuredDraft, sectionId: string, value: string): { draft: StructuredDraft; fieldPath: string } {
  const section = draft.customSections.find((candidate) => candidate.id === sectionId);
  if (!section) throw new Error("A área personalizada selecionada não existe mais.");
  if (section.format === "text" && section.items.length > 0) throw new Error("Áreas de texto possuem um único conteúdo. Edite o item existente.");
  if (section.items.length >= 100) throw new Error("A área atingiu o limite de 100 itens.");
  const normalizedValue = value.trim();
  if (!normalizedValue || normalizedValue.length > 4000) throw new Error("O conteúdo deve ter entre 1 e 4.000 caracteres.");
  if (section.items.some((item) => item.value.trim().toLocaleLowerCase("pt-BR") === normalizedValue.toLocaleLowerCase("pt-BR"))) {
    throw new Error("Este conteúdo já existe na área selecionada.");
  }
  const itemId = createCustomSectionItemId(section.items.map((item) => item.id));
  return {
    draft: {
      ...draft,
      customSections: draft.customSections.map((candidate) => candidate.id === sectionId
        ? { ...candidate, items: [...candidate.items, { id: itemId, value: normalizedValue }] }
        : candidate),
    },
    fieldPath: customSectionItemFieldPath(sectionId, itemId),
  };
}

export function customSectionItemFieldPath(sectionId: string, itemId: string): string {
  return `customSections.${sectionId}.items.${itemId}.value`;
}

export function parseCustomSectionItemFieldPath(fieldPath: string): { sectionId: string; itemId: string } | null {
  const match = /^customSections\.([a-z0-9][a-z0-9_-]{7,79})\.items\.([a-z0-9][a-z0-9_-]{7,79})\.value$/.exec(fieldPath);
  return match ? { sectionId: match[1]!, itemId: match[2]! } : null;
}

export function updateCustomSectionItemValue(draft: StructuredDraft, fieldPath: string, value: string): StructuredDraft {
  const parsed = parseCustomSectionItemFieldPath(fieldPath);
  if (!parsed) return draft;
  return {
    ...draft,
    customSections: draft.customSections.map((section) => section.id === parsed.sectionId
      ? { ...section, items: section.items.map((item) => item.id === parsed.itemId ? { ...item, value } : item) }
      : section),
  };
}

export function stableCustomSectionKey(name: string): string {
  const normalized = normalizeCustomSectionName(name);
  const slug = normalized.replace(/\s+/g, "_").slice(0, 40).replace(/_+$/g, "") || "section";
  return `custom_${slug}_${stableToken(normalized)}`;
}

function stableToken(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(8, "0");
}
