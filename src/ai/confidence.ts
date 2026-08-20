import type { ConfidenceExplanation, Evidence } from "../domain/types.js";

export function explainConfidence(
  evidence: Evidence[],
  contradictionCount = 0,
): ConfidenceExplanation {
  const independentEvidenceCount = new Set(
    evidence.map((item) => `${item.documentId}:${item.locator.blockId}`),
  ).size;
  const contextualEvidenceCount = evidence.filter(
    (item) => item.kind === "experience" || item.kind === "professional_context",
  ).length;

  const reasons: string[] = [
    `${independentEvidenceCount} bloco(s) de evidência independente(s).`,
    `${contextualEvidenceCount} evidência(s) ligada(s) a contexto profissional.`,
  ];
  if (contradictionCount > 0) reasons.push(`${contradictionCount} contradição(ões) identificada(s).`);
  else reasons.push("Nenhuma contradição identificada na fonte processada.");

  if (contradictionCount === 0 && independentEvidenceCount >= 2 && contextualEvidenceCount >= 1) {
    return { level: "corroborated", independentEvidenceCount, contextualEvidenceCount, contradictionCount, reasons };
  }
  if (contradictionCount === 0 && (contextualEvidenceCount >= 1 || independentEvidenceCount >= 2)) {
    return { level: "supported", independentEvidenceCount, contextualEvidenceCount, contradictionCount, reasons };
  }
  return { level: "limited", independentEvidenceCount, contextualEvidenceCount, contradictionCount, reasons };
}
