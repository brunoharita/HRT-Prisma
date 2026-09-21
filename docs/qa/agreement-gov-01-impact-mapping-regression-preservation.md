# Agreement Contract GOV-01 — Mapa de Impacto e Preservação de Funcionalidades

Versão: 1.0.0. Estado: `agreed`. Product Owner: Bruno. Data: 2026-09-20.

## Objetivo

Estabelecer, para todo movimento material do Prisma, um mapa prévio de impacto, um baseline mínimo e uma prova proporcional de regressão e preservação. Este contrato governa o processo de engenharia e QA; não altera produto, dados ou runtime.

## DEVE

- D-01 — Registrar o Mapa de Impacto antes da implementação.
- D-02 — Listar áreas, objetos, fluxos e processos diretamente afetados.
- D-03 — Listar dependências compartilhadas: código, contratos, schema, migrations, RPCs, funções, serviços, integrações, flags, ambiente, runtime e deploy.
- D-04 — Listar áreas potencialmente afetadas, mesmo quando não forem alteradas diretamente.
- D-05 — Listar capacidades concretas a preservar.
- D-06 — Classificar cada relação como `direct`, `plausible_indirect`, `critical_transversal` ou `no_impact_identified`.
- D-07 — Relação direta exige teste de regressão.
- D-08 — Relação plausivelmente indireta exige teste proporcional.
- D-09 — Jornada transversal crítica exige smoke quando houver consequência material.
- D-10 — `no_impact_identified` só pode ser usado após análise proporcional.
- D-11 — Selecionar testes pelo impacto, sem suíte completa por reflexo.
- D-12 — Registrar baseline antes da mudança quando necessário para provar preservação.
- D-13 — Baseline mínimo: capacidade, ambiente/estado, SHA ou versão, cenário e evidência.
- D-14 — Capacidade que funcionava antes e quebra depois impede `PASS`.
- D-15 — O AoT separa comportamento novo de capacidade preservada.
- D-16 — O AoT rastreia previsão, baseline, regressão, evidência e status de cada capacidade protegida.
- D-17 — Baseline ausente quando necessário é limitação explícita; não permite alegar ausência de regressão.
- D-18 — Dependência nova revisa o mapa.
- D-19 — Área nova descoberta exige mapa e regressão antes do fechamento.
- D-20 — Manter a classe de risco proporcional ao impacto.
- D-21 — Template de Agreement deve suportar áreas e capacidades preservadas.
- D-22 — Template de AoT deve suportar mapa, baseline e regressão.
- D-23 — `AGENTS.md` é a regra normativa para agentes.
- D-24 — Atualizar coerentemente owners de QA e release.
- D-25 — Context Pack gerado deve refletir a regra.

## PROIBIDO

- P-01 — Executar a suíte completa em todo movimento sem justificativa e autorização aplicável.
- P-02 — Provar ausência de impacto apenas pelo diff.
- P-03 — Afirmar preservação sem evidência proporcional.
- P-04 — Tratar fora de escopo como prova de ausência de risco.
- P-05 — Executar testes irrelevantes ao impacto.
- P-06 — Repetir baseline equivalente recente sem necessidade.
- P-07 — Ampliar escopo de produto, arquitetura ou UX.
- P-08 — Alterar comportamento de produto neste movimento.
- P-09 — Editar manualmente artefatos gerados do Context Pack.
- P-10 — Criar documento canônico concorrente.

## FORA DE ESCOPO

- F-01 — Corrigir regressões atuais, inclusive Parser IA.
- F-02 — Criar nova suíte E2E global.
- F-03 — Redesenhar CI/CD.
- F-04 — Alterar produto, banco, RLS, UX, IA, parser, matching ou runtime.
- F-05 — Executar todas as jornadas críticas em todo movimento.
- F-06 — Adicionar ferramenta externa de observabilidade ou testes.

## AUTONOMIA DE ENGENHARIA

- A-01 — Escolher a seção normativa adequada de `AGENTS.md`.
- A-02 — Adaptar os templates existentes.
- A-03 — Escolher os owners QA/release já existentes.
- A-04 — Criar ADR somente se não houver decisão equivalente.
- A-05 — Definir nomes e caminhos consistentes com o repositório.
- A-06 — Reutilizar classes de risco, AoT e dispatcher existentes.
- A-07 — Definir validação proporcional e evidência metadata-only.
- A-08 — Definir a versão documental sem criar versão pública de produto.

## CRITÉRIOS DE ACEITE

- CA-01 — AGENTS contém a regra normativa e a exige antes da implementação.
- CA-02 — Templates de Agreement e AoT contêm campos de mapa, capacidades, baseline e regressão.
- CA-03 — Owner QA registra a matriz de rastreabilidade; owner release aplica o gate orientado ao impacto.
- CA-04 — Cada relação é classificada e `no_impact_identified` tem análise proporcional.
- CA-05 — Validação do movimento usa somente provas proporcionais; suíte integral não é executada por reflexo.
- CA-06 — Context Pack é regenerado e verificado; fontes geradas não são editadas manualmente.
- CA-07 — Nenhum comportamento de produto, schema, RLS, runtime, IA ou deploy é alterado.
- CA-08 — Versionamento registra a decisão sem incrementar a versão pública.

## Referências e aprovação

Execution Prompt: `docs/qa/execution-gov-01-impact-mapping-regression-preservation.md`.
ADR: `docs/decisions/ADR-072-impact-mapping-regression-preservation.md`.
AoT: `docs/qa/aot-gov-01-impact-mapping-regression-preservation.md`.
