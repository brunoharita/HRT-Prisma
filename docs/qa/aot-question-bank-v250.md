# AoT — Banco de questões 2.5.0

Contrato congelado: `docs/qa/agreement-question-bank-v250.md` v1.0.0, integral; execução `docs/qa/execution-question-bank-v250.md`. Mapa prévio `docs/qa/impact-question-bank-v250.md`. Baseline main `a23d82edd317ca109b9ea20ef4d53f86767d92ec`; branch `codex/v2m5-question-bank`. Risco D. Evidências em `docs/qa/evidence/question-bank-v250/`.

## Matriz de acordos

| ID | Implementação | Teste/evidência | Status | Ambiente e limite |
| --- | --- | --- | --- | --- |
| D-01 | Rótulo e descrição operacional, componentes Prisma | browser/catalog quatro larguras; rota e registro de release | PASS | Componentes reais/fixtures |
| D-02 | Questões padrão, Para revisar com pendências; acessos secundários | browser/two main areas, pending excludes closed | PASS | Sem nove abas/indicadores vazios |
| D-03 | Catálogo autorizado global/empresa; filtro secundário | browser/combined filters; SQL/owner/global/cross-tenant | PASS | Nenhum novo papel |
| D-04 | Identificação por conteúdo, estados discretos completos | domain/availability; catalog quatro larguras | PASS | Disponibilidade não inventa elegibilidade |
| D-05 | Busca normalizada, filtros/limpar, paginação estável | browser/search/filter/pagination; domain/search | PASS | Consulta em memória proporcional ao workspace existente |
| D-06 | Conteúdo completo antes de metadados; gabarito no RPC protegido | SQL/full content e negativas anon/member/tenant; browser/detail | PASS | Acesso não depende só da interface |
| D-07 | Drawers responsivos; contexto/seleção/retorno separados | browser/close/Escape/pagination/drafts, states/scope | PASS | Rascunho preservado na sessão por organização |
| D-08 | Fila pendente e filtros para histórico encerrado | browser/pending; states/closed proposal | PASS | Nível da competência distinto da dificuldade |
| D-09 | Revisão integral, consulta encerrada, checkbox só aprovado | browser/review e batch; SQL/locked/valid content | PASS | Histórico2..6, processo exatamente5, sem conversão artificial |
| D-10 | Validação estrutural e razões; comparação completa | browser/comparison desktop/mobile; SQL/invalid/duplicate | PASS | Similaridade lexical secundária, sem garantia |
| D-11 | Nenhum prefill/decisão; motivos e rascunhos preservados | browser/empty rationale/disabled/draft; SQL/min10 | PASS | Sem conclusão humana fabricada |
| D-12 | RPC transacional aprovar/publicar, auditorias separadas | SQL/audit/idempotence/global; concurrency2conexões; browser/review-only | PASS | Reutiliza governança existente |
| D-13 | Aprovação comum vazia; exceções/rejeição/ajustes motivados | SQL/ordinary/exception/invalid atomic; browser/common | PASS | Revisão versionada2.0.0 |
| D-14 | Lote explícito com quantidade/destinos/origem | browser/batch; SQL/mixed tenant/status/rollback | PASS | Aprovados não selecionados preservados |
| D-15 | Cobertura/modelo, composição e reserva separadas | SQL/coverage; browser/coverage; states/admin | PASS | Reserva não prova impossibilidade |
| D-16 | Uma confirmação contextual, escolhas com efeito real | browser/generation; states/quantity/cancel | PASS | Cancelar não prepara/cobra/gera |
| D-17 | Boundary e ledger/tarifa existentes, cotação antes da ação | SQL/quote/reserve/settle/expiry/balance; Deno/usage/replay; browser/tokens | PASS | Nenhuma IA viva paga; fluxo condicionado à política |
| D-18 | Fake/preview em ferramentas administrativas identificadas | states/settings/explicit selection; SQL/fake4alternatives | PASS | Política produtiva desativada preservada |
| D-19 | Resultado/histórico reconhecíveis, pedido/produção separados | SQL/history; browser/history; Deno/replays | PASS | Andamento consulta sem retry automático |
| D-20 | Qualidade no detalhe com flags/evidência existentes | states/quality-review; SQL/snapshot enrichment | PASS | Sem novos limiares |
| D-21 | Null≠zero, amostra/método/data/limites | domain/absence; states/actual zero/synthetic/real-shaped | PASS | Período/observações válidas ausentes explicitamente |
| D-22 | Taxas sem metas, mediana min/s, limites de quantis/índice | states/quality e domain/time/rates | PASS | Sem inferência de fraude ou decisão sobre Pessoas |
| D-23 | Família real, conteúdo/autor/data por versão | browser/history e detail; SQL/preserved rows | PASS | Sem heurística de código/limite de oito; autoria ausente não reconstruída |
| D-24 | Configurações pela autoridade, consulta verdadeira | SQL/permissions; states/configuration/admin | PASS | Gerenciamento central pelo fluxo operacional existente |
| D-25 | Sem teto comunica indisponibilidade; finanças distintas | states/configuration; browser/generation unavailable | PASS | Sem barra vazia/preço falso/certificação jurídica |
| D-26 | Hierarquia conteúdo/decisão, ações azuis e rodapé | capturas catalog/detail/review/comparison/settings; inspeção | PASS | Mesmo conjunto de dados em1448/768/390/320 |
| D-27 | Loading real, preservação, estados/erros/recuperação | browser/hold/failure/empty; states; errors+loading coverage | PASS | Nenhum loading cria consulta/IA/recalculo |
| D-28 | Responsividade, teclado, labels e abertura explícita | browser/Escape/Enter/overflow; long detail desktop/390/320 | PASS | Sem referência normativa final de pixels |
| D-29 | Governança/tenant/histórico e consumidores preservados | regression-sql131; process64/portal38; navigation/loading/UX/Tokens | PASS | Evidência local sintética, sem Pessoas produtivas mutadas |
| D-30 | Versão, fontes, Context Pack, rollout e sincronização | Plano/CI/banco/Edge/web/smoke ainda em fechamento | PARTIAL | Atualizar somente após prova operacional |

## Proibições verificadas

| ID | Guardrail e teste negativo | Evidência | Status |
| --- | --- | --- | --- |
| P-01 | Nenhuma decisão/prefill/auto-publicação; motivos e seleção humana | browser/drafts/batch; SQL/no orphan review/no automatic publication | PASS |
| P-02 | Anon/member/inativo/outsider/global indevido/cross-tenant negados | SQL52 e integração131; grants e governança existente | PASS |
| P-03 | Versões/histórico preservados; origem sintética explícita | SQL/preserved items/legacy snapshots; browser/history/test tools | PASS |
| P-04 | Null distinto de zero, amostra/índice com limites | domain/metrics; states/quality | PASS |
| P-05 | Sem arquitetura/provider/prompt/tarifa novos, geração explícita, sem retry pago | diff; Deno/all statuses replay/no quote/unknown usage; SQL/budget | PASS |
| P-06 | Diagnóstico secundário, rascunhos/seleção/contexto preservados | browser/detail/history/drafts/pagination/loading | PASS |
| P-07 | Somente diff autorizado; sem force/destruição/PII | revisão do diff, hashes agregados produtivos e plano limitado | PASS |
| P-08 | Fixtures não apresentadas como jornada real/calibração | limites deste AoT e evidências de browser/SQL | PASS |

## Mapa final de impacto e preservação

| Capacidade | Relação | Baseline e regressão | Evidência/status |
| --- | --- | --- | --- |
| Catálogo/detalhe/versões | direct | M5.1C completo e autorizado, família real, null; sem destruir linhas | SQL/browser/states, PASS |
| Revisão/comparação/publicação | direct | Auditorias e autoridade existentes; transação, validação e motivos | SQL/concorrência/browser, PASS |
| Cobertura/geração/admin | direct | Elegibilidade e reserva existentes, fake histórico; política desativada | SQL/cancel/quote/admin, PASS |
| Tokens/orçamento/história IA | critical_transversal | ADR-083 e mesma tarifa/ledger; replays e falhas | SQL negativos/settlement, Deno e serviço Tokens, PASS |
| Processo/composição/revisão/envio | plausible_indirect | Banco canônico/five-choice/novo contexto/freeze/convites | regression-sql131 e regression-process64, PASS |
| Portal/correção/prova fixada | critical_transversal | Portal v1 compartilhado, autosave/revisão/envio/recibo e legado | regression-sql e regression-portal38, PASS |
| Shell/navegação/loading/foco | plausible_indirect | Rótulo da rota e CSS isolado, retorno/escopo/teclado | Node/navigation/UX/loading e browser, PASS |
| Pessoa/Perfil/Score/Posições | no_impact_identified | Sem escritor modificado; snapshots QA preservados | regression-sql/preservation e diff, PASS |
| Parser/Synthesis/mail/Paddle/Traefik | no_impact_identified | Nenhum diff dessas superfícies; baseline operacional capturado | production/runtime-before; verificar preservação após rollout |
| Outras Configurações/Knowledge | no_impact_identified | Sem redesign/taxonomia/novo blueprint/modelo | diff e operational source guards, PASS |

Nova entrega comprovada: topologia Questões/Para revisar, revisão contextual e consulta completa, geração cotada e administração secundária. Preservação é evidência separada do comportamento novo. Descoberta relevante: M5.1C tem contrato histórico diferente do processo; preservados ambos. Configuração externa produtiva ausente foi exposta, sem selecionar/ativar alternativa.

Limitação de baseline: o PostgreSQL descartável original tem arquivo físico ausente de `profile_synthesis_jobs`, observado no cenário de exclusão durante regressão de processo. Não foi reparado/mutado. A regressão completa foi executada em clone próprio de schema, com apenas sementes técnicas locais;131verificações passaram. A concorrência usa duas conexões no mesmo clone, com fixture sintética e justificativa de exceção explícita; uma revisão e uma versão publicadas. Clone removido ao final. Testes somente banco52 também passaram com rollback no baseline original. Sete definições runtime produtivas e locais são canonicamente iguais (diferenças só de formatação), conforme production/compatibility.json.

## Fora de escopo

F-01 a F-05 preservados: sem redesign de outros módulos, calibração real/limiares/Score, provedor/modelo/arquitetura nova, permissões adicionais, limpeza de dados, Pessoas reais para teste, mockup pago ou suíte integral local. Nenhum novo pacote/dependência. Reuso dos componentes Prisma, M5.1C e ADR-083; adaptações mínimas autorizadas A-01..A-04.

## Fidelidade e evidência visual

Não há mockup normativo final, conforme A-03; screenshot anterior foi classificado como contraexemplo. Comparação estrutural utiliza mesmos dados/estados de fixtures em1448/768/390/320, catalog/detail/review/comparison/coverage/history/error/generation-unavailable e states/long/quality/settings. Catálogo prioriza conteúdo, detalhe usa largura apropriada, comparação vira sequência no celular, filtros/retorno/ações permanecem. Corrigidos overflow de aviso sintético e perda de largura das abas no mobile. Sem alegação de identidade de pixels ou validação real a partir de screenshot.

## Desvios e decisões

Nenhum desvio de produto identificado após comparação D/P/F/A. Nenhuma nova decisão material. Boundary versionado2.0.0 incorpora cotação obrigatória, destino explícito e custo desconhecido indisponível; aceita requisição1.0.0 apenas com as mesmas guardas, sem novo prompt/schema de proposta. Contrato de revisão2.0.0 explicita justificativa comum opcional, sem retirar obrigações de exceções.

## Validação final e limites

UI principal191verificações; estados30; processo64; portal38. SQL52 + integração131 e uma disputa concorrente. Deno5testes (inclui cinco estados replay, modelo divergente, cotação ausente, entrega válida e uso desconhecido). Node dirigido:39domínio/serviço/erros e23navegação/UX/registro/loading/operational. Types/build web/raiz e checks de contexto serão registrados no fechamento. Nenhum LLM vivo, e-mail real ou decisão sobre Pessoas em produção. Não existe QA remoto separado; QA-first local isolado verificado. Jornada autenticada real e calibração empírica: NOT TESTED, fora da prova pretendida deste redesenho.

## Git / QA / produção

Rollout pendente de fechamento: publicar somente duas migrations novas, Edge `assessment-item-generator`, web e documentação/contexto, conforme plano por diff comprometido. Backend antes do web. Baseline: projeto Prisma `ioldpnqqvobprjiontre` ACTIVE_HEALTHY; Edge7 ACTIVE/JWT obrigatório; VPS `prisma-vps` `/opt/prisma` remoto autorizado, SHA a23d82e,10containers/218assets. Dados produtivos apenas por contagens/hashes agregados:11Pessoas,15Perfis,2avaliações,17questões,3propostas/solicitações/revisões e2políticas. Sem dados pessoais em evidências.

Não declarar D-30 PASS nem conclusão operacional até conferir CI, migrations/grants/definições, Edge, SHA/runtime/assets/rollback, smoke público, dados agregados e sincronização.
