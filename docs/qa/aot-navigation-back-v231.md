# AoT — Retorno imediato v2.3.1

Agreement/Execution `navigation-back-v231` v1.0.0 aprovados por Bruno em10/10/2026. Baseline79f12a54eb727c42ab237304a7e1ce9c251a3ec2, branch codex/navigation-back-v231. Referências/evidência em docs/qa/evidence/navigation-back-v231/. Fechamento funcional após publicação e verificação em produção. SHA funcional96c912d8eeb6ebc40722fe5970dc4bf80082ac90.

## Acordos

| ID | Implementação | Teste/evidência | Status |
| --- | --- | --- | --- |
| D-01 | PrismaPage seta única; usePrismaNavigation/back; estados internos dos assistentes/Perfil/banco | browser-results.json78checks, navigationHistory19checks com uxFoundation/registry | PASS |
| D-02 | Atalhos fixos mantêm destinos, sem ArrowLeftOutlined em páginas | Pessoa real em fixture + avaliação real em fixture + revisão do diff | PASS |
| D-03 | Guardas antes de back e aprovação única em popstate; store/scroll atuais | Quatro viewports: cancelar/confirmar seta e navegador, filtro/rolagem, forward/reload | PASS |
| D-04 | Metadados elegíveis operatorHistoryPath; escopo exato e reidratação assíncrona; entrada direta disabled | URLs externas/tokens/query/fragmento; sessão/papel/empresa; reload; testes negativos | PASS |
| D-05 | Registry2.3.1; publicação web única com rollback | Tipos/build, CI branch/main, produção2.3.1+SHA do bundle,14HTTP, UI pública1448/390, rollback e preservação PASS | PASS |

## Proibições

| ID | Evidência | Status |
| --- | --- | --- |
| P-01 | Grafo de dez caminhos; history.back/forward não empilha novo retorno; etapas/áreas regressam | PASS |
| P-02 | Cancelamento preserva URL/rascunho; escopos e URLs negativos; callbacks só apresentação; nenhuma generate/send/dispatch na fixture | PASS |
| P-03 | Diff sem banco/Edge/runtime IA/Score; regras de domínio preservadas | PASS |

## Mapa final de impacto e preservação

| Área/capacidade | Relação | Baseline | Regressão/evidência | Status |
| --- | --- | --- | --- | --- |
| Navegação/páginas/cabeçalhos | direct | main79f12a5, destinos fixos do levantamento | 78checks browser; quatro viewports;19Node (history/UX/registry) | PASS |
| Rascunhos/filtros/seleção/rolagem | direct | NavigationGuards/NavigationViewStore e scroll anteriores | Positivos/negativos no browser; uxFoundation;11Node de rotas/recovery | PASS |
| Sessão/papel/empresa | critical_transversal | Autorização fora da UI e scope anterior | Negativos; webProtectedRoutes; reidratação confirmada só após Auth | PASS |
| Avaliação/importação/revisão/curadoria | plausible_indirect | Domínio explícito e controles de origem | Pessoa15cenários reais em fixture PASS; avaliação38checks reais em fixture PASS; sem dados reais | PASS |
| Serviços/banco/Score/IA | no_impact_identified | production-before.json7containers e14HTTP | Seis serviços com IDs/imagens/restarts preservados; Parser/Synthesis/Mail healthy;14HTTP e sete assets antigos200 | PASS |

Nenhuma nova dependência/roteador. Estado interno limita memória a50valores de apresentação; metadados de rota usam History API existente e não local/sessionStorage. A reidratação Auth assíncrona foi incluída no mapa: metadata fica inerte até scope confirmado; não aceitar scope antigo como autoridade.

## Limites e correções da validação

QA browser usa navegação/PrismaPage reais e PersonForm/PositionAssessment reais com serviços substituídos; demais caminhos do grafo usam páginas sintéticas compartilhadas. Sem Pessoa real/autenticação de produção, escrita, IA ou e-mail. Smoke público em produção1448/390 com login/v2.3.1 sem erro/overflow, sem envio de formulário. NOT TESTED para jornada autenticada real, não inferida de HTTP público.

Primeiro teste de diálogo contou animação de fechamento como nova confirmação: ajustado para aguardar destruição do diálogo. Fixture de edição incompleta carecia updatedAt; corrigida sem mudar produto. Reidratação da fixture inicialmente aguardava metadata antiga, não Auth confirmado: corrigido readiness. Chrome local retornou EACCES; QA usa Edge headless existente. Falhas iniciais não eram fechamento PASS e não justificaram retirar guardas.

Sem referência visual normativa; posição superior esquerda/ausência de overflow provadas nos quatro viewports; screenshots profile-1448/768/390/320.png. Não representa fidelidade de todas as telas de domínio nem certificação WCAG.

F-01 preservado no diff; portais públicos mantêm seus controles. Documentos alheios não rastreados permanecem intocados. Context Pack gerado/verificado no snapshot somente de arquivos rastreados para não publicar acordos alheios locais. Lint1218arquivos, foundation e três testes de Context Pack PASS. Tipos/build após a alteração final PASS. Duplo clique na seta protegido antes da confirmação; reinício explícito de importação/avaliação/geração limpa somente histórico de etapas já descartadas pelo reinício existente.

## Git, CI, publicação e conclusão

CI inicial38045473960 bloqueou promoção:872/873, expectativa estática antiga de rótulo em m2DocumentReliabilityReview. Corrigida para novo rótulo e destino exato preservado; oito testes de documentos PASS (document-preservation.txt). Sem retirada de gate ou nova alteração de produto. CI final38045604570 (branch) e38045676664 (main) PASS no SHA96c912d8eeb6ebc40722fe5970dc4bf80082ac90. Main/origin/VPS funcionais sincronizados neste SHA. Somente prisma-web recriado (81e1c9d0d53c), imagem74df2620bfc6; bundle público contém SHA validado,2.3.1 e rótulo da seta. HTTP14/14 esperados, sete assets anteriores200 preservados; UI de login pública em1448/390 mostra v2.3.1 e protege rota autenticada sem erro/overflow.

Dispatcher publicou a unidade, mas seu smoke imediato terminou exit22/HTTP404 durante recriação. A verificação independente após estabilização passou, sem reconstruir/republicar nem contornar gate. Recibo publication-preservation.json conserva essa distinção. Rollback prisma-web:rollback-before-96c912d8eeb6 corresponde à imagem anterior b53ee95bb7b8. Seis demais containers mantiveram IDs/imagens/restarts/status; Parser/Synthesis/Mail continuam healthy. O experimento paddle-vl-llama-test já estava unhealthy no baseline e permaneceu assim: não é capacidade validada ou alterada neste movimento.

Fechamento documental e Context Pack seguem em commit posterior, sem reconstrução do runtime funcional. D-01..05 e P-01..03 PASS; nenhuma divergência do escopo aprovado. Jornada autenticada real continua NOT TESTED. Arquivos alheios e worktrees preexistentes preservados; avisos locais de prune com Permission denied não impediram commit/fetch e não foram tratados por exclusão. Evidências: ci-branch/main.json, release-plan.json, production-after.json, publication-preservation.json e production-browser.json. Nenhuma migration, função, runtime IA ou mail publicado.
