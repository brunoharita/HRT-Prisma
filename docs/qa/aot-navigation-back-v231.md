# AoT — Retorno imediato v2.3.1

Agreement/Execution `navigation-back-v231` v1.0.0 aprovados por Bruno em10/10/2026. Baseline79f12a54eb727c42ab237304a7e1ce9c251a3ec2, branch codex/navigation-back-v231. Referências/evidência em docs/qa/evidence/navigation-back-v231/. Checkpoint antes de publicação; não representa fechamento.

## Acordos

| ID | Implementação | Teste/evidência | Status |
| --- | --- | --- | --- |
| D-01 | PrismaPage seta única; usePrismaNavigation/back; estados internos dos assistentes/Perfil/banco | browser-results.json78checks, navigationHistory19checks com uxFoundation/registry | PASS |
| D-02 | Atalhos fixos mantêm destinos, sem ArrowLeftOutlined em páginas | Pessoa real em fixture + avaliação real em fixture + revisão do diff | PASS |
| D-03 | Guardas antes de back e aprovação única em popstate; store/scroll atuais | Quatro viewports: cancelar/confirmar seta e navegador, filtro/rolagem, forward/reload | PASS |
| D-04 | Metadados elegíveis operatorHistoryPath; escopo exato e reidratação assíncrona; entrada direta disabled | URLs externas/tokens/query/fragmento; sessão/papel/empresa; reload; testes negativos | PASS |
| D-05 | Registry2.3.1; publicação web única com rollback | Tipos/build PASS; CI/publicação/smoke pendentes | PARTIAL |

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
| Serviços/banco/Score/IA | no_impact_identified | production-before.json7containers e14HTTP | Sem implementação/runtime fora de web; comparação remota pendente | PARTIAL |

Nenhuma nova dependência/roteador. Estado interno limita memória a50valores de apresentação; metadados de rota usam History API existente e não local/sessionStorage. A reidratação Auth assíncrona foi incluída no mapa: metadata fica inerte até scope confirmado; não aceitar scope antigo como autoridade.

## Limites e correções da validação

QA browser usa navegação/PrismaPage reais e PersonForm/PositionAssessment reais com serviços substituídos; demais caminhos do grafo usam páginas sintéticas compartilhadas. Sem Pessoa real/autenticação de produção, escrita, IA ou e-mail. NOT TESTED para jornada autenticada real, não inferida de HTTP público.

Primeiro teste de diálogo contou animação de fechamento como nova confirmação: ajustado para aguardar destruição do diálogo. Fixture de edição incompleta carecia updatedAt; corrigida sem mudar produto. Reidratação da fixture inicialmente aguardava metadata antiga, não Auth confirmado: corrigido readiness. Chrome local retornou EACCES; QA usa Edge headless existente. Falhas iniciais não eram fechamento PASS e não justificaram retirar guardas.

Sem referência visual normativa; posição superior esquerda/ausência de overflow provadas nos quatro viewports; screenshots profile-1448/768/390/320.png. Não representa fidelidade de todas as telas de domínio nem certificação WCAG.

F-01 preservado no diff; portais públicos mantêm seus controles. Documentos alheios não rastreados permanecem intocados. Context Pack gerado/verificado no snapshot somente de arquivos rastreados para não publicar acordos alheios locais. Lint1218arquivos, foundation e três testes de Context Pack PASS. Tipos/build após a alteração final PASS. Duplo clique na seta protegido antes da confirmação; reinício explícito de importação/avaliação/geração limpa somente histórico de etapas já descartadas pelo reinício existente.

## Git, CI, publicação e conclusão

Pendentes. D-05 ainda PARTIAL: não declarar movimento concluído até publicação e preservação remota comprovadas.
