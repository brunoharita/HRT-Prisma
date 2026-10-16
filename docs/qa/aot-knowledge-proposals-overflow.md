# AoT — contenção de Propostas

Acordo/execução: `agreement-knowledge-proposals-overflow.md`1.0.0 e `execution-knowledge-proposals-overflow.md`. Baseline c4ef51011fe0e82b17f3cbb2896828d0fb61251b,2.8.0. Classe B. Reuso: AntD Space.wrap e CSS de contenção local, sem biblioteca/decisão arquitetural nova.

## Mapa de Impacto e Preservação anterior à implementação

| Capacidade | Relação | Baseline e prova proporcional prevista |
| --- | --- | --- |
| Propostas: ações, candidatos, fontes e classificação | direct | Produção autenticada: Rejeitar83px além do cartão em6pendentes; alerta candidato4px de scroll interno. Fixture anterior só cobria proposta aprovada. Comparação pareada desktop/celular com dados longos e pendentes. |
| Curadoria: motivo, subgrupo, guardas e ação humana | critical_transversal | Handlers intactos; fixture sem rede externa, retenção de inputs/reflow e zero escritas; produção somente leitura. |
| Abas vizinhas/estilo compartilhado | plausible_indirect | Novas regras restritas ao grid de propostas, Space.wrap apenas na linha afetada. Conferência de outra aba e diff. |
| Banco/IA/serviços/tenant/dados | no_impact_identified | Sem alteração de transportes ou contratos de produto; validação sintética, plano deve excluir esses destinos. |
| Hospedagem web | direct | Conferir identidade/SHA antes de publicar, CI, rollback, saúde e tela real após publicar; preservar demais contêineres. |

Validação mínima: roteiro focado com componentes reais em1448/1265/390/320px; baseline/depois, guardas e reflow; tipos/build web, lint/foundation e contexto. CI obrigatório, sem validate integral local. Fechamento: D/P com prova necessária PASS, documentação, publicação web e sincronização; limitações explícitas. Nenhuma expansão opcional.

## Acordos → implementação → teste → evidência

| ID | Implementação | Teste/evidência | Estado |
| --- | --- | --- | --- |
| D-01/02, P-01 | Space.wrap, min-width0, campos contidos, textos/títulos quebráveis; CSS somente no grid | 20pares de cartões em1448/1265/390/320,48checks após correção | PASS |
| D-03, P-02 | Handlers intactos; apenas Space recebe wrap | Motivo/subgrupo retidos após reflow, motivo obrigatório/certificação bloqueada,4ações globais e zero escritas | PASS |
| D-04 | Tipos/build/lint/foundation/contexto PASS; runtime eab0961 publicado | CI branch38920306393/main38920447973 SUCCESS,7checks HTTP/SHA/assets,28cartões reais sem overflow | PASS |

Desvios: nenhum previsto. Evidências sintéticas não substituem leitura autenticada em produção; nenhuma decisão real será testada. Versão permanece2.8.0, restauração de apresentação já aprovada, sem mudança de contrato persistido.

## Validação local

`tests/tooling/knowledgeProposals.browser.mjs --baseline` recompõe styles.css/KnowledgePage.tsx do SHA baseline, usando a mesma fixture atual;37checks de estado/preservação e reprodução do estouro. Sem flag:48checks PASS,20estados de cartão e20capturas em `evidence/knowledge-proposals-overflow/after`; JSON registra medidas e igualdade integral do texto com before. Cobertura: pendente global com4ações e candidato/fonte longa sem espaços, ocupação sem origem, proposta legada, certificação bloqueada e proposta aprovada, além de retorno à aba Visão Geral. Sem rede externa ou decisões sintéticas/reais. Capturas320 e1448 inspecionadas visualmente. A prova mede geometria e rolagem interna de cada elemento, não só da página.

O primeiro teste de320 encontrou título longo com ellipsis e contribuição para overflow; incluída quebra local do título e revalidado o recorte, seguido da rodada pareada final. Fixture agora tem código H4 explícito. Deprecações AntD existentes e avisos anteriores de chunk/import dinâmico não geraram exceções de runtime. Sem alteração de contrato/handler, sem suíte integral local.

Mapa: capacidades diretas e crítica preservadas localmente PASS; aba vizinha PASS, diff restrito; backend/IA/banco sem impacto identificado pela ausência de mudanças executáveis nesses destinos, confirmado pelo dispatcher. Hospedagem PASS conforme publicação abaixo.

## Publicação e preservação produtiva

Runtime eab0961ae19001f3d98c5db6028cbaf2f93ceaeb publicado em16/10/2026 12:03:39 BRT, versão2.8.0. Plano53arquivos (40capturas pareadas), somente prisma-web; banco/Edge/Parser/gateway/mail/Synthesis SKIPPED. O dispatcher sugeriu pnpm test geral; local deduplicado para roteiro diretamente afetado, mantendo CI integral obrigatório nos refs de branch/main. Integração ff-only; rascunhos untracked canônicos preservados.

`publication.json`:7checks HTTP/entry/CSS/SHA e entry anterior preservado PASS. `production-geometry.json`: sessão real autenticada,1448/1265/390/320px,7cartões por largura (6pendentes com4ações,1aprovado), sem overflow da página, elementos dos cartões ou candidatos. Capturas `production-desktop.jpg` e `production-mobile.jpg` inspecionadas; desktop recorta a região de conteúdo para excluir o menu da conta. Nenhuma edição de motivo/subgrupo, decisão, pesquisa/IA ou mutação real acionada. Produção valida apresentação em sessão Super Admin; transações reais de curadoria não foram exercitadas, intencionalmente.

Contêiner prisma-web4aab0302e45f running/0restarts; imagem sha256:57ebbaea04b6c4441c6c9299ca5c6a9cde64af153008e04659fd1c802c823c58. nginx -t PASS. Rollback prisma-web:rollback-before-eab0961ae190 aponta à imagem anterior sha256:2298f378f7286cbba12bcf58c74dd4e6d1f741c3b5ac96c9a68a325be3e12a0a; não foi necessário exercê-lo. Parser e8bc778c8c00, gateway8fb76416f61c, mailb257a83cbb37, Synthesisdb6c5c0ef238, Paddled991a574e45e e Traefik5e25fdc6d2e6 mantiveram IDs. O curl imediato do script recebeu404 transitório após recriação; smoke independente recebeu200 e confirmou o SHA/assets, sem rebuild adicional.

Fechamento documental posterior apenas registra evidências e sincroniza refs/VPS, mantendo o runtime eab0961 e o mesmo contêiner. CI do fechamento continua obrigatório. Avisos antigos de permissões em housekeeping de worktrees Git não impediram operações; nenhuma worktree/lock alheia foi removida. Todos D/P e mapa PASS dentro da cobertura declarada; nenhum desvio ou resíduo funcional conhecido.
