# Acordo M7 — Resumo operacional do Perfil da Pessoa

Versão 1.0.0. Product Owner: Bruno. Fonte de autoridade: pedido de implementação anexado nesta tarefa em 2026-09-19 e imagem `codex-clipboard-914c184a-4ffc-4678-bb75-cf4a5f8cb92a.png`. A imagem é alvo normativo de arquitetura visual e ilustrativa quanto a Pessoa, textos, datas, contagens e capacidades não contratadas. Este acordo codifica o pedido; não aprova semântica nova.

## DEVE

- D-UX-01 — Preservar cabeçalho, abas e composição desktop em área principal ampla com coluna lateral, mantendo topologia, hierarquia, densidade, agrupamentos, ordem relativa e posição dos CTAs da referência. Em 768/390/320 px, empilhar a lateral após o principal, preservar cabeçalho e pendência primeiro e impedir overflow global.
- D-UX-02 — Para itens reais aguardando associação humana, exibir banner imediatamente após as abas com contagem da mesma fonte da curadoria e CTA para a lista M7.4 quando o papel pode agir. Zero não produz alerta; dado indisponível não vira zero. Papel sem autoridade não recebe ação habilitada.
- D-UX-03 — Mostrar resumo profissional publicado de forma escaneável, sem alterar seu texto, e somente etiquetas presentes no Perfil aprovado. O Perfil completo preserva todos os fatos e continua acessível.
- D-UX-04 — Exibir indicadores compactos apenas de fontes atuais e com rótulo fiel: conceitos com evidência, itens pendentes, evidências distintas vinculadas e data de publicação quando válida. Zero, vazio e indisponível são distintos.
- D-UX-05 — Na lateral, apresentar pendências, evidências recentes autorizadas e ações existentes. Recência ordena por `recordedAt`, sem ranking; evidência repetida por múltiplas associações aparece uma vez no resumo. A aba Evidências e a origem permanecem acessíveis.
- D-UX-06 — Agrupar conceitos pelo tipo canônico da projeção vigente, com contagens reais e acesso ao conjunto completo; nenhuma reclassificação local. Lista compacta de itens pendentes segue a ordem de declaração da curadoria, sem prioridade valorativa, e leva à lista em uma ação.
- D-UX-07 — Reutilizar somente ações e permissões existentes: curadoria autorizada, versões/revisão do Perfil para papéis elegíveis, Evidências e Perfil completo. Nenhuma ação nova de mutação nasce da composição.
- D-UX-08 — Retirar explicações extensas de taxonomia e evidência da visão principal, preservando transparência nas abas/detalhes existentes. Manter loading, vazio, erro, indisponibilidade, foco, teclado, nomes acessíveis e sinalização que não dependa só de cor.
- D-UX-09 — Comparar antes e depois no mesmo estado sintético e viewport da referência, além de 768/390/320 px, inspecionando topologia, densidade, proporções, ordem, CTAs, corte e overflow.
- D-UX-10 — Executar testes dirigidos, atualizar owner e Context Pack, decidir versão pelo registro vigente e fechar AoT com desvios e limites explícitos.

## PROIBIDO

- P-UX-01 — Criar proficiência, senioridade, nível, barra, score ou completude não contratados.
- P-UX-02 — Criar “top/principais/em destaque” ou ordenar conceitos/pendências por importância não contratada.
- P-UX-03 — Interpretar ausência de evidência, não revisão ou falha como deficiência, reprovação ou inexistência de competência.
- P-UX-04 — Converter conteúdo ilustrativo de “decisões sugeridas” em recomendação ou autoridade automática.
- P-UX-05 — Introduzir IA, provider, fonte externa, tabela, coluna, migration, persistência, permissão ou RLS para preencher o resumo.
- P-UX-06 — Redesenhar as abas e fluxos completos de Competências, Evidências ou Perfil completo; alterar matching, verificações, Parser, Knowledge ou taxonomias.

## FORA DE ESCOPO

- F-UX-01 — Nova metodologia de avaliação de competências.
- F-UX-02 — Senioridade ou proficiência.
- F-UX-03 — Score de completude do Perfil.
- F-UX-04 — Ranking de competências.
- F-UX-05 — Motor de recomendação de carreira, desenvolvimento ou contratação.
- F-UX-06 — Mudança de papéis/RLS, exceto correção de regressão demonstrada causada pela entrega.
- F-UX-07 — Produção, merge, operação destrutiva, dados reais e mudança de ambiente fora de autorização operacional explicitamente aplicável.

## AUTONOMIA

- A-UX-01 — Reutilizar e adaptar componentes, helpers de apresentação, CSS, tokens, ícones, spacing, breakpoints existentes, foco, skeletons e testes sem alterar semântica de produto ou autoridade.
- A-UX-02 — Substituir exemplos da imagem por fatos equivalentes disponíveis; registrar substituições no AoT.

## PENDENTE

Nenhum `Q-*` material está aberto no pedido. Um conflito novo de domínio, autorização, capacidade ou fidelidade visual interrompe a parte afetada antes de decisão de produto.

## CRITÉRIOS DE ACEITE

- CA-UX-01 (D-UX-01/09) — Comparação visual no mesmo estado/dados/viewport mostra estrutura reconhecível; 768/390/320 px sem sobreposição, corte de ação ou overflow global.
- CA-UX-02 (D-UX-02/06/07) — Contagem coincide com `pendingCompetencies`; banner positivo, zero e indisponível; CTA alcança a lista e foca seu título; papel não autorizado não recebe ação habilitada.
- CA-UX-03 (D-UX-03/04/05) — Indicadores têm fonte identificada, resumo preserva texto publicado, evidências recentes distintas e agrupamentos canônicos ficam acessíveis; vazio/erro não fabricam fatos.
- CA-UX-04 (D-UX-08) — Teclado, foco visível, nomes acessíveis e estados de carregamento/vazio/erro são inspecionados; transparência permanece nas superfícies secundárias.
- CA-UX-05 (D-UX-10/P-UX-*) — Testes negativos, typecheck/build, diff, owner, Context Pack e AoT registram resultados e limites sem falso rollout.
