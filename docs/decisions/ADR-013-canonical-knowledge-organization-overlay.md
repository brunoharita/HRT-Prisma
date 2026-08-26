# ADR-013: Knowledge canônica Prisma com overlay organizacional

- Status: accepted
- Data: 2026-08-26
- Owners: product, data, architecture, security

## Decisão

O Prisma mantém conceitos canônicos próprios e mapeia fontes externas sem transformar uma taxonomia em autoridade única. Organization Knowledge é um overlay tenant-owned: precede a base global dentro da empresa e nunca a altera. Observado, normalizado e inferido são artefatos separados e versionados. Termo desconhecido é preservado e entra na Inbox.

## Consequências

O modelo exige provenance, aprovação, change sets, RLS e resolução determinística de alias. A complexidade é maior que uma tabela de skills, mas evita equivalências forçadas e perda de evidência. Embeddings ficam fora.

## Evidência

Migration `20260826201154_m4_knowledge_foundation.sql`, `src/domain/knowledge.ts` e testes `knowledgeFoundation.test.ts`.
