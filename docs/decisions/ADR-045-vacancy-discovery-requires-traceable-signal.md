# ADR-045: Resultado de descoberta exige sinal rastreável

- Status: accepted
- Date: 2026-09-08
- Owners: product and domain engineering

## Context

O ADR-044 determinou que todos os Perfis publicados permanecessem visíveis para evitar exclusões silenciosas. A aplicação prática mostrou Perfis sem relação ocupacional e sem qualquer evidência de requisito misturados aos resultados relevantes.

## Problem

Evitar que disponibilidade para análise manual seja interpretada como relação com a Vaga.

## Decision

Todos os Perfis publicados elegíveis continuam paginados e analisados, mas um Perfil só é retornado quando possui relação ocupacional automática, requisito atendido, evidência parcial, sinal relacionado ou confirmação humana anterior. Zero sinal produz lista vazia, nunca card de candidato.

## Alternatives considered

- Manter todos visíveis em seção recolhida: rejeitado porque ainda transforma ausência total de sinal em resultado da Vaga.
- Exigir somente requisito atendido: rejeitado porque excluiria relações ocupacionais úteis antes da classificação detalhada.
- Usar score mínimo: rejeitado por opacidade e incompatibilidade com a governança do Prisma.

## Reasons for the choice

O critério é simples, observável e explicável. Reduz ruído sem impedir relações ocupacionais ou evidências parciais legítimas.

## Positive consequences

Resultados possuem justificativa rastreável e Perfis sintéticos ou desconectados deixam de aparecer.

## Negative consequences

Um Perfil cuja relação não esteja materializada no título, experiência, Knowledge ou requisitos pode não aparecer até que a Vaga ou o Perfil seja enriquecido.

## Risks

Falso negativo por evidência ainda não registrada ou dimensão incorreta.

## Mitigation

Manter relação ocupacional ampla, equivalências Knowledge, evidência parcial, requisitos pendentes não bloqueantes, total analisado e ação para revisar a Vaga.

## Technical impact

`vacancy-matching-explainable` passa a 2.1.0. O filtro é determinístico após a análise e não altera a consulta tenant-scoped.

## Data impact

Nenhuma migration ou reescrita. Decisões humanas existentes continuam em `match_evaluations`.

## Security and LGPD impact

Sem mudança de autoridade, RLS ou exposição de dados.

## AI impact

Sem LLM, score ou decisão automática de contratação.

## Compatibility

Avaliações anteriores permanecem legíveis. A mudança afeta apenas quais cards entram no resultado atual.

## Validation strategy

Testes determinísticos para zero sinal, sinais positivos e confirmação humana, além da regressão integral do repositório.

## Review criterion

Reavaliar se Perfis comprovadamente relevantes não aparecerem por ausência estrutural de evidência.

## Replacement criterion

Somente por critério igualmente rastreável, sem score oculto e com decisão humana preservada.

## References

- `docs/decisions/ADR-044-inclusive-position-first-vacancy-discovery.md`
- `web/src/domain/vacancy.ts`
- `web/src/infrastructure/supabase/vacancyService.ts`

## Change history

- 2026-09-08: accepted; supersedes somente a regra do ADR-044 que mantinha Perfis sem sinal visíveis.
