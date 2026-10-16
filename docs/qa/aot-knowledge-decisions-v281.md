# AoT — decisões de Conhecimento2.8.1

Acordo1.0.0 e execução `knowledge-decisions-v281`, fonte Bruno16/10/2026. Baseline cb0c629fbabd019d72e4075ee63ba2190f98e2f3. Classe D. Reuso: RPCs/AntD/fixture/roteiro atuais. PostgreSQL17 nativo já instalado para banco local descartável; Docker local indisponível, sem nova dependência ou infraestrutura remota. Projeto Supabase Prisma ioldpnqqvobprjiontre confirmado ACTIVE_HEALTHY; único remoto produtivo, sem QA remoto separado conforme operations/environments.md. Nada é inferido do antigo nome QA.

## Mapa de Impacto anterior à implementação

| Capacidade | Relação | Baseline / regressão mínima |
| --- | --- | --- |
| Decisões da aba Propostas | direct |2.8.0:4ações incluindo pesquisa, motivo>=5 no frontend; clique vazio/curto nas2decisões novas, estados inválidos e falhas recuperáveis |
| RPC de manutenção local | direct | Produção conferida: rejected/deferred, motivo>=5, lock/estado/auditoria. Novo SQL em PG17 descartável, positivos/negativos e atomicidade |
| Autoridade/tenant/origem/auditoria | critical_transversal | Helper real exige Super Admin global; grants e políticas intactas. Testes negativos e snapshots sintéticos de origem/histórico |
| Aprovação/classificação/certificação | plausible_indirect | RPCv2 existente aceita motivo opcional; preservar assinatura/delegação e guardas. Browser valida payload e bloqueios com motivo vazio |
| Contenção e abas vizinhas | plausible_indirect | Correção2.8.0 e7cartões produtivos preservados; geometria1448/390/320, histórico e aba local sem decisões globais |
| Transição legada/macróareas/outros fluxos | no_impact_identified | Ramos separados, não usam RPC alterada; revisão de referências e teste legado atual preservado |
| Backend/IA/Score/perfis | no_impact_identified | Nenhuma mudança nesses serviços/dados; plano deve excluir Edge/Parser e outros containers |
| Hospedagem/registry | direct | Produto2.8.1, CI, migration antes do frontend, rollback web e forward fix DB, smoke somente leitura e sincronização |

Validação mínima e término: SQL real em PG17 local com fixtures e sem dados reais, testes browser focados e regressão dos contratos atingidos; tipos/build/lint/foundation/contexto, CI obrigatório. Finalizar quando D/P PASS, docs/evidência e rollout seletivo/smoke/sync concluídos. Não estender a outras curadorias. Baseline operacional e definições remotas lidos sem acessar conteúdo pessoal. Nenhuma mutação remota de teste.

| ID | Implementação | Evidência | Estado |
| --- | --- | --- | --- |
| D-01/02 |2decisões, motivo opcional, service tipado somente deferred |30checks de clique/estado/falha/histórico,78com reflow | PASS |
| D-03/04,P-01/02 | Migration real aceita apenas deferred e motivo opcional; auth/locks/estado/auditoria/ACL preservados |29checks PG17 local;13testes de contrato/legado/release; sem mutações de teste remotas | PASS |
| D-05 | UI/registry2.8.1, baseline responsivo preservado | Tipos root/web, builds, lint/foundation PASS; CI/rollout/smoke/sync pendentes | PARTIAL |

Desvios: nenhum. Limites/recibos serão completados durante a execução.

## Evidência local

`tests/tooling/knowledgeDecisions.postgres.mjs` executa SQL real em PostgreSQL17 local127.0.0.1:5840, cluster descartável em tmp.29checks PASS: null/vazio/espaços/1caractere; auditoria autor/data/ação/motivo; rejected/null/approved/desconhecido recusados; anon sem EXECUTE, falta de ator/usuário comum negados; organização/origem/estado inválidos e retry recusados; falha de auditoria reverte atualização; histórico e origem sintéticos intactos; ACL de authenticated/anon/service_role preservada e reaplicação da migration sem perda histórica. Fixture usa helper require_knowledge_admin real e identidades/consultas de papel sintéticas. Prova cobre a RPC alterada; não é reprodução integral de RLS/Supabase Auth, que não foram modificados. Aprovação global real não foi executada; suas3definições remotas foram conferidas, continuam sem gate de motivo e com taxonomia/autoridade anteriores, código não alterado.

Browser com componentes reais/transporte sintético:30checks em1448/390/320, quatro cliques por largura (aprovação/local sem motivo, aprovação/local com1caractere), payload exato, classificação/certificação preservadas, falha deixa pendente e retém texto, rejeição histórica legível e perfil da empresa sem aba Global.48checks adicionais de reflow1448/1265/390/320,20capturas; comparação textual desconta somente o rótulo aprovado e ação removida. Captura390 inspecionada visualmente, sem estouro; pesquisa não acionada. A rodada inicial de identificação do PG usou representação inet com máscara/32; corrigida a asserção para host(), sem mudança de produto. Nenhuma outra falha local.

13testes focados de decisões/M7.7/legado/registry PASS; tipos root/web e build web, lint/foundation PASS. Avisos AntD/chunk/import dinâmico são anteriores e não geraram exceções. Sem suíte integral local; CI geral continua obrigatório. Arquivos e releases históricos não foram reescritos.

Produção é remoto único; nenhuma QA remota separada. Método local é SQL real descartável mais browser sintético. Rollout só após CI, migration revisada antes do web; manter histórico e auditoria é obrigatório. Rollback web por imagem anterior; DB por forward fix preservando a recusa de novas rejeições, sem script que reescreva decisões reais.
