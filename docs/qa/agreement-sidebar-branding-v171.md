# Contrato de Acordos — Sidebar institucional e Prisma v1.7.1

Versão 1.0.0. Estado: **agreed**. Product Owner: Bruno. Aprovação: pedido explícito de 2026-09-18 para executar o briefing da sidebar e incorporar o protocolo de fidelidade visual. Referência normativa: imagem anexada nesta tarefa; balões, linhas e checklist são anotações, não interface. Textos, nomes e empresa da imagem são ilustrativos.

## DEVE — Inegociável e critérios de aceite

| ID | Decisão aprovada | Critério de aceite |
| --- | --- | --- |
| D-UX-01 | A sidebar expandida mantém, nesta ordem, identidade Prisma, navegação, empresa ativa, usuário ativo e rodapé institucional. | CA-UX-01: captura desktop expandida comprova agrupamento, ordem, hierarquia e ausência de sobreposição. |
| D-UX-02 | O rodapé expandido mostra `Powered by`, o asset HRT oficial já usado no login e a versão central do Prisma. | CA-UX-02: usa `/assets/login/hrt-logo-light.png`, preserva a marca completa e apresenta `v1.7.1` sem string de versão local. |
| D-UX-03 | A sidebar colapsada mantém símbolo Prisma completo, um único botão de expansão em região própria, navegação por ícones, empresa e usuário funcionais e somente a versão no rodapé. | CA-UX-03: captura colapsada comprova estrutura e respiro; interação de empresa, usuário e toggle permanece acessível. |
| D-UX-04 | A composição visual segue a referência em topologia, ordem, agrupamentos, densidade e posição relativa, adaptada aos tokens e componentes Prisma. | CA-UX-04: comparação no mesmo estado e viewport registra divergências materiais no AoT. |
| D-01 | A versão pública passa a `v1.7.1` pela fonte executável única de releases. | CA-D01: `PRISMA_RELEASE.displayVersion` e todas as superfícies consumidoras exibem `v1.7.1`; teste do registro aprovado. |
| D-02 | O drawer móvel preserva navegação, empresa, usuário e rodapé expandido sem sobreposição. | CA-D02: inspeção em viewport móvel e operação por teclado. |

## PROIBIDO

- P-01: recriar, simplificar ou duplicar o logo HRT; hardcodar `v1.7.1` na sidebar.
- P-02: exibir `Powered by HRT` no modo colapsado.
- P-03: remover ou degradar seleção de empresa, menu do usuário, navegação, toggle ou acessibilidade.
- P-04: adicionar segundo botão de expansão/recolhimento ou sobrepor o controle ao logo.
- P-05: alterar backend, Supabase, schema, RLS, permissões ou produção neste movimento.

## FORA DE ESCOPO

- F-01: redesenho de páginas de conteúdo ou navegação móvel fora do drawer existente.
- F-02: novos assets, bibliotecas, endpoints, persistência ou migrações.
- F-03: implantação em QA ou produção sem autorização posterior.

## AUTONOMIA

- A-01: engenharia pode reorganizar internamente header, navegação, utilidades e footer, sem alterar a arquitetura visual acordada.
- A-02: medidas finas, tokens, CSS e comportamento responsivo podem ser ajustados para evitar corte, overflow e sobreposição.
- A-03: testes dirigidos, documentação, Context Pack, commit e push da branch estão autorizados; merge e produção não.

## PENDÊNCIAS

Nenhuma. O estado expandido e colapsado usa um único toggle contextual; o modo colapsado usa o símbolo triangular Prisma completo; o asset HRT é o mesmo da tela de login; a solicitação atual aprova `v1.7.1` como primeira entrega oficial do Movimento 7.

## APROVAÇÃO

- Product Owner: Bruno.
- Data: 2026-09-18.
- Evidência: pedido atual e briefing anexado.
