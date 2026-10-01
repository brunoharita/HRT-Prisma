# Acordo — modal de revisão de divergências v1.0.0

Decisão de Bruno em 2026-10-01: apresentar a pergunta de revisão, o trecho profissional, as duas classificações divergentes e suas evidências em um modal na lista de Pessoas por Posição. A resposta humana é uma seleção fechada. Este acordo altera somente a apresentação do fluxo já aprovado em `agreement-matching-human-conflicts.md` e `agreement-matching-legacy-review-refresh.md`.

## DEVE

- D-01 — Abrir a revisão em um modal responsivo a partir do cartão, sem expandir a lista nem sair da Posição; identificar a Pessoa e manter o cálculo interno visível ao fundo.
- D-02 — Para cada um dos até cinco itens retornados pelo serviço autorizado, mostrar uma pergunta legível de revisão, o trecho publicado, as classificações da primeira e da segunda leitura e as respectivas referências de evidência, alinhadas por item.
- D-03 — Oferecer exatamente as duas classificações recebidas e `Não é possível determinar` como escolhas humanas por item, sem pré-seleção. Salvar e recalcular somente após escolha para todos os itens; conservar a semântica atual quando alguma escolha for indeterminada.
- D-04 — Para um par antigo indisponível, dizer que as respostas não podem ser recuperadas e oferecer nova checagem apenas por clique explícito; manter erros, excesso de cinco itens e carregamento causalmente distintos.

## PROIBIDO

- P-01 — Inventar a pergunta literal ou as respostas antigas da IA, apresentar a pergunta explicativa da revisão como prompt original, ou expor resposta bruta do provedor.
- P-02 — Campo aberto como classificação, seleção automática, mudança no limite de cinco itens, score ou grupo antes de uma revisão íntegra, ou reprocessamento ao abrir o modal.
- P-03 — Alterar papéis, isolamento de tenant, motor de score, prompt/modelo, cache, Knowledge ou dados profissionais neste movimento.

## FORA DE ESCOPO

- F-01 — Novas categorias, justificativa textual persistida, outra política de IA, nova página e reprocessamento de Pessoas reais para teste.

## AUTONOMIA

- A-01 — Engenharia escolhe componentes e detalhes visuais acessíveis, reutilizando o modal, a carga, a checagem explícita, as opções tipadas e o salvamento existentes.

## CRITÉRIOS DE ACEITE

- CA-01 — Cartão mantém as três zonas de ação e o botão abre modal; até cinco itens mostram pares alinhados, trecho, pergunta de revisão e três opções visíveis; mobile empilha as leituras.
- CA-02 — Nenhuma opção nasce selecionada; salvar está indisponível enquanto faltar escolha; `Não é possível determinar` preserva o cálculo interno; conclusão usa o serviço atual.
- CA-03 — Par antigo, excesso de cinco, erro e carregamento não mostram respostas inventadas nem habilitam salvamento; nova IA só começa após clique específico.
- CA-04 — O operador sem papel de revisão não recebe o modal; backend, banco, Edge, matching, score e Knowledge permanecem sem diff funcional.

Estado: aprovado pelo pedido explícito de implementação de Bruno em 2026-10-01.
