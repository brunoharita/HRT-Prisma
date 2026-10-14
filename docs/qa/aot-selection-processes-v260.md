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
| D-06 | Gate vivo, ACLs existentes, guards e auditoria | SQL120total (baseline79 + novo41) e contrato5, disputa3 e negativos | PASS |
| D-07 | Registry2.6.0, owner docs e contexto | CI branch38583647158/main38584067622, verification.json/ledger | PASS |
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
| Parser/Synthesis/gateway/mail/Knowledge | no_impact_identified | Plano somente banco/web; nove runtimes IDs/imagens/estados/restarts preservados | PASS |

Mapa inicial mantido. Bootstrap QA usa recipe rastreado/fixtures existentes, sem dependência em rascunhos não rastreados. Nenhuma nova biblioteca/fornecedor; reúso aprovado registrado no delta ADR-082.

## Fidelidade visual

Referência normativa: docs/product/proposta-processos-seletivos-v2m6-2026-10-14/03-lista-painel.png. Prancha raster com desktop/mobile, sem viewport executável declarado. Comparação estrutural normalizada com render1448/390e mesmos estados/dados: split38/62, hierarquia, seleção, abas, resumo/ações e mobile sucessivo reconhecíveis. Viewports768/320sem overflow. Ajustes autônomos: sidebar real288, tokens/marca/tipografia atuais, ícone Encerrar sem lixeira, ações mobile após resumo. Cartões reais/Score/controles conservados; simplificações da prancha são ilustrativas. Nenhum desvio material identificado.

## Validação / limites

SQL120PASS com rollback/disputas3PASS; Node19e rotas6PASS; browser29novo+9preservaçãoPASS sem chamadas externas/erros. Tipos/build web PASS, com avisos de bundle/dynamic import preexistentes. Evidências docs/qa/evidence/selection-processes-v260. Suíte integral local não executada; CI obrigatório permanece.

Falhas resolvidas antes do teste final: papel local identificado no runner existente após pressuposto incorreto; fixture de Posição ganhou título obrigatório; negativo histórico usa40001preservado; registry/JSX corrigidos; ícones decorativos aria-hidden e espera do browser ajustados; marcador documental incorreto reaplicado no arquivo correto. Nenhuma ampliação de escopo ou alteração produtiva durante QA.

Jornada autenticada real NOT TESTED; não inferir uso humano ou entrega de convite do QA sintético. F-01/F-02 preservados, sem IA/preço/Score/instrumento alterados.

## Git / publicação

Publicado runtime 141a7c81d0781516eeee098757bc243161e8b12f, v2.6.0, em main/origin/VPS. CI branch38583647158 e main38584067622 SUCCESS. Plano somente migration e web; serviços/modelos/tarifas adjacentes não publicados. Verificação production/verification.json comprova container running/restart0, bundle/SHA/versão,4rotas HTTP200 e login público1448/390sem erro/overflow. Nove contêineres adjacentes preservaram IDs/imagens/estado/restarts,238assets anteriores byte-idênticos preservados,242assets após. Rollback96eda2f1 corresponde à imagem anterior.

Migration local20261014150000/remote20261014145038, fingerprint normalizado3a5eea3a0b5f66989ed545b0c14715d6a497d0b4236568cae007312b8b518a3d, comprimento11382, iguais. scope-after.json confirma somente start RPC anterior alterado, quatro funções protegidas/ACLs mantidas e três tabelas RLS/ACLs sem novo grant. Índice/guard/consultas instalados. database-preservation.json/data-before/data-after comprovam hashes/contagens idênticos dos sete conjuntos produtivos: processos,entries,provas,aplicações,Scores,Perfis e ocupação.

CI inicial38583025197 bloqueou mapeamento inline no throw e aviso de acesso sem ação; corrigidos preservando os testes, com21checks dirigidos e teste adicional de mensagem de criação/reabertura/recuperação. CI final passou. Smoke imediato do deploy retornou404durante recriação; confirmação independente posterior comprovou estabilização sem rebuild. Probe de rollback inicialmente usou prefixo8em vez do12do script; corrigida somente a verificação, rollback existente confirmado.

Integração main por fast-forward. A referência PNG não rastreada na pasta canônica tinha hash idêntico; foi preservada como03-lista-painel-origem.png antes da integração. Outros rascunhos alheios preservados. Avisos de Git sobre prune de worktrees antigos não bloqueiam commits/FF; nenhum lock/checkout alheio foi removido.

D-01..D-07/D-UX-01/02 e P-01..03/P-UX-01 PASS nos limites declarados, F-01/F-02 preservados; nenhum desvio material. Jornada autenticada real permanece NOT TESTED. Fechamento documental e ledger sincronizados sem reconstruir o runtime funcional. Banco aditivo mantém dados/guards; UI antiga sem início explícito recebe erro seguro e precisa atualizar. Não retirar guard para rollback.
