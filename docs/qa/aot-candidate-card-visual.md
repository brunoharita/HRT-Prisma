# AoT — cartão de Pessoas por Posição

Contrato: `docs/qa/agreement-candidate-card-visual.md` v1.0.0. Referência normativa: `docs/qa/assets/candidate-match-card-action-hub-reference.png`. Baseline funcional: `main` `fe01775da1d8a08624342a26ec70a4b2b573762f`; cartão atual em `web/src/pages/VacancyPages.tsx`, revisão em `web/src/components/TrajectoryConflictReview.tsx` e estilos em `web/src/styles.css`.

## Acordos -> implementação -> teste -> evidência

| ID | Implementação | Teste/evidência | Estado |
| --- | --- | --- | --- |
| D-01 | Cabeçalho `prisma-vacancy-match-identity` com identidade, etiquetas e `MatchingScoreSummary` existente | Prévia React 1670 × 941, checkbox único e score 32/100 demonstrativo à direita | PASS |
| D-02 | `prisma-vacancy-action-hub` reúne consultar, revisão condicional e decisão; `TrajectoryConflictReview` conserva métodos e estados | DOM confirmou cada controle uma vez; revisão simulada abriu um conflito, mostrou trechos, escolhas e salvamento desabilitado antes de decidir; `canReview=false` exibiu somente aviso de restrição | PASS |
| D-03 | `prisma-vacancy-evidence-layout` separa trajetória e requisitos; buckets e razões vêm do mesmo `match` | Captura local B nas duas colunas; modo C exibiu somente bucket contextual; A/B mantiveram quatro buckets e cinco razões no código | PASS |
| D-04 | Breakpoints 1100/760/600/420 adaptam colunas e buckets | Prévia em 1670, 760 e 390 px, revisão aberta e controles acessíveis; `scrollWidth <= innerWidth` nos três; buckets empilhados a 390 px | PASS |
| D-05 | Branch pendente e condições de decisão preservadas; score reutilizado | Prévia local A, B, C, pendente, sem permissão, confirmada, descartada e score nulo; labels, disabled e ausência/presença de revisão conferidos | PASS |
| P-01 | Nenhum arquivo de domínio, persistência, serviço, Edge ou backend editado | Revisão do diff e plano de release seletivo | PASS |
| P-02 | Sem duplicar CTA, sem ocultar lacunas ou forçar revisão | DOM do cenário B; lacunas visíveis; revisão sem escolha não habilita salvar | PASS |
| P-03 | Valores do exemplo ficam apenas na referência, nunca em código runtime | Prévia com Pessoa demonstrativa, modos alternativos e inspeção do diff | PASS |

## Comparação visual e preservação

Referência: PNG com SHA-256 `de50e17478d3a65a60c0dfc876660d1296f7bba57fe711ad7db81f4f0ace5385`. Captura renderizada desta execução no histórico da conversa: prévia Vite local temporária `/visual-qa.html`, Grupo B com divergência, Pessoa/score/requisitos espelhando a imagem, viewport 1670 × 941. Topologia conferida: identidade/score, três grupos de ação, duas colunas de conteúdo, três buckets superiores e lacunas abaixo. Diferenças deliberadas: texto dos botões existente preservado; resumo mantém elipse de duas linhas do produto; a seleção para comparação e as razões continuam visíveis, embora omitidas da ilustração. Variações a 760 e 390 px e revisão aberta também foram renderizadas. A prévia e os valores fictícios foram removidos ao fim da inspeção; não houve chamada à IA nem mutação de Pessoa real.

## Release e limites

Lint, typecheck web, build web, gerador/verificador do Context Pack e `git diff --check` passaram no worktree. O build apresentou somente avisos existentes de chunks grandes/importação dinâmica. Pendente registrar SHA, CI, plano, QA, VPS e smoke após publicação; nenhum resultado remoto é presumido aqui.
