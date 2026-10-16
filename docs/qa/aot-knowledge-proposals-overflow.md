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
| D-04 | Tipos/build/lint/foundation/contexto PASS; publicação pendente | CI, release e sincronização ainda necessários | PARTIAL |

Desvios: nenhum previsto. Evidências sintéticas não substituem leitura autenticada em produção; nenhuma decisão real será testada. Versão permanece2.8.0, restauração de apresentação já aprovada, sem mudança de contrato persistido.

## Validação local

`tests/tooling/knowledgeProposals.browser.mjs --baseline` recompõe styles.css/KnowledgePage.tsx do SHA baseline, usando a mesma fixture atual;37checks de estado/preservação e reprodução do estouro. Sem flag:48checks PASS,20estados de cartão e20capturas em `evidence/knowledge-proposals-overflow/after`; JSON registra medidas e igualdade integral do texto com before. Cobertura: pendente global com4ações e candidato/fonte longa sem espaços, ocupação sem origem, proposta legada, certificação bloqueada e proposta aprovada, além de retorno à aba Visão Geral. Sem rede externa ou decisões sintéticas/reais. Capturas320 e1448 inspecionadas visualmente. A prova mede geometria e rolagem interna de cada elemento, não só da página.

O primeiro teste de320 encontrou título longo com ellipsis e contribuição para overflow; incluída quebra local do título e revalidado o recorte, seguido da rodada pareada final. Fixture agora tem código H4 explícito. Deprecações AntD existentes e avisos anteriores de chunk/import dinâmico não geraram exceções de runtime. Sem alteração de contrato/handler, sem suíte integral local.

Mapa: capacidades diretas e crítica preservadas localmente PASS; aba vizinha PASS, diff restrito; backend/IA/banco sem impacto identificado pela ausência de mudanças executáveis nesses destinos. Hospedagem permanece PARTIAL até os recibos finais.
