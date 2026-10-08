# AoT — Ação de avaliação no cabeçalho da Pessoa

Contrato `docs/qa/agreement-discovery-header-evaluation.md` v1.0.0 e execução correspondente. Baseline `6b94570b3141f34a919bfd3f28bd1bb18b3085a1`, v2.2.1, 08/10/2026. Evidência `docs/qa/evidence/discovery-header-evaluation/`.

## Matriz de Acordos

| ID | Implementação | Teste / evidência | Status | Limite |
| --- | --- | --- | --- | --- |
| D-01/D-UX-01 | Cabeçalhos normal/pendente, CTA azul/ícone em região própria após Score | VacancyPages/AddToPositionFollowUp, before/after/header1537, geometria1813/1537 | PASS | sintético; ramo semântico pendente conferido no diff |
| D-02/D-UX-02 | Mobile largura total após Score; tablet quebra abaixo; sem CTA mantém layout | browser-results45checks em1813/1537/1024/768/390/320 e cinco estados mobile | PASS | sintético |
| D-03 | Mesmo add, loading, erro/retry, sucesso e navegação | browser-results.json/payloads e48testes dirigidos | PASS | serviço sintético; sem mutação real |
| D-04 | Consultar/relação/revisão/Score preservados;2.2.1/publicação | renders/review, diff, testes; release pendente | PARTIAL | produção pendente |

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
| Release/contexto | direct |2.2.1/contexto/CI/web/smoke/rollback/sincronização | NOT TESTED |

Novidade: hierarquia e localização da ação aprovada. Preservação: mesma capacidade de inclusão. Nenhuma nova dependência ou reclassificação necessária. Fixture compartilhada recebeu apenas hold opt-in (false por padrão) e estados novos de teste; Kanban produtivo não mudou. Sem jornada transversal crítica alterada.

## Fora de escopo preservado

F-01 PASS: diff não altera regras/cor dos outros botões, denominator/cálculo/versão, matching, backend, dados reais ou páginas adjacentes.

## Fidelidade visual

Modelo normativo textual aprovado: identidade → Score → CTA no cabeçalho; demais blocos abaixo. Screenshot enviado é contraexemplo da posição anterior. before/after1537 e390 usam os mesmos dados sintéticos; header-1537 mostra a região própria e botão azul à direita do Score. Inspeção visual PASS e geometria em seis larguras confirma ordenação, centralização e ausência de corte. Tablet quebra o botão abaixo do Score conforme autonomia prevista. Sem desvio material.

## Validação / desvios

48testes dirigidos (vacancyIntelligence, trajectoryReviewModal, positionFollowUpRoutes, actionableNotices) e45checks browser PASS. Tipos/build web/root, contextos/lint/foundation/diff PASS. Sem IA paga/banco real como teste; nenhuma mudança material adicional autorizada ou desvio do acordo. A renderização semântica pendente específica é preservada por alteração idêntica nos dois ramos/diff; descoberta em streaming foi testada. Nenhuma prova autenticada real inferida.

## Git / ambientes

Branch `codex/discovery-header-evaluation`; produto2.2.1 mantido. Baseline runtime c87ad10 funcional anterior, checkout6b94570. Publicação e sincronização pendentes. Arquivos alheios e worktrees preservados. Jornada autenticada real NOT TESTED.

## Conclusão

Local aprovado; fechar D-04 após publicação/CI/smoke.
