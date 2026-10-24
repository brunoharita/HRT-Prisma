# AoT — Origem única da verdade

Contrato de referência: decisão explícita de Bruno em 24/10/2026 e acordo documental 1.0.0 abaixo. Baseline: main `956c61e9765ef3ef7a8b0ba671561f5ba57a1d72`, AGENTS1.3.3 e produto3.1.4. Escopo documental; não comprova conformidade integral do legado.

## Acordo e execução 1.0.0

- D-01: registrar em AGENTS e arquitetura o reuso/ampliação das estruturas proprietárias originais, sem tabelas/entidades concorrentes para o mesmo objetivo, aplicável a todas as próximas implementações.
- D-02: limitar a exceção a desempenho comprovado, mantendo dados derivados reconstruíveis, origem/versionamento e ausência de edição/autoridade independente.
- D-03: preservar responsabilidades distintas de propostas/evidências/histórico, escopos organizacional/global e curadoria; consolidar referências e Context Pack.
- P-01: não alterar runtime, banco, contratos persistidos, dados, decisões humanas ou versão pública; não implementar RAG ou consolidar legado.
- F-01: migração, auditoria integral do legado, novos modelos, tabelas ou funcionalidades.
- A-01: redação e localização dos registros e validação documental proporcional delegadas à engenharia.
- Q: nenhuma decisão material pendente para este registro.
- CA-01: os documentos explicitam D-01/D-02/D-03, links resolvem, check:foundation/context passam e diff contém somente documentação autorizada.

Execução: atualizar AGENTS para1.3.4, regra normativa GOV-02 no Modelo de dados, referência em arquitetura do sistema, ADR-088 e índice/estado atual; gerar exportações de snapshot rastreado. Validar apenas documentação e sincronizar Git conforme autorização permanente. Não há superfície executável para QA/deploy/smoke de runtime.

## Matriz de Acordos

| ID | Acordo | Implementação | Teste | Evidência | Status | Ambiente / limitação |
| --- | --- | --- | --- | --- | --- | --- |
| D-01 | Reuso e origem única | AGENTS1.3.4 / Modelo de dados GOV-02 / ADR-088 | Revisão dirigida e links | 7 documentos / 75 links locais válidos / whitespace PASS | PASS | Documental |
| D-02 | Exceção estrita por desempenho | GOV-02 / ADR-088 | Revisão de condições e limites | Baseline, gargalo, alternativas, benefício, ADR e derivação sem edição independente explícitos | PASS | Sem exceção aplicada |
| D-03 | Responsabilidades e referências preservadas | GOV-02 / estado atual / exportações | Foundation e contexto | check-foundation e check-prisma-context PASS em snapshot rastreado | PASS | Sem consolidação de legado |

## Proibições verificadas

| ID | Guardrail | Teste negativo | Evidência | Status |
| --- | --- | --- | --- | --- |
| P-01 | Somente documentação | Revisar lista de arquivos e diff; ausência de migrations/runtime/registry | Dispatcher1.0.6: documentation/context-pack; destinos executáveis vazios | PASS |

## Mapa de Impacto e Preservação

Mapa inicial registrado antes da implementação: comportamento dos agentes e arquitetura são direct; Context Pack é plausible_indirect por geração; schema/runtime/Auth/tenant/Score/histórico são no_impact_identified porque o movimento apenas registra instruções e não altera seus escritores, consumidores executáveis ou contratos. Nenhuma jornada critical_transversal executável entra no escopo.

| Capacidade protegida / área | Relação | Impacto previsto | Baseline | Regressão executada | Evidência | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Agentes e arquitetura | direct | Norma explícita | SHA baseline / AGENTS1.3.3 | Revisão normativa e foundation | Links válidos; foundation PASS | PASS |
| Context Pack | plausible_indirect | Propagar norma sem rascunhos | Exportações rastreadas | Gerador e checker em snapshot exato | 5 fontes canônicas / 2 artefatos gerados / checker PASS | PASS |
| Runtime, banco e dados | no_impact_identified | Nenhuma mudança executável | Produto3.1.4 / baseline | Diff e plano documental | Nenhuma migration, Edge, web ou serviço no plano | PASS |

### Novidade e preservação

Entrega nova: diretriz normativa para próximas implementações, sem afirmar que todo o legado foi auditado. Preservação comprovada pelo diff: produto3.1.4, dados e contratos executáveis não alterados; trabalho alheio não rastreado excluído do snapshot e preservado. Nenhuma reclassificação de impacto ou nova superfície executável descoberta.

## Fora de escopo preservado

| ID | Evidência no diff | Status |
| --- | --- | --- |
| F-01 | Ausência de implementação/migração/modelo novo no diff e dispatcher | PASS |

## Evidência de fidelidade visual

Não aplicável: nenhum pedido de mudança de tela ou referência visual normativa neste movimento.

## Desvios / Mudanças autorizadas durante a execução

Nenhum desvio do acordo. Autoridade: pedido explícito para registrar esta diretriz, sem nova decisão funcional. Não houve ampliação do escopo.

## Validação final

Revisão dirigida do diff, whitespace e 75 links locais de 7 documentos PASS. Dispatcher1.0.6 do diff staged: somente documentation/context-pack, sem destino de runtime. Snapshot produzido por checkout-index dos arquivos rastreados/staged, excluindo rascunhos alheios. Scripts de generate-prisma-context, check-prisma-context e check-foundation PASS; equivalem aos scripts pnpm homônimos definidos em package.json. A preparação automática de dependências acionada por duas chamadas pnpm no mesmo snapshot encontrou EBUSY; chamadas interrompidas e validadores sem dependências executados diretamente pelo Node, sem mudança do lockfile. Sem suíte integral local, chamadas pagas ou validação de runtime por não haver alteração executável. CI obrigatória preservada.

## Git / QA / ambiente

Branch `codex/canonical-data-authority`; baseline acima. Commit/push e integração documental em main seguem a autorização permanente; SHA e resultado de CI são verificados no fechamento operacional. QA/produção de runtime fora de escopo; rascunhos não rastreados preservados. Nenhum acesso/deploy da VPS é necessário para este plano documental.

## Conclusão

D-01/D-02/D-03/P-01/F-01 PASS nas evidências documentais delimitadas. Diretriz registrada sem alterar estruturas de dados nem implementar o fluxo de RAG. Sincronização Git/CI faz parte do fechamento; nenhum resultado de runtime ou conformidade integral do legado é declarado por estes checks.
