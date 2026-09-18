# Contrato de Acordos — Fidelidade a referências visuais em prompts

Versão: 1.0.0. Estado: **agreed**. Product Owner: Bruno. Aprovação: solicitação explícita de 2026-09-18 para tornar a regra uma diretriz do agente e da fonte de conhecimento usada pelo GPT do Prisma, aplicável à criação ou alteração de telas e elementos visuais.

Owner de produto: `docs/product/ux-foundation.md`, contrato `prisma-ux-foundation-1.1.0`. Decisão arquitetural: ADR-061. Esta regra é transversal e complementa, sem reabrir, `docs/qa/agreement-ux-foundation.md` 1.0.0.

Supersessão explícita: quando houver referência visual normativa, D-UX-04 e A-UX-02 deste contrato limitam A-01 e A-02 do acordo `agreement-ux-foundation` 1.0.0. A autonomia anterior sobre distribuição e detalhes visuais continua válida apenas sem referência normativa ou dentro da arquitetura visual acordada. Nenhum outro requisito do acordo anterior é alterado.

## DEVE — Inegociável e critérios de aceite

| ID | Decisão aprovada | Critério de aceite |
| --- | --- | --- |
| D-UX-01 | Toda referência visual usada como orientação deve ser classificada como alvo normativo, inspiração, contraexemplo ou exemplo de conteúdo. | CA-UX-01: o contrato/prompt declara a classificação; na ausência de indicação contrária do PO, a imagem do resultado planejado é normativa para arquitetura visual e ilustrativa para dados. |
| D-UX-02 | O prompt deve decompor o alvo em topologia, hierarquia, proporções, agrupamentos, densidade, alinhamentos, ordem, ações, estados e transformação responsiva. | CA-UX-02: o prompt contém requisitos visuais verificáveis e não apenas uma lista funcional. |
| D-UX-03 | A arquitetura visual normativa deve virar requisitos `D-UX-*`, proibições `P-UX-*`, autonomia `A-UX-*`, pendências `Q-UX-*` e aceites `CA-UX-*`. | CA-UX-03: os templates e a orientação do agente exigem a classificação; dúvida material bloqueia o prompt final. |
| D-UX-04 | “Não copiar literalmente” permite adaptar conteúdo ilustrativo, dados reais, componentes acessíveis, tokens e acabamento, sem autorizar uma composição materialmente diferente. | CA-UX-04: a diretriz preserva topologia, hierarquia, proporções relativas, agrupamentos, densidade, ordem e posição relativa das ações. |
| D-UX-05 | A implementação visual deve ser comparada com a referência no mesmo estado, com dados equivalentes e no mesmo viewport, além dos viewports responsivos aplicáveis. | CA-UX-05: o AoT identifica referência e render, compara a estrutura e registra divergências e autorização; teste funcional isolado não conta como prova visual. |
| D-UX-06 | A regra deve existir no contrato do agente, no owner de UX e na fonte compacta gerada usada pelo GPT, sem criar fonte manual concorrente. | CA-UX-06: `AGENTS.md`, `ux-foundation.md`, templates, gerador, checker e teste de Context Pack preservam a regra; `FONTE_GPT_PRISMA.md` e `TUDO_SOBRE_PRISMA.md` são regenerados. |

## PROIBIDO

- P-UX-01: interpretar “não copiar literalmente” como liberdade para trocar layout, hierarquia, proporções, agrupamentos, densidade, ordem ou posição das ações.
- P-UX-02: transformar textos, nomes, avatares, números ou registros ilustrativos da imagem em requisitos de produto sem decisão explícita.
- P-UX-03: declarar fidelidade visual apenas com typecheck, teste funcional, presença de componentes ou descrição textual.
- P-UX-04: editar manualmente os artefatos gerados `FONTE_GPT_PRISMA.md` ou `TUDO_SOBRE_PRISMA.md`.
- P-UX-05: esconder conflito com domínio, segurança, acessibilidade, dados reais ou componente obrigatório; o conflito deve ser exposto para decisão.

## FORA DE ESCOPO

- F-UX-01: redesenhar ou corrigir retroativamente telas existentes, inclusive o Movimento 7.1.
- F-UX-02: alterar schema, Supabase, runtime de IA, modelo, aplicação web, QA ou produção.
- F-UX-03: tornar pixel perfect obrigatório por padrão ou exigir certificação visual automatizada.

## AUTONOMIA

- A-UX-01: redação, organização documental e implementação do checker, desde que todos os D-UX/P-UX sejam preservados.
- A-UX-02: detalhes de acabamento, tokens e componentes acessíveis permanecem delegados quando não alteram a arquitetura visual normativa.
- A-UX-03: versionar o contrato do agente, a fundação UX e a fonte compacta; regenerar os artefatos e executar somente os checks afetados.

## PENDÊNCIAS

Nenhuma pendência material no escopo autorizado.

## APROVAÇÃO

- Product Owner: Bruno.
- Data: 2026-09-18.
- Evidência de aprovação: mensagem “faça isso para garantir que o gpt internalize a regra ao criar prompts que demandem criação ou alteração de telas ou elementos visuais”.
- Referência para o prompt: este contrato versão 1.0.0 e ADR-061.
