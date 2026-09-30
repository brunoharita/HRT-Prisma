# AoT — revisão humana de divergências da trajetória

Contrato: `docs/qa/agreement-matching-human-conflicts.md` v1.0.0. Baseline: `main` e0e8289; divergência entre duas leituras validadas conservava o matching interno, sem tratamento de itens. Nenhum Perfil real foi reprocessado para esta validação.

## Acordos e proibições

| ID | Implementação | Evidência | Estado |
| --- | --- | --- | --- |
| D-01 | Comparação por ID/categoria no domínio compartilhado; par validado | 91 testes de domínio, incluindo ordem/citação e limites | PASS |
| D-02 | Edge projeta até cinco conflitos para operador autorizado; tela mostra trecho/categorias/evidências | Testes Edge/SQL e build web; visual autenticado ainda não verificado | PARTIAL |
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
| Busca/comparação e tela | direct | Typecheck/build; smoke visual autenticado pendente | PARTIAL |
| Privacidade e isolamento | critical_transversal | Negativos de grants, RLS, role, tenant, fontes obsoletas e evidência inventada | PASS |
| Knowledge, parser, requisitos | no_impact_identified | Sem diff funcional nem escrita nessas fontes; comparação preserva motor existente | PASS |

## Validação, rollout e limites

Local: `pnpm run typecheck`, `pnpm run build`, `node --test dist/tests/semanticTrajectory.test.js` (91/91), `deno check` e `deno test` focados (35/35) passaram. PostgreSQL 17 isolado em loopback, banco descartável, aplicou as migrações relevantes e executou transação com rollback: M83, último par e revisão humana, incluindo aceitação/rejeição do snapshot, seis conflitos, decisão não determinada, grants/RLS e fonte obsoleta. Nenhuma chamada ao provedor de IA nem dado pessoal real.

QA, CI, main, VPS e produção: **NOT TESTED** neste registro inicial; atualizar somente após evidência. Smoke autenticado com Perfil real não é parte do teste, pois exigiria mutação desnecessária. Falha do provedor continua usando fallback causal. A revisão de até cinco conflitos melhora a utilidade do resultado, mas não garante que uma das respostas da IA esteja correta; o operador continua responsável por fundamentar a escolha.

## Desvios

Nenhum desvio funcional conhecido neste estágio. Evidência visual e rollout ainda pendentes; não declarar entrega final antes deles.
