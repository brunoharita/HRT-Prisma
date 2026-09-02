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
| `postgres_rls_contract` | implementado | ativo | não separado | Foundation, M2-A, M2-B, M2-C e intake currículo-first aplicados |
| `pdf_ocr_ingestion` | ativo | ativo | não separado | PDF.js nativo, Tesseract seletivo, Storage privado e RPC atômica |
| `curriculum_first_intake` | ativo | ativo | não separado | Intake pré-Pessoa, identidade mínima, deduplicação tenant-scoped e resolução transacional |
| `spatial_cv_evidence_review` | ativo | ativo | não separado | PDF-first, regiões normalizadas, OCR local por seleção e histórico imutável |
| `intra_document_sibling_learning` | ativo | ativo | não separado | assinatura temporária, candidatos explicáveis, aceite humano e evidência própria por campo |
| `competency_verification_preparation` | ativo | ativo | não separado | M5.1A, sufficiency, Item Bank sintético, blueprint, rubrica e preparation |
| `competency_verification_execution` | ativo | rollout pendente | não separado | M5.1B, somente dados sintéticos e uso interno/QA; sem provider de delivery |
| `public_assessment_access` | ativo | rollout pendente | não separado | Edge Function tokenizada, sem conta de Pessoa e sem grants anon em tabelas |
| `item_bank_governance` | ativo | ativo | não separado | gaps elegíveis, proposals, review, dedup, Global/Organization e audit |
| `assessment_item_generation_fake` | ativo | ativo | não separado | determinístico, sem LLM, sem PII e custo zero |
| `assessment_item_generation_external` | implementado/desativado | implantado/desativado | não separado | sem provider/modelo/secret/budget aprovados; flag false |
| `assessment_item_analytics` | ativo | ativo com fixture sintética | não separado | P25, mediana, P75, acerto, omissão, mudanças e incidentes excluídos |
| `assessment_item_real_calibration` | bloqueado | bloqueado | não separado | exige dados reais autorizados, metodologia e decisão jurídica |
| `live_llm_extraction` | não implementado | não implementado | não implementado | Requer benchmark e ADR |
| `vector_embeddings` | não implementado | não implementado | não implementado | Requer necessidade medida |

Alteração de capability é material e exige teste, documentação, Context Pack e decisão de rollout.
