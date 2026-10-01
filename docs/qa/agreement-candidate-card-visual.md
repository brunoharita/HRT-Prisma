# Acordo — cartão de Pessoas por Posição, composição visual v1.0.0

Decisão de Bruno: implementar na lista de Pessoas por Posição a proposta visual 2, preservando integralmente o funcionamento atual. Referência normativa de estrutura: `docs/qa/assets/candidate-match-card-action-hub-reference.png` (SHA-256 `de50e17478d3a65a60c0dfc876660d1296f7bba57fe711ad7db81f4f0ace5385`). Nomes, contagens, score e textos de exemplo da imagem são ilustrativos; o runtime sempre usa dados e estados reais.

## DEVE

- D-01 — No cartão completo, exibir identidade, localização e etiquetas à esquerda e o mesmo resumo do Score Prisma em painel compacto à direita. Seleção para comparação permanece disponível.
- D-02 — Abaixo do cabeçalho, reunir as ações em uma faixa horizontal com grupos `Consultar`, `Revisão da IA` quando houver divergência revisável, e `Decisão humana`. Cada controle aparece uma vez, conserva seu handler, condição de exibição, autorização, estado desabilitado e loading. A revisão expandida permanece no mesmo cartão, com espaço suficiente para trechos e decisões.
- D-03 — Sob a faixa de ações, usar duas colunas: à esquerda explicação da trajetória, área, proximidade, resumo profissional e evidências que trouxeram o Perfil; à direita requisitos e cobertura, mantendo os quatro grupos existentes e o tratamento contextual do Grupo C. Preservar os mesmos dados, textos de evidência, limites de lista e versões.
- D-04 — Em larguras menores, empilhar progressivamente painel de score, ações e colunas de conteúdo, sem overflow horizontal nem ocultar controles, evidência ou estado de revisão.
- D-05 — Estados de IA pendente, falha, discordância, revisão aberta, decisão confirmada/descartada, ausência de score e Grupo C mantêm as mesmas regras e ações atuais. A referência não autoriza inferir uma decisão da IA nem inventar quantidade de conflitos.

## PROIBIDO

- P-01 — Alterar matching, score, pesos, ordem dos grupos, chamadas de IA, cache, Knowledge, fonte de dados, autorização ou efeitos das decisões.
- P-02 — Duplicar ações, transformar revisão em aprovação obrigatória, ocultar lacunas ou trocar ausência de evidência por incapacidade.
- P-03 — Copiar literalmente da imagem os dados demonstrativos de Bruno ou o score 32/100 para outros Perfis.

## FORA DE ESCOPO

- F-01 — Tela de comparação, painel de score em Drawer, perfil da Pessoa, fluxos de edição, banco, Edge, backend e mudanças de produto fora da lista.

## AUTONOMIA

- A-01 — Ajustar composição React/CSS, ícones existentes, espaçamento e rótulos auxiliares sem mudar a semântica dos controles. Pode preservar textos de botões atuais quando forem mais precisos que a ilustração.

## CRITÉRIOS DE ACEITE

- CA-01 — No mesmo estado de Grupo B com divergência, comparar render desktop de viewport similar à referência: cabeçalho identidade/score, faixa de três grupos, conteúdo em duas colunas e destaque correto.
- CA-02 — Testar estados representativos A/B/C, análise pendente, revisão da IA aberta, papel sem autorização e decisão anterior; comparar presença, unicidade e handlers dos controles com o baseline.
- CA-03 — Comprovar composição responsiva e navegação por teclado/foco; typecheck, build e regressão funcional proporcional da lista.
- CA-04 — Publicar somente a superfície web se o plano de release confirmar; smoke em produção sem acionar IA paga ou mutar Pessoas reais.

## Mapa de impacto e preservação

| Área | Relação | Baseline/capacidade protegida | Prova |
| --- | --- | --- | --- |
| Cartão da lista e CSS responsivo | direct | Todos os dados/controles no cartão atual; captura fornecida mostra ações dispersas | Comparação visual e testes dos estados |
| Revisão humana dentro do cartão | direct | Abertura, checagem legada, escolhas e salvamento atuais | Teste de botão único e fluxo local sem provedor |
| Comparação e Drawer de score | plausible_indirect | Mesmos componentes de resumo/score podem ser compartilhados | Seletores CSS escopados e regressão de render |
| Autorização, IA, tenant, score e Knowledge | critical_transversal | Nenhum contrato de runtime alterado | Diff restrito, negativos de controles e smoke sem mutação |
| Banco, Edge e ingestão | no_impact_identified | Nenhum arquivo/contrato compartilhado modificado | Inspeção do diff e plano de release |

Não há pendência material para implementar a composição aprovada. A ausência de ambiente autenticado para screenshot real deve ser declarada como limite, não substituída por afirmação de fidelidade visual não observada.
