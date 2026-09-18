# Acordo M7.4 — Curadoria contextual de competências

Versão 1.0.0, agreed, 2026-09-18. Bruno aprovou o fluxo, esclareceu o retorno/paginação, aprovou o mockup e solicitou implementar a melhoria. Baseline `a26472c`. Risco D: decisão humana sobre aliases existentes e integração transacional; sem novo provedor ou autoridade.

## DEVE

- D-01: revisar pendências dentro do Perfil, reutilizando busca, aprovação de alias e proposta da Knowledge. Declaração original, termo interpretado, motivo, candidatos, origem/tipo/agrupamento, alcance e justificativa permanecem explícitos.
- D-02: Gravar confirma a decisão, atualiza projeção/contagens e fecha o painel. Cancelar não grava e retorna ao mesmo registro. Gravar e próximo mantém o painel no próximo pendente; sem próximo usa anterior; sem pendências fecha.
- D-03: preservar filtros, ordenação, página e posição. Seleção por chave estável, nunca índice isolado. Ao remover o item, focar próximo sobrevivente ou anterior. Página vazia recua para a última válida. Falha mantém formulário e não simula sucesso.
- D-04: alcance empresa como padrão; Global somente para Super Admin. Informar reutilização em outros perfis. Respeitar autoridade server-side existente. Proposta não publica conceito nem resolve a pendência por si só.
- D-05: preservar snapshots, decisões humanas, natureza declarada, tenant e proveniência. Atualização local sem recarregar página inteira nem consumir IA. Decisão concorrente/perfil obsoleto falha com instrução recuperável.
- D-UX-01: mockup `exec-8ed2a0bd-1697-4348-bef8-fb0e64a4a2a0.png` é referência normativa para a área de curadoria: lista à esquerda, item azul destacado, painel à direita ~42% da área útil, sem máscara que impeça consulta da lista. Cabeçalho/fonte no topo, busca/candidatos no meio, alcance/justificativa abaixo e ações fixas no rodapé. Lista paginada de dez itens, pesquisa e estado de pendência. Sidebar e cabeçalho existentes não são redesenhados; nomes, conceitos e números são ilustrativos.
- D-UX-02: no móvel o painel ocupa a tela; fechar retorna ao registro/página preservados. Teclado, foco, labels e descarte de alterações não salvas protegidos, inclusive ao trocar de item.
- D-06: testes direcionados de domínio, integração e autorização, smoke visual desktop/mobile e AoT. Registrar versão de workflow `profile-competency-curation-1.0.0` e entrega v1.7.4, owners/contexto.

## PROIBIDO

- P-01: navegar à Knowledge para completar esta curadoria, perder posição, aprovar silenciosamente, descartar edição ao trocar de item ou ocultar falha de gravação.
- P-02: publicar proposta automaticamente, aceitar ocupação como competência, ampliar papéis/escopos, usar similaridade como equivalência ou transformar declaração em demonstração.
- P-03: reescrever Perfil/snapshots, alterar matching/parser/IA, mudar Knowledge de outra empresa ou realizar produção sem autorização específica desta melhoria.

## FORA DE ESCOPO

- F-01: produção, merge em main, nova IA/taxonomia, redesign de navegação global, reprocessamento pago ou alteração de perfis reais nesta etapa.

## AUTONOMIA

- A-01: componentes, endpoints transacionais/aditivos, testes, estados técnicos e índices necessários, mantendo regras Knowledge existentes e sem dependências novas.
- A-UX-01: tokens/acessibilidade e adaptação ao shell real; dimensões finas e decoração sem mudar a topologia aprovada.

## Pendências e aceite

Nenhum Q funcional pendente. CA-01 (D-01/04/05): alias gravado com auditoria e projeção atualizada no mesmo fluxo; proposta continua pendente, negativos de autoridade/tenant/conflito. CA-02 (D-02/03): cancelar, gravar, gravar/próximo, último item, página esvaziada, filtro, duplicatas e erro. CA-UX-01 (D-UX-*): comparação visual com estado equivalente de página 2/item 14, desktop e móvel, foco e descarte seguro. CA-03 (D-06): builds, testes, contexto, diff e AoT sem falso rollout.
