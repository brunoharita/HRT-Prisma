export interface ProductMovementRelease {
  productGeneration: number;
  movement: number;
  /** Explicit Product Owner convention for a movement launched at .0. */
  firstDeliveryNumber?: 0 | 1;
  deliveries: readonly string[];
  /** Numbers explicitly skipped by the Product Owner, never fictitious deliveries. */
  skippedDeliveryNumbers?: readonly number[];
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
}, {
  productGeneration: 1,
  movement: 6,
  deliveries: [
    "M6.1: pontuação determinística e explicável de matching",
    "M6.1.1: requisito conectado a evidência profissional explícita",
    "M6.2: jornada contextual de verificação",
    "M6.1.2: descoberta por trajetória em três grupos",
  ],
}, {
  productGeneration: 1,
  movement: 7,
  deliveries: [
    "M7.1: taxonomia profissional e inteligência de posições",
    "M7.2: perfil de competências e evidências",
    "M7.3: normalização de competências declaradas",
    "M7.4: curadoria contextual de competências",
    "M7.2 v2: taxonomia de competências e perfil de evidências",
    "M7.5: recuperação de cobertura de competências",
  ],
}, {
  productGeneration: 1,
  movement: 8,
  deliveries: [
    "M8.1: arquitetura sistêmica de competências",
    "M8.2: classificação global assistida de competências",
    "M8.3: interpretação versionada da trajetória no Score Prisma",
    "M8.4: dimensões temporais do Score Prisma",
  ],
}, {
  productGeneration: 2,
  movement: 0,
  deliveries: [
    "2.0.1: importação totalmente online na KVM2",
    "2.0.2: compatibilidade e recuperação das evidências de importação",
    "2.0.3: orientação clara para corrigir erros recuperáveis",
    "2.0.4: período de formação permanece acessível durante a revisão",
    "2.0.5: síntese profissional por IA, persistida e rastreável às fontes",
    "2.0.6: síntese resiliente com diagnóstico e recuperação controlada",
    "2.0.8: leitura integral do Resumo com fontes sob demanda",
    "2.0.9: vínculo de uma ou mais evidências sem justificativa obrigatória",
    "2.0.10: avisos com orientação e ação direta para corrigir pendências",
    "2.0.12: painel executivo com trajetória e destaques enriquecidos",
  ],
  skippedDeliveryNumbers: [7, 11],
}, {
  productGeneration: 2,
  movement: 1,
  firstDeliveryNumber: 0,
  deliveries: [
    "2.1.0: página unificada da Pessoa, leitura profissional e operações no mesmo contexto",
    "2.1.1: hierarquia visual, iconografia e destaques tonais em toda a plataforma",
    "2.1.2: curadoria de competências preservada por declaração e trecho original",
    "2.1.3: explicações e ajuda acessível nas opções de revisão de divergências",
    "2.1.4: Score persistido por Pessoa e Posição, com atualização causal e histórico",
    "2.1.6: carregamento visível em páginas, blocos e operações da plataforma",
    "2.1.7: revisão opcional de todas as divergências, com navegação item por item",
  ],
  skippedDeliveryNumbers: [5],
}, {
  productGeneration: 2,
  movement: 2,
  firstDeliveryNumber: 0,
  deliveries: [
    "2.2.0: acompanhamento Pessoa–Posição em Lista e Kanban, com arraste e histórico",
    "2.2.1: detalhes da Posição alinhados ao Perfil, com leitura principal e sidebar contextual",
  ],
}, {
  productGeneration: 2,
  movement: 3,
  firstDeliveryNumber: 0,
  deliveries: ["2.3.0: Avaliação para Posição, convites e histórico genérico de IA", "2.3.1: seta de retorno à tela anterior e atalhos de destino preservados", "2.3.2: prova comum por processo seletivo, montagem automática e convites em lote", "2.3.4: cards compactos de Pessoas e acompanhamento atual identificado", "2.3.5: identificação legível no Kanban e avaliação com seções guiadas 4A"],
  skippedDeliveryNumbers: [3],
} , {productGeneration:2,movement:4,firstDeliveryNumber:0,deliveries:["2.4.0: Tokens Prisma, franquia mensal, pacotes e gestão de consumo", "2.4.1: Foco operacional e acesso contextual a fontes, histórico e diagnóstico"]}, {productGeneration:2,movement:5,firstDeliveryNumber:0,deliveries:["2.5.0: Banco de questões, consulta completa e revisão humana contextual", "2.5.1: Questões aprovadas reutilizáveis no banco privado da empresa", "2.5.2: Atividade da avaliação legível e análise fundamentada por IA", "2.5.3: Sinais de seleção, cópia e menu de contexto durante a avaliação", "2.5.4: Resultado executivo da avaliação com agrupamentos e filtros", "2.5.5: Linha do tempo factual e marcos de resposta por questão"]}, {productGeneration:2,movement:6,firstDeliveryNumber:0,deliveries:["2.6.0: Processos seletivos separados de Posições, criação explícita e gestão própria", "2.6.1: Escolha no encerramento e histórico completo da participação no Perfil", "2.6.2: Tokens Prisma por origem, franquia no mês calendário e planejamento de uso"]}, {productGeneration:2,movement:7,firstDeliveryNumber:0,deliveries:["2.7.0: Tarifas por vigência, perfil manual estruturado e funcionário ativo auditado", "2.7.1: Candidato por participação ativa e Colaborador por vínculo confirmado", "2.7.2: Áreas, funções e filtros de Pessoas integrados ao Knowledge", "2.7.3: Rolagem completa e largura do editor manual de Perfil", "2.7.4: Áreas profissionais globais e locais, curadoria e seleção no Perfil", "2.7.5: Pessoas com cargo original, última empresa, cidade, data do Perfil e filtros reversíveis", "2.7.6: Tipografia e alinhamento uniformes na lista de Pessoas", "2.7.7: Processos em andamento por padrão e Visão Geral primeiro no Conhecimento", "2.7.8: Base visual compartilhada em todas as abas de Conhecimento"]}, { productGeneration: 2, movement: 8, firstDeliveryNumber: 0, deliveries: ["2.8.0: padronização visual de leitura e operação compacta", "2.8.1: decisões globais com justificativa opcional e preservação local"] }
, { productGeneration: 2, movement: 9, firstDeliveryNumber: 0, deliveries: ["2.9.0: administração multiempresa inspirada no Horus, quatro perfis e limites configuráveis"] }
, { productGeneration: 3, movement: 0, firstDeliveryNumber: 1, deliveries: ["3.0.1: Cadastrar Owner com identidade e escopo do novo grupo preenchidos e bloqueados", "3.0.2: grupos recolhíveis com resumos separados e empresas adaptadas ao celular", "3.0.3: ordenação de grupos e empresas por nome, criação e atualização", "3.0.4: requisitos de senha reativos com estados explícitos e campos bloqueados identificados", "3.0.5: mínimo de oito caracteres alinhado no cadastro e troca de senha", "3.0.6: username único com e-mail compartilhável e recuperação por conta", "3.0.7: ativação inicial e gestão segura do ciclo de vida do Owner"] }
, {productGeneration:3,movement:1,firstDeliveryNumber:0,deliveries:["3.1.0: descoberta, início operacional, Perfil, comparação, planejamento de Tokens e importação assistida em lote"]}
] as const satisfies readonly ProductMovementRelease[];

export function calculateProductRelease(history: readonly ProductMovementRelease[]) {
  const current = history.at(-1);
  if (!current || !Number.isSafeInteger(current.productGeneration) || current.productGeneration < 1
    || !Number.isSafeInteger(current.movement) || current.movement < 0 || current.deliveries.length === 0
    || current.deliveries.some((name) => !name.trim()) || new Set(current.deliveries).size !== current.deliveries.length) {
    throw new Error("Invalid official product release registry");
  }
  const skipped = current.skippedDeliveryNumbers ?? [];
  const first = current.firstDeliveryNumber ?? 1;
  if (first !== 0 && first !== 1) throw new Error("Invalid official product release number");
  const delivery = current.deliveries.length + skipped.length - (first === 0 ? 1 : 0);
  if (new Set(skipped).size !== skipped.length || skipped.some(number => !Number.isSafeInteger(number) || number < 1 || number >= delivery)) {
    throw new Error("Invalid official product release number");
  }
  const version = `${current.productGeneration}.${current.movement}.${delivery}`;
  return { productGeneration: current.productGeneration, movement: current.movement, delivery, version, displayVersion: `v${version}` };
}

export const PRISMA_RELEASE = calculateProductRelease(PRISMA_RELEASE_HISTORY);
