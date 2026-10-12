# Acordo, execução e AoT — Tempo e orientações do participante

Acordo v1.0.0,11/10/2026. Solicitação explícita de Bruno nesta conversa e publicação autorizada por AGENTS §7. Baseline03372cde8be187cc5b548c5018d7724d3ec1e78f. Risco B: apresentação do portal compartilhado, preservando fronteiras sensíveis e coleta. Correção2.4.1, sem nova entrada de release. Screenshot é contraexemplo do contador e referência de conteúdo, não redesign total.

## Acordo e execução congelados

- D-01: tempo restante legível em dias, horas e minutos, sem segundos; omitir unidades zero, concordância singular/plural, menos de1minuto e prazo encerrado explícitos. Antes de iniciar, indicar prazo de acesso; após iniciar, indicar tempo para concluir conforme deadline efetivo do servidor. Relógio e limites existentes permanecem.
- D-02: data limite de acesso em dd/mm/yyyy às HH:mm, horário de Brasília; novos convites até23:59. Exibir o valor real de convites históricos, sem reescrever/falsear hora. Após início informar também o limite efetivo de conclusão quando distinto do acesso.
- D-03: orientar antes do início e durante a prova: ambiente/conexão, aba e janela da avaliação ativas, conhecimentos próprios, não alternar abas/janelas para consultar conteúdo nem capturar questões; cinco alternativas/uma resposta, navegação/revisão, sincronização, retomada sem pausa do relógio, envio completo e confirmação dentro do menor prazo. Manter ação Li as instruções · iniciar avaliação.
- D-04: transparência precisa sobre respostas e sinais existentes por questão: perda de foco/visibilidade, intervalos de mouse parado até primeira escolha com questão/janela ativas, reaberturas/mudanças de resposta, escala observável e alguns atalhos de captura entregues pelo navegador. Informar limites, ausência de gravação de tela/imagens/clipboard/histórico geral de teclas/destino de outras janelas, análise humana e ausência de eliminação automática; acessibilidade/teclado/touch não são indícios negativos. Contato para dúvidas/acessibilidade/tratamento é a empresa responsável, sem inventar canal ou cadastro.
- D-UX-05: manter topo Prisma/contexto/Pessoa/tempo e cartão Antes de começar, nova região de tempo com destaque e data; instruções agrupadas em Como responder e Atividade e privacidade, detalhes técnicos sob demanda; informações essenciais visíveis. Mobile empilha cabeçalho e contador, sem corte ou overflow. Preservar questão/navegação/sync/revisão/ações e loading.
- D-06: validar módulos diretos/preservados, desktop1448/768/mobile390/320, atualizar docs/contexto, integrar main/publicar web conforme diff, rollback/smoke e sincronização.
- P-01: ampliar coleta, screen capture/keylogging/clipboard, nova análise IA, acusação/punição ou decisão automática; prometer captura universal, detecção de toda trapaça ou justiça certificada.
- P-02: afirmar conformidade jurídica/base legal/consentimento/retention não aprovados; botão de ciência operacional não é consentimento LGPD. Não usar todas as informações possíveis, incompatível com minimização e com a coleta observada.
- P-03: alterar duração/prazo/tenant/tokens/gabarito/respostas/recibos/escritores/backend, iniciar/submeter automaticamente, perder buffer/falha/retry ou criar resultado parcial completo.
- F-01: aviso jurídico final/base legal/retenção/direitos/canais específicos, proctoring e telemetria novos, redesenho da jornada inteira, envio/teste real a candidato.
- A-01: redação explicativa fiel aos fatos, componentes/tokens/CSS e formatadores puros sem dependências novas; reutilizar portal e fixtures existentes.
- Q: nenhuma pendência no escopo operacional. A intenção de transparência autoriza aprimorar a redação; a coleta permanece limitada conforme produto, sem prometer monitoramento inexistente.
- CA-01: testes de dias/horas/minutos, singular/plural, menos de1minuto/zero/inválido e timezone Tokyo/Brasília; UI no estado convidado/iniciado/encerrado.
- CA-02: browser de instruções completas, ciência manual, ausência de IO/novas permissões/coleta, autosave/falha/buffer/retry/navegação/revisão/submissão/recibo; revisão visual em4larguras. CI/produção seletiva e preservação operacional.

D-01..06 e P-01..03 implementados no escopo F-01 e autonomia A-01. Este delta refina instruções D-08/D-10 do acordo position-assessment-v230 v0.5.0; não supersede a coleta D-09 nem P-04. Reuso do portal/componentes/formatador IANA satisfaz descoberta sem dependência externa. A informação operacional não substitui aviso jurídico final.

Referência pública para redação: [LGPD compilada, arts.6º e9º](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm), consultada11/10/2026: minimização, finalidade e transparência. Fonte de capacidades: PositionAssessmentPortal/QuestionFocusTracker/QuestionMouseTracker, não alegação jurídica.

## Mapa de impacto anterior à implementação

| Capacidade | Relação | Baseline / preservação / prova |
| --- | --- | --- |
| Portal: contador, prazo e instruções | direct | baseline03372cd, relógio em segundos e texto corrido; unit e browser renderizado nos4viewports |
| Portal: iniciar/responder/sync/buffer/retry/revisão/recibo | plausible_indirect | mesmo componente; fixture real com serviços sintéticos, regressão completa e negativos |
| Sinais foco/mouse/atalhos/zoom e limites | critical_transversal | handlers e trackers atuais; diff sem alteração de coleta, testes puros e payload/browser negativos |
| Página individual de preparação/resultado e stylesheet compartilhado | plausible_indirect | CSS somente pa-portal/newclasses; browser existente com override de evidência para não sobrescrever histórico |
| Prova comum/convites/backend/tenant/IA/serviços | no_impact_identified | sem alteração de writers/schema/serviços, contrato de token/limite mantido; plano webonly, runtime/rollback/assets preservados |

Baseline operacional será conferido antes do deploy. Dados sintéticos; nenhum acesso ao token pessoal mostrado na imagem, que é dado de exemplo privado e não autorização para responder/iniciar a tentativa.

## AoT

| Regra | Implementação | Teste / evidência | Estado |
| --- | --- | --- | --- |
| D-01/02 | assessmentPortalPresentation e região de tempo do portal, deadline original preservado | 3testes puros de unidades/limite/invalidade/datas; browser70checks em1448/768/390/320 com clock/fuso Tokyo, tempo de acesso/início/último minuto/expiração | PASS |
| D-03/04 | AssessmentParticipantGuidance e orientação persistente durante questões | texto/ciência/finalidade/limites/keyboard disclosure, ausência de início/coleta/escrita por leitura; confirmação completa/cancelamento/recibo e consulta durante prova | PASS |
| D-UX-05 | classes pa-portal-time/pa-guidance/pa-number, sem alterar shell individual | imagens instructions/expired/receipt em browser/; revisão visual1448/390 e overflow negativo nas4larguras. Corrigido corte de2px na grade numérica320px, sem mudar navegação | PASS |
| D-06 | entrega principal e documentação | local18Node+70browser+38regressão/tipos/build PASS; CI/produção/contextos pendentes | PARTIAL |
| P-01/02/03 | handlers/trackers/IO/escritores/backend intactos; formatação somente visual | 18Node (presentation+positionAssessment+Activity),70novos checks;38regressões de configuração/composição/revisão/convite/portal/resultado, falha/buffer/retry; nenhum envio real/IA paga | PASS local |

Evidências em `docs/qa/evidence/assessment-portal-v241/{browser,regression}`. Fonte do contador é o deadline do servidor; acesso e conclusão não são intercambiáveis. Detalhes técnicos de coleta fechados inicialmente, acessíveis por teclado; essenciais permanecem visíveis. Screenshot do PO é contraexemplo, mantendo topologia/contexto e os elementos existentes, com dados fictícios nas provas. Jornada autenticada de candidato real NOT TESTED; token privado da imagem não acessado. Sem desvio de contrato identificado.
