# AoT â€” Prova comum por processo v2.3.2

10/10/2026. Acordo/execution process-assessment-v232 v1.0.0 congelados por decisÃ£o explÃ­cita de Bruno. Baseline mainb4e0923c382eae518ac19cbf29c0d715d5f50aed; branch codex/process-assessment-v232. Template docs/qa/aot-template.md. ImplementaÃ§Ã£o em validaÃ§Ã£o; publicaÃ§Ã£o ainda NOT TESTED.

## Matriz de Acordos

| ID | ImplementaÃ§Ã£o | Teste / EvidÃªncia | Status | Limite |
| --- | --- | --- | --- | --- |
| D-01 | Parent comum v2 e aplicaÃ§Ãµes pessoais, snapshot compartilhado | SQL workspace/vÃ­nculos/late candidate, algoritmo | PASS | Fixtures sintÃ©ticas |
| D-02 | Freeze no primeiro envio, ciclos/histÃ³rico/reuso compatÃ­vel | SQL freeze/reuso/novo ciclo e browser | PASS | Fixtures sintÃ©ticas |
| D-03 | SeleÃ§Ã£o acompanhamento, padrÃµes20/FÃ¡cil/Banco/60, requisitos | UI real/fixtures em1448/768/390/320px | PASS | Sem Pessoa produtiva |
| D-04 | Montagem por fluxo mÃ¡ximo/cotas/cobertura e rascunho preservado | DomÃ­nio/SQL banco, browser completo/parcial/cancelar | PASS | Qualidade empÃ­rica nÃ£o medida |
| D-05 | Modal explÃ­cita, dÃ©ficit/custos/ledger/limites/retry | SQL/Deno/domÃ­nio, browser sem IA implÃ­cita | PASS | Sem chamada paga |
| D-06 | RevisÃ£o do conjunto, editar/cÃ³pia/reaprovaÃ§Ã£o/substituir | SQL canonical bank/ediÃ§Ã£o, UI desktop/mobile | PASS | Sem revisÃ£o fabricada |
| D-07 | Lote atÃ´mico/recibos/fila/replay/contacts | SQL lote invÃ¡lido/replay, Edge,5disputas | PASS | Nenhum e-mail real |
| D-08 | Portal v1/atividade/correÃ§Ã£o/isolamento/erasure | SQL antes/depois, domÃ­nio/transporte, browser atividade | PASS | Jornada real NOT TESTED |
| D-09 | Migration aditiva/tenant/roles,2.3.2 rollout seletivo | Local SQL/typecheck/Deno; operaÃ§Ã£o pendente | PARTIAL | CI/main/produÃ§Ã£o pendentes |

## ProibiÃ§Ãµes verificadas

| ID | Negativo / EvidÃªncia | Status |
| --- | --- | --- |
| P-01 | Backend recusa nova prova individual/configuraÃ§Ã£o emitida; late snapshot igual | PASS |
| P-02 | Consulta sem IA/envio; confirmaÃ§Ã£o explÃ­cita/override sÃ³ outbox | PASS |
| P-03 | SQL roles/tenant/helpers/token/public gabarito/erasure e snapshots | PASS |
| P-04 | Replay/lote invÃ¡lido/reserva/lease/5disputas e revisÃ£o otimista | PASS |

## Mapa de Impacto e PreservaÃ§Ã£o

Mapa `impact-process-assessment-v232.md` antes da implementaÃ§Ã£o. Descoberta adicional: escritores de acompanhamento precisam de ID de ciclo explÃ­cito, incluÃ­do no mesmo domÃ­nio/rollback; dados/estÃ¡gios/fÃ³rmulas preservados. ADR-082 registra versÃ£o e consequÃªncia em rollback. ExclusÃ£o explÃ­cita remove tambÃ©m recibos pessoais do lote, nÃ£o a prova comum.

| Capacidade | RelaÃ§Ã£o | Baseline / RegressÃ£o | Status |
| --- | --- | --- | --- |
| HistÃ³rico individual/portal/outbox | direct | v1 estabelecido e assert antes/depois migration/sharedsend | PASS |
| Banco/IA/custos/revisÃ£o | direct | DomÃ­nio/SQL/Deno e ledger/transporte | PASS |
| Tenant/auth/token/erasure/concorrÃªncia | critical_transversal | Negativos/5conexÃµes independentes/rollback local | PASS |
| Score/Perfil/PosiÃ§Ã£o | plausible_indirect | Snapshots SQL idÃªnticos, nenhum cÃ¡lculo na UI/transportes | PASS |
| Acompanhamento/navegaÃ§Ã£o/loading/mobile | direct | 76 browser novo,78 navegaÃ§Ã£o e34 acompanhamento | PASS |
| Parser/Synthesis/Mail/Gateway/Traefik/Paddle | no_impact_identified | Baseline runtime verificado; comparaÃ§Ã£o pÃ³s-release pendente | NOT TESTED |

### Novidade e preservaÃ§Ã£o

Nova unidade de prova comum, montagem automÃ¡tica e aprovaÃ§Ã£o/envio transacional do conjunto. Portal/outbox/IA/ledger existentes reaproveitados. QA local comeÃ§a vazio e o runner usa rollback; clone de concorrÃªncia Ã© guardado e removido. Nenhum dado privado produtivo exportado. Candidato real, entrega e calibraÃ§Ã£o de dificuldade NOT TESTED.

## Fora de escopo preservado

F-01: Sem aviso final/expurgo/fornecedor/modelo/plano/cobranÃ§a novos. Nenhum dado fictÃ­cio ou mensagem de teste em produÃ§Ã£o. Diff/revisÃ£o: PASS.

## Fidelidade visual

NÃ£o aplicÃ¡vel referÃªncia normativa: a proposta aprovada nesta conversa Ã© fluxo textual com design system existente. Screenshots da UI real/fixtures em `evidence/process-assessment-v232/browser`, larguras1448/768/390/320px. ConfiguraÃ§Ã£o320 e revisÃ£o390 inspecionadas visualmente, alÃ©m dos asserts de overflow/acessibilidade. NÃ£o substituem comparaÃ§Ã£o com referÃªncia futura.

## Desvios / mudanÃ§as autorizadas

Nenhum desvio apÃ³s comparaÃ§Ã£o integral D-01..09/P-01..04/F-01/A-01. ID de ciclo no writer, nomes/algoritmo/limites tÃ©cnicos e helpers de erasure exercem A-01; nÃ£o alteram o comportamento aprovado. Nenhuma decisÃ£o material adicional do PO.

## ValidaÃ§Ã£o final / Git / QA / ambiente

79 asserts SQL local,5disputas e52Node dirigidos PASS;4Deno PASS. Browser:76 novo fluxo,78 navegaÃ§Ã£o,34 acompanhamento PASS. Root build PASS; tipos web e build web PASS (avisos anteriores de tamanho de bundle/import dinÃ¢mico). Contextos/lint/foundation PASS em snapshot apenas dos arquivos selecionados, preservando arquivos particulares nÃ£o rastreados. CI/main/produÃ§Ã£o/smoke ainda pendentes. EvidÃªncia em docs/qa/evidence/process-assessment-v232.

## ConclusÃ£o

PARTIAL. NÃ£o declarar implementaÃ§Ã£o publicada enquanto todos D-* e critÃ©rios verificÃ¡veis nÃ£o forem PASS.
