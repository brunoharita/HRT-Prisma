# AoT — linha do tempo da questão 2.5.5

Acordo/execução congelados: agreement-assessment-question-timeline.md 1.0.0, aprovados por Bruno em14/10/2026. Baseline main5316236, runtime8a6a181/web83ac4e53, Supabase ioldpnqqvobprjiontre ACTIVE_HEALTHY. QA remoto separado inexistente; PostgreSQL17 local127.0.0.1:55479/import_evidence_v202 confirmado vazio (people0, sem avaliações) e fixtures em transação com rollback. Fonte testada estabilizada antes dos navegadores.

| Requisito | Implementação | Teste/evidência | Estado |
| --- | --- | --- | --- |
| D-01 | assessmentTimeline.ts/AssessmentActivity: intervalos válidos por início, eventos pontuais, desempate e resumos explícitos | 3 unit novos, 20 checks novos browser e 68 regressões de atividade; snapshots/fatos não reordenados | PASS |
| D-02 | Portal: exibição, primeira escolha/troca com IDs, revisão sem questão ativa | Novo browser desktop1448/mobile390; portal82 preserva revisão/envio/buffer; SQL novo método/legado/replay | PASS |
| D-03 | Contexto resposta final/salva, situação, marcos ausentes e divergência explícita | timeline/legacy PNGs1448/390, 20 browser; sem IA paga ou história criada | PASS |
| D-04/P-01 | Migration aditiva sem grants/DML, token/tenant/versão e opções validados | SQL completo do pipeline em sql/sql.txt, negativos e preservação; 20 Node/fatos/mouse/release | PASS |
| D-05 | Registro2.5.5, docs de produto/arquitetura/contexto | Tipos/build/contexto PASS; CI38568382541/38568730165 e production/verification.json/ledger/preservation.json | PASS |

## Preservação e limites

Mapa do acordo mantido. Novo fluxo é apresentação e metadados: nada modifica respostas/resultados/avaliações/snapshots de IA. Consulta e filtros não geram IA/cotação. Processo de preparação/convite não é chamado; portal82 preserva autoridade do envio. Scope/RLS/grants/hash de6funções foram conferidos no backend antes do rollout. Somente position_assessment_public deve mudar, demais corpos/ACL devem ficar iguais. Perfil/Score/etapa/tarifas não possuem writer alterado.

Falhas resolvidas: tipo opcional explicitamente undefined no renderer; helper de fixture SQL ganhou acesso apenas session-local porque service_role não possui leitura direta das tabelas (proteção preservada). Cluster local estava parado; iniciado no diretório/porta corretos, sem alterar serviço PostgreSQL principal. Primeira tentativa usou porta padrão e falhou sem modificar dados. Um patch documental foi rejeitado por marcador incorreto e reaplicado no arquivo certo. Comparação visual/new/legacy não possui referência nova normativa: conserva modal claro e cards existentes, agrega resposta e lista vertical, sem overflow1448/390. IA/análise contratual1.1.0 inalterada; classificação humana permanece humana.

Jornada autenticada real e IA paga NOT TESTED; não são inferidas dos testes sintéticos. Nenhuma fixture em produção. Rollback: web anterior preservado por release-web; banco aditivo mantém leitores/coletores antigos e não requer apagar eventos novos. Não remover registros para rollback.

## Encerramento operacional

Publicado runtime8c2b38ff1bdeb05a6c193825d9b17aeb4f7f73a9 em main/origin/VPS. CI38568382541 (branch) e38568730165 (main) SUCCESS. SQL233checks PASS,20Node e22tooling PASS; novos20browser+68atividade+82portal=170 PASS. Tipos/build/contexto/lint PASS no snapshot rastreado, sem drafts alheios.

Migração assessment_response_timeline aplicada isoladamente no projeto verificado: local20261014100000/remote20261014130326, SHA256normalizado4eebe8e1bd244998835f8c32fd125b04a987efa119e06d64921d08a34f000008 igual. Scope-after/preservation comprovam apenas position_assessment_public alterado;5outros corpos,6ACLs,3tabelas/RLS/ACL e políticas preservados. Sem DML/backfill ou Edge publicado. A publicação do dispatcher mantém database em remaining porque é destino manual; a evidência Supabase comprova a aplicação realizada, sem reaplicar pelo CLI.

Web60916ee5/image96eda2f1 running/restart0;9contêineres adjacentes iguais,238assets anteriores byte-idênticos,241após. Rollback83ac4e53 igual à imagem anterior.4rotas/bundle HTTP200, SHA2.5.5/timeline verificados; login público1448/390 sem erro/overflow. verification.json e scope-after.json registram o estado. D-01..D-05/P-01 PASS nos limites declarados; sem desvio material. Fechamento documental sincroniza Git/VPS sem rebuild. Jornada autenticada real/IA paga permanecem NOT TESTED.
