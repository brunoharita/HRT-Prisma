# AoT — revisão humana de divergências da trajetória

Contrato: `docs/qa/agreement-matching-human-conflicts.md` v1.0.0. Baseline: `main` e0e8289; divergência entre duas leituras validadas conservava o matching interno, sem tratamento de itens. Nenhum Perfil real foi reprocessado para esta validação.

## Acordos e proibições

| ID | Implementação | Evidência | Estado |
| --- | --- | --- | --- |
| D-01 | Comparação por ID/categoria no domínio compartilhado; par validado | 91 testes de domínio, incluindo ordem/citação e limites | PASS |
| D-02 | Edge projeta até cinco conflitos para operador autorizado; componente no cartão do grupo pré-IA mostra trecho/categorias/evidências | Testes Edge/SQL, typecheck/build, bundle público contém o componente; visual autenticado ainda não verificado | PARTIAL |
| D-03 | RPC de revisão verifica fontes, tenant, papel, cache, escolhas; auditoria com ator/horário | PostgreSQL local transacional e casos negativos | PASS |
| D-04 | Leitura composta versionada, mesmo score e snapshot com proveniência; não determinado conserva pré-IA | Testes de domínio, Edge e snapshot SQL | PASS |
| D-05 | Mais de cinco conflitos sem salvamento e sem substituir cálculo interno | Testes domínio, Edge e PostgreSQL | PASS |
| P-01 | Sem escolha automática, zero ou Grupo C por discordância | Testes de fallback | PASS |
| P-02 | Sem revisão por membro, tenant alheio, versão obsoleta ou item inválido | PostgreSQL e Edge | PASS |
| P-03 | Nenhuma escrita na Knowledge/Perfil/Posição, currículo bruto ou score do cliente | Inspeção do diff, RPC service-only, snapshot compartilhado | PASS |

F-01 preservado: sem mudança de modelo, prompt, pesos, triagem, Knowledge, requisitos ou reprocessamento pago. A-01: tabela auditável nova e componente na busca existente; não foi criada base paralela.

## Mapa de preservação

| Capacidade | Relação | Baseline e regressão | Estado |
| --- | --- | --- | --- |
| Cache, último par, lease, retry | direct | M83/M84/M86/2.1 + par auditado no PostgreSQL local; par original conservado | PASS |
| Matching, score, fingerprint | direct | 91 testes de domínio; leitura revisada muda score/fingerprint, fallback não muda | PASS |
| Edge, snapshot, autorização | direct/critical_transversal | 35 testes Deno; SQL local aceita somente revisão com ID/versão autenticados | PASS |
| Busca/comparação e tela | direct | Typecheck/build e bundle público 200; cartão mantém grupo e score internos; smoke visual autenticado pendente | PARTIAL |
| Privacidade e isolamento | critical_transversal | Negativos de grants, RLS, role, tenant, fontes obsoletas e evidência inventada | PASS |
| Knowledge, parser, requisitos | no_impact_identified | Sem diff funcional nem escrita nessas fontes; comparação preserva motor existente | PASS |

## Validação, rollout e limites

Local: `pnpm run typecheck`, `pnpm run build`, `node --test dist/tests/semanticTrajectory.test.js` (91/91), `deno check` e `deno test` focados (35/35) passaram. PostgreSQL 17 isolado em loopback, banco descartável, aplicou as migrações relevantes e executou transação com rollback: M83, último par e revisão humana, incluindo aceitação/rejeição do snapshot, seis conflitos, decisão não determinada, grants/RLS e fonte obsoleta. Nenhuma chamada ao provedor de IA nem dado pessoal real.

Não há QA remoto separado; o gate foi local com fixtures sintéticas. CI inicial de branch `36756152129` falhou em um teste de texto causal da notificação; correção dirigida passou localmente (7/7), e os CIs de branch `36756588104` e main `36756887575` aprovaram o SHA funcional `998d25ae5253f4a1534ffa39a0b878bb69d517c4` (incluindo 716 testes no pipeline). Esse código funcional está publicado em `main` local/GitHub e VPS `/opt/prisma`. Migration remota `20260930181341_matching_human_conflict_review` presente, RLS ativo, `authenticated` sem SELECT/EXECUTE de revisão e `service_role` com RPC; Edge `matching-trajectory` v14 ACTIVE/JWT com 12 arquivos idênticos e POST anônimo 401. Web `prisma-web` na imagem `sha256:c304e0dce254e99cf154096fe9ed9dff24230caded6835f5655ae7a5150062ef`, `running` e zero reinícios; rollback `prisma-web:rollback-before-998d25ae5253` aponta à imagem anterior `sha256:a20b817629afc87665498542f5102e7e132b0a9356b4cf9d1ef78d3b8e97dec8`. Smoke do script recebeu 404 imediatamente após a troca e saiu com erro; checagem posterior de `/`, `/login`, `/index.html` e asset novo retornou 200, inclusive texto da revisão. A recusa anônima da Edge e o smoke público não provam a jornada autenticada.

Nenhum Perfil real foi reanalisado, nenhuma chamada paga foi feita e nenhuma escolha humana foi inventada para teste. A experiência autenticada de abrir, escolher e salvar uma divergência real, com recálculo visto na tela, permanece **NOT TESTED**; por isso D-02 e a preservação visual continuam PARTIAL, embora backend, Edge e frontend estejam publicados. A revisão não garante que uma das respostas da IA esteja correta: a Pessoa autorizada deve fundamentar a escolha.

## Desvios

Nenhum desvio funcional conhecido. O primeiro CI e o smoke HTTP imediato falharam pelos motivos descritos e foram resolvidos/verificados sem alterar outros serviços; não os registrar como PASS. A ausência de prova visual autenticada limita o aceite integral do D-02.
