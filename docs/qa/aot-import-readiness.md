# AoT — disponibilidade antecipada da importação

Contrato: `docs/qa/agreement-import-readiness.md` 1.0.0; execução: `docs/qa/execution-import-readiness.md`. Baseline `eb561b4ea128f749eac4a34b241b4d7c4b876335`; branch `codex/import-readiness`; risco D.

## Matriz de Acordos

| ID | Implementação | Teste/evidência | Status | Ambiente/limitação |
| --- | --- | --- | --- | --- |
| D-01 | rota gateway e worker read-only | HTTP sintético, payload `{}`, headers mínimos | PASS | local; smoke real pendente |
| D-02 | Alert acessível, cinco estados, horário e botão | domínio tipado; build | PARTIAL | inspeção renderizada pendente |
| D-03 | checagem anterior a PDF.js; seleção mantida | política de bloqueio e inspeção do fluxo | PARTIAL | smoke de seleção pendente |
| D-04 | limites/timeout, autorização existente, sem lock da checagem | HTTP negativos, ocupação, falha sem cooldown | PASS | local |
| D-05 | TTL, escopo por empresa, abort/sequence na desmontagem; parse preservado | domínio/67 testes direcionados incluindo regressão | PASS | local |
| D-06 | worker → gateway → web, main e produção | rollout pendente | NOT TESTED | remoto |

## Proibições verificadas

| ID | Guardrail | Evidência | Status |
| --- | --- | --- | --- |
| P-01 | sem documento/segredo/IA/escrita na checagem | spies de fetch; diretório vazio após consulta; respostas sanitizadas | PASS |
| P-02 | autorização/tenant, lock, parse preservados | negativos e regressão de gateway/worker/parse | PASS |
| P-03 | desconhecido nunca disponível; causa não inventada | schema estrito, worker antigo, timeout, conectividade | PASS |

## Mapa de Impacto e Preservação

Mapa inicial no acordo, sem ampliação de domínio. Importação/gateway/worker `direct`; auth/tenant `critical_transversal`; Paddle/outras entradas de parse e web/assets `plausible_indirect`; dados/matching/Knowledge `no_impact_identified`. Consulta anterior ao intake, sem banco ou payload pessoal. Regressores: `paddleGateway`, `parserIaService`, `parserIaRecovery`, `parserIa`, `parserReadiness`. Baseline operacional atual sem listener 8787 local e sem listener 18787 VPS; não é correlação retrospectiva com horário da captura.

### Novidade e preservação

- Nova disponibilidade comprovada nos testes HTTP/domínio; UI/produção pendentes.
- Parse, recuperação, bloqueio de concorrência, negativas de permissão e Paddle compartilhado passaram nos 67 testes.
- Build TS, typecheck web, build web e lint passaram. Avisos existentes de bundle grande/import dinâmico e update-check do pnpm sem rede não invalidaram comandos.
- Sem suíte integral; seleção proporcional por mapa, não `pnpm run validate`.

## Fora de escopo e fidelidade

F-01/F-02 preservados: sem monitor externo, canal, painel, OCR, modelo/prompt, banco, taxonomia ou dados humanos. Captura é evidência de incidente, não mockup normativo. Estrutura da tela mantida com aviso compacto junto ao botão.

## Desvios e mudanças autorizadas

Nenhum desvio identificado na implementação local. Usuário autorizou main/produção. Rollout e smoke pendentes, sem alegar conclusão.

## Git / QA / ambiente

QA local sintético. Produção única. Arquivos alheios `.tmp.driveupload/`, `services/paddle/Dockerfile.gpu` e `models/` remoto preservados. Rollback: imagens anteriores de gateway/web e revisão anterior do worker; contratos aditivos permitem clientes antigos. Parser e túnel continuam dependentes do PC.
