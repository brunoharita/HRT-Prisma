import type { TrajectoryActivity } from "../domain/semanticTrajectory.js";

/** Separate synthetic regression corpus. Never append to or relabel the original twelve cases. */
export const semanticComplexPilotLimitation = "Supplemental synthetic development corpus informed by the rubric and reported smoke failures; independently authored inputs, NOT an independent holdout. No real identity, expected winner, score or proof of generalization.";
export const semanticComplexPilotPosition = {
  title: "Desenvolvedor backend", mission: "Desenvolver serviços de servidor.", responsibilities: ["Implementar APIs."],
};
export const semanticComplexPilotArea = "Operações; Processos; Produtos Digitais; Dados; IA Aplicada";

type Variant = "plain" | "plural_titles" | "bullets" | "repetition" | "narrative";
interface Profile {
  professionalTitle: string;
  areasOfExpertise: string[];
  experiences: Array<{ role: string; description: string }>;
}
export interface SemanticComplexPilotCase { id: string; baseId: string; variant: Variant; profile: Profile }
interface ExperienceText { role: string; pluralRole: string; statements: string[]; narrative: string[] }

// Six experience entries plus title and area declarations = eight prepared entries per case.
// No identities, employers, schools, dates, expected categories or scores occur in these inputs.
const analyst: ExperienceText = { role: "Analista de sistema", pluralRole: "Analista de sistemas", statements: [], narrative: [] };
const shared: ExperienceText[] = [
  {
    role: "Diretor de tecnologia", pluralRole: "Diretor de tecnologias",
    statements: [
      "Liderei equipes de engenharia de software e organizei a distribuição das demandas de produtos digitais.",
      "Acompanhei propostas de arquitetura apresentadas pelos especialistas, a capacidade de atendimento e as prioridades discutidas com as áreas usuárias.",
      "Coordenei reuniões de planejamento, defini responsabilidades de gestão e acompanhei os indicadores de entrega e a comunicação entre equipes.",
      "A implementação de código, das APIs e dos serviços de servidor foi realizada pelos desenvolvedores; minha atuação nesse cargo foi de gestão, sem programação pessoal.",
    ],
    narrative: [
      "Minha responsabilidade era dirigir equipes de software, distribuir demandas de produtos digitais e alinhar prioridades com as áreas usuárias.",
      "Os especialistas apresentavam as propostas de arquitetura, enquanto eu acompanhava capacidade, indicadores, planejamento e comunicação entre equipes.",
      "Eu coordenava as responsabilidades gerenciais, mas não programava pessoalmente: os desenvolvedores implementavam o código, as APIs e os serviços de servidor.",
    ],
  },
  {
    role: "Recrutador de profissionais de software", pluralRole: "Recrutador de profissionais de sistemas de software",
    statements: [
      "Conduzi processos de recrutamento de profissionais para equipes de software, sem exercer as atividades técnicas dos cargos recrutados.",
      "Organizei agendas de entrevistas, consolidei informações fornecidas pelas lideranças requisitantes e acompanhei a comunicação com os participantes.",
      "As vagas mencionavam APIs, serviços de servidor e linguagens de programação como parte do trabalho dos profissionais que seriam contratados.",
      "Minha participação era selecionar e comunicar etapas do recrutamento, sem desenvolver sistemas, programar ou realizar análise técnica de software.",
    ],
    narrative: [
      "Trabalhei no recrutamento para equipes de software e organizei entrevistas e comunicação entre participantes e lideranças requisitantes.",
      "Consolidei as informações das vagas, que citavam APIs, serviços de servidor e linguagens usadas pelos profissionais a contratar.",
      "Essas eram atribuições dos cargos recrutados, não minhas: eu não desenvolvia sistemas, não programava e não fazia análise técnica de software.",
    ],
  },
  {
    role: "Coordenador de operações de armazém", pluralRole: "Coordenador de operações de armazéns",
    statements: [
      "Coordenei recebimento, armazenamento e expedição de mercadorias, com foco na organização física das rotinas do armazém.",
      "Distribuí equipes entre conferência, separação e carregamento, acompanhei inventários e tratei diferenças de quantidade encontradas na contagem.",
      "Ajustei o sequenciamento das atividades operacionais, acompanhei a disponibilidade de materiais e organizei a passagem de informações entre turnos.",
      "Os entregáveis dessa experiência eram rotinas de movimentação e controle físico de mercadorias, não desenvolvimento ou análise de sistemas de software.",
    ],
    narrative: [
      "Fui responsável pelas rotinas físicas de recebimento, armazenagem e expedição de mercadorias, organizando conferência, separação e carregamento.",
      "Acompanhei inventários e diferenças de contagem, a disponibilidade de materiais, o sequenciamento das atividades e a comunicação entre turnos.",
      "Minha entrega nessa experiência era o controle físico e a movimentação de mercadorias; não era desenvolvimento nem análise de sistemas de software.",
    ],
  },
  {
    role: "Consultor", pluralRole: "Consultor",
    statements: [
      "Atuação em iniciativas de transformação e apoio à organização de demandas, conforme o contexto de cada projeto.",
      "O registro menciona participação em reuniões, acompanhamento de encaminhamentos e preparação de materiais de apoio.",
      "As descrições disponíveis não especificam o domínio profissional, os métodos utilizados ou a natureza dos entregáveis produzidos.",
      "Não há detalhamento suficiente neste registro para identificar que atividade técnica foi realizada pessoalmente nessa experiência.",
    ],
    narrative: [
      "Prestei consultoria em iniciativas de transformação e organização de demandas e participei de reuniões e encaminhamentos.",
      "O relato inclui materiais de apoio, mas não detalha o domínio profissional, os métodos nem a natureza dos entregáveis.",
      "A atividade técnica realizada pessoalmente nessa experiência não está especificada no registro disponível.",
    ],
  },
];

const bases: Array<{ id: string; anchor: ExperienceText }> = [
  { id: "complex_title_programming", anchor: {
    role: "Programador de sistema", pluralRole: "Programador de sistemas", statements: [], narrative: [],
  } },
  { id: "complex_management_only", anchor: {
    role: "Gerente de desenvolvimento de software", pluralRole: "Gerente de desenvolvimento de sistemas de software",
    statements: ["Gerenciei a equipe que programava os sistemas de software.", "Nessa experiência, não escrevi código nem implementei pessoalmente APIs ou serviços de servidor."],
    narrative: ["Minha atuação foi gerenciar desenvolvedores de sistemas de software, sem escrever código, implementar APIs ou programar serviços de servidor pessoalmente."],
  } },
  { id: "complex_explicit_backend", anchor: {
    role: "Desenvolvedor backend", pluralRole: "Desenvolvedor de serviços backend",
    statements: ["Implementei pessoalmente APIs e serviços de servidor.", "Escrevi o código de validação das requisições e os testes automatizados das respostas.", "Essa execução pertence a uma experiência anterior à atuação em gestão descrita nos demais cargos."],
    narrative: ["Em uma experiência anterior aos cargos de gestão, programei pessoalmente APIs e serviços de servidor, incluindo validação das requisições e testes automatizados das respostas."],
  } },
];

const variants: Variant[] = ["plain", "plural_titles", "bullets", "repetition", "narrative"];
function profileFor(anchor: ExperienceText, variant: Variant): Profile {
  return {
    professionalTitle: "Diretor de tecnologia",
    areasOfExpertise: semanticComplexPilotArea.split("; "),
    experiences: [analyst, anchor, ...shared].map(item => {
      const statements = variant === "narrative" ? item.narrative : item.statements;
      const text = statements.join(" ");
      return {
        role: variant === "plural_titles" ? item.pluralRole : item.role,
        description: variant === "bullets" ? statements.map(statement => `• ${statement}`).join("\n")
          : variant === "repetition" && text ? [text, text, text].join("\n") : text,
      };
    }),
  };
}

/** Three factual bases, five realizations including plain, two fresh readings: 30 calls/model. */
export const semanticComplexPilotCases: SemanticComplexPilotCase[] = bases.flatMap(base => variants.map(variant => ({
  id: `${base.id}.${variant}`, baseId: base.id, variant, profile: profileFor(base.anchor, variant),
})));

// LOCAL oracle: never sent in a request, prompt, feedback or retry. No ranking oracle.
const sharedClasses: Record<string, TrajectoryActivity> = {
  e0: "software_analysis", e2: "software_leadership", e3: "software_context", e4: "other", e5: "unclear",
  title: "software_leadership", area: "software_context",
};
export const semanticComplexPilotExpectations: Record<string, { classes: Record<string, TrajectoryActivity>; grounding: string }> = {
  complex_title_programming: {
    classes: { ...sharedClasses, e1: "software_execution" },
    grounding: "Explicit systems-analyst and programmer titles preserve their activity under singular/plural changes. Programming does not imply backend specialization. Mixed domains remain a contextual declaration, not performed work.",
  },
  complex_management_only: {
    classes: { ...sharedClasses, e1: "software_leadership" },
    grounding: "Managing programmers with explicit absence of personal programming is leadership, even amid repeated references to APIs and software. The systems-analyst experience remains analysis.",
  },
  complex_explicit_backend: {
    classes: { ...sharedClasses, e1: "backend_execution" },
    grounding: "Personal implementation of server APIs is explicit and survives later management roles. Length, repeated bullets, declarations and generic consulting cannot upgrade other entries or establish a winner.",
  },
};
