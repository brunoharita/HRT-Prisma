// Human decisions are an explicit input. Neither parser nor model generates an approved reference.
const normalized = (value) => String(value).normalize("NFKC").replace(/\s+/g, " ").trim();

export function draftFacts(draft) {
  const facts = [];
  const add = (id, field, value) => { if (typeof value === "string" && value.trim()) facts.push({ id, field, value }); };
  for (const key of ["professionalTitle", "summary"]) add(key, key, draft[key]);
  add("identity.fullName", "identity.fullName", draft.identity?.fullName);
  for (const key of ["city", "state", "phone", "email", "linkedin"]) add(`contact.${key}`, `contact.${key}`, draft.contact?.[key]);
  for (const [kind, fields] of [["experiences", ["role", "organization", "period", "description"]], ["education", ["institution", "course", "period"]]]) {
    for (const record of draft[kind] ?? []) for (const field of fields) add(`${kind}.${record.id}.${field}`, `${kind}.*.${field}`, record[field]);
  }
  for (const kind of ["certifications", "languages", "competencies"]) (draft[kind] ?? []).forEach((item, index) => add(`${kind}.${index}`, `${kind}.*`, item));
  return facts;
}

export function humanReviewTemplate(sourceSha256, implementationSha256) {
  return { version: 1, sourceSha256, implementationSha256, approvedBy: null, approvedAt: null, humanApproved: false, expectedFacts: [], decisions: [], reviewMs: null, instruction: "Primeiro registrar fatos esperados lendo a fonte original, com IDs próprios por registro e página/trecho. Depois mapear observedId de cada proposta para expectedId, ou null quando sem suporte. Julgar associação e evidência separadamente. Não copiar a saída do parser como referência correta. Aprovação e tempo são humanos." };
}

export function scoreHumanReview(reference, observed, binding) {
  if (reference?.humanApproved !== true) return { status: "NOT TESTED", reason: "human_reference_missing", metrics: null };
  if (reference.version !== 1 || reference.sourceSha256 !== binding.sourceSha256 || reference.implementationSha256 !== binding.implementationSha256 || typeof reference.approvedBy !== "string" || !reference.approvedBy.trim() || !Number.isFinite(Date.parse(reference.approvedAt)) || !Array.isArray(reference.expectedFacts) || !Array.isArray(reference.decisions)) throw new Error("INVALID_HUMAN_REFERENCE");
  const expected = new Map();
  for (const fact of reference.expectedFacts) {
    if (typeof fact.id !== "string" || !fact.id || expected.has(fact.id) || typeof fact.value !== "string" || !fact.value.trim() || typeof fact.field !== "string" || !fact.field || !Number.isInteger(fact.pageNumber) || fact.pageNumber < 1 || typeof fact.quote !== "string" || !fact.quote.trim()) throw new Error("INVALID_EXPECTED_FACT");
    expected.set(fact.id, fact);
  }
  const actual = new Map(observed.map((fact) => [fact.id, fact]));
  if (actual.size !== observed.length) throw new Error("DUPLICATE_OBSERVED_FACT");
  const seen = new Set();
  const mapped = new Set();
  let correct = 0; let incorrectValues = 0; let incorrectAssociations = 0; let unsupported = 0; let correctEvidence = 0; let evidenceJudged = 0;
  for (const decision of reference.decisions) {
    const fact = actual.get(decision.observedId);
    if (!fact || seen.has(decision.observedId) || ![true, false].includes(decision.associationCorrect) || ![true, false, null].includes(decision.evidenceCorrect)) throw new Error("INVALID_DECISION");
    seen.add(decision.observedId);
    if (decision.evidenceCorrect !== null) { evidenceJudged += 1; if (decision.evidenceCorrect) correctEvidence += 1; }
    if (decision.expectedId === null) { unsupported += 1; continue; }
    const truth = expected.get(decision.expectedId);
    if (!truth || mapped.has(decision.expectedId)) throw new Error("INVALID_ASSOCIATION");
    mapped.add(decision.expectedId);
    const sameValue = normalized(truth.value) === normalized(fact.value);
    const association = decision.associationCorrect && truth.field === fact.field;
    if (sameValue && association) correct += 1;
    if (!sameValue) incorrectValues += 1;
    if (!association) incorrectAssociations += 1;
  }
  if (seen.size !== actual.size) throw new Error("INCOMPLETE_HUMAN_REVIEW");
  if (reference.reviewMs !== null && (!Number.isFinite(reference.reviewMs) || reference.reviewMs <= 0)) throw new Error("INVALID_REVIEW_TIME");
  const ratio = (a, b) => b ? a / b : null;
  return { status: "measured_not_cutover_approval", metrics: { expectedFields: expected.size, observedFields: actual.size, correctFields: correct, omittedFields: expected.size - mapped.size, incorrectValues, incorrectAssociations, unsupportedFacts: unsupported, factualRecall: ratio(correct, expected.size), factualPrecision: ratio(correct, actual.size), evidenceCorrect: correctEvidence, evidenceJudged, evidenceTotal: actual.size, evidenceCorrectRate: evidenceJudged === actual.size ? ratio(correctEvidence, actual.size) : null, fieldsNeedingIntervention: actual.size - correct + expected.size - mapped.size, reviewMs: reference.reviewMs } };
}
