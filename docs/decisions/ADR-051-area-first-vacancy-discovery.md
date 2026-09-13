# ADR-051: Descoberta de Pessoas considera a área profissional antes da proximidade do cargo

- Status: accepted
- Date: 2026-09-13
- Owners: product and domain engineering
- Supersedes: a extensão textual por domínio profissional registrada no ADR-045 em 2026-09-13

## Context

A Posição `Analista de Marketing` não retornou Beatriz Galazzini apesar de seu Perfil publicado registrar atuação explícita em Marketing em cargos e descrições de experiências. O ajuste 2.2.0 tentou recuperar o caso usando `marketing` como termo distintivo compartilhado entre cargos. O Product Owner esclareceu que esse critério confundia duas perguntas diferentes: se a Pessoa atuou na área profissional da Posição e quão próximo seu cargo é do cargo procurado.

## Decision

A descoberta passa a avaliar separadamente:

1. **experiência na área**: sinal de entrada quando a área informada na Posição aparece de forma explícita em áreas de atuação ou em cargo, descrição ou evidência de experiência do Perfil publicado;
2. **proximidade do cargo**: sinal posterior para ordenar e explicar, usando referência ocupacional publicada ou relação textual suficientemente específica;
3. **aderência por requisito**: leitura detalhada e independente, preservando seus estados e evidências.

Um termo de área isolado não cria equivalência entre cargos. A proximidade textual de cargo volta a exigir igualdade, inclusão ou pelo menos dois termos ocupacionais comuns. O Prisma pode ordenar resultados por classes determinísticas de evidência, mas não exibe score, probabilidade ou vencedor.

## Alternatives considered

- Manter o domínio compartilhado como relação de cargo: rejeitado porque chama uma evidência de área de relação ocupacional.
- Exigir cargo equivalente para aparecer: rejeitado porque exclui trajetórias legítimas dentro da mesma área.
- Criar score numérico de similaridade: rejeitado porque reduz explicabilidade e não é necessário para ordenar sinais observáveis.

## Consequences

Pessoas com experiência publicada na área da Posição entram na descoberta mesmo quando seus cargos anteriores são diferentes. A interface explica separadamente a evidência de área e a proximidade do cargo. Perfis sem área, relação ocupacional, requisito ou confirmação humana continuam fora do resultado.

## Boundaries

- A evidência deve vir do Perfil publicado; resumo livre não é usado para criar relação de área.
- O matching não altera Perfil, Posição ou Knowledge e não infere competência ou senioridade.
- Ausência de evidência não significa ausência de experiência.
- A decisão humana permanece auditável e prevalece na ordenação.

## Technical impact

`vacancy-matching-explainable` avança para 2.3.0. O resultado inclui `areaRelation`, persistido junto das avaliações futuras. Não há migration, dependência nova ou mudança de autoridade.

## Validation

A regressão reproduz os cargos publicados da Beatriz e exige sua inclusão por `experience_area`, mantendo `positionRelation: none`. Também cobre área declarada no Perfil, exclusão de área não relacionada, ausência de score e rastreabilidade da evidência.

## References

- `docs/decisions/ADR-045-vacancy-discovery-requires-traceable-signal.md`
- `docs/ai/matching-contract.md`
- `docs/qa/m54-vacancy-intelligence.md`
- `web/src/domain/vacancy.ts`
