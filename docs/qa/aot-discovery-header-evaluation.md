# AoT — Ação de avaliação no cabeçalho da Pessoa

Contrato `docs/qa/agreement-discovery-header-evaluation.md` v1.0.0 e execução correspondente. Baseline `6b94570b3141f34a919bfd3f28bd1bb18b3085a1`, v2.2.1, 08/10/2026. Evidência `docs/qa/evidence/discovery-header-evaluation/`.

## Matriz de Acordos

| ID | Implementação | Teste / evidência | Status | Limite |
| --- | --- | --- | --- | --- |
| D-01/D-UX-01 | Cabeçalhos normal/pendente, CTA azul/ícone em região própria após Score | VacancyPages/AddToPositionFollowUp, before/after/header1537, geometria1813/1537 | PASS | sintético; ramo semântico pendente conferido no diff |
| D-02/D-UX-02 | Mobile largura total após Score; tablet quebra abaixo; sem CTA mantém layout | browser-results45checks em1813/1537/1024/768/390/320 e cinco estados mobile | PASS | sintético |
| D-03 | Mesmo add, loading, erro/retry, sucesso e navegação | browser-results.json/payloads e48testes dirigidos | PASS | serviço sintético; sem mutação real |
| D-04 | Consultar/relação/revisão/Score preservados; versão 2.2.1 mantida e publicação somente web | renders/review, diff, testes; CI e production-after.json | PASS | jornada autenticada real não testada |

## Proibições verificadas

| ID | Prova negativa | Status |
| --- | --- | --- |
| P-01/P-UX-01 | Uma CTA só no header, zero em Consultar, geometria/ícone/overflow e ausência de seleção/decisão implícita | PASS |
| P-02 | Diff sem serviço/contrato/migration; fixture bloqueia rede externa; gates role preservados | PASS |

## Mapa de impacto e preservação final

| Área / capacidade | Relação | Baseline / regressão / evidência | Status |
| --- | --- | --- | --- |
| Cabeçalho/CTA | direct | SHA baseline/render mesmos dados1537/390; geometria6larguras/estados | PASS |
| AddToPositionFollowUp | direct | add original, hold sintético/loading/falha/retry/added/navegação | PASS |
| Consultar/relação/revisão/Score | plausible_indirect | mesmas ações/handlers, render review e score antes/depois da inclusão;48dirigidos | PASS |
| Permissão/comparação | plausible_indirect | member sem CTA; zero seleção implícita; rotas de papéis e diff da comparação intocado | PASS |
| Lista/Kanban/backend/tenant/IA | no_impact_identified | serviço/add/IDs intactos; teste payload/rotas, sem cálculo/IA pela inclusão | PASS |
| Perfil/overview/iconografia | no_impact_identified | novos seletores limitados ao header/componente exclusivo da descoberta, sem reset global | PASS |
| Release/contexto | direct | 2.2.1/contexto/CI/web/smoke/rollback; fechamento documental e sincronização sem rebuild | PASS |

Novidade: hierarquia e localização da ação aprovada. Preservação: mesma capacidade de inclusão. Nenhuma nova dependência ou reclassificação necessária. Fixture compartilhada recebeu apenas hold opt-in (false por padrão) e estados novos de teste; Kanban produtivo não mudou. Sem jornada transversal crítica alterada.

## Fora de escopo preservado

F-01 PASS: diff não altera regras/cor dos outros botões, denominator/cálculo/versão, matching, backend, dados reais ou páginas adjacentes.

## Fidelidade visual

Modelo normativo textual aprovado: identidade → Score → CTA no cabeçalho; demais blocos abaixo. Screenshot enviado é contraexemplo da posição anterior. before/after1537 e390 usam os mesmos dados sintéticos; header-1537 mostra a região própria e botão azul à direita do Score. Inspeção visual PASS e geometria em seis larguras confirma ordenação, centralização e ausência de corte. Tablet quebra o botão abaixo do Score conforme autonomia prevista. Sem desvio material.

## Validação / desvios

48testes dirigidos (vacancyIntelligence, trajectoryReviewModal, positionFollowUpRoutes, actionableNotices) e45checks browser PASS. Tipos/build web/root, contextos/lint/foundation/diff PASS. Sem IA paga/banco real como teste; nenhuma mudança material adicional autorizada ou desvio do acordo. A renderização semântica pendente específica é preservada por alteração idêntica nos dois ramos/diff; descoberta em streaming foi testada. Nenhuma prova autenticada real inferida.

## Git / ambientes

Branch `codex/discovery-header-evaluation` integrada por fast-forward em main; SHA funcional `f4a1ef89c8bc197bd481d39e70cbddb117420133`, produto 2.2.1 mantido. Baseline runtime c87ad10 funcional anterior, checkout 6b94570. CI branch 37862033038 e main 37862156702 registrados em ci.json. Plano oficial determina somente prisma-web: banco, Functions, Parser IA e Synthesis ignorados.

Produção verificada no host srv1038882: container `7ed61e0e8c15`, imagem `sha256:9233290e63599d62e560618f94aad53c741922d2ffa1b8f7592d9fd43f105bbd`, running com zero reinícios. Assets `index-DBIvvNZ4.js` e `index-BZ5dcuRA.css`; 16 respostas HTTP 200 e 14 checks de SHA/versão/layout/textos/assets/infra PASS em production-after.json. IDs/imagens de Parser IA, Synthesis e gateway preservados; workers healthy. Rollback `prisma-web:rollback-before-f4a1ef89c8bc` corresponde à imagem anterior `25f949ba8dad`.

O probe imediato do dispatcher retornou HTTP 404 durante a recriação e encerrou com código 1 (SSH 22). A verificação independente posterior passou sem repetir o deploy; publication-consolidated.json registra esse limite. Fechamento documental/contextos sincroniza main/origin/VPS sem reconstruir runtime. Arquivos alheios e worktrees preservados. Jornada autenticada real NOT TESTED.

## Conclusão

Escopo aprovado implementado e publicado; requisitos D-* e proibições P-* PASS nas evidências descritas. Sem desvio material. O teste sintético comprova interação/layout; o smoke público comprova implantação e integridade dos assets/serviços. Nenhum deles comprova uma inclusão autenticada real em produção.
