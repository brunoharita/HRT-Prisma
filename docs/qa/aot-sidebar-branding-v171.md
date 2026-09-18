# AoT — Sidebar institucional e Prisma v1.7.1

Data: 2026-09-18. Contrato: `docs/qa/agreement-sidebar-branding-v171.md` 1.0.0. Execução: `docs/qa/execution-sidebar-branding-v171.md` 1.0.0. Baseline: `19e0a7c66bbe08d0d5a406cbe638c05f17410762`.

## Matriz de Acordos

| ID | Implementação | Teste / evidência | Status | Ambiente / limitação |
| --- | --- | --- | --- | --- |
| D-UX-01 | `PrismaAppShell` mantém marca, navegação, utilidades e footer em regiões próprias; CSS preserva ordem e respiro. | Render autenticado local expandido em 1766 × 1272, com logo, navegação, empresa, usuário e rodapé sem sobreposição. | PASS | local |
| D-UX-02 | Footer expandido reutiliza `/assets/login/hrt-logo-light.png` e `PRISMA_RELEASE.displayVersion`. | Inspeção visual confirmou a marca HRT completa; teste-fonte impede versão local e exige o asset oficial. | PASS | local |
| D-UX-03 | Estado recolhido mostra símbolo Prisma, toggle único, ícones, empresa, usuário e somente a versão. | Render autenticado recolhido; seletor de empresa e menu do usuário foram abertos; árvore acessível expôs nomes e `v1.7.1`. | PASS | local |
| D-UX-04 | Medidas finas e recortes usam componentes/tokens existentes sem alterar a topologia normativa. | Comparação visual dos estados equivalentes registrada abaixo. | PASS | fidelidade estrutural, não pixel perfect |
| D-01 | Registro executável acrescenta M7.1 como primeira entrega do Movimento 7; login e sidebar consomem a mesma fonte. | `productRelease.test` e inspeção autenticada do login/sidebar confirmaram `v1.7.1`. | PASS | rollout hospedado fora do escopo |
| D-02 | Drawer móvel reutiliza `SidebarContent` expandido com marca, navegação, empresa, usuário e footer. | Viewport 390 × 844; abertura por `Enter`, fechamento por `Escape` e inspeção visual/AX concluídas. | PASS | local |

## Proibições verificadas

| ID | Teste negativo / evidência | Status |
| --- | --- | --- |
| P-01 | O diff não cria assets; usa o PNG oficial. Teste rejeita `v1.7.1` hardcoded no shell. | PASS |
| P-02 | Branch condicional renderiza apenas `PRISMA_RELEASE.displayVersion` quando recolhida; captura confirma ausência de `Powered by`. | PASS |
| P-03 | Navegação, empresa e usuário permaneceram operáveis; nomes acessíveis foram verificados na árvore AX. | PASS |
| P-04 | Teste-fonte exige uma única ocorrência do controle de recolhimento; captura confirma região própria sem sobreposição. | PASS |
| P-05 | Diff limitado a frontend, release registry, testes e documentação; nenhum arquivo de backend, Supabase, schema, RLS, permissão ou produção foi alterado. | PASS |

## Fora de escopo preservado

| ID | Evidência no diff | Status |
| --- | --- | --- |
| F-01 | Nenhuma página de conteúdo ou jornada móvel externa ao drawer foi redesenhada. | PASS |
| F-02 | Nenhum asset, biblioteca, endpoint, persistência ou migration foi criado. | PASS |
| F-03 | Não houve merge, implantação em QA, Supabase ou produção. | PASS |

## Evidência de fidelidade visual

| Referência / viewport | Estado equivalente | Render entregue | Divergências | Status |
| --- | --- | --- | --- | --- |
| imagem normativa / desktop 1766 × 1272 | expandido | Captura autenticada local em `http://127.0.0.1:5555/`: logo e toggle em regiões próprias; grupos de navegação; empresa; usuário; assinatura HRT e versão. | Largura usa o token real de 288 px e dados/autorização reais do produto; nenhuma divergência topológica material. | PASS |
| imagem normativa / desktop 1766 × 1272 | recolhido | Captura autenticada local: símbolo completo, toggle abaixo da marca, ícones, empresa, avatar e `v1.7.1`. | Largura usa o token real de 88 px; o nome curto da empresa permanece visível sob o ícone conforme a implementação acessível existente. | PASS |
| fundação responsiva / 390 × 844 | drawer expandido | Captura autenticada local: logo, menu agrupado rolável, empresa, usuário e assinatura HRT dentro do drawer. | Drawer usa o componente Ant Design e a largura tokenizada, não a proporção ilustrativa da prancha. | PASS |

## Desvios do contrato

Nenhum desvio material. A referência foi tratada como alvo normativo de arquitetura visual; dimensões finas, conteúdo real e comportamento acessível foram adaptados conforme A-01/A-02.

## Validação final

- `pnpm run typecheck:web`: PASS.
- `pnpm run build`: PASS.
- `pnpm run build:web`: PASS; aviso existente de chunk Vite acima de 900 kB, sem erro de build.
- `node --test dist/tests/productRelease.test.js dist/tests/uxFoundation.test.js tests/tooling/prismaContext.test.mjs`: PASS, 16/16.
- `pnpm run generate:prisma-context`: PASS; `TUDO_SOBRE_PRISMA.md` e `FONTE_GPT_PRISMA.md` regenerados.
- `pnpm run check:prisma-context`: PASS.
- Browser local autenticado: estados expandido, recolhido e móvel, menus de empresa/usuário e teclado verificados. O console manteve dois avisos preexistentes de depreciação Ant Design (`Alert.message` e `Drawer.width`) em conteúdo já existente; nenhum erro novo foi associado à sidebar.

## Git / QA / ambiente

Branch `codex/sidebar-branding-v171`. Entrega destinada ao `origin` existente após revisão do diff. QA, Supabase, merge em `main` e produção permaneceram fora do escopo.

## Conclusão

PASS. Todos os `D-*` e `P-*` aplicáveis possuem implementação e evidência local; não há requisito obrigatório parcial ou sem prova.
