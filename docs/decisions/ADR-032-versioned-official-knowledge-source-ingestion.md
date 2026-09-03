# ADR-032: Ingestão versionada de fontes oficiais para normalização

Status: accepted
Data: 2026-09-03

## Contexto

O M4 possuía catálogo, versões, conceitos, termos, relações, mappings, Inbox e governança, mas não carregava snapshots oficiais. A normalização precisava operar sobre CBO e ESCO verificáveis sem transformar relação semântica em equivalência, sem sobrescrever versões históricas e sem alterar Perfis aprovados.

## Decisão

Estender a fundação M4. O fluxo é `download oficial -> checksum -> manifesto -> validação -> staging -> diff -> aprovação humana -> publicação imutável`. `knowledge_source_stage_records` é transitória, protegida por RLS e gravável somente por `service_role`. A publicação exige um Super Admin ativo explícito, cria `knowledge_change_sets`, marca uma única versão corrente e conserva mappings históricos.

`knowledge-normalization-2.0.0` resolve apenas equivalência lexical aprovada e exata, com precedência pelo escopo de `knowledge_terms`: Organization do tenant antes de Global. Um candidato único resolve; múltiplos candidatos permanecem `ambiguous`; ausência permanece `unresolved`. Prefixo e substring existem somente para sugestão humana. Não há embeddings, score, LLM ou propagação por relações.

A CBO é a autoridade inicial para ocupações brasileiras. Ocupação, sinônimo e família são importados; cada ocupação se relaciona à família por `is_a`. O Perfil Ocupacional não entra neste piloto por não agregar valor lexical proporcional ao custo. A ESCO permanece preparada para skills, labels PT/EN, URI e hierarquia, mas não pode ser marcada como carregada sem o pacote oficial obtido pelo gate humano do portal.

Novos Perfis publicados por revisão geram observações rastreáveis. Perfis vigentes não recebem backfill automático. Decisões da Inbox podem aprovar alias Organization/Global ou criar proposta para revisão, sempre com autoria e motivo. Pesquisa de Pessoas usa somente observações resolvidas de Perfis vigentes.

## Alternativas consideradas

- Nova ontologia paralela: rejeitada por duplicar M4.
- API ESCO em runtime: rejeitada para o caminho principal por latência, disponibilidade e reprodutibilidade.
- `pg_trgm`, vetor ou LLM para entity linking: adiados; o piloto ainda não demonstrou necessidade e equivalência aproximada seria insegura.
- Parser CSV artesanal: substituído por `csv-parse` 7.0.2, biblioteca madura, sem dependências de runtime e com parsing robusto de CSV real.

## Consequências

O Prisma compara conceitos sem perder texto e evidência originais. Atualizações de fonte são reproduzíveis, diffáveis e rollback-safe por nova versão, mas exigem download e aprovação humana. A interface administrativa permanece um piloto operável, não um editor completo de ontologia. Redistribuição externa de conteúdo CBO adaptado continua bloqueada por gate jurídico.

## Evidência

- Migrations `20260903094700`, `20260903100340`, `20260903101644` e `20260903102721`.
- `src/knowledge/sourceIngestion.ts` e `scripts/prepare-knowledge-source.mjs`.
- `supabase/qa/m52_knowledge_normalization_verification.sql`.
- `tests/knowledgeNormalization.test.ts`.
