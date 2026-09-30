# AoT — checagem explícita de discordância antiga

Contrato: `docs/qa/agreement-matching-legacy-review-refresh.md` v1.0.0. Baseline: `main` `2663c5e165c42b97bfb42838d1b173f7143f7fa7`, Edge v14 e web em produção. Observação remota em 2026-09-30: na Posição backend, Diego e Bruno tinham cache `READINGS_DISAGREE` sem último par; a carga de revisão do Diego retornou HTTP 504, enquanto fontes/claim responderam 200. O par não pode ser reconstruído das respostas antigas.

## Acordos -> implementação -> teste -> evidência

| ID | Implementação | Evidência | Estado |
| --- | --- | --- | --- |
| D-01 | Carga de par legado devolve `PAIR_NOT_STORED`; tela explica ausência sem inventar itens | SQL sintético e Deno; smoke remoto pendente | PARTIAL |
| D-02 | Botão explícito chama RPC service-only com papel, tenant, versões, contexto, chave, solicitante e horário | SQL negativo/positivo, Deno sem provedor na carga; smoke autenticado pendente | PARTIAL |
| D-03 | Lease existente, conclusão auditada, tentativa 4 real e bloqueio de retry automático após falha | SQL nos prompts 1.1/1.2; Deno com duas leituras simuladas | PASS |
| D-04 | Fallback e score só mudam após resultado íntegro; erros de configuração/fonte/concorrência têm causa | Teste de domínio, UI compilada; smoke autenticado pendente | PARTIAL |
| P-01 | Busca/carga não acionam nova IA | Testes Deno e guarda SQL | PASS |
| P-02 | Sem acesso por member/anon/tenant alheio; par não vai ao navegador | Negativos SQL/Deno, RLS/grants | PASS |
| P-03 | Sem diff em pesos, prompt/modelo, Knowledge, Perfil ou Posição | Inspeção do diff | PASS |

F-01 preservado: sem reprocessamento em massa, backfill ou IA real para smoke. A-01: reuso do cache, lease e auditoria; sem base paralela.

## Impacto e preservação

| Área | Relação | Baseline/risco | Regressão |
| --- | --- | --- | --- |
| Cache, par, revisão, migration | direct | Legados sem par; retry normal não pode cobrar novamente | PostgreSQL sintético com rollback, 1/3/4 tentativas, falha e autoridade |
| Edge e provedor | direct | Duas leituras independentes só após claim | Deno 33 testes; sem chamadas reais |
| Busca, tela, score | direct | Cálculo interno e mensagem causal | Typecheck/build; visual autenticado pendente |
| Auth/tenant/RLS/PII | critical_transversal | Service-only e fontes minimizadas | Negativos SQL/Deno; grants remotos pendentes |
| Snapshot/Knowledge/requisitos | plausible_indirect | Nenhuma regra modificada | Domínio 112 testes, diff e smoke seletivo pendente |

## Validação e rollout

Local: PostgreSQL 17 descartável, migração aplicada e quatro scripts SQL de regressão rodados em transação com rollback para prompts 1.1 e 1.2. Deno handler 33/33, domínio 112/112, TypeScript raiz/web, build web, lint, runtime gerado e ledger checker passaram. Não houve IA real nem mutação de Perfil real. QA remoto separado não existe; produção, CI, deploy e smoke serão registrados somente após execução. O fluxo visual autenticado de decisão sobre Pessoa real permanece não testado sem consulta paga explícita do operador.

## Desvios

Nenhum desvio funcional conhecido na validação local. A entrega ainda não deve ser declarada concluída antes do rollout e evidência proporcional.
