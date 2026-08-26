# Arquitetura da Fundação de Conhecimento

O pipeline passa a ser `documento -> evidência -> termo observado -> normalização -> relações -> inferência -> Perfil Prisma`. `knowledge_observations` preserva o termo e as versões Global/Organization usadas; `knowledge_inbox` deduplica pendências por fingerprint e guarda somente IDs de evidência.

`knowledge_concepts`, `knowledge_terms`, `knowledge_relations` e `knowledge_external_mappings` formam a ontologia Prisma. Escopo global exige `organization_id = null`; escopo organizacional exige tenant. A resolução consulta primeiro termos aprovados da empresa e depois a base global. Mais de um candidato ou alias marcado como ambíguo retorna `ambiguous`.

Fontes seguem `catalogue -> source version -> upload/fetch -> validate -> stage -> diff -> publish`. O catálogo não prova que um snapshot foi importado. CBO, ESCO e O*NET estão registrados como `catalogued`, sem checksum fictício.

Pesquisa externa ocorre na Edge Function `knowledge-agent`. O domínio depende de `KnowledgeResearchProvider`, não do SDK OpenAI. Propostas persistidas são imutáveis; edição humana fica em campo separado. `approve_knowledge_proposal` cria change set, conceito e termos em transação.

Impactos usam observações relacionadas e perfis atuais. `dispatch_knowledge_reinterpretation` é idempotente; `prepare_knowledge_reinterpretation_review` cria um draft ligado ao perfil-base, documento e tentativa existentes. A aprovação continua em `approve_profile_review`, reutilizando M2-C. Trigger copia versões Knowledge para a nova versão do perfil.

Não há embeddings, vetor ou busca vetorial neste movimento. Evolução futura: embedding sugere; ontologia resolve.
