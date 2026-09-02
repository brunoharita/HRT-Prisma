# ADR-026: Classificação acadêmica estruturada e revisável

- Status: accepted
- Date: 2026-09-02
- Owners: Product, AI, Engineering, Security, QA

## Context

Formação era persistida como curso, instituição e período. Textos como “Tecnologia em”, “Técnico em”, “MBA” e “Pós-graduação” permaneciam misturados ao nome do curso, sem representar nível, qualificação, situação e origem separadamente. Datas também poderiam induzir uma conclusão que o documento não declarou.

## Decision

- O array canônico `education` é enriquecido; não existe tabela ou fluxo paralelo.
- `education-academic-classification` 1.0.0 separa `level`, `qualification`, `status`, `classificationOrigin` e origem por dimensão.
- A classificação inicial é determinística, local e versionada. Ela reconhece português e inglês com normalização de caixa, acentos e hífens, sem LLM.
- Período encerrado não prova conclusão. `Atual/Present` gera somente `in_progress` inferido. Pós-graduação genérica mantém qualificação `unknown`. `Tecnologia em` é graduação tecnológica.
- `originalText`, motivos, versão e `classifierSnapshot` preservam o resultado inicial. Override humano altera a classificação efetiva e nunca apaga o snapshot.
- Inferência ou insuficiência exige confirmação humana antes da publicação. Combinações incompatíveis falham no cliente e no banco.
- Perfis históricos sem o contrato continuam legíveis com fallback `unknown`, sem backfill inventado.
- O Delta usa identidade canônica do curso para enriquecer uma formação estável, sem duplicá-la por diferença de prefixo.

## Consequences

M5, Central da Pessoa e Documentos passam a explicar formação de modo consistente e rastreável. O operador mantém autoridade sobre ambiguidades. O custo é um contrato JSON maior e a necessidade de confirmar registros que não declaram situação ou qualificação completa.

## Security and data

Não há nova tabela exposta nem novos grants. Os validadores privados usam `search_path` vazio. Eventos em `person_ingestion_events` registram somente IDs, dimensões alteradas, origem, versão e estado de confirmação; texto do currículo não é duplicado no ledger.

## Compatibility and rollback

A migration aceita payload histórico em leitura e exige o shape atual apenas em novas extrações e salvamentos. Remover a migration restaura o validador anterior, mas drafts escritos em 7.0.0 precisariam ser lidos por runtime compatível; por isso rollback de aplicação e banco deve ocorrer em conjunto.

## Validation

Testes cobrem todas as qualificações principais, inglês, caixa, acentos, hífen, status explícito e inferido, ambiguidade, compatibilidade, override, snapshot, aprovação, Delta e shape SQL. QA conectado deve comprovar migração, negação cross-tenant, publicação revertida e zero resíduo; smoke usa os cinco viewports normativos.

## References

- `src/domain/educationClassification.ts`
- `web/src/components/review/StructuredReviewPanel.tsx`
- `web/src/pages/PersonWorkspacePage.tsx`
- `supabase/migrations/20260902122414_education_academic_classification.sql`
