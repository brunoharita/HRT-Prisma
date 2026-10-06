# Acordo — Comunicação visual Prisma v2.1.1

Versão 1.0.0. Congelado pela decisão explícita de Bruno em06/10/2026: “gostei da opção 4 também. pode alterar a comunicação visual da plataforma baseada nessa escolha. implementar e publicar na versão 2.1.1”. Registra a escolha já aprovada, sem propor decisão adicional.

## Referência e modelo visual

Normativa: `evidence/visual-option4-v211/approved-option4.png`, cópia integral da opção4 apresentada. Dados/pessoas/textos exemplificativos. Screenshot anterior é contraexemplo de hierarquia fraca. As demais opções não são alvo; nenhuma faixa escura da opção2 é introduzida.

Pessoa: identidade e ações no topo, seis abas, leitura principal aproximadamente72% e lateral operacional28% no desktop largo; quatro destaques alinhados, síntese inteira abaixo e oito análises abertas em duas colunas. Cards tonais azul-claro com borda azul perceptível, cantos16px, pequeno acento superior, símbolos32px sobre suporte56px; valores24–26px fortes, rótulos14–15px, detalhes14px, leitura16px, títulos de seção20–24px, identidade30–36px. Conteúdo define altura, sem cortes. Intermediário2x2; celular uma coluna, pendência antes da leitura, controles e abas acessíveis. Ícones semânticos consistentes, sem fotos/logos inventados.

Plataforma: a mesma escala, títulos reconhecíveis, símbolos de abertura de área e cards de indicadores/destaques tonais. Painéis de leitura/formulários continuam claros; azul identifica organização/ação, âmbar pendência, vermelho falha/destruição, verde confirmação. Sidebar institucional e identidade da marca preservadas, sem novas áreas ou funções.

## Requisitos

- D-UX-01: aplicar tipografia hierárquica e iconografia com presença aos componentes compartilhados e aberturas de áreas existentes da plataforma.
- D-UX-02: reproduzir a direção4 nos quatro destaques da Pessoa, preservando topologia, proporções, conteúdo integral, ordem e ações existentes; manter os oito eixos e fontes sob demanda.
- D-UX-03: usar superfícies tonais nos indicadores/destaques de Home/Pessoas e padrões equivalentes existentes, com painéis de leitura claros e estados semânticos distinguíveis.
- D-UX-04: preservar responsividade, zoom/reflow, nomes acessíveis, foco, controles, listas, formulários, diálogos e geometria das evidências/PDF.
- D-REL-05: registrar v2.1.1, validar proporcionalmente, integrar main, publicar somente destinos indicados no dispatcher e verificar produção/rollback/sincronização.
- P-01: proibido alterar fatos/cálculos, classificação, síntese/IA, matching, papéis, tenant, schemas, navegação/handlers ou dados humanos. Sem novo score, IA por visita, seleção humana automática, textos cortados ou dependência nova.
- F-01: redesign estrutural das jornadas, marca/login ilustrado, backend/SQL/Parser/Synthesis/Paddle, mudanças de regra e teste mutacional em Pessoas reais.
- A-UX-01: engenharia escolhe ícones da biblioteca já instalada, SVG simples quando necessário, tokens, CSS e pequenos ajustes de espaçamento coerentes com a referência. Conteúdo ilustrativo usa os cálculos existentes, sem alterar fatos para reproduzir números do bitmap.
- Q-01: nenhuma decisão material pendente; aprovação e publicação explícitas.

## Aceite

CA-01/D-UX-01,03: renders de páginas reais com adapters sintéticos (Home, Pessoas, Posições, Conhecimento, Configurações), títulos/indicadores legíveis, controles funcionais e sem erro/overflow em desktop/celular.

CA-02/D-UX-02: comparação visual identificada contra opção4, viewport/dados/estado equivalentes para a direção visual, quatro cards, escala e ícones medidos; render adicional com conteúdo longo. Textos exatos e durações da imagem são ilustrativos; diferença causada por cálculo real deve ser registrada.

CA-03/D-UX-04,P-01: regressão browser Pessoa, fontes/lazy/cache/zero geração, member/recruiter, dirty, erros locais, navegação/shell, formulário/revisão/evidência e teclado; tipos/build e testes dirigidos dos contratos afetados.

CA-04/D-REL-05: registry, Context Pack, CI, SHA/versão/assets servidos, saúde de web e preservação dos serviços; nenhum deploy sem indicação no plano.

## Mapa inicial de impacto e preservação

Baseline: main local b781870c5b4df0fe71ac6e1035290da2c620929e, v2.1.0; estado operacional será verificado antes do release. Classe C, apresentação transversal.

| Área/capacidade | Relação | Preservar / regressão prevista |
| --- | --- | --- |
| Tokens, CSS foundation, headings/cards/indicadores, páginas consumidoras | direct | Hierarquia nova; renders desktop/móvel, medidas/overflow e ações reais sintéticas |
| Pessoa, destaques, síntese e fontes | direct | Mesmos dados/ordem/4cards/8eixos; browser15cenários + comparação visual |
| Formulários/listas/revisão/diálogos/public surfaces | plausible_indirect | Controles, texto longo, foco, menus, estados; smoke sintético proporcional |
| Tenant/papéis/dirty/geom. evidência e seleções humanas | critical_transversal | Negativos existentes, fluxo Pessoa, revisão/evidência sem geometria CSS alterada |
| Registro/release web | direct |2.1.1, build/CI/rollback/assets/SHA/HTTP |
| SQL/IA/Parser/matching/Paddle | no_impact_identified | Apresentação apenas; diff/plano, testes contratuais existentes e serviços preservados |

Trabalho alheio não rastreado identificado no baseline permanece fora do movimento.
