# AoT — Prova comum por processo v2.3.2

10/10/2026. Acordo/execution process-assessment-v232 v1.0.0 congelados por decisão explícita de Bruno. Baseline mainb4e0923c382eae518ac19cbf29c0d715d5f50aed; branch codex/process-assessment-v232. Template docs/qa/aot-template.md. Implementação em validação; publicação ainda NOT TESTED.

## Matriz de Acordos

| ID | Implementação | Teste / Evidência | Status | Limite |
| --- | --- | --- | --- | --- |
| D-01 | Parent comum v2 e aplicações pessoais, snapshot compartilhado | SQL workspace/vínculos/late candidate, algoritmo | PASS | Fixtures sintéticas |
| D-02 | Freeze no primeiro envio, ciclos/histórico/reuso compatível | SQL freeze/reuso/novo ciclo e browser | PASS | Fixtures sintéticas |
| D-03 | Seleção acompanhamento, padrões20/Fácil/Banco/60, requisitos | UI real/fixtures em1448/768/390/320px | PASS | Sem Pessoa produtiva |
| D-04 | Montagem por fluxo máximo/cotas/cobertura e rascunho preservado | Domínio/SQL banco, browser completo/parcial/cancelar | PASS | Qualidade empírica não medida |
| D-05 | Modal explícita, déficit/custos/ledger/limites/retry | SQL/Deno/domínio, browser sem IA implícita | PASS | Sem chamada paga |
| D-06 | Revisão do conjunto, editar/cópia/reaprovação/substituir | SQL canonical bank/edição, UI desktop/mobile | PASS | Sem revisão fabricada |
| D-07 | Lote atômico/recibos/fila/replay/contacts | SQL lote inválido/replay, Edge,5disputas | PASS | Nenhum e-mail real |
| D-08 | Portal v1/atividade/correção/isolamento/erasure | SQL antes/depois, domínio/transporte, browser atividade | PASS | Jornada real NOT TESTED |
| D-09 | Migration aditiva/tenant/roles,2.3.2 rollout seletivo | Local SQL/typecheck/Deno; operação pendente | PARTIAL | CI/main/produção pendentes |

## Proibições verificadas

| ID | Negativo / Evidência | Status |
| --- | --- | --- |
| P-01 | Backend recusa nova prova individual/configuração emitida; late snapshot igual | PASS |
| P-02 | Consulta sem IA/envio; confirmação explícita/override só outbox | PASS |
| P-03 | SQL roles/tenant/helpers/token/public gabarito/erasure e snapshots | PASS |
| P-04 | Replay/lote inválido/reserva/lease/5disputas e revisão otimista | PASS |

## Mapa de Impacto e Preservação

Mapa `impact-process-assessment-v232.md` antes da implementação. Descoberta adicional: escritores de acompanhamento precisam de ID de ciclo explícito, incluído no mesmo domínio/rollback; dados/estágios/fórmulas preservados. ADR-082 registra versão e consequência em rollback. Exclusão explícita remove também recibos pessoais do lote, não a prova comum.

| Capacidade | Relação | Baseline / Regressão | Status |
| --- | --- | --- | --- |
| Histórico individual/portal/outbox | direct | v1 estabelecido e assert antes/depois migration/sharedsend | PASS |
| Banco/IA/custos/revisão | direct | Domínio/SQL/Deno e ledger/transporte | PASS |
| Tenant/auth/token/erasure/concorrência | critical_transversal | Negativos/5conexões independentes/rollback local | PASS |
| Score/Perfil/Posição | plausible_indirect | Snapshots SQL idênticos, nenhum cálculo na UI/transportes | PASS |
| Acompanhamento/navegação/loading/mobile | direct | 76 browser novo,78 navegação e34 acompanhamento | PASS |
| Parser/Synthesis/Mail/Gateway/Traefik/Paddle | no_impact_identified | Baseline runtime verificado; comparação pós-release pendente | NOT TESTED |

### Novidade e preservação

Nova unidade de prova comum, montagem automática e aprovação/envio transacional do conjunto. Portal/outbox/IA/ledger existentes reaproveitados. QA local começa vazio e o runner usa rollback; clone de concorrência é guardado e removido. Nenhum dado privado produtivo exportado. Candidato real, entrega e calibração de dificuldade NOT TESTED.

## Fora de escopo preservado

F-01: Sem aviso final/expurgo/fornecedor/modelo/plano/cobrança novos. Nenhum dado fictício ou mensagem de teste em produção. Diff/revisão: PASS.

## Fidelidade visual

Não aplicável referência normativa: a proposta aprovada nesta conversa é fluxo textual com design system existente. Screenshots da UI real/fixtures em `evidence/process-assessment-v232/browser`, larguras1448/768/390/320px. Configuração320 e revisão390 inspecionadas visualmente, além dos asserts de overflow/acessibilidade. Não substituem comparação com referência futura.

## Desvios / mudanças autorizadas

Nenhum desvio após comparação integral D-01..09/P-01..04/F-01/A-01. ID de ciclo no writer, nomes/algoritmo/limites técnicos e helpers de erasure exercem A-01; não alteram o comportamento aprovado. Nenhuma decisão material adicional do PO.

## Validação final / Git / QA / ambiente

77 asserts SQL local,5disputas e52Node dirigidos PASS;4Deno PASS. Browser:76 novo fluxo,78 navegação,34 acompanhamento PASS. Root build PASS; tipos web e build web PASS (avisos anteriores de tamanho de bundle/import dinâmico). Contextos/lint/foundation PASS em snapshot apenas dos arquivos selecionados, preservando arquivos particulares não rastreados. CI/main/produção/smoke ainda pendentes. Evidência em docs/qa/evidence/process-assessment-v232.

## Conclusão

PARTIAL. Não declarar implementação publicada enquanto todos D-* e critérios verificáveis não forem PASS.
