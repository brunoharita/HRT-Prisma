# AoT — último par de leituras da interpretação por IA

Contrato: `docs/qa/agreement-matching-last-reading-pair.md` v1.0.0. Baseline: `main` em `a7009e3` antes deste movimento; cache M8.3/M8.6 com leitura consensual única, motivo `READINGS_DISAGREE` sem categorias de cada lado. Escopo de dados: Perfil/versão da Posição/chave de fontes; sem reprocessamento de Pessoas.

## Matriz de Acordos

| ID | Implementação | Teste/evidência | Status |
| --- | --- | --- | --- |
| D-01 | `last_reading_pair` no cache versionado; retry substitui somente o par da mesma chave | SQL transacional local: primeira/segunda tentativa, par divergente e completo | PASS |
| D-02 | Edge envia categorias e IDs de evidência validados ou etapa/motivo tipificados; banco guarda modelo, par e tentativa | 28 testes Deno, typecheck Deno; SQL local rejeita campo de resposta livre/IDs inválidos | PASS |
| D-03 | RPC `complete_matching_trajectory_audited` chama a conclusão existente e grava par na mesma transação; resultado continua próprio | SQL transacional local, testes de fallback/snapshot Edge, grants e versão corrente | PASS |

## Proibições verificadas

| ID | Prova | Status |
| --- | --- | --- |
| P-01 | Testes Deno não encontram marcadores de nome, empregador, email, citação ou texto privado no par; SQL rejeita campo extra | PASS |
| P-02 | RPC sem `EXECUTE` para `anon`/`authenticated`; tabela sem SELECT para eles ou `service_role`; claim exclui o par; Edge retorna campos explícitos | PASS |
| P-03 | Nenhum backfill/IA adicional no diff; registros antigos mantêm campo nulo | PASS |

## Mapa de Impacto e Preservação

| Capacidade | Relação | Baseline | Regressão | Status |
| --- | --- | --- | --- | --- |
| Duas leituras, consenso e fallback | direct | Edge usava duas leituras e descartava o par | 28 testes Deno; divergência mantém `reading=null` | PASS |
| Cache, lease, retry, grants e cascade | direct | Cache M83, três tentativas, RLS | SQL M83 prompts 1.1/1.2 e cadeia local M83→M86→2.1, com rollback | PASS |
| Privacidade e autoridade | critical_transversal | Dados minimizados, RPC service-only | Rejeição de role/lease/par malformado/ator revogado, sem texto bruto | PASS |
| Snapshot, Knowledge, score | plausible_indirect | Snapshot dependente da leitura consensual | Regressão do handler e SQL M83; sem alteração de cálculo | PASS |
| UI, prompt/modelo, dados reais | no_impact_identified | Sem mudança pedida | Diff não altera tais superfícies; sem chamadas pagas | PASS |

## Fora de escopo

F-01: sem tela, política nova de retenção, histórico de pares, backfill, ajuste de prompt/modelo/retry ou reprocessamento. PASS.

## Validação e limites

`deno test` (28/28), `deno check` da Edge/testes, `pnpm run typecheck` e SQL PostgreSQL 17 local transacional passaram. O SQL exercitou M83 nos prompts 1.1/1.2 e a cadeia posterior M84/M86/reconhecimento/2.1. A produção foi consultada apenas para conferir identidade da função claim e ausência de `EXECUTE` autenticado; nenhum registro de Pessoa foi lido ou alterado. O campo novo fica nulo em caches anteriores. Evidência de modelo real e consulta futura da auditoria por UI não integram este movimento.

## Git / QA / ambiente

Pendente: checks de fechamento, commit/CI, publicação seletiva, verificação remota e sincronização.

## Desvios

Nenhum identificado no escopo local. Estado de produção ainda pendente.
