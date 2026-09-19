# Acordo M7.4 — Curadoria contextual de competências

Versão 1.2.0, agreed, 2026-09-18. Bruno aprovou fluxo/mockup e implementação; após o aceite local, autorizou main, migração e produção. A decisão também estabelece rollout completo como padrão futuro, salvo veto explícito. M7.6 supersede a exigência de justificativa textual desta curadoria; descrição opcional e escopo seguro estão em `agreement-m76-curation-description-scope.md`. Baseline `a26472c`. Risco D.

## DEVE

- D-01: revisar pendências dentro do Perfil, reutilizando busca, aprovação de alias e proposta da Knowledge. Declaração original, termo interpretado, candidatos, origem/tipo/agrupamento e alcance permanecem explícitos; justificativa textual foi aposentada pelo M7.6.
- D-02: Gravar confirma a decisão, atualiza projeção/contagens e fecha o painel. Cancelar não grava e retorna ao mesmo registro. Gravar e próximo mantém o painel no próximo pendente; sem próximo usa anterior; sem pendências fecha.
- D-03: preservar filtros, ordenação, página e posição. Seleção por chave estável, nunca índice isolado. Ao remover o item, focar próximo sobrevivente ou anterior. Página vazia recua para a última válida. Falha mantém formulário e não simula sucesso.
- D-04: alcance empresa como padrão; Global somente para Super Admin. Informar reutilização em outros perfis. Respeitar autoridade server-side existente. Proposta não publica conceito nem resolve a pendência por si só.
- D-05: preservar snapshots, decisões humanas, natureza declarada, tenant e proveniência. Atualização local sem recarregar página inteira nem consumir IA. Decisão concorrente/perfil obsoleto falha com instrução recuperável.
- D-UX-01: mockup `exec-8ed2a0bd-1697-4348-bef8-fb0e64a4a2a0.png` é referência normativa para a área de curadoria: lista à esquerda, item azul destacado, painel à direita ~42% da área útil, sem máscara que impeça consulta da lista. Cabeçalho/fonte no topo, busca/candidatos no meio, alcance abaixo e ações fixas no rodapé. M7.6 acrescenta descrição opcional somente na proposta e remove o bloco de justificativa. Lista paginada de dez itens, pesquisa e estado de pendência. Sidebar e cabeçalho existentes não são redesenhados; nomes, conceitos e números são ilustrativos.
- D-UX-02: no móvel o painel ocupa a tela; fechar retorna ao registro/página preservados. Teclado, foco, labels e descarte de alterações não salvas protegidos, inclusive ao trocar de item.
- D-06: testes direcionados de domínio, integração e autorização, smoke visual desktop/mobile e AoT. Registrar versão de workflow `profile-competency-curation-1.0.0` e entrega v1.7.4, owners/contexto.
- D-07: integrar main, aplicar somente a migration M74 e publicar frontend v1.7.4 com flags hosted vigentes, rollback, smoke autenticado e sincronização local/GitHub/VPS. Registrar a autorização permanente no AGENTS.md; sem reinício desnecessário de serviços alheios.

## PROIBIDO

- P-01: navegar à Knowledge para completar esta curadoria, perder posição, aprovar silenciosamente, descartar edição ao trocar de item ou ocultar falha de gravação.
- P-02: publicar proposta automaticamente, aceitar ocupação como competência, ampliar papéis/escopos, usar similaridade como equivalência ou transformar declaração em demonstração.
- P-03: reescrever Perfil/snapshots, alterar matching/parser/IA, mudar Knowledge de outra empresa, inventar decisões humanas ou publicar fora do escopo autorizado.

## FORA DE ESCOPO

- F-01: nova IA/taxonomia, redesign de navegação global, reprocessamento pago ou gravação de decisões de curadoria em perfis reais para teste. Main e produção passam ao escopo D-07 por autorização explícita.

## AUTONOMIA

- A-01: componentes, endpoints transacionais/aditivos, testes, estados técnicos e índices necessários, mantendo regras Knowledge existentes e sem dependências novas.
- A-UX-01: tokens/acessibilidade e adaptação ao shell real; dimensões finas e decoração sem mudar a topologia aprovada.

## Pendências e aceite

Nenhum Q funcional pendente. CA-01 (D-01/04/05): alias gravado com auditoria e projeção atualizada no mesmo fluxo; proposta continua pendente, negativos de autoridade/tenant/conflito. CA-02 (D-02/03): cancelar, gravar, gravar/próximo, último item, página esvaziada, filtro, duplicatas e erro. CA-UX-01 (D-UX-*): comparação visual com estado equivalente de página 2/item 14, desktop e móvel, foco e descarte seguro. CA-03 (D-06): builds, testes, contexto, diff e AoT sem falso rollout.

CA-04 (D-07): migration/grants conferidos remotamente, release v1.7.4 visível e painel aberto/cancelado na UI autenticada, commit de entrega em main/GitHub/VPS e imagem anterior conservada. Sem mutação de curadoria real no smoke.
