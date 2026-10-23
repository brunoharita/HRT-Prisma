# AoT — atualização de campos simples do Perfil

Contrato: `docs/qa/agreement-profile-publication-scalar-fix.md`v1.0.0. Baseline4c4db24. Fonte: screenshot como contraexemplo, logs produtivos23/10/2026 às14:22/14:23UTC com23514/profile_publication_decisions_check e leitura delimitada de revisão draft com mudança de professionalTitle. Nenhum conteúdo curricular versionado. A causa confirmada é a divergência entre constraint de auditoria e validador/RPC; campo simples legitimamente não possui targetBlockId.

## Mapa de impacto inicial e preservação

| Capacidade | Relação | Baseline / regressão mínima | Status |
| --- | --- | --- | --- |
| Auditoria/publicação de campos simples | direct | Baseline23514 reproduzido; título/resumo publicados e auditados sem IDs; quatro combinações merge/replace e update/replace com sete campos/listas e replay | PASS local |
| Blocos de experiência/formação/resultados/seções | plausible_indirect | Oito pares root/ação sem destino falham23514; validador rejeita destino ausente/desconhecido; atualização válida de experiência preservada | PASS local |
| Organização/papel, lock, replay, escrita direta | critical_transversal | Regressão SQL manual: tenant/papel/inativo/sem sessão, lock, replay e DML; helpers privados/RLS mantidos | PASS local |
| Histórico/omissões/remoção/restauração | plausible_indirect | Versões, omissões, proveniência, remoção explícita e restauração no harness reutilizado | PASS local |
| Tela, IA, Parser, matching, Auth e serviços VPS | no_impact_identified | Diff somente constraint da auditoria, sem consumidor; zero jobs IA, sem alteração de UI/serviços | PASS diff/local; plano/publicação pendentes |

## Matriz de acordos e proibições

| ID | Implementação / evidência esperada | Status |
| --- | --- | --- |
| D-01 | Migração da constraint; RPC real local com ações simples, auditoria/replay | PASS local; rollout pendente |
| D-02 / P-01 | Somente sete campos/listas conhecidos dispensam target; entidades e demais guardas preservados | PASS local |
| D-03 / P-02 | Regressão108asserts/rollback; sem escrita humana produtiva; hashes/plano/CI/sincronização pendentes | PARTIAL |
| F-01 | Diff somente migração, harness/evidência/docs/contextos | PASS |

Fidelidade visual: não aplicável; screenshot é contraexemplo de falha, sem nova composição visual.

## Validação e fechamento

`node scripts/test-profile-publication-scalar-targets.mjs`:108asserts PASS. Reutiliza a regressão manual existente em clone vazio schema-only PostgreSQL17 localhost55479; transação revertida e clone removido. Evidência `docs/qa/evidence/profile-publication-scalar-fix/sql.txt` e `summary.json`. Duas falhas do harness foram corrigidas: escape de$$ em String.replace e rascunho sintético obsoleto deixado pelo cenário de conflito; nenhuma correção adicional de produto foi necessária. Migração de produto permaneceu a mesma durante os três ciclos.

QA local sintético não prova comportamento autenticado de Pessoa real; não executar publicação real como smoke. Sem QA remoto separado. CI/contextos/rollout/sincronização pendentes. Nenhuma divergência do contrato identificada até esta etapa. Nenhuma relação reclassificada.
