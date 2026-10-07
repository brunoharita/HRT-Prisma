# AoT: curadoria de competências persistente, v2.1.2

Acordo integral `agreement-competency-curation-persistence.md` 1.0.0; execução no arquivo correspondente. Pedido explícito de Bruno autoriza implementação e publicação. Baseline `07b79f6`, runtime visual v2.1.1. Classe D, ADR-077.

## Acordos → implementação → teste → evidência

| Requisito | Implementação | Evidência | Estado |
| --- | --- | --- | --- |
| D-01 | Decisão por organização/Pessoa/Perfil/declaração/trecho; precedência na projeção V3 e conclusão da normalização | SQL: rename/ambiguidade automática, refresh e Perfil posterior | PASS local |
| D-02 | Core compartilhado grava decisão e confere resolução na mesma transação; aprovação global efetiva registra seu alvo por trigger privado | SQL: criação/alias; falha injetada impede falso sucesso e desfaz conceito/proposta/alias | PASS local |
| D-03 | Trecho exato e mesma Pessoa/tenant; autorização existente; sem grants diretos | SQL: BPMN, outra Pessoa, tenant, papéis, anon, conflito e fonte forjada | PASS local |
| D-04 | Recuperação inicial de termos humanos aprovados, resultado completo vigente e fonte fundamentada; prova de alias/change set ou proposta aprovada | Baseline reproduz criação aprovada com pendência; migração recupera exatamente o BPM sintético | PASS local e produção |
| D-05 | Registry v2.1.2, migration forward-only e destinos seletivos | CI/rollout/smoke/sincronização pendentes | NOT TESTED |
| P-01/P-02 | Snapshots e resultados antigos preservados; sem mudança em frontend/domain matching/IA, sem modelo pago | SQL: snapshot, zero requests, só declaração, proposta global pendente e conceito indisponível explícito | PASS local |

## Impacto e preservação

Mapa integral no acordo, registrado antes da implementação. Curadoria/normalização/projeções são diretas; tenant/papéis são transversais críticos. Pessoa/lista consome o mesmo contrato, apenas o estado correto. Registro de versão exige web. Nenhum arquivo de Parser, Synthesis, matching, Score ou extração é alterado.

V2–V6 mantêm sua forma pública. V1/observações humanas antigas não são reescritas. Nova persistência é interna, com RLS e sem SELECT/INSERT/UPDATE/DELETE para anon/authenticated. Helpers privados não recebem EXECUTE dessas roles. Nova decisão não invalida ou substitui outra; indisponibilidade real permanece explícita.

## Validação local

`node scripts/verify-curation-persistence.mjs`: 35 checks PASS no PostgreSQL local descartável `import_evidence_v202`, porta 55479, transação ROLLBACK. Fixture exclusivamente sintética e sem rede/LLM. O primeiro check reproduz o defeito com funções anteriores; a mesma aprovação é recuperada após a migração. Inclui aprovação global posterior, sem antecipar uma decisão pendente.

O runner recompõe somente dependências de curadoria/normalização necessárias na transação. A montagem inicial descobriu dependências históricas (aliases canônicos duplicados sem M7.7 de transição); corrigida a montagem, sem alterar migrations históricas ou produção. Um teste usava revisão 2 quando a mudança de versão Knowledge gera uma nova revisão 1; corrigido para a sequência mais recente, mantendo o cenário.

Tipos/build raiz e web, lint (959 arquivos), foundation e 36 testes dirigidos PASS. Context Pack gerado/conferido em espelho dos rastreados mais arquivos próprios, excluindo documentos locais alheios, PASS. Diff-check PASS. Nenhuma suíte integral local. Jornada humana autenticada mutacional não é usada como teste.

## Produção, rollback e limites

Projeto alvo confirmado: Supabase `ioldpnqqvobprjiontre`, Prisma ACTIVE_HEALTHY. Migration local `20261007020000` aplicada pelo fluxo versionado como ledger remoto `20261007013453` (`stable_competency_curation`), sem db push/replay histórico. Baseline dos três corpos de função conferido por hash antes da aplicação e protegido pela própria migration. Recuperadas 10 decisões humanas existentes em quatro Perfis, sem nova escolha/alias/conceito. Restaurar funções anteriores preservando a tabela em eventual rollback; imagem web anterior retida pelo deploy.

A ausência de curadoria de Excelência operacional foi esclarecida por Bruno; PMO é outro termo. A recuperação não escolhe qualquer um deles por semelhança. Limite operacional: verificações remotas de leitura e prova de recuperação de decisões existentes; não publicar Perfil nem criar decisão humana para testar.

Projeção V5 real, sob o operador da aprovação existente em transação de leitura/ROLLBACK: BPM `unresolved` → `human_preserved`, uma associação declarada com proveniência estável. Cobertura 54 itens/52 termos pendentes → 53/51; 13 → 14 associados. Excelência operacional permanece `unresolved`, BPMN mantém seu conceito e PMO mantém decisão humana. Run original completo sequência 41 conserva BPM `unresolved`; a correção está na projeção, sem reescrever histórico. RLS, ausência de acesso direto/EXECUTE privado e worker somente service_role conferidos em produção. Evidências em `evidence/curation-persistence-v212/`. Advisor INFO de tabela com RLS sem policies é intencional: acesso exclusivamente pelos definers já autorizados.

## Fechamento

Em andamento. Não declarar concluído antes da prova operacional de D-04/D-05 e sincronização.
