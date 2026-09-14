# AoT — M6.2 Jornada contextual de verificação

Contrato: `docs/qa/agreement-m62-verification-journey.md` 1.0.0. Execução: `docs/qa/execution-m62-verification-journey.md` 1.0.0. Evidência iniciada em 2026-09-14.

## Matriz de acordos

| IDs | Implementação | Teste / evidência | Status |
| --- | --- | --- | --- |
| D-001 a D-004 | `create_m62_verification_need`, snapshot exato do matching, detalhe contextual e timeline | prova SQL transacional criou a necessidade exata; smoke autenticado exibiu a ação no requisito e o contexto de Beatriz sem criar uma verificação real | PASS |
| D-005 a D-008 | contexto imutável em leitura, escolhas reais de Definition, prévias de Blueprint/Rubric/Item Bank e revisão do convite | testes M6.2, tipos, build web e inspeção autenticada da jornada | PASS |
| D-009 a D-012 | compartilhamento manual, fallback de clipboard, monitor contextual e separação de concluído/inconclusivo | testes de contrato/execução e smoke da central autenticada | PASS |
| D-013 a D-014 | loaders sem mutação, autorização por organização/papel e auditoria da criação/reuso | SQL confirmou leitura sem escrita, bloqueio anônimo, acesso autenticado controlado e aposentadoria da fixture legada | PASS |
| P-001 a P-006 | guardrails de decisão, evidência, delivery, versão e tenant | negativos SQL e testes locais; nenhuma Pessoa real recebeu convite, nenhum item protegido foi exposto e o score permaneceu inalterado | PASS |

## Fora de escopo

Produção, Pessoas reais, provider/delivery externo, nova fórmula de score e reescrita de histórico permanecem excluídos.

## Validação e ambiente

### Evidência técnica

- `pnpm run validate`: PASS em 2026-09-14 no estado final, incluindo lint de 485 arquivos, foundation, Context Pack, tipos, builds, 440 testes, 23 casos golden e vertical slice determinístico.
- `pnpm run build:web`: PASS; permanece apenas o aviso histórico de chunk acima de 900 kB.
- `pnpm run check:prisma-context`: PASS com cinco fontes canônicas.
- `git diff --check`: PASS.
- Prova SQL `supabase/qa/m62_contextual_verification_journey_verification.sql`: PASS com `exact_need_created`, `explained_status`, `persisted_level_preserved`, `persisted_criticality_preserved`, `anonymous_denied`, `authenticated_allowed` e `legacy_demo_retired` verdadeiros; a transação termina em rollback.

### Prisma-QA

- Migration `20260914051751_m62_contextual_verification_journey` aplicada: RPC contextual, identidade exata, loaders somente leitura e projeções de versão/timeline.
- Migration `20260914051918_m62_demo_need_retirement` aplicada: execução de `ensure_m51a_demo_need` revogada de `public`, `anon` e `authenticated`.
- Migration `20260914053202_m62_requirement_parameter_hardening` aplicada: nível e criticidade persistidos na versão da Posição não podem ser substituídos por parâmetros do cliente.
- Advisors executados após as migrations. O novo RPC aparece no alerta geral de funções `SECURITY DEFINER` executáveis por autenticados; esse acesso é intencional e a própria função exige revisor autorizado antes de ler ou gravar o contexto. Os demais alertas de RLS, funções e índices já pertenciam ao estado anterior.

### Smoke autenticado

Login no Prisma-QA concluído com a sessão fornecida. Em **Pessoas para Analista de Marketing**, Beatriz apareceu no grupo A, com evidência da experiência em Marketing e score 58/100. O drawer do score exibiu **Reduzir incerteza por requisito**; para um requisito sem nível/criticidade, a ação permaneceu bloqueada até escolhas explícitas. A central **Verificações** abriu sem criar registros, separou **Inconclusivas**, mostrou busca contextual e não apresentou overflow horizontal na largura verificada.

Não foi acionada uma verificação para Beatriz, porque ela é uma Pessoa real e esse uso está fora do contrato. Nenhum convite foi criado ou enviado. Produção não foi alterada.
