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
| P-03 | Sem alteração funcional em Edge, banco, score, prompt, Knowledge ou papéis | Inspeção do diff e plano seletivo de release, que marcou banco/Edge como `skip` | PASS |

F-01 preservado: sem novas categorias, justificativa persistida ou reprocessamento de Perfil real. A-01: componentes Modal/Radio/Skeleton existentes e estilos locais, sem dependência nova.

## Validação e limites

`pnpm run typecheck:web`, `pnpm run build`, `pnpm run build:web`, `pnpm run lint`, `pnpm run check:prisma-context` e `node --test dist/tests/trajectoryReviewModal.test.js dist/tests/matchingScore.test.js` passaram localmente (21/21 no teste direcionado). O Context Pack foi regenerado em worktree isolado para não incluir um documento não rastreado alheio ao movimento. Esses checks provam compilação, contratos estáticos e preservação do matching exercitado; não provam a aparência real nem a interação autenticada. Build web emitiu avisos não bloqueantes de chunks grandes/import dinâmico ineficaz.

SHA funcional `f0418f7e9ff58ac31e056a88b8661c8af87e2c2b` integrado por fast-forward em `main` local/GitHub/VPS. CI da branch `36870374243` PASS. O plano seletivo indicou somente web, documentação e Context Pack; banco e Edge não foram acessados. Apenas `prisma-web` foi construído e recriado, imagem `sha256:85a0abe1a47a69e4fdde2545ee509fd11c4528e16d8ef13dbdd387fb3f360ae8`, contêiner `running` e zero reinícios. Rollback `prisma-web:rollback-before-f0418f7e9ff5` preserva a imagem anterior `sha256:3340361913ae3b752780421ba2bb323cca7e2e6c0983bbab504e0dd3b93e9732`. O smoke imediato do script saiu com HTTP 404; verificação posterior confirmou `/`, `/login`, `/index.html` e o asset JS novo em 200, com marcadores do modal nos bundles JS/CSS. A consulta `release:verify` confirmou SHA local/origin e HEAD HTTP 200.

Não houve chamada paga à IA nem revisão/decisão sobre Pessoa real. A abertura visual autenticada do modal, sua comparação em desktop/mobile e o salvamento com recálculo continuam **NOT TESTED** em produção; por isso D-01 a D-04 permanecem `PARTIAL`, apesar de publicação e checagens locais concluídas. Não há desvio funcional conhecido nos caminhos exercitados. O 404 inicial foi resolvido sem alterar código ou outros serviços.
