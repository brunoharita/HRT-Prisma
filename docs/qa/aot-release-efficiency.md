# AoT — Publicação eficiente por impacto

Contrato de referência: `docs/qa/agreement-release-efficiency.md` 1.0.0. Execução: `docs/qa/execution-release-efficiency.md`.

## Matriz de Acordos

| ID | Implementação | Teste / evidência | Status | Limitação |
| --- | --- | --- | --- | --- |
| D-01/D-02 | classificador e plano em `scripts/release-impact.mjs` | testes sintéticos de docs, web, migration e função | PASS | não infere dependências sem presença no diff |
| D-03/D-04 | `release-dispatcher.mjs` com SHA, branch e worktree guards | testes positivos/negativos e gate completo | PASS | publicação externa usa o próprio SHA deste fechamento |
| D-05 | mapa e checker do ledger | inventário remoto 140/local 136; checker local | PASS | equivalência histórica não demonstrada; push geral bloqueado |
| D-06 | opção `--receipt` | teste cria, lê e remove um único JSON estruturado | PASS | recibos reais ficam em `tmp/` ignorado |
| D-07 | runbook e prompt inicial | owner doc e Context Pack regenerado/verificado | PASS | configuração do Projeto do ChatGPT é ação manual do PO |

## Proibições verificadas

| ID | Evidência | Status |
| --- | --- | --- |
| P-01/P-04 | matriz seletiva e arquivos alheios preservados | PASS |
| P-02/P-03 | alteração histórica e caminho desconhecido bloqueiam; `cliDbPushAllowed=false` | PASS |
| P-05 | mapa e recibos não contêm secrets nem PII | PASS |

## Fora de escopo preservado

F-01 a F-04 preservados: nenhum ambiente, schema, dado ou regra funcional foi alterado.

## Desvios do contrato

Nenhum desvio funcional. O ledger foi reconciliado por mapa factual, não por mutação remota, porque 57 pares não têm fingerprint textual equivalente e seis registros remotos representam histórico desdobrado. Isso cumpre P-02/P-03 e preserva a verdade operacional.

## Validação final

- `pnpm run test:release-tooling`: 13/13.
- `pnpm run check:supabase-ledger`: 134 nomes mapeados, dois locais, seis remotos e nenhum pendente desconhecido; push geral bloqueado.
- `pnpm run validate`: lint 599 arquivos, foundation, Context Pack, typechecks, build web, 519 testes técnicos, 23 goldens e `VERTICAL_SLICE_OK`.
- `pnpm run audit:dependencies`: nenhuma vulnerabilidade conhecida.
- `git diff --check`: aprovado.
- `bash -n deploy/release-web.sh`: delegado ao CI Linux porque o bash/WSL local retornou acesso negado antes de carregar o arquivo.

## Git / ambiente

Branch `codex/release-efficiency-dispatcher`; baseline `8259d0f`. Supabase foi consultado somente para inventário. Nenhuma migration, função, dado ou VPS foi alterado; o próprio plano desta entrega deve permanecer Git-only.

## Conclusão

Implementação local e provas concluídas. O fechamento externo publica o mesmo SHA em branch/main e confirma CI; Supabase e VPS permanecem corretamente fora da rota.
