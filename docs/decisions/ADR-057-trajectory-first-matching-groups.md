# ADR-057: Trajetória profissional precede requisitos na descoberta por Posição

- Status: accepted
- Date: 2026-09-14
- Owners: product and domain engineering
- Supersedes: composição binária dos grupos do ADR-051 e elegibilidade uniforme do ADR-052; preserva a conexão factual cross-category do ADR-053

## Context

O matching 4.0.0 recupera um requisito explícito em qualquer conteúdo profissional publicado. Isso corrige falsos negativos de categoria, mas permite que uma Pessoa sem trajetória na área apareça ao lado de trajetórias relacionadas apenas porque mencionou ou comercializou uma ferramenta exigida. O exemplo observado foi uma carreira comercial conectada a uma Posição gerencial de tecnologia por termos tecnológicos.

## Problem

Separar, de forma simples e explicável, experiência profissional direta, trajetória transferível e sinais contextuais sem transformar palavras isoladas em compatibilidade competitiva. Posições de entrada precisam preservar descoberta por potencial mesmo sem experiência anterior.

## Decision

O matching avalia primeiro a relação da trajetória e depois a elegibilidade para score:

1. Grupo A contém experiência direta na área ou função equivalente sustentada por cargo/ocupação e histórico profissional publicado.
2. Grupo B contém trajetória adjacente ou transferível. Em títulos explicitamente de entrada, sinais rastreáveis de formação, projetos ou conhecimentos também representam potencial de entrada.
3. Grupo C contém somente sinais contextuais ou requisitos isolados, sem trajetória relacionada suficiente.

Somente A e B recebem `matching-score` comparável e são ordenados numericamente dentro do grupo. C permanece recuperável, recolhido por padrão e sem número comparável. A conexão factual de um requisito continua preservada; o grupo controla elegibilidade competitiva, não apaga evidência.

## Alternatives considered

- Classificar semanticamente cada verbo de uso, venda, implantação ou gestão: adiado por complexidade desnecessária para a regra aprovada.
- Excluir totalmente sinais sem trajetória: rejeitado porque elimina conexões úteis para análise humana.
- Manter dois grupos e aplicar apenas penalidade: rejeitado porque um número ainda sugeriria comparabilidade entre trajetórias diferentes.

## Reasons for the choice

A solução reutiliza relações de área, ocupação, função, senioridade e evidências já existentes. O critério é compreensível para o operador: primeiro a história profissional precisa se relacionar ao trabalho; depois os requisitos refinam a compatibilidade. A exceção explícita conserva o propósito de vagas de entrada.

## Positive consequences

Termos isolados deixam de competir com trajetórias profissionais. A explicação mostra por que cada Pessoa está em A, B ou C. O matching permanece determinístico, rastreável e sem nova dependência.

## Negative consequences

Títulos profissionais muito incomuns podem ficar no Grupo C até uma relação ocupacional ou decisão humana estar disponível. O critério deliberadamente simples não distingue, por verbo, venda de uso técnico dentro da mesma trajetória.

## Risks

Descrições profissionais podem conter palavras de área sem que o cargo pertença à área. Uma lista extensa no Grupo C pode gerar ruído visual. Versões novas do matching poderiam deixar de ser aceitas pela jornada M6.2.

## Mitigation

Cargo/ocupação e área declarada sustentam A/B; descrição isolada permanece C. O Grupo C inicia recolhido. A fronteira M6.2 usa lista fechada de versões 4.0.0 e 5.0.0, com versão desconhecida rejeitada.

## Technical impact

`vacancy-matching-explainable` avança para 5.0.0 e inclui `trajectoryAssessment` e o terceiro grupo. `matching-score` avança para 1.2.0 para tornar o resultado indisponível quando a elegibilidade é apenas contextual. A UI apresenta A/B/C e a avaliação persistida registra trajetória. Uma migration substitui somente a função M6.2 para ampliar versões suportadas.

## Data impact

Não há tabela, coluna, backfill ou reescrita. Avaliações novas preservam a versão e o snapshot adicional. Avaliações históricas continuam legíveis.

## Security and LGPD impact

Não entram novos atributos nem PII no cálculo. A função `SECURITY DEFINER` conserva checagem tenant-scoped, `search_path` vazio, execução negada a `anon` e concedida somente a `authenticated`.

## AI impact

Nenhum prompt, modelo, embedding, chamada externa ou inferência probabilística é introduzido.

## Compatibility

Snapshots 4.0.0 permanecem válidos para necessidades de verificação já auditáveis; 5.0.0 passa a ser a versão corrente. Versões desconhecidas falham fechadas.

## Validation strategy

Fixtures cobrem tecnologia direta, trajetória adjacente, carreira comercial com SAP, exceção de entrada, ausência total de sinal, ordenação A/B/C, score indisponível no C e fronteira M6.2 positiva/negativa. Build, typecheck, golden, Context Pack, SQL transacional e smoke visual autenticado fecham a entrega.

## Review criterion

Reavaliar se análise real mostrar volume material de falsos A/B ou se a exceção de entrada ocultar candidatos pertinentes.

## Replacement criterion

Qualquer classificação semântica por atividade, aprendizado automático ou mudança de autoridade exige novo acordo e ADR substituto.

## References

- `docs/qa/agreement-m61-matching-score.md`
- `docs/qa/execution-m61-matching-score.md`
- `docs/ai/matching-contract.md`
- `web/src/domain/vacancy.ts`
- `web/src/domain/matchingScore.ts`
- `supabase/migrations/20260914161427_m61_trajectory_matching_version.sql`

## Change history

- 2026-09-14: accepted by explicit Product Owner implementation request.
