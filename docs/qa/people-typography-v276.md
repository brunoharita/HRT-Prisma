# Pessoas: tipografia e alinhamento2.7.6

Acordo aprovado por Bruno, baseline64746ca (2.7.5). Classe B, visual delimitada.

- D-UX-01 nome, área, cargo, empresa, cidade e data em14px/20px; peso400, nome600 como acesso navegável.
- D-UX-02 e-mail e período em12px/18px, cor secundária e espaçamento4px consistente.
- D-UX-03 células e avatar/texto alinhados pelo topo; múltiplas áreas não centralizam as demais colunas.
- D-UX-04 ausência em14px/20px e cor secundária, textos curtos sem confundir indisponibilidade com ausência; selo IA acompanha a última palavra, sem linha isolada.
- P-01 preservar seis colunas, dados originais, tooltip/proveniência, filtros, navegação, cronologia e responsividade. Sem impacto em IA/banco/publicação de Perfis.
- F-01 redesign de tabela/editor, classificações, regras de negócio e pipeline.
- A-01 CSS restrito à tabela de Pessoas e marcação mínima; reutilizar componentes atuais. Versão2.7.6, somente web.
- Q nenhuma. Screenshot é contraprova da inconsistência. Manter topologia: cabeçalho/ações, busca/filtros, tabela clara/paginação; sem alteração de ordem/proporções. Referência normativa é a hierarquia tipográfica aprovada.
- CA-01 mesmas fixtures/viewports1448/390 antes/depois, estilos computados, posição inicial e badge, ausência e navegação/filtros preservados.

Execução implementa D-UX-01..04 e impede P-01, dentro de F-01/A-01. Validação mínima: browser visual e regressão existente, tipos/build web, teste de versão, lint/contexto, CI obrigatório e smoke seletivo. Sem suíte integral local.

## GOV-01

| Capacidade | Relação | Baseline/preservação/prova |
| --- | --- | --- |
| Tabela de Pessoas/tipografia/alinhamento | direct | 2.7.5; screenshots antes/depois, computed styles/bounding boxes1448/390 |
| Filtros/navegação/tooltips/ausências | plausible_indirect | mesmos componentes; regressão browser existente e foco/proveniência |
| CSS compartilhado/editor/IA/Auth/dados/Score | no_impact_identified | regras novas restritas à tabela; sem writers/serviços/domínio alterados; diff e CI |
| Hospedagem/rollover de assets | critical_transversal | só web; SHA/versão/assets anteriores/rollback e serviços preservados |

## AoT

D-UX-01..04/P-01 PASS:18assertivas de estilos/alinhamentos/ausências/badge/proveniência,24regressões de colunas/filtros/navegação em1448/390, screenshots antes/depois na mesma fixture e viewport. Escopo CSS revisado: somente tabela de Pessoas. Tipos/build web,5testes de versão, lint e Context Pack PASS. Fixture corrige o teste de tooltip para usar hover, interação já existente. Sem novo comportamento funcional.

QA sintético local, sem dados ou chamadas de IA reais. CI e publicação ainda pendentes; esta evidência não equivale a jornada autenticada real.


## Fechamento operacional

D-UX-01..04/P-01 PASS:18verificações de tipografia/alinhamento/badge/ausências e24de preservação de filtros/navegação;5testes de versão, tipos/build/lint/contexto PASS. Capturas1448/390 antes/depois inspecionadas, sem desvios materiais. Mudança restrita à tabela e marcação de apresentação, sem domínio/serviço/contrato de IA alterado.

2.7.6 publicada no runtime166213640b6a776efd62ad5229aff7625a21dd93 após CIs branch38843350893/main38843360673 SUCCESS. Plano exige somente web. Smoke18checks PASS:13HTTP,4bundle e1CSS; SHA/versão, seletor tipográfico e assets antigos/novos. Host/rollback em publication.json. Parser/gateway/synthesis/mail/Traefik mantêm IDs da versão anterior. Rollbackweb:prisma-web:rollback-before-166213640b6a. Sem reprocessamento, alteração de banco ou chamada de IA. Produção autenticada real NOT TESTED; evidência visual é sintética. Fonte documental sincroniza main/origin/VPS sem rebuild adicional.

Início02:55:41UTC; tipos/build/teste versão/browser/lint/contexto e implementação concluídos antes03:00:40; CI aprovado03:02:12. Tempo restante de publicação/fechamento registrado na conversa. Reutilizado bootstrap validado e teste de versão atualizado antes do primeiro CI; não houve rodada extra de CI por falha de produto ou versão. Tooltip no teste usa hover, interação existente; nenhuma semântica nova.
