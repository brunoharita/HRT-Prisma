# AoT: curadoria de competências persistente, v2.1.2

Acordo integral `agreement-competency-curation-persistence.md` 1.0.0; execução no arquivo correspondente. Pedido explícito de Bruno autoriza implementação e publicação. Baseline `07b79f6`, runtime visual v2.1.1. Classe D, ADR-077.

## Acordos → implementação → teste → evidência

| Requisito | Implementação | Evidência | Estado |
| --- | --- | --- | --- |
| D-01 | Decisão por organização/Pessoa/Perfil/declaração/trecho; precedência na projeção V3 e conclusão da normalização | SQL: rename/ambiguidade automática, refresh e Perfil posterior | PASS |
| D-02 | Core compartilhado grava decisão e confere resolução na mesma transação; aprovação global efetiva registra seu alvo por trigger privado | SQL: criação/alias; falha injetada impede falso sucesso e desfaz conceito/proposta/alias | PASS |
| D-03 | Trecho exato e mesma Pessoa/tenant; autorização existente; sem grants diretos | SQL: BPMN, outra Pessoa, tenant, papéis, anon, conflito e fonte forjada | PASS |
| D-04 | Recuperação inicial de termos humanos aprovados, resultado completo vigente e fonte fundamentada; prova de alias/change set ou proposta aprovada | Baseline reproduz criação aprovada com pendência; migração recupera exatamente o BPM sintético | PASS |
| D-05 | Registry v2.1.2, migration forward-only e destinos seletivos | CI branch/main e produção verificadas; fechamento documental por Git | PASS |
| P-01/P-02 | Snapshots e resultados antigos preservados; sem mudança em frontend/domain matching/IA, sem modelo pago | SQL: snapshot, zero requests, só declaração, proposta global pendente e conceito indisponível explícito | PASS |

## Impacto e preservação

Mapa integral no acordo, registrado antes da implementação. Curadoria/normalização/projeções são diretas; tenant/papéis são transversais críticos. Pessoa/lista consome o mesmo contrato, apenas o estado correto. Registro de versão exige web. Nenhum arquivo de Parser, Synthesis, matching, Score ou extração é alterado.

V2–V6 mantêm sua forma pública. V1/observações humanas antigas não são reescritas. Nova persistência é interna, com RLS e sem SELECT/INSERT/UPDATE/DELETE para anon/authenticated. Helpers privados não recebem EXECUTE dessas roles. Nova decisão não invalida ou substitui outra; indisponibilidade real permanece explícita.

## Validação local

`node scripts/verify-curation-persistence.mjs`: 35 checks PASS no PostgreSQL local descartável `import_evidence_v202`, porta 55479, transação ROLLBACK. Fixture exclusivamente sintética e sem rede/LLM. O primeiro check reproduz o defeito com funções anteriores; a mesma aprovação é recuperada após a migração. Inclui aprovação global posterior, sem antecipar uma decisão pendente.

O runner recompõe somente dependências de curadoria/normalização necessárias na transação. A montagem inicial descobriu dependências históricas (aliases canônicos duplicados sem M7.7 de transição); corrigida a montagem, sem alterar migrations históricas ou produção. Um teste usava revisão 2 quando a mudança de versão Knowledge gera uma nova revisão 1; corrigido para a sequência mais recente, mantendo o cenário.

Tipos/build raiz e web, lint (964 arquivos), foundation e 36 testes dirigidos PASS; mais 19 testes de release/contexto PASS. Context Pack gerado/conferido em espelho dos rastreados mais arquivos próprios, excluindo documentos locais alheios, PASS. Diff-check PASS. Nenhuma suíte integral local. Jornada humana autenticada mutacional não é usada como teste.

## Produção, rollback e limites

Projeto alvo confirmado: Supabase `ioldpnqqvobprjiontre`, Prisma ACTIVE_HEALTHY. Migration local `20261007020000` aplicada pelo fluxo versionado como ledger remoto `20261007013453` (`stable_competency_curation`), sem db push/replay histórico. Baseline dos três corpos de função conferido por hash antes da aplicação e protegido pela própria migration. Recuperadas 10 decisões humanas existentes em quatro Perfis, sem nova escolha/alias/conceito. Restaurar funções anteriores preservando a tabela em eventual rollback; imagem web anterior retida pelo deploy.

A ausência de curadoria de Excelência operacional foi esclarecida por Bruno; PMO é outro termo. A recuperação não escolhe qualquer um deles por semelhança. Limite operacional: verificações remotas de leitura e prova de recuperação de decisões existentes; não publicar Perfil nem criar decisão humana para testar.

Projeção V5 real, sob o operador da aprovação existente em transação de leitura/ROLLBACK: BPM `unresolved` → `human_preserved`, uma associação declarada com proveniência estável. Cobertura 54 itens/52 termos pendentes → 53/51; 13 → 14 associados. Excelência operacional permanece `unresolved`, BPMN mantém seu conceito e PMO mantém decisão humana. Run original completo sequência 41 conserva BPM `unresolved`; a correção está na projeção, sem reescrever histórico. RLS, ausência de acesso direto/EXECUTE privado e worker somente service_role conferidos em produção. Evidências em `evidence/curation-persistence-v212/`. Advisor INFO de tabela com RLS sem policies é intencional: acesso exclusivamente pelos definers já autorizados.

## Fechamento

D-01 a D-05 e P-01/P-02 PASS, sem desvio de contrato. CI branch `37558377478` e main `37558476862` success. Runtime funcional `58f8bd7fd97543dd7249002b8e0e035868c610b4` publicado em main/origin/VPS: web imagem `931e15b9f40ce8ba7b7e52950d3723ded3ba794d32c5708e4847be9e44ab5991`, running/0, entry `index-DU5ijjcH.js`, CSS `index-CA9shKY5.css`. 17 HTTP200, cinco checks de SHA/versão/visual/assets e sete de infraestrutura PASS. Parser/Synthesis/gateway mantêm IDs/imagens/reinícios e workers healthy. Rollback `prisma-web:rollback-before-58f8bd7fd975` conserva imagem anterior `2cfc671e9d50f9d4c56fb378fbd22bd04e59a7badbdc5dfb19b356bb6795ea3f`.

O smoke imediato do script de deploy recebeu HTTP404 durante a recriação, fazendo o dispatcher sair1/SSH22. Após estabilização, todos os checks independentes passaram sem rebuild/redeploy. Registrar o erro transitório não equivale a omitir a verificação final. Plano exige apenas esta migration (já aplicada e mapeada) e web; nenhum serviço/Edge Function adicional. Evidências `release-plan.json`, `release.json`, `production-smoke.json`, `infrastructure.json`. Fechamento documental sincroniza Git por fast-forward sem reconstruir o runtime validado. Arquivos locais alheios permanecem fora dos commits. Jornada humana mutacional real NOT TESTED; projeção autenticada real somente leitura PASS.
