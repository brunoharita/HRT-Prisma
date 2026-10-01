# AoT — modal de revisão de divergências

Contrato: `docs/qa/agreement-matching-review-modal.md` v1.0.0. Baseline: `main` anterior ao movimento, revisão expandida no cartão, seleção em lista suspensa, mesma API de carga/checagem/salvamento. Mapa de impacto: cartão e estilos (`direct`), carga e salvamento da revisão (`plausible_indirect`), autorização/PII (`critical_transversal`), IA, banco, Knowledge e score (`no_impact_identified`, sem diff funcional previsto).

| ID | Implementação e preservação | Evidência | Estado |
| --- | --- | --- | --- |
| D-01 | Botão do cartão abre modal existente da biblioteca, sem navegação; score fica no cartão | Typecheck, build web e inspeção do diff; visual autenticado pendente | PARTIAL |
| D-02 | Pergunta explicativa, trecho, duas categorias e evidências alinhadas por item no modal | Teste direcionado e inspeção do componente; renderização autenticada pendente | PARTIAL |
| D-03 | Três opções visíveis por item, nenhuma pré-selecionada, botão indisponível até concluir todas; gravação e recálculo continuam no serviço anterior | Teste direcionado, typecheck, inspeção da chamada existente; gravação autenticada não executada | PARTIAL |
| D-04 | Estado legado separado, checagem somente por clique; excesso e erro preservam cálculo | Teste direcionado e inspeção do fluxo; smoke autenticado pendente | PARTIAL |
| P-01 | Pergunta rotulada como revisão, sem prompt/saída bruta nem respostas inventadas | Inspeção do diff e teste direcionado | PASS |
| P-02 | Sem campo aberto, sem escolha automática ou chamada IA na abertura | Teste direcionado e inspeção do diff | PASS |
| P-03 | Sem alteração funcional em Edge, banco, score, prompt, Knowledge ou papéis | Inspeção do diff e plano de release pendente | PARTIAL |

F-01 preservado: sem novas categorias, justificativa persistida ou reprocessamento de Perfil real. A-01: componentes Modal/Radio/Skeleton existentes e estilos locais, sem dependência nova.

## Validação e limites

`pnpm run typecheck:web`, `pnpm run build`, `pnpm run build:web`, `pnpm run lint` e `node --test dist/tests/trajectoryReviewModal.test.js dist/tests/matchingScore.test.js` passaram localmente (21/21 no teste direcionado). Esses checks provam compilação, contratos estáticos e preservação do matching exercitado; não provam a aparência real nem a interação autenticada. Build web emitiu apenas avisos preexistentes de chunks grandes/import dinâmico ineficaz. Context Pack, commit, CI, publicação web, smoke e comparação visual permanecem pendentes neste registro inicial.
