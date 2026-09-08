# ADR-044: Descoberta inclusiva de Pessoas com relação ocupacional separada

- Status: accepted
- Date: 2026-09-07
- Owners: product, domain and AI engineering

## Context

A Vaga e o Perfil usam dimensões canônicas, referências ocupacionais publicadas e evidências observáveis. A descoberta anterior podia esconder Pessoas quando faltavam requisitos classificados ou sinais detalhados, e um requisito podia consultar dimensões profissionais não correspondentes.

## Problem

Descobrir Pessoas potencialmente relevantes sem transformar ausência de evidência em exclusão, sem score oculto e sem declarar equivalência ocupacional ou aderência que a evidência não sustenta.

## Decision

Separar relação com a posição de aderência detalhada. Paginar todos os Perfis publicados acessíveis e mantê-los visíveis. Calcular relação ocupacional por referência oficial, relações e aliases Knowledge aprovados, título profissional e cargos das experiências. Aproximações textuais são apenas possíveis relações até confirmação humana. Cada requisito consulta somente sua dimensão canônica; igualdade exata/canônica é atendida, substring é parcial, relação explícita é sinal relacionado e narrativa não é evidência.

A decisão humana de confirmar ou descartar a relação é auditada em `match_evaluations`, prevalece na ordenação e não altera Perfil, Vaga ou Knowledge. Requisitos sem classificação mantêm a aderência detalhada pendente, sem bloquear descoberta.

## Alternatives considered

- Filtrar somente quem atende requisitos: rejeitado porque confunde ausência de evidência com ausência profissional.
- Usar busca textual ampla em todo o Perfil: rejeitado por produzir falsos positivos entre dimensões.
- Criar score de aderência: rejeitado por opacidade e risco de decisão automatizada.
- Criar tabela ou índice paralelo de candidatos: rejeitado porque Perfis, Knowledge e avaliações existentes atendem ao contrato.

## Reasons for the choice

Privilegia descoberta e controle humano, reutiliza fundações existentes, torna cada explicação rastreável e reduz falsos negativos sem fabricar evidência.

## Positive consequences

Perfis potencialmente relevantes aparecem; pendências são visíveis; decisões humanas têm efeito operacional; evidência fica separada por dimensão e com proveniência.

## Negative consequences

Listas podem ser maiores e exigem paginação. Relações lexicais possíveis ainda dependem de revisão humana. A ausência de requisitos classificados reduz o detalhe disponível.

## Risks

Alias lexical excessivo, custo de carregar muitos Perfis e interpretação incorreta de nível de evidência como score.

## Mitigation

Vocabulário ocupacional restrito, ordem estável e paginação, rótulos explícitos, proveniência expansível, decisão humana e ausência de porcentagem ou vencedor.

## Technical impact

`vacancy-matching-explainable` passa a 2.0.0. `profile-discovery` pagina a coleção publicada. A projeção canônica materializa ferramentas históricas em tempo de leitura. Nenhuma dependência nova.

## Data impact

Nenhuma migration. Perfis históricos não são reescritos. Confirmações e descartes usam o JSON auditável de `match_evaluations` no tenant e versão da Vaga.

## Security and LGPD impact

Somente Perfis publicados visíveis pela RLS são consultados. Decisões exigem os mesmos papéis autorizados do matching e não ampliam dados privados.

## AI impact

Não há LLM, score ou inferência de competência/senioridade. Knowledge publicada pode sustentar equivalência; aproximação lexical permanece hipótese explícita.

## Compatibility

Avaliações antigas permanecem legíveis. Campos novos de explicação são derivados; ferramentas ausentes recebem projeção de compatibilidade sem backfill.

## Validation strategy

Testes determinísticos de dimensão, exato/parcial, narrativa excluída, relação ocupacional, decisão humana, inclusão total, paginação, compatibilidade tecnológica e caso Gerente de Projetos de TI.

## Review criterion

Reavaliar com volume relevante de Perfis, falsos positivos lexicais ou adoção de busca server-side dedicada.

## Replacement criterion

Superseder somente com contrato igualmente explicável, tenant-scoped, sem decisão automática e com migração compatível.

## References

- `docs/architecture/vacancy-profile-matrix.md`
- `docs/ai/matching-contract.md`
- `web/src/domain/vacancy.ts`
- `web/src/infrastructure/supabase/profileDiscoveryService.ts`
- `web/src/infrastructure/supabase/vacancyService.ts`
- Supersedes the matching-blocking clause of ADR-043; all other ADR-043 decisions remain active.

## Change history

- 2026-09-07: accepted and implemented locally.
