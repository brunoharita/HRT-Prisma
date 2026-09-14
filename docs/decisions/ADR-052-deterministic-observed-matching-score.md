# ADR-052: Score determinístico projeta o matching explicável após a descoberta

- Status: accepted
- Date: 2026-09-13
- Owners: product and domain engineering
- Supersedes: somente a decisão de não expor score registrada no ADR-051; preserva integralmente sua descoberta por área

## Context

O matching 2.3.0 separa área, função e requisitos, mas ordena apenas por classes internas. O Product Owner aprovou uma projeção numérica explicável sem transformar o número em filtro ou autoridade de contratação.

## Decision

`vacancy-matching-explainable` avança para 3.0.0 e incorpora `matching-score-1.0.0`. Uma função pura, executada depois da descoberta, aplica pesos 30/20/35/15 somente às dimensões definidas pela Posição. Requisitos dividem o peso da categoria igualmente e usam 100/50/25/0. Cobertura é separada; score provisório não ordena. Pela fórmula aprovada, `score <= cobertura`.

O resultado derivado leva breakdown, evidências por referência, versões e fingerprint dos inputs. Não há cache persistido, migration ou nova fonte de verdade. A Evidência Demonstrada vigente pode fortalecer apenas o requisito exato na fronteira tenant-scoped. Decisões humanas permanecem em `match_evaluations`, precedem o score na ordenação e não alteram o cálculo factual.

## Consequences

Grupo principal e grupo relacionado continuam semanticamente separados. Scores definitivos ordenam somente dentro do mesmo grupo e estado de decisão humana. Ausência de critério retorna indisponível; falta de evidência não vira incapacidade. O detalhe permite reproduzir numerador, denominador, cobertura e versões.

## Boundaries

- Sem LLM, provider, atributo sensível, condição operacional, cutoff ou bônus genérico.
- Sem alteração de Perfil, Posição, Knowledge ou evidência original.
- Sem produção neste movimento.

## Validation

Testes de unidade/golden cobrem fórmula, ausência de dimensões, provisório, versões, senioridade, M5.1, PII/keyword stuffing, Beatriz, Tecnologia/Marketing e ordenação. `pnpm run report:matching-score-shadow` gera relatório sintético reproduzível sem nome pessoal.

## References

- `docs/qa/agreement-m61-matching-score.md`
- `docs/ai/matching-contract.md`
- `docs/decisions/ADR-051-area-first-vacancy-discovery.md`
- `web/src/domain/matchingScore.ts`
