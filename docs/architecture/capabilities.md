# Capabilities

## Objetivo

Este catálogo impede que documentação trate capacidade planejada como disponível. `PRISMA_CURRENT_STATE.md` continua sendo a fonte factual de disponibilidade por ambiente.

| Capability | Local | QA | Produção | Observação |
| --- | --- | --- | --- | --- |
| `platform_users` | ativo | ativo | não separado | M2-A, username e escopo Grupo -> Empresa |
| `resume_text_import` | ativo | ativo | não separado | Texto manual versionado e rastreável |
| `structured_profile` | ativo | ativo | não separado | Schema 1.0.0 e versões imutáveis |
| `evidence_provenance` | ativo | ativo | não separado | Documento e página preservados |
| `limited_inference` | ativo | ativo | não separado | Ontologia determinística |
| `natural_language_retrieval` | ativo | não comprovado | não separado | Vocabulário controlado |
| `explainable_matching` | ativo | não comprovado | não separado | Sem score absoluto |
| `tenant_json_isolation` | ativo em teste | inexistente | inexistente | Não substitui RLS |
| `postgres_rls_contract` | implementado | ativo | não separado | Foundation, M2-A, M2-B e M2-C aplicados |
| `pdf_ocr_ingestion` | ativo | ativo | não separado | PDF.js nativo, Tesseract seletivo, Storage privado e RPC atômica |
| `live_llm_extraction` | não implementado | não implementado | não implementado | Requer benchmark e ADR |
| `vector_embeddings` | não implementado | não implementado | não implementado | Requer necessidade medida |

Alteração de capability é material e exige teste, documentação, Context Pack e decisão de rollout.
