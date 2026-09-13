export interface ProductMovementRelease {
  productGeneration: number;
  movement: number;
  deliveries: readonly string[];
}

// Append only deliveries accepted by the Product Owner. Fixes do not add entries.
export const PRISMA_RELEASE_HISTORY = [{
  productGeneration: 1,
  movement: 5,
  deliveries: [
    "M5: revisão de currículo com evidência espacial",
    "M5.1A: preparação da verificação de competências",
    "M5.1B: execução da verificação",
    "M5.1C: governança do Item Bank",
    "M5.2: normalização do Knowledge",
    "M5.3: resiliência operacional",
    "M5.4: Vagas e matching explicável",
    "M5.4.2: pesquisa Web contextual",
    "M5.4.4: resolução ocupacional por IA",
    "M5.5: exclusão definitiva de Pessoa",
    "M5.7: Parser IA local",
  ],
}] as const satisfies readonly ProductMovementRelease[];

export function calculateProductRelease(history: readonly ProductMovementRelease[]) {
  const current = history.at(-1);
  if (!current || !Number.isSafeInteger(current.productGeneration) || current.productGeneration < 1
    || !Number.isSafeInteger(current.movement) || current.movement < 1 || current.deliveries.length === 0
    || current.deliveries.some((name) => !name.trim()) || new Set(current.deliveries).size !== current.deliveries.length) {
    throw new Error("Invalid official product release registry");
  }
  const delivery = current.deliveries.length;
  const version = `${current.productGeneration}.${current.movement}.${delivery}`;
  return { productGeneration: current.productGeneration, movement: current.movement, delivery, version, displayVersion: `v${version}` };
}

export const PRISMA_RELEASE = calculateProductRelease(PRISMA_RELEASE_HISTORY);
