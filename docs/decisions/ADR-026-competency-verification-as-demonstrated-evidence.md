# ADR-026: Verificação de competências como evidência demonstrada

- Status: proposed
- Date: 2026-09-01
- Owners: product, architecture, AI, security, QA

## Context

O Prisma já separa fatos, evidências, inferências, recomendações, decisões humanas e resultados observados. O matching atual identifica requisitos atendidos, parcialmente atendidos e sem evidência, mas ainda não possui uma forma planejada de obter evidência prática quando a evidência documental ou contextual é insuficiente para uma necessidade profissional concreta.

## Problem

É necessário decidir se o M5.1 deve ser modelado como plataforma de testes ou como mecanismo de redução de incerteza sobre competências, preservando explicabilidade, tenant isolation, privacidade e autoridade humana.

## Decision

O M5.1 será planejado como Verificação de Competências, centrado em Verification Need e evidência demonstrada. Assessment é mecanismo, não entidade central do produto.

A verificação nasce prioritariamente de uma necessidade profissional, como vaga, matching, busca de recrutador ou mapeamento organizacional. O Perfil da Pessoa pode iniciar verificação manualmente, mas não é o gatilho principal.

Evidência demonstrada não sobrescreve evidência declarada, contextual ou confirmada. Divergências são preservadas como informação útil.

O primeiro desenho operacional recomendado usa múltipla escolha, Item Bank, blueprint, rubrica, telemetria por questão e correção determinística. Senioridade consolidada, proctoring invasivo, ranking e decisão automática ficam fora do M5.1.

## Alternatives considered

- Teste como entidade central: rejeitado porque desloca o produto para uma plataforma genérica de provas.
- Perfil individual como gatilho principal: rejeitado porque cria verificações sem contexto de necessidade.
- IA gerando assessment inteiro sob demanda: rejeitado como padrão por custo, variabilidade, menor auditabilidade e dificuldade de calibração.
- Resultado demonstrado sobrescrevendo perfil: rejeitado porque apaga divergências e viola a separação de evidências.

## Reasons for the choice

O desenho preserva a tese do Prisma: evidência, explicabilidade, rastreabilidade e apoio à decisão humana. Também cria base para mobilidade interna, skill gap e senioridade futura sem antecipar essas entregas.

## Positive consequences

- Gaps de evidência passam a ter tratamento explícito.
- Matching pode explicar quando uma competência crítica precisa de evidência demonstrada.
- Item Bank reduz custo marginal e melhora auditabilidade.
- Divergências entre evidências ganham valor analítico.

## Negative consequences

- Exige governança editorial e metodológica.
- Exige política de privacidade, retenção, contestação e acessibilidade antes de piloto real.
- Exige cuidado para não converter sinais de integridade em acusação.
- Cold start terá poucos itens calibrados e dependerá mais de revisão humana.

## Risks

- Confundir dificuldade de item com nível de competência.
- Usar tempo como proxy absoluto.
- Tratar browser telemetry como prova.
- Vazar item privado de organização.
- Promover item gerado por IA sem revisão.
- Reclassificar senioridade indevidamente.

## Mitigation

Contratos separados para nível-alvo, dificuldade e nível demonstrado; Item Bank com lifecycle; telemetry reason codes; resultado bruto imutável; RLS e FKs compostas; QA negativa; acessibilidade como requisito; política explícita de organização; e estado planejado separado de implementação.

## Technical impact

Nenhum impacto executável neste movimento. Implementação futura exigirá contratos, schema, RLS, composer, attempt runtime, evidência demonstrada, policy engine, UX e integração ao matching.

## Data impact

Planeja novos agregados tenant-owned e globais. Todo dado tenant deve carregar `organization_id`. Itens Organization permanecem privados. Assessments históricos devem reter versões de definição, blueprint, item, rubrica e método.

## Security and LGPD impact

Assessment, respostas e telemetria são dados pessoais. Antes de piloto real, definir base legal, aviso, retenção, exportação, exclusão, contestação, subprocessadores e auditoria de visualização.

## AI impact

IA pode gerar lacunas e variantes, mas não aprova item global, não decide contratação, não acusa fraude e não inventa calibração. Provedor, modelo e custo permanecem não aprovados no runtime atual.

## Compatibility

M5.1 deve ser aditivo. Perfis, evidências e matchings históricos permanecem legíveis. Versão desconhecida em operação sensível deve falhar fechada.

## Validation strategy

Antes de ativação: unit tests de suficiência, contract tests de versão, testes RLS, composer determinístico, golden fixtures de divergência/inconclusivo, replay de attempt, telemetria por questão, integridade sem acusação, acessibilidade, Context Pack e QA remoto com dados sintéticos.

## Review criterion

Revisar antes de qualquer migration, provider externo, piloto com Pessoas reais, proctoring, modalidade prática, uso de dados agregados para calibração ou exposição externa.

## Replacement criterion

Superseder se o Prisma adotar uma modalidade central diferente, alterar o papel de Verification Need, incluir senioridade no mesmo movimento ou mudar a política de separação entre evidências.

## References

- `docs/product/m5-1-competency-verification.md`
- `docs/architecture/competency-verification-architecture.md`
- `docs/ai/competency-verification-evaluation.md`
- `docs/security/competency-verification-security.md`
- `docs/qa/competency-verification-test-plan.md`

## Change history

- 2026-09-01: proposed.
