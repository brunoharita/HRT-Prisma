import { difficultyOrder, type ContextualAssessmentQuestion, type DistributionSnapshot } from './positionAssessment.js';

type Requirement = { id: string; competencyKey: string };
export type GenerationPart = { requirementId: string; difficulty: 'easy' | 'medium' | 'hard'; quantity: number };

/** Deterministic bank assembly. Maximum flow covers requirements before filling quotas.
 * One catalog item may be compatible with several requirements, but is selected only once.
 * No IO or implicit AI invocation; unresolved quotas remain explicit deficits. */
export function assembleProcessAssessment<T extends ContextualAssessmentQuestion>(bank: readonly T[], requirements: readonly Requirement[], snapshot: DistributionSnapshot, organizationId: string, existing: readonly T[] = []): T[] {
  const eligible = bank.filter(q => q.organizationId === organizationId && q.source === 'bank' && q.provenance.method === 'approved-item-bank'
    && requirements.some(r => r.id === q.requirementId && r.competencyKey === q.competencyKey));
  const items = [...new Map(eligible.filter(q=>!existing.some(x=>x.id===q.id)).map(q => [q.id, q])).values()].sort((a, b) => a.id.localeCompare(b.id));
  const size = 2 + requirements.length + items.length + 3, source = size - 2, sink = size - 1;
  const edges: Array<Array<{ to: number; cap: number; reverse: number }>> = Array.from({ length: size }, () => []);
  const add = (a: number, b: number, cap: number) => { edges[a]!.push({ to: b, cap, reverse: edges[b]!.length }); edges[b]!.push({ to: a, cap: 0, reverse: edges[a]!.length - 1 }); };
  requirements.forEach((r, ri) => {
    add(source, ri, existing.some(q=>q.requirementId===r.id)?0:1);
    items.forEach((q, qi) => { if (eligible.some(x => x.id === q.id && x.requirementId === r.id)) add(ri, requirements.length + qi, 1); });
  });
  items.forEach((q, qi) => add(requirements.length + qi, requirements.length + items.length + difficultyOrder.indexOf(q.difficulty), 1));
  difficultyOrder.forEach((d, di) => add(requirements.length + items.length + di, sink, Math.max(0,snapshot.counts[d]-existing.filter(q=>q.difficulty===d).length)));
  while (true) {
    const path: Array<[number,number]> = Array.from({ length: size }, () => [-1, -1]), queue = [source]; path[source] = [source, -1];
    for (let i = 0; i < queue.length && path[sink]![0] === -1; i++) edges[queue[i]!]!.forEach((e, j) => {
      if (e.cap > 0 && path[e.to]![0] === -1) { path[e.to] = [queue[i]!, j]; queue.push(e.to); }
    });
    if (path[sink]![0] === -1) break;
    for (let n = sink; n !== source;) { const [from, index] = path[n]!, edge = edges[from]![index]!; edge.cap--; edges[n]![edge.reverse]!.cap++; n = from; }
  }
  const selected: T[] = [...existing];
  requirements.forEach((r, ri) => edges[ri]!.forEach(e => {
    if (e.to >= requirements.length && e.to < requirements.length + items.length && e.cap === 0) {
      const q = items[e.to - requirements.length]!; selected.push(eligible.find(x => x.id === q.id && x.requirementId === r.id)!);
    }
  }));
  // Reserve a slot for every uncovered requirement; bank counts alone cannot establish coverage.
  const missing = requirements.filter(r => !selected.some(q => q.requirementId === r.id)).length;
  for (const q of items) {
    if (selected.length >= snapshot.quantity - missing || selected.some(x => x.id === q.id)
      || selected.filter(x => x.difficulty === q.difficulty).length >= snapshot.counts[q.difficulty]) continue;
    const candidates = eligible.filter(x => x.id === q.id).sort((a, b) => selected.filter(x => x.requirementId === a.requirementId).length - selected.filter(x => x.requirementId === b.requirementId).length || a.requirementId.localeCompare(b.requirementId));
    selected.push(candidates[0]!);
  }
  return selected;
}

/** Only missing slots are proposed. Coverage is allocated first, then balanced by requirement. */
export function processAssessmentDeficit(snapshot: DistributionSnapshot, requirements: readonly Requirement[], questions: readonly ContextualAssessmentQuestion[]): GenerationPart[] {
  if (!requirements.length) throw Error('ASSESSMENT_REQUIREMENTS_REQUIRED');
  const missing = requirements.filter(r => !questions.some(q => q.requirementId === r.id));
  const counts = new Map(requirements.map(r => [r.id, questions.filter(q => q.requirementId === r.id).length]));
  const parts: GenerationPart[] = [];
  for (const difficulty of difficultyOrder) {
    const remaining = snapshot.counts[difficulty] - questions.filter(q => q.difficulty === difficulty).length;
    if (remaining < 0) throw Error('ASSESSMENT_QUOTA_EXCEEDED');
    for (let n = 0; n < remaining; n++) {
      const req = missing.shift() ?? [...requirements].sort((a, b) => counts.get(a.id)! - counts.get(b.id)! || a.id.localeCompare(b.id))[0]!;
      counts.set(req.id, counts.get(req.id)! + 1);
      const part = parts.find(p => p.requirementId === req.id && p.difficulty === difficulty);
      if (part) part.quantity++; else parts.push({ requirementId: req.id, difficulty, quantity: 1 });
    }
  }
  if (missing.length) throw Error('ASSESSMENT_COVERAGE_REQUIRES_REPLACEMENT');
  return parts;
}

export function splitGenerationParts(parts: readonly GenerationPart[], limit = 20): GenerationPart[][] {
  const chunks: GenerationPart[][] = []; let chunk: GenerationPart[] = [], total = 0;
  for (const part of parts) { let remaining = part.quantity;
    while (remaining > 0) {
      const take = Math.min(limit - total, remaining); chunk.push({ ...part, quantity: take }); remaining -= take; total += take;
      if (total === limit) { chunks.push(chunk); chunk = []; total = 0; }
    }
  }
  if (chunk.length) chunks.push(chunk); return chunks;
}
