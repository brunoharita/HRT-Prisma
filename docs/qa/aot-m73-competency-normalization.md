# AoT — M7.3 Normalização de competências declaradas

Contrato: `docs/qa/agreement-m73-competency-normalization.md` 1.0.0. Execução: `docs/qa/execution-m73-competency-normalization.md`. Autorização de produção e reprocessamento recebida de Bruno em 2026-09-18.

## Matriz de acordos

| ID | Implementação | Teste/evidência | Status |
| --- | --- | --- | --- |
| D-01 | Resolver server-side usa Knowledge publicada e tipos M7.1 | QA SQL: alias real, tradução, empresa estrangeira e ocupação | PASS |
| D-02 | Trigger transacional, fila e claim com lease | QA SQL: enqueue idempotente, claim duplicado negado, falha preserva declaração | PASS local; produção NOT TESTED |
| D-03 | `src/knowledge/competencyNormalization.ts` | Golden: Excel/Word, composto, heading/lista legada; QA SQL: dois conceitos distintos | PASS |
| D-04 | Modo novo no Knowledge Agent, sem novo provedor/modelo | Deno worker com provider simulado; schema, cobertura, PII, timeout | PASS local; produção NOT TESTED |
| D-05 | Estados e pendências expansíveis; Inbox de curadoria existente | Browser sintético desktop/mobile; SQL falha/ambiguidade | PASS |
| D-06 | Enqueue autorizado de todos os aprovados vigentes, snapshots preservados | QA SQL: atual/histórico intactos; revisão aditiva | PASS local; produção NOT TESTED |
| D-07 | Contagem de entradas originais separada de conceitos e pendências | Teste 43 declarações/zero conceitos; browser 8 declarações, 15 conceitos e uma pendência | PASS |
| D-08 | Scope, perfil, versões, modelo/usage, origem e decisão | QA SQL: decisão humana posterior prevalece; nenhuma natureza demonstrada criada | PASS |
| D-09 | ADR, owners, Context Pack, release central v1.7.3 e rollout | Fechamento operacional abaixo | PARTIAL |

## Proibições

| ID | Evidência | Status |
| --- | --- | --- |
| P-01 | Testes Office, ocupação, natureza declarada; matching/score/avaliação não editados | PASS |
| P-02 | Perfis/decisões humanos preservados; QA SQL e revisão de diff | PASS |
| P-03 | Negativos anon/membro/inativo/outsider, FK org/Perfil, decisão ambígua e lease | PASS |
| P-04 | Coverage/source spans, malformed provider, fallback e falha visível | PASS |

F-01/F-02 preservados: nenhuma ontologia, inferência por trajetória, ranking, parser/OCR ou remodelagem visual ampla.

## Fidelidade visual

Referência: composição atual M7.2; screenshot vazio do usuário é contraexemplo funcional. Harness `tests/ui/m72.html`, dados sintéticos equivalentes antes/depois. Browser in-app, 2026-09-18: viewport padrão 1266×714 e móvel 390×844, aba Competências. Mantidos cabeçalho, abas, mapa principal, coluna de leitura e empilhamento móvel. Pendência Arquitetura expandida mostra justificativa e declaração original. Capturas desta execução comprovam leitura das métricas, lista acessível e footer v1.7.3. Foi corrigido overflow dos filtros que invadia a coluna lateral em largura intermediária; ajuste responsivo dentro de A-02. Nenhuma divergência material não autorizada.

## Validação local

- Baseline M7.2 replayada em PostgreSQL 17 descartável, loopback 55471, `m72_m73_baseline`; todos os testes anteriores passaram.
- `scripts/test-m73-postgres.ps1`: migration + fixtures sintéticas em transação integralmente revertida; positivos/negativos passaram.
- `deno check supabase/functions/knowledge-agent/index.ts`: PASS.
- `deno test --allow-env supabase/functions/knowledge-agent/competencyNormalization.test.ts`: 3/3, nenhum modelo real.
- `pnpm run typecheck:web`, `pnpm run build`, `pnpm run build:web`, `pnpm run lint`: PASS. Aviso de chunk grande preexistente no build.
- Testes Node de normalização, mapa M7.2, release e Knowledge: 20/20.
- Não foi executada validação global não autorizada.

## Rollout / evidência remota

NOT TESTED. Preencher com estado efetivamente observado. Não há homologação remota separada: PostgreSQL descartável/sintético antecede a produção única `ioldpnqqvobprjiontre` e Hostinger.

## Desvios e conclusão

Nenhum desvio funcional identificado na revisão local. Entrega ainda não concluída: falta comprovação do rollout e reprocessamento real. Material alheio preservado: `.tmp.driveupload/` e `services/paddle/Dockerfile.gpu`.
