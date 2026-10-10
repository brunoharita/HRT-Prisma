# AoT — Prova comum por processo v2.3.2

10/10/2026. Acordo/execution process-assessment-v232 v1.0.0 congelados por decisão explícita de Bruno. Baseline main b4e0923c382eae518ac19cbf29c0d715d5f50aed; branch codex/process-assessment-v232. Template docs/qa/aot-template.md. Implementação publicada e verificada em main/produção2.3.2; SHA funcional fa4168c69bc58dea78c0bf0eb7cb286088e38c6d. Fechamento documental sincroniza fontes sem reconstruir runtime.

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
| D-09 | Migration aditiva/tenant/roles,2.3.2 rollout seletivo | SQL/CI, migration fingerprint igual, Edge2/código igual, main/VPS/bundle,41smokes | PASS | Jornada autenticada real NOT TESTED |

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
| Parser/Synthesis/Mail/Gateway/Traefik/Paddle | no_impact_identified | IDs/imagens/restarts iguais antes/depois; mail/parser/synthesis healthy; experimento unhealthy anterior preservado | PASS |

### Novidade e preservação

Nova unidade de prova comum, montagem automática e aprovação/envio transacional do conjunto. Portal/outbox/IA/ledger existentes reaproveitados. QA local começa vazio e o runner usa rollback; clone de concorrência é guardado e removido. Nenhum dado privado produtivo exportado. Candidato real, entrega e calibração de dificuldade NOT TESTED.

## Fora de escopo preservado

F-01: Sem aviso final/expurgo/fornecedor/modelo/plano/cobrança novos. Nenhum dado fictício ou mensagem de teste em produção. Diff/revisão: PASS.

## Fidelidade visual

Não aplicável referência normativa: a proposta aprovada nesta conversa é fluxo textual com design system existente. Screenshots da UI real/fixtures em `evidence/process-assessment-v232/browser`, larguras1448/768/390/320px. Configuração320 e revisão390 inspecionadas visualmente, além dos asserts de overflow/acessibilidade. Não substituem comparação com referência futura.

## Desvios / mudanças autorizadas

Nenhum desvio após comparação integral D-01..09/P-01..04/F-01/A-01. ID de ciclo no writer, nomes/algoritmo/limites técnicos e helpers de erasure exercem A-01; não alteram o comportamento aprovado. Nenhuma decisão material adicional do PO.

## Validação final / Git / QA / ambiente

79 asserts SQL local,5disputas e52Node dirigidos PASS;4Deno PASS. Browser:76 novo fluxo,78 navegação,34 acompanhamento PASS. Root build PASS; tipos web e build web PASS (avisos anteriores de tamanho de bundle/import dinâmico). Contextos/lint/foundation PASS em snapshot apenas dos arquivos selecionados, preservando arquivos particulares não rastreados. Primeiro CI detectou dois avisos sem ação no próprio Alert, corrigidos com Atualizar/Tentar novamente (3 checks dirigidos PASS). Primeira montagem passou a exigir ID do ciclo: aba anterior/ID ausente falham fechados (2 negativos adicionais). CI branch38062132581/main38062345249 success:878tests/878pass. Publicação e41smokes PASS. Migração remota20261010150632 tem SHA256 normalizado idêntico à fonte revisada. Edge position-assessment2 ACTIVE,verify_jwt=false/autorização custom preservada; seus dois arquivos foram comparados com a fonte local: iguais. Evidência em docs/qa/evidence/process-assessment-v232.

## Conclusão

PASS D-01..09/P-01..04/CA-01..04. main/origin/VPS no SHA funcional durante o smoke. Histórico produtivo preservado:1processo/1avaliação/0aplicações/0entregas e hashes iguais antes/depois, descontadas apenas colunas aditivas. Sem conversão, aprovação ou dados fictícios. Nenhum candidato ou convite real foi exercitado; qualidade empírica permanece NOT TESTED.

## Recibos operacionais e rollback

Plano e recibos em evidence/process-assessment-v232/production. Dispatcher exigiu SHA explícito e CI, promoveu main e atualizou apenas prisma-web. Seu curl imediato retornou404 após recriação, a aplicação estabilizou e passou41smokes sem rebuild adicional; não registrar esse exit como sucesso do dispatcher. Container novo d383f8b175b3, imagem anterior sha256:74df2620bfc6d42a51645762b1a08146722ae3ef42e1b0b74b33ce7a5bb5a0e6 preservada como rollback-before-fa4168c69bc5. Contratos aditivos/portalv1 permanecem; rollback de autoria exige correção forward conforme documento operacional, sem apagar dados. Os demais seis containers mantêm IDs/imagens/restarts. Fechamento documental tem plano sem destino runtime. Arquivos particulares não rastreados preservados.
