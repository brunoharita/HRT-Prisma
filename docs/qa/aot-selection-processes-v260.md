# AoT — Processos seletivos v2.6.0

Acordo/execução1.0.0 aprovados por Bruno em14/10/2026. Baseline main/VPS3766fce913a835ec32a2db73214d9239f4bd6803; runtime8c2b38ff/web96eda2f1. Supabase ioldpnqqvobprjiontre ACTIVE_HEALTHY verificado, um processo encerrado/nenhum ativo. QA remoto separado inexistente na configuração; PostgreSQL17 local import_evidence_v202:55479/prisma_v202_qa confirmado people0. Fixtures transacionais/rollback; DB próprio de disputa criado/removido pelo script.

## Matriz de acordos

| ID | Implementação | Teste / evidência | Status |
| --- | --- | --- | --- |
| D-01 | Tabelas existentes, ciclos e links Posição/processo | SQL histórico/candidato anterior e browser vínculo | PASS |
| D-02 | start RPC, trigger/índice/locks, modal vazio e inclusão sem criação | SQL criação/ocupada/replay, disputa3, browser vazio/entrada | PASS |
| D-03 | Menu, workspace paginado50, busca/status e summary | SQL escopo/filtros/offset, rotas6, browser29 | PASS |
| D-04 | Acompanhamento Lista/Kanban, prova e histórico | browser preservação9, Node19, SQL avaliação/ciclo/snapshots | PASS |
| D-05 | PositionProcessAccess e aba da Posição | browser preseleção, SQL elegíveis e links | PASS |
| D-06 | Gate vivo, ACLs existentes, guards e auditoria | SQL120total (baseline79 + novo41) e contrato4, disputa3 e negativos | PASS |
| D-07 | Registry2.6.0, owner docs e contexto | Publicação/CI pendentes | NOT TESTED |
| D-UX-01 | Lista38%/painel62%, seleção e ações | browser/desktop-1448.png, dados12/8/10 e geometria38/62 | PASS |
| D-UX-02 | Acompanhamento amplo, mobile sucessivo/resumo antes de ações | browser/detail-390.png/list-390.png/detail-320.png; preservation/kanban-1448.png/390/320 | PASS |

## Proibições e mapa de preservação

| ID / capacidade | Relação | Prova | Status |
| --- | --- | --- | --- |
| P-01 | direct | Negativos ocupada/implícita/ativo, índice/concurrency.json | PASS |
| P-02 | critical_transversal | Tenant/papel/anon/worker/tabelas e snapshots protegidos | PASS |
| P-03 | no_impact_identified | SQL prova/aplicações/Score/Perfil; close não ocupa; browser sem IA/comercial | PASS |
| P-UX-01 | direct | Split/mobile único/acompanhamento real preservado | PASS |
| Candidatos/etapas/entrevista/decisão | direct | Writer core/grants preservados, SQL baseline/browser | PASS |
| Avaliações/convites/resultados | plausible_indirect | Writer preservado, ID explícito/legado e snapshots/rotas | PASS |
| Auth/tenant/retorno | critical_transversal | Gate backend/reviewer e origins-scoped rotas6/Node4 | PASS |
| Parser/Synthesis/gateway/mail/Knowledge | no_impact_identified | Sem writer/dependência; release/runtimes a confirmar | NOT TESTED |

Mapa inicial mantido. Bootstrap QA usa recipe rastreado/fixtures existentes, sem dependência em rascunhos não rastreados. Nenhuma nova biblioteca/fornecedor; reúso aprovado registrado no delta ADR-082.

## Fidelidade visual

Referência normativa: docs/product/proposta-processos-seletivos-v2m6-2026-10-14/03-lista-painel.png. Prancha raster com desktop/mobile, sem viewport executável declarado. Comparação estrutural normalizada com render1448/390e mesmos estados/dados: split38/62, hierarquia, seleção, abas, resumo/ações e mobile sucessivo reconhecíveis. Viewports768/320sem overflow. Ajustes autônomos: sidebar real288, tokens/marca/tipografia atuais, ícone Encerrar sem lixeira, ações mobile após resumo. Cartões reais/Score/controles conservados; simplificações da prancha são ilustrativas. Nenhum desvio material identificado.

## Validação / limites

SQL120PASS com rollback/disputas3PASS; Node19e rotas6PASS; browser29novo+9preservaçãoPASS sem chamadas externas/erros. Tipos/build web PASS, com avisos de bundle/dynamic import preexistentes. Evidências docs/qa/evidence/selection-processes-v260. Suíte integral local não executada; CI obrigatório permanece.

Falhas resolvidas antes do teste final: papel local identificado no runner existente após pressuposto incorreto; fixture de Posição ganhou título obrigatório; negativo histórico usa40001preservado; registry/JSX corrigidos; ícones decorativos aria-hidden e espera do browser ajustados; marcador documental incorreto reaplicado no arquivo correto. Nenhuma ampliação de escopo ou alteração produtiva durante QA.

Jornada autenticada real NOT TESTED; não inferir uso humano ou entrega de convite do QA sintético. F-01/F-02 preservados, sem IA/preço/Score/instrumento alterados.

## Git / publicação

Pendente. Destinos: migration nova e web, SHA explícito/CI/rollback. Banco aditivo não remove dados. Rollback UI conserva guards; cliente antigo sem início explícito recebe erro seguro e deve atualizar para2.6.0. Não retirar guard para rollback.
