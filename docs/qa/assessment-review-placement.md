# Acordo, execução e AoT — Revisão da avaliação no cabeçalho

Acordo v1.0.0, 12/10/2026. Bruno aprovou executar rapidamente sem mudar a versão: manter 2.5.1. Baseline 83f37310f38b52331a49462b4c3172a3583a3186. Risco B, apresentação do portal; publicação autorizada por AGENTS §7. Screenshot é contraexemplo da posição/nome do botão, mantendo composição restante.

## Acordo e execução

- D-01: mover a ação para o cabeçalho, junto ao progresso X de Y respondidas, com nome Revisar avaliação. Rodapé da questão contém somente Anterior e Próxima.
- D-02: revisão tem Voltar às questões e Enviar avaliação. Confirmação final usa Confirmar envio e encerrar, explicando irreversibilidade. Revisão pode abrir incompleta, envio continua bloqueado quando incompleta/expirada; relógio segue correndo.
- D-03: orientar com nomes atualizados; responsividade sem overflow, contexto/respostas preservados ao voltar. Manter versão 2.5.1 e publicar somente superfícies necessárias.
- P-01: sem alteração de submit/save/telemetria/backend/prazos/correção/tenant, envio automático ou remoção da confirmação; sem alterações alheias.
- F-01: redesign total, Banco de Questões, mudança de versão e schema/coleta.
- A-01: classes locais e componentes existentes, região de progresso no contexto do cabeçalho; rodapé de revisão separado. Q: nenhuma.
- CA-01: browser dirigido desktop/768/390/320 prova ação global, progresso, anterior/próxima, revisão incompleta, retorno, marcação, confirmação/cancelamento/recibo e relógio; tipos/build e smoke de publicação sem versão alterada.

Execução: implementar D-01/03 na região de contexto do cabeçalho e CSS local; D-02 nos controles da revisão/modal; reaproveitar fixture de portal e checks existentes com acréscimos relevantes. Context Pack e documentos donos no mesmo movimento; release plan por SHA comprometido, produção somente web, rollback/smoke/sincronização. Não usar token pessoal da imagem nem mutações de negócio em produção.

## Mapa de impacto

| Área/capacidade | Relação | Baseline e prova proporcional |
| --- | --- | --- |
| Portal: navegação, revisão, envio explícito | direct | baseline acima; fixture com 20 questões e serviços sintéticos, browser positivo/negativo e captura mesma largura/estado |
| CSS e orientação compartilhados do portal | direct | classes locais, instruções pre-início/execução; tipos/build e 4 viewports |
| Autosave, marcação, prazo e recibo | plausible_indirect | handlers intactos; fixture verifica preservação, confirmação, expirado e contador |
| Preparação, Banco de Questões, backend/tenant/IA | no_impact_identified | nenhuma alteração de serviços/contratos/writers; inspeção de diff e plano web-only; sem banco ou IA pagos |
| Publicação e navegação pública | critical_transversal | SHA/versão/rotas/assets/health/rollback antes/depois; sem escrita real |

## AoT

| Regra | Implementação / evidência | Estado |
| --- | --- | --- |
| D-01 | Cabeçalho com progresso e Revisar avaliação; footer somente navegação. Capturas question-1448/768/390/320 e asserts de localização. | PASS |
| D-02 | Revisão, retorno, cancelamento, envio final, expiração e recibo em82checks browser. Relógio continua; incompleta bloqueada. | PASS |
| D-03 UX | Instruções atualizadas, quatro larguras sem overflow, revisão visual desktop1448/mobile390. Tipos/build PASS; versão registry intacta. | PASS |
| P-01 | Diff sem handlers, serviços, schema, trackers, correção e versionamento alterados;82checks sintéticos, sem IO externo. | PASS |
| D-03 publicação | Plano, produção e sincronização pendentes; não são PASS nesta etapa. | NOT TESTED |

Evidência em docs/qa/evidence/assessment-review-placement. Baseline remoto: srv1038882,/opt/prisma,origin aprovado,83f3731; web72517b3e/d95867a1 running0; nove demais containers registrados em snapshot privado tmp/assessment-review/production-baseline.json. Lint raiz encontrou whitespace em output/pa-concurrency-baseline.sql alheio; preservar arquivo e executar lint/contexto em snapshot limpo da tarefa. Não foi usado token pessoal nem candidato real.
