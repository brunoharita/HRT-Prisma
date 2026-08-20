# Capabilities

## Objetivo

Este catálogo impede que documentação trate capacidade planejada como disponível. `PRISMA_CURRENT_STATE.md` continua sendo a fonte factual de disponibilidade por ambiente.

| Capability | Local | QA | Produção | Observação |
| --- | --- | --- | --- | --- |
| `resume_text_import` | ativo | inexistente | inexistente | Somente texto UTF-8 representativo |
| `structured_profile` | ativo | inexistente | inexistente | Schema 1.0.0 |
| `evidence_provenance` | ativo | inexistente | inexistente | Página é nula em texto |
| `limited_inference` | ativo | inexistente | inexistente | Ontologia determinística |
| `natural_language_retrieval` | ativo | inexistente | inexistente | Vocabulário controlado |
| `explainable_matching` | ativo | inexistente | inexistente | Sem score absoluto |
| `tenant_json_isolation` | ativo em teste | inexistente | inexistente | Não substitui RLS |
| `postgres_rls_contract` | implementado | não ativado | não ativado | Migration existente |
| `pdf_ocr_ingestion` | não implementado | não implementado | não implementado | Fail-closed |
| `live_llm_extraction` | não implementado | não implementado | não implementado | Requer benchmark e ADR |
| `vector_embeddings` | não implementado | não implementado | não implementado | Requer necessidade medida |

Alteração de capability é material e exige teste, documentação, Context Pack e decisão de rollout.
