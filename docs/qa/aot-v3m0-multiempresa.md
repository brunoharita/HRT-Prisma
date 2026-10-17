# AoT — V3M0 administração multiempresa2.9.0

Acordo `docs/qa/agreement-v3m0-multiempresa.md`1.0.0 e execução correspondente. Fonte: decisões de Bruno neste chat17/10/2026, quatro perfis, Horus como referência principal e mandato final de execução com parâmetros delegados. Baseline7456e22/main2.8.1. Classe D com decisão durável de autoridade registrada no ADR-085. Não há versão3.0.0 implícita.

## Acordos, implementação, testes e evidência

| ID | Implementação | Teste/evidência | Estado local |
| --- | --- | --- | --- |
| D-01 | Quatro opções; alias Admin -> Recruiter, transição auditada como metadata de sistema; helpers/consumidores adaptados | SQL103, Node66 incluindo perfis/rotas; Deno3 com sete cenários do handler de Usuários | PASS |
| D-02 | OrganizationsPage, RPC versionada; grupo/primeira empresa em preparação, criação por Recruiter/Owner/Super | SQL criação/onboarding, limite e dois concorrentes reais; browser114 em1448/390/320 | PASS |
| D-03 | Configuração privada por grupo; capacidade inclui empresas inativas/em preparação; atual2empresas preservado com limite2; sem preço/checkout/gate novo | SQL limites/capacidade/ausência de reciclagem/sem saldo de Tokens por preparação; validação de limites Node | PASS |
| D-04 | Owner único ativo/pendente, designação explícita; principal/situação/revisão; Super preserva consulta global de inativos | SQL Owner duplicado/remoção/ativação inválida/versão/situação e visibilidade; browser metadados | PASS |
| D-05 | Cadastro+membership+audit atômicos em RPC service-only; Edge verifica sessão e compensa somente Auth recém-criado se persistência falha; links locais preservam vínculos externos | SQL persistência/negativos/falha de auditoria e ausência de resíduos; Deno handler real com fetch sintético e sem rede | PASS |
| D-06 | Default resolvido no servidor, comum sem seletor; guards de edição e contexto do shell preservados | SQL múltiplos vínculos/default/PII negada; browser quatro perfis, falha preserva edição, cancelamento e descarte explícito | PASS |
| D-07 | Isolamento/RLS/grants/contrato/locks; documentação e CI/publicação por destinos | Provas locais PASS; publicação e sincronização abaixo | PARTIAL |

| Proibição | Evidência negativa | Estado local |
| --- | --- | --- |
| P-01 | Grupo/empresa cruzados, comum, ausência de identidade, autoalteração, contrato ausente/desconhecido, escopo stale/revogado e endpoint service-only negados. Gate Knowledge real permite Recruiter local e recusa Global/cross-tenant | PASS |
| P-02 | Algoritmos/decisões/ledger de Tokens preservados; guards de autoridade em Processos/matching/reserva e Knowledge. SQL preserva memberships e replay de reserva; corpo anterior das nove funções preservado exceto guard; contratos/métodos e quotes congelados | PASS |
| P-03 | Migrations históricas intactas; sem3.0.0; reused Auth/RLS/AntD/Horus, sem nova dependência | PASS |

## Mapa de impacto e preservação final

Mantém o mapa do acordo, anterior à implementação, com a revisão abaixo por dependências descobertas. Direct: administração/Usuários/shell e guards de autoridade Knowledge/Processos/matching/reservas; critical_transversal: roles/RLS/tenant/PII; plausible_indirect: Banco/erasure e jornadas de talentos. Regressão:66Node em11arquivos;38tooling de quotes/processos/navegação/release;3Deno (sete cenários do handler, histórico Knowledge e quatro modos negados antes de provedor/escrita),103SQL e114browser. Tipos root/web, build web, lint/foundation/contexto conforme local-validation.json. Não se executou validate integral local; CI geral continua obrigatório.

Revisão do mapa durante a implementação: consultas diretas por service-role em Knowledge e nove funções SQL não passavam pela RLS. A situação da empresa passou a ser verificada nesses limites existentes. São oito guards de entrada (follow-up e matching) e um antes de nova reserva, depois do replay existente. Algoritmos, ACLs e liquidações não mudam. A migração exige nomes/argumentos e quantidade esperados e aborta diante de drift; não substitui código desconhecido. Evidência de preservação dos corpos remotos será registrada no rollout.

Baseline operacional conferido somente leitura: Supabase Prisma ioldpnqqvobprjiontre,17.6ACTIVE_HEALTHY,1grupo/2empresas/1Owner ativo; sem conflitos de Owner. Remoto único produtivo, sem QA remoto separado. Duas Edge Functions instaladas tinham entradas byte-equivalentes ao baseline normalizado: platform-users v5 e knowledge-agent v22, ambasJWT=true. Helpers remotos de papel/validação/erasure correspondem ao contrato local anterior. Não foram lidos currículos ou dados pessoais de talentos.

SQL usa PostgreSQL17 isolado localhost5846, schemas/tabelas/helpers/policies e gate follow-up extraídos das fontes reais pertinentes; Auth.uid substituído por fixture de sessão. Sete funções matching e a reserva usam delegação sintética com os mesmos argumentos de autoridade: comprovam guard, preservação do corpo, negação e replay, não algoritmos de negócio completos. Não é reset integral do Supabase nem teste empírico de login. Banco descartável encerrado pelo roteiro. Browser usa componentes reais e transporte sintético sem rede externa,12estados por perfil/viewport, nove capturas mais recuperação. Inspecionadas desktop1448 e mobile320, título/ações sem corte após correção necessária. Tabela móvel mantém rolagem horizontal interna; sem overflow de página.

O mapa foi precisado na capacidade: inativar não libera slot, evitando reciclagem de cadastro/franquia e respeitando a separação Horus entre situação e contratação. Configuração inicial é provisória, não evidência de compra. Principal e Owner preservados; migração registra parâmetros/aliases como sistema, sem inventar autoria humana. F-01 preservado: preços definitivos, redistribuição comercial de funcionalidades, transferência de controlador/Owner, compartilhamento, consolidação de negócio e cobrança fora do movimento.

## Desvios e limites

Sem desvio dos quatro perfis/escopos aprovados. Não é clone literal de módulos de tarefas/PTI/IA comercial do Horus. Downgrade comercial ampliado não foi importado; capacidade incompatível é recusada, não suspende arbitrariamente empresas. Sem escala Enterprise validada, SLA ou promessa de contratação. Auth externo e domínio não formam transação distribuída: criação tem compensação, atualização de metadados Auth conserva o fluxo existente. Nenhuma chamada paga/decisão/Perfil publicado para validar. Jornada autenticada humana de produção permanece NOT TESTED até evidência específica; SQL e browser sintético não a substituem.

Ocorrências locais: launcher PostgreSQL no Windows reteve handles de stdout; corrigido para stdio ignorado apenas em pg_ctl e encerrado exclusivamente o cluster descartável da tarefa. Ambiguidade de alias SQL detectada/corrigida antes do rollout; fixture de falha de auditoria corrigida para NOT VALID sobre histórico anterior; teste de descarte passou após aguardar o desmontar do modal. Não eram regressões produtivas. Avisos AntD de API depreciada/contexto/form e warnings prévios de chunk/import dinâmico não geraram exceção; nenhuma refatoração adjacente.

CI inicial39004033908 recusou três testes: dois avisos da nova tela sem ação contextual e duas asserções históricas de autoridade (settings e exclusão) ainda restritas ao Admin. Adicionadas recuperação no próprio aviso e asserções Recruiter; testes dirigidos9Node/5tooling e recuperação browser passaram. Nenhuma mudança remota ocorreu antes da correção.

Primeira aplicação remota recusada por dois vínculos Super legados incompatíveis com o validador anterior. Reversão transacional comprovada: configurações/colunas novas ausentes e zero entrada no ledger. A migração preserva esses vínculos sem default/conversão, mantém novos vínculos Super proibidos e deriva autoridade global do perfil ativo. Fixture de legado adicionada;103SQL PASS. Nenhuma limpeza de dados ou desativação de trigger ocorre na migração.

## Publicação, rollback e sincronização

Pendente. Somente migration nova, platform-users, knowledge-agent e web. Banco antes de consumidores; CI obrigatório. Preservar rollback da imagem web e versões anteriores Edge. Correção DB por migration forward, sem rebaixar usuários ou reescrever histórico automaticamente. Outros serviços VPS preservados por IDs/imagens/restarts observados. Conclusão geral PARTIAL enquanto esta seção não estiver comprovada.
