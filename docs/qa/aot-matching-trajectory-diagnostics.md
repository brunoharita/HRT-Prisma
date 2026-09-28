# AoT — diagnóstico seguro da trajetória

Contrato: `docs/qa/agreement-matching-trajectory-diagnostics.md` v1.0.0. Execução: `docs/qa/execution-matching-trajectory-diagnostics.md`. Baseline local: `main` em `4d381cf`; Edge de produção v8, sem diagnóstico de etapa. Esta entrega não reconstitui as falhas históricas da Beatriz.

## Acordos → implementação → teste → evidência

| ID | Implementação | Teste/evidência | Status |
| --- | --- | --- | --- |
| D-01 | Evento único `matching_trajectory_readings` v1 com dois resultados, análise, tentativa e metadados permitidos | Fixture de resposta incompleta verifica lado, etapa, HTTP, status, razão e tokens; typecheck Deno | PASS |
| D-02 | `ReadingError` tipificado, validação por etapa, diagnóstico de quote, modelo e discordância; motivo público preservado | Fixtures de JSON, quote, modelo e discordância; suíte existente de envelope/timeout | PASS |
| D-03 | `emitDiagnostic` isolado com `try/catch`, sem escrita no cache ou cliente | Logger que lança mantém resultado e RPC; cache/sucesso/autorização não geram evento | PASS |
| P-01 | Allowlist de status/razão e tokens limitados; log não recebe texto, prompt ou erro livre | Negativos com resposta e detalhes maliciosos; revisão do diff | PASS |
| P-02 | Evento fica somente no log da Edge, sem efeito no cálculo | Motivos públicos e snapshots preservados nos testes Deno | PASS |

## Mapa de impacto e preservação

| Capacidade | Relação | Baseline | Regressão/evidência | Status |
| --- | --- | --- | --- | --- |
| Duas leituras/erro público da Edge | direct | `RESPONSE_INVALID` sem detalhe, 2 chamadas com ordem invertida | 27 testes do handler, typecheck Deno | PASS |
| Privacidade/segurança do log | critical_transversal | Sem log de resposta bruta | Fixtures com conteúdo sensível, allowlist e logger indisponível | PASS |
| Cache, triagem, score e snapshot | plausible_indirect | Contratos M8.6 e fallback vigentes | 5 testes de snapshot + negativos do handler; sem chamada real | PASS |
| Banco, prompt, UI e VPS | no_impact_identified | Nenhuma alteração pretendida | Revisão de diff e plano seletivo de release | NOT TESTED |

Novidade: correlação e etapa por leitura em tentativas problemáticas. Preservação: mesma resposta pública, motivo, cache, score e fallback. Relação reclassificada: nenhuma. Limitação: nenhum log anterior à implantação contém essa etapa; o smoke autenticado em produção poderia consumir IA e por isso não será usado como teste de telemetria.

Fora de escopo F-01: sem alteração de prompt/modelo/limites/retry/banco/UI e sem reprocessamento de Perfil real. Fidelidade visual: não aplicável, sem superfície visual alterada. Desvios do contrato: nenhum na implementação local. Mudanças autorizadas durante a execução: nenhuma.

Validação local: `deno check` do handler e testes; `deno test --no-check` do handler/snapshot: 32/32 PASS; `pnpm run lint` PASS; `pnpm run check:matching-runtime` PASS; `pnpm run generate:prisma-context` e `pnpm run check:prisma-context` PASS; `git diff --check` PASS. O typecheck Deno exigiu tipagem explícita do retorno já usado de `prepareTrajectoryContext`, sem mudança de dado.

Git/CI/produção: pendente nesta fase. Não declarar publicação antes de verificar SHA, plano, CI, Edge e smoke seguro.
