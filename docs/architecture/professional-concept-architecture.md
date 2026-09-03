# Arquitetura da Fundação de Conhecimento

O pipeline passa a ser `documento -> evidência -> termo observado -> normalização -> relações -> inferência -> Perfil Prisma`. `knowledge_observations` preserva o termo e as versões Global/Organization usadas; `knowledge_inbox` deduplica pendências por fingerprint e guarda somente IDs de evidência.

`knowledge_concepts`, `knowledge_terms`, `knowledge_relations` e `knowledge_external_mappings` formam a ontologia Prisma. Escopo global exige `organization_id = null`; escopo organizacional exige tenant. A resolução consulta primeiro termos aprovados da empresa e depois a base global. Mais de um candidato ou alias marcado como ambíguo retorna `ambiguous`.

Fontes seguem `catalogue -> source version -> upload/fetch -> validate -> stage -> diff -> publish`. O catálogo não prova que um snapshot foi importado. No M5.2, `sourceIngestion` valida CSVs reais com manifesto e SHA-256, gera lotes idempotentes, e `knowledge_source_stage_records` mantém staging separado da Knowledge ativa. `publish_knowledge_source_version` exige um Super Admin ativo explícito e cria change set antes de marcar uma única versão corrente.

A CBO `CBO 2002-2025-06-06` está publicada no Prisma-QA com 3.320 registros conceituais, 11.097 termos e 2.694 relações ocupação-família. Ocupação, Sinônimo e Família foram importados; Perfil Ocupacional ficou fora por não agregar valor lexical imediato. A ESCO v1.2.1 possui importer e fixture PT/EN, mas o snapshot oficial não foi obtido porque o portal exige aceite, e-mail e entrega do link; ela permanece somente catalogada.

O monitor `knowledge-source-monitor-1.0.1` verifica CBO, ESCO e O*NET no primeiro dia de cada mês às 01:00 em `America/Sao_Paulo`. `knowledge_source_checks` preserva cada resultado e `knowledge_sources` mantém o resumo consultado pela Home. O cron horário apenas encontra fontes com `next_check_at` vencido e suporta retentativas em 6h, 24h e 72h. CBO compara hashes dos três CSVs oficiais com o manifesto publicado; ESCO e O*NET comparam versão e data nas páginas oficiais. Detecção pode catalogar uma versão, mas nunca executa `publish_knowledge_source_version`.

`knowledge-normalization-2.0.0` usa o escopo do termo, não o escopo do conceito, para aplicar precedência Organization -> Global. Somente correspondência exata e inequívoca resolve. Sugestões por prefixo ou substring servem apenas à decisão humana na Inbox. Relações como `is_a` nunca viram equivalência nem evidência profissional.

Pesquisa externa ocorre na Edge Function `knowledge-agent`. O domínio depende de `KnowledgeResearchProvider`, não do SDK OpenAI. Propostas persistidas são imutáveis; edição humana fica em campo separado. `approve_knowledge_proposal` cria change set, conceito e termos em transação.

Impactos usam observações relacionadas e perfis atuais. `dispatch_knowledge_reinterpretation` é idempotente; `prepare_knowledge_reinterpretation_review` cria um draft ligado ao perfil-base, documento e tentativa existentes. A aprovação continua em `approve_profile_review`, reutilizando M2-C. Trigger copia versões Knowledge para a nova versão do perfil.

Novos Perfis aprovados pela publicação M2-C geram observações para competências com vínculo ao review/evidência. Perfis vigentes não recebem backfill automático. A busca canônica retorna Pessoas somente quando uma observação resolvida pertence ao Perfil vigente. Não há embeddings, vetor ou busca vetorial neste movimento. Evolução futura: embedding sugere; Knowledge aprovada resolve.
