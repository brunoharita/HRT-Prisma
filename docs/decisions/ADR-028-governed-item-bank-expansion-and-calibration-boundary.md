# ADR-028: Expansão governada e calibração progressiva do Banco de Itens

- Status: accepted
- Date: 2026-09-01
- Owners: architecture, AI, security, product, QA

## Context

O M5.1A criou o catálogo e o Composer. O M5.1B criou execução, métricas e Evidência Demonstrada. Escalar o Banco de Itens sem um limite explícito criaria risco de geração desnecessária, custo não controlado, duplicidade, publicação sem revisão e falsa calibração baseada em fixtures.

## Decision

O Prisma resolve cobertura elegível antes de criar uma Generation Need. A geração externa fica atrás da Edge Function `assessment-item-generator`, com JWT obrigatório, flag fail-closed, provider e modelo aprovados, orçamento, teto por pedido, limite diário, cooldown e Structured Output estrito. O provider falso determinístico é a única rota ativa para QA.

Generation Need, Request, Proposal, Review, orçamento e snapshots analíticos permanecem separados. Proposal nunca é Item ativo. Publicação exige decisão humana append-only, preserva provider, modelo, prompt, schema, custo e proposal de origem. Escritas Global exigem Super Admin; itens Organization continuam privados e não são promovidos automaticamente.

Deduplicação usa fingerprint determinístico e similaridade lexical versionada. Similaridade gera sinal explicável para revisão, não um score opaco de qualidade. Geração não recebe Pessoa, currículo, resposta, contato ou pesquisa web.

Dificuldade e tempo definidos nunca são sobrescritos por observações. Snapshots sintéticos podem demonstrar cálculo, mas nunca recebem estado `calibrated`. Calibração real permanece bloqueada até dados reais autorizados, amostra, metodologia e decisão jurídica.

## Consequences

- O Item Bank existente continua operando com a IA externa desativada.
- Retries preservam idempotência e custo por meio de reservation, usage e release append-only.
- Conteúdo publicado permanece versionado e histórico.
- Não existe roteamento autônomo de modelo, decisão sobre Pessoas ou publicação Global automática.
- Ativação de provider real exige nova decisão material sobre modelo, privacidade, retenção, custo e QA.

## Validation

QA deve provar gap, geração fake, validação, deduplicação, revisão, publicação, replay, isolamento tenant, autoridade Global, orçamento, analytics sintéticos e ausência de calibração real. Nenhum teste obrigatório pode depender de LLM vivo.

## References

- `src/domain/assessmentItemGovernance.ts`
- `supabase/functions/assessment-item-generator/index.ts`
- `supabase/migrations/20260901145444_m51c_item_bank_governance.sql`
- `docs/ai/competency-verification-evaluation.md`
- `docs/qa/competency-verification-test-plan.md`
