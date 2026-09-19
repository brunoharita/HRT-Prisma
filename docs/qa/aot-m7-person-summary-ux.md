# AoT — M7 Resumo operacional do Perfil da Pessoa

Contrato: `docs/qa/agreement-m7-person-summary-ux.md` 1.0.0; execução: `docs/qa/execution-m7-person-summary-ux.md`. Pedido e imagem anexados pelo Product Owner à tarefa de 2026-09-19. Baseline Git: `a792c69e333a4061c10fa9db606da4ec498939d0`, branch `codex/m7-summary-ux`. O estado abaixo distingue prova local, QA e produção.

## Matriz de Acordos

| ID | Acordo | Implementação | Teste / evidência | Status | Ambiente / limitação |
| --- | --- | --- | --- | --- | --- |
| D-UX-01 | Topologia e responsividade da referência | `PersonProfessionalEvidenceMap.tsx`, `styles.css` | Capturas sintéticas antes/depois em 1672×941 e nova tela em 768×1024, 390×844, 320×800; DOM sem overflow global | PASS | Navegador local; capturas inline no histórico da tarefa, não persistidas como arquivo |
| D-UX-02 | Banner real, zero/indisponível e CTA autorizado | `personProfileSummary.ts`, `PersonProfessionalEvidenceMap.tsx`, foco em `CompetencyCuration.tsx` | Fixture 53 itens; 17 testes dirigidos iniciais; DOM zero, processamento, erro e membro; Enter focou `prisma-profile-pending` | PASS | Projeção sintética; nenhuma decisão de curadoria gravada |
| D-UX-03 | Resumo publicado legível e íntegro | Resumo original com expansão apenas quando houver corte; etiquetas `areasOfExpertise`; Perfil completo preservado | Comparação visual mesmo `PrismaProfileView`; aba canônica existente intacta | PASS | Nenhum fato transformado ou sintetizado |
| D-UX-04 | Indicadores factuais | Helper de apresentação deriva conceitos, itens, evidências distintas e `publishedAt` válido | `personProfileSummary.test.ts`: contagens, zero, nulo, duplicata; DOM nos estados | PASS | “15”/“53” da prévia são fixture, não contagem de Pessoa real |
| D-UX-05 | Lateral operacional e evidências | Pendências, últimas três evidências distintas e ações existentes | Capturas desktop; vazio de evidência no DOM; aba Evidências preservada | PASS | Recência por `recordedAt` decrescente, empate por ID; nenhuma importância implícita |
| D-UX-06 | Grupos canônicos e prévia de itens | `groupProfessionalEvidence` e `groupPendingCompetencies` reutilizados | Teste de 3 itens/2 termos; 3 cartões de grupo e prévia no render; CTA alcança lista | PASS | Tipo por taxonomia vigente; conceitos alfabeticamente dentro do tipo; prévia na ordem de declaração |
| D-UX-07 | Ações e papéis vigentes | Curadoria via adapter; versões via rota existente; Evidências e Perfil completo via abas | CTA por clique e Enter; cenário `member` com zero CTAs de revisão habilitados | PASS | Sem nova mutação; autorização continua no serviço/RPC |
| D-UX-08 | Transparência secundária e estados acessíveis | Texto técnico removido do Resumo; abas/drawer mantidos; erro/vazio sem falso fato; foco visível | AX de botões/nomes, foco por teclado; DOM zero/erro/indisponível; skeleton da página inalterado | PASS | Inspeção dirigida não é certificação WCAG global |
| D-UX-09 | Comparação visual | Prévia temporária renderizou componente original do HEAD e componente novo com a mesma projeção sintética | Capturas inline antes/depois 1672×941; verificações em 768/390/320; CTA após tabs, proporção principal/lateral, densidade, agrupamentos e ações comparados | PASS | Capturas não foram persistidas; prévia temporária foi removida após inspeção |
| D-UX-10 | Testes, owners, contexto, versão e AoT | Testes dirigidos e docs de produto/QA; versão pública não incrementada | 26 testes dirigidos, lint, dois typechecks/builds, Context Pack e diff sem erro; release plan do SHA é etapa de publicação separada | PASS | Local; rollout ainda não comprovado |

## Proibições verificadas

| ID | Guardrail | Teste negativo / evidência | Status |
| --- | --- | --- | --- |
| P-UX-01 | Sem nível, senioridade, proficiência ou score novos | Teste estático do Resumo e diff de código; nenhum campo/visual criado | PASS |
| P-UX-02 | Sem ranking/ordenação valorativa | Ordenação alfabética canônica, ordem da declaração e recência factual; helper testado | PASS |
| P-UX-03 | Ausência/erro não é deficiência | Casos sem evidência e indisponível; linguagem neutra no DOM | PASS |
| P-UX-04 | Sem recomendação automática | Ações rápidas são rotas/abas existentes; nenhum bloco de decisão sugerida | PASS |
| P-UX-05 | Sem IA, persistência ou ampliação de autorização | Diff limitado a UI/helper/testes/docs; nenhum schema, migration, RPC ou serviço novo | PASS |
| P-UX-06 | Sem redesign das outras abas/fluxos | Competências, Evidências e Perfil completo preservados; única mudança na curadoria é âncora de foco | PASS |

## Fora de escopo preservado

`F-UX-01` a `F-UX-06`: metodologia, senioridade, completude, ranking, recomendações, papéis e RLS não foram alterados. `F-UX-07`: nenhuma operação de produção, dados reais ou destrutiva integra a prova local; eventual publicação depende da autorização operacional aplicável e do release plan do SHA validado. Status: PASS local.

## Evidência de fidelidade visual

| Referência / viewport | Estado e dados equivalentes | Comparação estrutural | Divergência / adaptação | Status |
| --- | --- | --- | --- | --- |
| Imagem do PO / 1672×941 | Antes (código HEAD) e depois com mesma Pessoa sintética, 53 itens, 15 conceitos e 15 evidências | Banner logo após abas; área principal ~70% e lateral ~30%; resumo, quatro indicadores, grupos, itens, evidências e ações preservam ordem e posição | Métricas mostram conceitos evidenciados e publicação real em lugar de total genérico e “última revisão”; sem edição direta do resumo, que não existe | PASS |
| 768×1024 | Mesma fixture depois | Colunas empilhadas, banner e resumo primeiro; quatro indicadores em 2×2; sem overflow | Lateral segue a área principal, como no contrato | PASS |
| 390×844 | Mesma fixture depois | Cabeçalho, abas roláveis, banner e resumo visíveis; sem overflow global | Indicadores e lateral seguem abaixo da primeira dobra | PASS |
| 320×800 | Mesma fixture depois | Ações do cabeçalho empilhadas, título do cartão não cortado, sem overflow global | Abas têm rolagem horizontal interna existente | PASS |

Os screenshots antes/depois e responsivos foram emitidos inline pelo navegador integrado durante esta tarefa, mas não receberam arquivo permanente. O comparativo é reproduzível com a fixture sintética descrita acima e o componente anterior em `a792c69`.

## Desvios do contrato

Nenhum desvio material observado. Adaptações de conteúdo da imagem: “Editar resumo” não foi exibido porque não há edição direta existente; data é publicação do Perfil, não uma “última revisão” inferida; contagem de evidências é por identidade distinta e não por associações; números e Pessoa são sintéticos. A região de recomendações ilustrativas foi preenchida com ações reais. A referência usa três agrupamentos ilustrativos; o runtime mostra os tipos canônicos que a projeção da Pessoa efetivamente trouxer.

## Mudanças autorizadas durante a execução

Nenhuma decisão nova. A correção de reflow de 320 px e o foco no título da lista são detalhes de implementação da UX solicitada.

## Validação final

`pnpm run lint` PASS (616 arquivos); `pnpm run build` PASS; `pnpm run typecheck:web` PASS; `pnpm run build:web` PASS; 26 testes dirigidos de Resumo, projeção, curadoria e Perfil canônico PASS; `pnpm run generate:prisma-context` e `pnpm run check:prisma-context` PASS; `git diff --check` sem erro. O build web emitiu avisos já existentes de import dinâmico inefetivo e tamanho de chunk, sem falha. `pnpm run release:plan -- --base=origin/main --head=HEAD` no commit `e309a2f` apontou apenas `prisma-web` como destino de runtime; migrations e Edge Functions não se aplicam. O dry-run de `release:publish` para esse SHA passou.

O CI da branch (`35451423869`) executou 532 testes: 531 passaram e 1 falhou em `m77KnowledgeCompanyGlobalGovernance.test.ts`, que espera ausência de uma aba de propostas no painel global. O mesmo teste falhou no CI da `main` (`35448554913`) no baseline `a792c69`, antes desta alteração; nem o teste nem `KnowledgePage.tsx` foram modificados pela branch. A correção de M7.7 é fora deste acordo e não será presumida. Gate de CI e publicação: BLOCKED por falha preexistente, não por teste do Resumo.

## Git / QA / ambiente

Início: `main` em `a792c69`, remoto `origin` existente. Itens preexistentes não relacionados `.tmp.driveupload/` e `services/paddle/Dockerfile.gpu` preservados. Branch isolada `codex/m7-summary-ux`, commit de implementação `e309a2f` enviado a `origin`, seguido deste registro de bloqueio. Não há QA remota separada. Sem integração na `main`, implantação, smoke de produção ou sincronização local/GitHub/VPS, pois o gate de CI permanece vermelho.

## Conclusão

Implementação e aceite técnico local: PASS para todos os `D-UX-*` e `P-UX-*` deste acordo. A prova visual usa fixture sintética e as capturas inline deste histórico; não é prova de implantação ou de dados reais. CI, integração e produção: BLOCKED por teste M7.7 preexistente no baseline. A entrega não está concluída operacionalmente.
