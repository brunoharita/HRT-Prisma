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
| Banco, prompt, UI e VPS | no_impact_identified | Nenhuma alteração pretendida | Plano: database/web skip; diff e deploy só da Edge; smoke anônimo | PASS |

Novidade: correlação e etapa por leitura em tentativas problemáticas. Preservação: mesma resposta pública, motivo, cache, score e fallback. Relação reclassificada: nenhuma. Limitação: nenhum log anterior à implantação contém essa etapa; o smoke autenticado em produção poderia consumir IA e por isso não será usado como teste de telemetria.

Fora de escopo F-01: sem alteração de prompt/modelo/limites/retry/banco/UI e sem reprocessamento de Perfil real. Fidelidade visual: não aplicável, sem superfície visual alterada. Desvios do contrato: nenhum na implementação local. Mudanças autorizadas durante a execução: nenhuma.

Validação local: `deno check` do handler e testes; `deno test --no-check` do handler/snapshot: 32/32 PASS; `pnpm run lint` PASS; `pnpm run check:matching-runtime` PASS; `pnpm run generate:prisma-context` e `pnpm run check:prisma-context` PASS; `git diff --check` PASS. O typecheck Deno exigiu tipagem explícita do retorno já usado de `prepareTrajectoryContext`, sem mudança de dado.

Git/CI/produção: SHA funcional `a12b4e09884d6017c4cf1da339db73ede28ac5e1` integrado por fast-forward em `main` e `origin/main`. CI `36377229062` PASS. Plano 1.0.1: nove arquivos; documentação/Context Pack e somente Edge `matching-trajectory`; database e web/VPS `skip`. Edge v9 ACTIVE, `verify_jwt=true`, bundle `17a5de86cc73cf7b0bc83bee04dc7fc551722a53ce12da2c96658f649b8d6ec6`, os 12 arquivos publicados comparados ao bundle local. POST sem autenticação recebeu 401; não houve chamada autenticada com Perfil real nem custo de IA de smoke. Git local no worktree de release e GitHub alinhados no SHA funcional. O checkout principal mantém quatro itens não rastreados do usuário e exports gerados temporários fora do commit; não foram sobrescritos. Logs históricos não são recuperáveis. Conclusão: D-01..D-03 e P-01..P-02 PASS, sem desvio; efeito operacional de telemetria em erro real ainda não observado, por decisão de não provocar uma falha paga em produção.
