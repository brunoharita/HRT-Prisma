# Acordo — Ação de avaliação no cabeçalho da Pessoa

v1.0.0, agreed/frozen, 08/10/2026. Bruno aprovou “Adicionar à avaliação” azul, no cabeçalho de cada cartão, à direita e ao lado do Prisma Score; no celular, abaixo da identificação e Score, em largura disponível. Autoridade: “exato... aí sim. pode implementar”. Baseline main `6b94570b3141f34a919bfd3f28bd1bb18b3085a1`, produto2.2.1. Classe B. Publicação autorizada pelo AGENTS.md seção7. Versão permanece2.2.1: ajuste delimitado de apresentação da ação existente.

- D-01/D-UX-01: mover a inclusão do grupo Consultar para região própria no cabeçalho de cada CandidateMatchCard que já possui essa ação, após identificação e Score na ordem DOM. Desktop amplo: identidade à esquerda, Score e ação à direita, lado a lado. Botão azul preenchido, ícone de adicionar centralizado, tamanho confortável e espaço próprio.
- D-02/D-UX-02: celular até760px: identidade, Score, ação em largura total, depois consultas/evidências. Tablet pode quebrar ação abaixo do Score para preservar leitura; sem corte/overflow, ícones/avatares e Score preservados. Cartões sem autorização para inclusão mantêm layout existente.
- D-03: preservar componente/handler/RPC/IDs/tenant/papéis, loading contínuo, erro com retry explícito, sucesso/disabled e acesso ao acompanhamento. Inclusão permanece independente de comparação e confirmação da relação. Sem inclusão automática pela visita.
- D-04: preservar textos e ações de Consultar/relação/revisão, dados/cálculo/versões do Score e lista/Kanban. Atualizar UX/contexto/AoT e publicar somente superfície necessária com CI/smoke/rollback/sincronização.
- P-01/P-UX-01: não duplicar a ação, colocá-la no bloco Consultar, esconder/cortar o controle ou esticar avatar; não depender da confirmação de relação ou seleção de comparação.
- P-02: sem alterações de matching, backend, banco, IA, permissões, decisões humanas, dados reais ou novas dependências.
- F-01: redesenho geral, novos textos/fluxos, cor dos demais botões e alteração da versão/denominador do Score.
- A-01/A-UX-01: reutilizar Button/Space/ícones Ant Design e componente/fixtures atuais. Engenharia decide colunas, breakpoint intermediário, medidas e validação proporcional. Nenhuma pesquisa externa/nova arquitetura necessária: capacidade existente atende.
- Q-01: nenhuma pendência material.

## Aceite e fidelidade

CA-01: render mostra uma única ação no cabeçalho, azul e à direita do Score em desktop amplo, sem ação em Consultar. CA-02: comparação antes/depois mesmos dados/viewport1537/390; geometria em1813/1537/1024/768/390/320 e estados de ausência de autorização, títulos longos, revisão e sucesso/erro. CA-03: clique chama o mesmo add, loading, falha/retry/sucesso, navegação e nenhuma seleção/decisão/recalculation implícita. CA-04: tipos/build, testes dirigidos, checks de contexto/diff, CI e smoke público com SHA/versão/assets/rollback.

Imagem fornecida é contraexemplo da localização anterior. Alvo normativo é o modelo textual aprovado, não seus dados ilustrativos. Preservar card branco, identidade/selos/score no cabeçalho, faixa de consultas/relação abaixo e painéis de evidências. Única mudança estrutural: região de ação própria no cabeçalho; celular segue a ordem aprovada.

## Mapa de impacto inicial

| Área / capacidade | Relação | Baseline / proteção / evidência |
| --- | --- | --- |
| Cabeçalhos normal/pendente e CTA | direct | SHA baseline; mesma composição/render1537/390, geometria e código dos dois ramos |
| AddToPositionFollowUp | direct | componente usado só na descoberta; add/loading/falha/retry/added/navegação sintéticos |
| Consultar/relação/revisão e Score | plausible_indirect | mesma página, handlers intocados; inspeção/diff/testes dirigidos e render review |
| Sem permissão / comparação | plausible_indirect | gates de role atuais; member sem CTA e comparação sem alteração |
| Lista/Kanban/backend/tenant/IA | no_impact_identified | serviços/RPC/contratos sem mudanças; regressão de rotas e verificação payload |
| Perfil/overview/ícones compartilhados | no_impact_identified | CSS restrito ao cabeçalho da descoberta/componente de inclusão; sem reset global |
| Release/contexto | direct |2.2.1, web apenas, rollback/CI/smoke |

Sem jornada transversal crítica alterada. Fixtures não provam persistência autenticada real nem qualidade de matching. Limites explícitos no AoT.
