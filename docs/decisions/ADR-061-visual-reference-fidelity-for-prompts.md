# ADR-061: Fidelidade estrutural de referências visuais em prompts

- Status: accepted
- Date: 2026-09-18
- Owners: Product Owner and engineering
- Authority: aprovação explícita de Bruno em 2026-09-18 para internalizar a regra no agente e na fonte do GPT do Prisma.

## Context

Referências visuais vinham sendo tratadas como orientação funcional ampla. A expressão “não copiar literalmente” permitia que a implementação preservasse funções, mas alterasse composição, hierarquia e densidade a ponto de o resultado ficar visualmente distante do planejado.

## Decision

Quando uma demanda visual inclui referência tratada como resultado planejado, sua arquitetura visual é normativa por padrão e seus dados de exemplo são ilustrativos. O prompt deve decompor e contratar topologia, hierarquia, proporções, agrupamentos, densidade, alinhamentos, ordem, posição das ações, estados e responsividade usando IDs UX. A entrega exige comparação no mesmo estado, com dados equivalentes e no mesmo viewport, registrando divergências no AoT.

“Não copiar literalmente” autoriza adaptar conteúdo real, componentes acessíveis, tokens, implementação e acabamento. Não autoriza uma composição materialmente diferente. Pixel identity permanece opcional e só se torna requisito por decisão explícita.

A regra canônica vive em `docs/product/ux-foundation.md`, governa agentes por `AGENTS.md` e é projetada pelo gerador em `FONTE_GPT_PRISMA.md`. Os artefatos gerados não se tornam fontes independentes.

## Alternatives considered

- Manter instruções livres: rejeitado porque não cria critérios verificáveis.
- Exigir cópia pixel a pixel: rejeitado porque conflita com dados reais, responsividade, acessibilidade e design system.
- Depender somente de revisão humana informal: rejeitado porque não preserva rastreabilidade entre acordo, prompt e evidência.

## Consequences and risks

Prompts visuais ficam mais objetivos e aceites mais fortes, com pequeno custo adicional de decomposição e comparação. Uma referência ambígua pode bloquear o prompt até decisão do PO. O protocolo não mede automaticamente semelhança perceptiva e não elimina julgamento humano; reduz o risco de redesenho silencioso.

## Technical, data, security and AI impact

Mudança documental e de geração do Context Pack. Não altera produto, schema, dados, autorização, Supabase, modelo ou prompt de runtime. Altera a fonte de conhecimento do GPT autor de prompts e o contrato comportamental dos agentes de desenvolvimento.

## Validation strategy

Checker de fundação protege os elementos obrigatórios. Teste do Context Pack comprova a projeção da seção canônica e o manifesto comum. Geração e comparação verificam que os artefatos derivados estão sincronizados.

## Review and replacement criteria

Reavaliar se testes reais mostrarem excesso de bloqueio, se houver ferramenta confiável de comparação visual ou se o fluxo de design mudar. Superseder por nova decisão e atualizar contrato, templates, gerador, testes e AoT em conjunto.

## References

- `docs/qa/agreement-visual-reference-fidelity.md` 1.0.0
- `docs/product/ux-foundation.md` `prisma-ux-foundation-1.1.0`
- ADR-048 e ADR-056

## Change history

- 2026-09-18: accepted and implemented as prompt-governance policy.
