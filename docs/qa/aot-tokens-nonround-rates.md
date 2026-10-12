# AoT — Tokens Prisma: tarifas não redondas

Contrato e execução `docs/qa/tokens-nonround-rates.md` 1.0.0, decisão explícita de Bruno em12/10/2026. Baseline main/origin/VPS `65c555f2cf44e12f0c87d6c21202f33b1f1b26ac`, runtime web2.5.1 `47c9b09`. Branch `codex/tokens-nonround`, risco D. Configuração `prisma-token-tariffs-2026-10-12`, sem mudança do app/envelope RPC. Evidências `docs/qa/evidence/tokens-nonround-rates/`.

## Matriz de Acordos

| ID | Implementação | Teste / evidência | Status |
| --- | --- | --- | --- |
| D-01 | Três revisões 2.347/14.785/6.193 no catálogo existente | SQL valores exatos/unidades não redondas; UI tabela e cotações | PASS |
| D-02 | INSERT aditivo; guard baseline/vigência futura e lock do catálogo | SQL snapshots de tarifas/cotações/reservas e saldos/pacotes/pedidos; reserva antiga10.000 e cotação antiga40.000 | PASS |
| D-03 | Mesma UI/RPC dinâmica, pt-BR e texto secundário; sem aleatoriedade | Browser22checks em1448/390;20questões46.940; revisão visual mobile | PASS |
| D-04 | Local rollback e negativas, publicação seletiva, preservação e documentação | Local PASS; produção e sincronização pendentes | PARTIAL |

## Proibições verificadas

P-01 PASS local: migration histórica/corpos/grants/RLS/escritores intactos no diff; snapshots e replay SQL preservam histórico. P-02 PASS: nenhuma mudança de runtime/IA/modelo/prompt/cache/reuso/Score/Perfil/Posição; dados protegidos intactos no SQL. Produção ainda NOT TESTED.

## Mapa de Impacto e Preservação

Mapa final igual ao inicial, sem dependência nova. Novidade: três tarifas. Preservação:

| Capacidade / relação | Baseline e regressão | Status |
| --- | --- | --- |
| Tarifas/cotação/reserva/débito — direct | Valores iniciais; snapshots, versões, total, liquidação antiga/nova/replay/falha/expiração | PASS local |
| Avaliação/Banco de questões — direct | Mesmo código consulta `position_assessment_items`;79 asserts processo/portal legados e cotação/reserva20questões | PASS local; corpos produtivos pendentes |
| Parser/Síntese — direct | Mesmas RPCs e funções; cotação/reserva/liquidação e permissão member | PASS local; corpos produtivos pendentes |
| Informação UI — direct | Mesmos componentes reais com transporte sintético;22 checks desktop/mobile e capturas | PASS |
| Autorização/tenant/RLS — critical_transversal | Anônimo, tenant errado, DML privado, edição operacional, member/Parser negados | PASS local; metadados produtivos pendentes |
| Franquia/lotes/pacotes/pedidos/dados humanos — critical_transversal | Snapshot exato SQL; dez hashes produtivos baseline capturados | PASS local; produção pendente |
| Cache/banco/reuso/Score/matching/Knowledge — plausible_indirect | Diff sem mudança runtime; SQL snapshots e regressão de reutilização/portal | PASS local |
| Serviços/Edge/web/portal/mail — no_impact_identified | Somente catálogo SQL; sete containers baseline capturados, sem rebuild/restart previsto | NOT TESTED produção |

## Fora de escopo preservado

F-01 PASS: nenhum pacote, preço, franquia, layout, provedor, infraestrutura ou regra de cobrança alterado. A única referência visual desta solicitação é o exemplo textual14.785; não há nova composição normativa. Capturas mostram componentes existentes e cotações reais sobre transporte sintético, não uma nova tela produtiva.

## Desvios e mudanças autorizadas

Nenhum desvio identificado na revisão local. Valores concretos delegados à engenharia; revisão substitui somente tarifas iniciais do acordo2.4.0. Não muda significado de contrato persistido, por isso app2.5.1 mantido.

## Validação e limites

PostgreSQL17 LOCAL descartável em127.0.0.1:55479/import_evidence_v202, baseline sem Pessoas/avaliações/tabelas comerciais, transação com ROLLBACK. Testes sintéticos sem IA paga, pedidos comerciais ou dados humanos produtivos. Não existe QA remoto separado. Browser22, serviço de cotação1 PASS; SQL/evidências incluem teste de baseline inesperada, tarifa futura e reexecução negada. Jornada real autenticada NOT TESTED. Context Pack valida somente checkout isolado limpo; arquivos locais alheios no root preservados.

## Git / QA / ambiente

Publicação ainda pendente. Rollback por novas versões via Gestão de Tokens, preservando cotações/reservas. Supabase produtivo Prisma ioldpnqqvobprjiontre ACTIVE_HEALTHY verificado; sete serviços running/restarts0, Parser/Síntese/mail healthy, Paddle experimental unhealthy preexistente.

## Conclusão

Implementação local validada, fechamento produtivo pendente.
