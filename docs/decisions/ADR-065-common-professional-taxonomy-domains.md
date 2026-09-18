# ADR-065 — Infraestrutura taxonômica profissional comum com domínios separados

Status: accepted. Data: 2026-09-18. Acordo: `docs/qa/agreement-m72-competency-taxonomy-evidence-v2.md` 2.0.0.

## Contexto

M7.1 criou uma Taxonomia Ocupacional segura sobre Knowledge. O primeiro M7.2 reutilizou as identidades, mas chamou `position-taxonomy-1.0.0` de versão taxonômica em associações de competências. Isso confundia o domínio sem quebrar a separação física dos fatos. M7.3/M7.4 adicionaram normalização e curadoria, enquanto `suggest_knowledge_concepts` ainda filtrava ocupações no cliente e aceitava substring curta.

## Decisão

Knowledge continua sendo a única infraestrutura conceitual. `knowledge_concepts`, termos, mappings, relações, fontes, versões, Inbox e change sets não são duplicados. `professional_taxonomy_releases` registra somente versões independentes de projeções de domínio:

- Taxonomia Ocupacional: `position-taxonomy-1.0.0`, preservada;
- Taxonomia de Competências: `competency-taxonomy-1.0.0`, composta por conceitos publicados não ocupacionais.

A identidade Prisma é `knowledge_concepts.id`, tipada. Mappings conservam a identidade nativa da fonte. Igualdade de rótulo não reconcilia fontes. Relações ocupação→competência continuam em `knowledge_relations`, com fonte/versão/atributos, e a API declara que não criam evidência pessoal.

`person-professional-evidence-3.0.0` é uma projeção on-read V4: usa o Perfil publicado vigente e evidências já aprovadas, remove ocupações do mapa de competências, expõe as duas versões de domínio e preserva V1/V2/V3. Assim Perfis existentes recebem a organização nova sem reimportação, backfill ou reescrita.

Requisitos de Posição continuam usando `vacancy_requirements.concept_id`; uma associação nova/alterada aceita somente conceito publicado não ocupacional visível ao tenant e registra `competency-taxonomy-1.0.0`. Relações não inserem requisitos e matching permanece inalterado.

`search_competency_taxonomy` filtra domínio e tenant antes do limite, permite sigla curta somente por igualdade exata, usa prefixo de token a partir de três caracteres e expõe classe/autoridade/referências. Parcial e ambiguidade são candidatos humanos, nunca fatos. `profile-competency-curation-2.0.0` envolve o workflow anterior e retorna a projeção V4 na mesma transação.

## Segurança, compatibilidade e rollback

RPCs usam autorização server-side, `SECURITY DEFINER` com `search_path` vazio, grants autenticados e nenhuma escrita de PII na Knowledge Global. V1/V2/V3 e workflow 1.0.0 permanecem para rollback. O frontend pode voltar aos consumidores antigos sem apagar releases, aliases, propostas ou histórico. Correções posteriores são forward-only.

## Alternativas rejeitadas

- Nova base de competências: duplicaria Knowledge e criaria identidades concorrentes.
- Renomear M7.1: quebraria histórico e snapshots.
- Reconciliar por rótulo/similaridade: fabricaria equivalência.
- Backfill destrutivo de Perfis/Posições: reescreveria fatos e não é necessário para a projeção on-read.
