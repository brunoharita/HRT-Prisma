# Acordo — Detalhes da Posição alinhados ao Perfil

v1.0.0, agreed, 08/10/2026. Bruno aprovou a proposta revisada e autorizou implementar em main e publicar v2.2.1. Baseline0684d086ec820bf99ac961123223dca99e38e45d. Classe C: composição de leitura/navegação existente, sem persistência nova.

- D-01/D-UX-01: cabeçalho compacto com ícone centralizado, título, área, localização, ocupação, metadados existentes e versão discreta; Editar posição secundário, Encontrar pessoas primário (preservar Avaliar Pessoa atual quando ocupada), Excluir em Mais ações com confirmação e cancelamento auditável anteriores.
- D-02/D-UX-02: quatro abas em faixa branca imediatamente sob cabeçalho: Visão geral, Pessoas encontradas, Acompanhamento, Histórico. Pessoas encontradas abre a rota correspondente diretamente, sem intermediário vazio. Histórico e acompanhamento existentes preservados.
- D-03/D-UX-03: Visão geral com painel branco principal aproximadamente72% e sidebar28%, alinhados ao topo. Painel Resumo da posição, missão em Sobre a posição e dois cartões azul-claro lado a lado: responsabilidades/resultados esperados e obrigatórios/desejáveis. Acento azul curto, rótulos discretos, conteúdo legível, ícones menores centralizados, divisórias e listas. Sem pílulas artificiais, faixa azul inteira ou ícones adicionais nas subseções/sidebar.
- D-04: sidebar com Contexto de trabalho, Referência ocupacional e Acompanhamento. Referências completas em drawer sob demanda: associação, fontes, conhecimentos relacionados e complementos reutilizam componentes existentes. Corrigir associação e explicações/histórico da taxonomia continuam acessíveis.
- D-05: preservar listas completas, categorias/dimensões e origens dos requisitos, employmentType, occupantName, estado de ocupação e campos existentes. Conteúdo ausente é explicitamente não informado, nunca texto demonstrativo. Pendências reais de classificação/associação e ações de correção permanecem visíveis na Visão geral, sem exigir abertura do drawer. Nenhuma pendência fictícia.
- D-06/D-UX-04: desktop72/28; intermediário/baixo uma coluna com sidebar após leitura, cartões empilhados quando necessário; conteúdo longo não corta nem gera overflow da página. Teclado/foco/Escape, loading visível e navegação anteriores preservados.
- D-07: versão oficial2.2.1, ownerUX/current-state/contexto/AoT atualizados; CI, publicação seletiva, smoke, rollback e sincronização.
- P-01/P-UX-01: não substituir topologia aprovada por composição integral em largura ou esconder requisitos no sidebar; não copiar nomes/dados de Perfil ou requisitos ilustrativos para produção; não apresentar ausências como fatos/zero.
- P-02: sem mudar matching, IA, backend, banco, permissões, fontes ou contrato persistido; sem recalcular/interpretar por abrir detalhe, aba ou drawer; sem referências virarem requisitos automaticamente.
- P-03: sem remover funcionalidades/proveniência nem alterar o Perfil ou Kanban para acomodar este movimento; sem biblioteca nova ou reset global de estilos.
- F-01: redesign de resultados/Perfil/Kanban/editor, novas métricas, decisões automáticas e dados reais de teste.
- A-01/A-UX-01: engenharia reutiliza Ant Design, tokens/ícones e componentes existentes; adapta acabamento, estados reais e semântica acessível. Conteúdo/contagens do mock são ilustrativos.
- Q-01: nenhuma pendência material.

## Referências e aceites

Alvo normativo: `evidence/position-overview-v221/approved-mock.png` (proposta04 aprovada). Perfil fornecido é referência de estilo e escala; o conteúdo da Posição vem dos dados vigentes. No render controlado usar os mesmos dados/estado e viewport do mock, comparar estrutura/hierarquia/proporções/grupos/alinhamento/ordem/ações; registrar adaptações necessárias (categorias/origens e avisos reais).

CA-01..07: prova por requisito no AoT. Browser: leitura, abas/rotas, drawer/origens/correção/fechar/foco, Mais ações/confirmar/cancelar/falha, estados vazios/longos/ocupada/pendências/erro/loading,1813/1536/768/390/320. Confirmar zero chamadas de descoberta/IA na consulta; baseline Perfil/Kanban/ícones preservados por smoke sintético dirigido. Tipos/build e testes dirigidos de posições/taxonomia/release, lint/foundation/contexto, CI e smoke operacional.

## Mapa de impacto inicial

| Área / capacidade | Relação | Baseline e prova proporcional |
| --- | --- | --- |
| Detalhes da Posição | direct | layout antigo antes de tabs,3blocos técnicos; novo mock + fixture mesmos dados |
| Taxonomia, fontes, categorias/origens | direct | componente atual completo, drawer/explicação/correção; negativos snapshot ausente/divergente |
| Navegação/editar/excluir/histórico | direct | rotas e cancelamento auditável existentes; mouse/teclado/erro/cancelar/confirmar |
| Perfil/Kanban/indicadores | plausible_indirect | arquivo de páginas compartilhado, CSS escopado; renders/centros e navegação dirigidos |
| Loading/acessibilidade | critical_transversal | estados reais e controles Ant Design; pending/erro/drawer/foco/reflow |
| IA/dados/tenant/backend | no_impact_identified | nenhum contrato/serviço modificado; origem tenant validada como no componente existente, chamadas externas bloqueadas nos fixtures |
| Release/contexto/web | direct |2.2.0/runtimead55395; plano somente destinos requeridos e rollback |

Sem decisão arquitetural nova: reutilização de Ant Design Drawer/Dropdown/Modal e componentes Prisma já aprovados. Sem ADR novo.
