# AoT — atualização de campos simples do Perfil

Contrato: `docs/qa/agreement-profile-publication-scalar-fix.md`v1.0.0. Baseline4c4db24. Fonte: screenshot como contraexemplo, logs produtivos23/10/2026 às14:22/14:23UTC com23514/profile_publication_decisions_check e leitura delimitada de revisão draft com mudança de professionalTitle. Nenhum conteúdo curricular versionado. A causa confirmada é a divergência entre constraint de auditoria e validador/RPC; campo simples legitimamente não possui targetBlockId.

## Mapa de impacto inicial e preservação

| Capacidade | Relação | Baseline / regressão mínima | Status |
| --- | --- | --- | --- |
| Auditoria/publicação de campos simples | direct | Baseline23514 reproduzido; título/resumo publicados e auditados sem IDs; quatro combinações merge/replace e update/replace com sete campos/listas e replay | PASS local |
| Blocos de experiência/formação/resultados/seções | plausible_indirect | Oito pares root/ação sem destino falham23514; validador rejeita destino ausente/desconhecido; atualização válida de experiência preservada | PASS local |
| Organização/papel, lock, replay, escrita direta | critical_transversal | Regressão SQL manual: tenant/papel/inativo/sem sessão, lock, replay e DML; helpers privados/RLS mantidos | PASS local |
| Histórico/omissões/remoção/restauração | plausible_indirect | Versões, omissões, proveniência, remoção explícita e restauração no harness reutilizado | PASS local |
| Tela, IA, Parser, matching, Auth e serviços VPS | no_impact_identified | Diff somente constraint da auditoria, sem consumidor; zero jobs IA; plano somente banco/docs e nenhum runtime reconstruído | PASS |

## Matriz de acordos e proibições

| ID | Implementação / evidência esperada | Status |
| --- | --- | --- |
| D-01 | Migração da constraint; RPC real local com ações simples, auditoria/replay; constraint produtiva validada e statements idênticos | PASS |
| D-02 / P-01 | Somente sete campos/listas conhecidos dispensam target; entidades e demais guardas preservados | PASS local |
| D-03 / P-02 | Regressão108asserts/rollback; sem escrita humana produtiva; hashes antes/depois iguais, CI branch/main e migração aplicada | PASS |
| F-01 | Diff somente migração, harness/evidência/docs/contextos | PASS |

Fidelidade visual: não aplicável; screenshot é contraexemplo de falha, sem nova composição visual.

## Validação e fechamento

`node scripts/test-profile-publication-scalar-targets.mjs`:108asserts PASS. Reutiliza a regressão manual existente em clone vazio schema-only PostgreSQL17 localhost55479; transação revertida e clone removido. Evidência `docs/qa/evidence/profile-publication-scalar-fix/sql.txt` e `summary.json`. Duas falhas do harness foram corrigidas: escape de$$ em String.replace e rascunho sintético obsoleto deixado pelo cenário de conflito; nenhuma correção adicional de produto foi necessária. Migração de produto permaneceu a mesma durante os três ciclos.

QA local sintético não prova comportamento autenticado de Pessoa real. Sem QA remoto separado; publicação humana real NOT TESTED deliberadamente. Nenhuma divergência do contrato identificada. Nenhuma relação reclassificada. Snapshot rastreado excluiu todos os rascunhos alheios dos contextos; lint2006arquivos, foundation/contextos/ledger e22testes do release tooling PASS. A seleção genérica `pnpm run test` do dispatcher foi substituída localmente pelo harness SQL integrado da fronteira afetada, sem suíte integral local; CI obrigatória executou seus gates completos e auditoria de dependências.

## Publicação e sincronização

SHA funcional021083abfc423cfd3a6707cc42bb9a43119014d3 integrado por fast-forward. CI branch39972770184/main39973388063 SUCCESS. Migração remota20261023145525, constraint convalidated=true e fingerprint exato igual ao source validado: e38a3435f2c74532c15faf1021a7921a2ac571249df6b63a5b1777f605a6748b (722caracteres canônicos). PostgreSQL produtivo manteve hashes de todas as revisões e versões do caso, funções de publicação/aprovação/validação, RLS/grants e409auditorias. Advisors de segurança antes/depois mantêm as mesmas contagens preexistentes, sem nova concessão ou alteração de fronteira.

Recibos e evidência mínima no diretório deste movimento: release-plan.json/release-receipt.json/production.json. `remaining.database` no recibo do dispatcher antecede a aplicação pelo conector; a evidência produtiva e o alias no ledger comprovam aplicação, sem replay. Apenas banco/docs; aplicação permanece3.1.3 e nenhum container/Edge foi reconstruído. Não se acessou VPS para publicar superfícies excluídas pelo plano. Encerramento documental sincroniza Git sem novo rollout de runtime. Worktree auxiliar sem uso arquivada; branch isolada preservou os arquivos alheios. Avisos de manutenção Git sobre metadados antigos foram preservados, sem limpeza forçada. PostgreSQL local teve recuperação de sua parada anterior antes do teste; lentidão/timeout do checker local foi resolvida executando apenas o checker interrompido, sem repetir as verificações concluídas.

Conclusão: D-01..03 e P-01/02 PASS nas fronteiras requeridas, F-01 preservado, sem alteração de dados humanos. A correção restaura publicação legítima de campos sem ID de bloco; somente a ação explícita do operador publicará a revisão real.
