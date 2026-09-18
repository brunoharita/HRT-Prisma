# AoT — Fidelidade a referências visuais em prompts

Data: 2026-09-18. Contrato: `docs/qa/agreement-visual-reference-fidelity.md` 1.0.0. Execução: `docs/qa/execution-visual-reference-fidelity.md` 1.0.0. Owner: `prisma-ux-foundation-1.1.0`. Decisão: ADR-061.

## Matriz de Acordos

| ID | Implementação | Teste / evidência | Status | Ambiente / limitação |
| --- | --- | --- | --- | --- |
| D-UX-01 | `AGENTS.md`, owner e template classificam cada referência. | `check:foundation` e revisão do diff. | PASS | local |
| D-UX-02 | Owner e contrato do agente exigem decomposição visual implementável. | `check:foundation` e teste da fonte compacta. | PASS | local |
| D-UX-03 | Convenções D/P/A/Q/CA-UX incorporadas ao agente e templates. | `check:foundation`. | PASS | local |
| D-UX-04 | Limite de “não copiar literalmente” definido no agente e owner. | Checker e teste da fonte compacta. | PASS | local |
| D-UX-05 | Template AoT exige evidência no mesmo estado/dados/viewport e registro de divergências. | `check:foundation` e revisão do template. | PASS | regra validada; aplicação começa nas próximas entregas visuais |
| D-UX-06 | Gerador projeta a seção canônica na fonte GPT e gera ambos os artefatos. | 3 testes de tooling, geração e `check:prisma-context`. | PASS | local |

## Proibições verificadas

| ID | Guardrail / teste negativo | Evidência | Status |
| --- | --- | --- | --- |
| P-UX-01 | Checker exige limites estruturais e a fonte compacta os contém. | Checker aprovado; teste confirma os termos na projeção. | PASS |
| P-UX-02 | Owner separa arquitetura normativa de dados ilustrativos. | Revisão do owner e contrato. | PASS |
| P-UX-03 | AoT declara que teste funcional não prova fidelidade visual. | Checker aprovado. | PASS |
| P-UX-04 | Artefatos derivados são produzidos somente pelo gerador. | Diff e geração reproduzível. | PASS |
| P-UX-05 | Conflitos materiais devem ser expostos ao PO. | Regra explícita no agente e owner. | PASS |

## Fora de escopo preservado

| ID | Evidência no diff | Status |
| --- | --- | --- |
| F-UX-01 | Nenhuma tela ou componente web alterado. | PASS |
| F-UX-02 | Nenhum schema, Supabase, runtime IA ou ambiente remoto alterado. | PASS |
| F-UX-03 | Pixel perfect permanece opt-in explícito. | PASS |

## Evidência de fidelidade visual

Não aplicável a esta entrega documental: ela define a regra e não cria nem altera uma superfície visual do produto.

## Desvios do contrato

Nenhum desvio.

## Validação final

- `pnpm run check:foundation`: PASS, 18 tabelas públicas e 6 versões de processamento preservadas.
- `node --test tests/tooling/prismaContext.test.mjs`: PASS, 3/3 testes.
- `pnpm run generate:prisma-context`: PASS, dois artefatos regenerados.
- `pnpm run check:prisma-context`: PASS, manifesto e conteúdo sincronizados.
- `git diff --check`: PASS.

## Git / QA / ambiente

Branch `codex/visual-fidelity-governance`. Entrega local e documental. QA, Supabase e produção não foram alterados.

## Conclusão

PASS local. A regra está ativa nas fontes e nos artefatos gerados; sua eficácia visual será comprovada em cada futura entrega que use referência normativa.
