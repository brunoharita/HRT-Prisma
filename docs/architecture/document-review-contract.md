# Contrato de documentos, operações e revisão humana

## Contratos vigentes

| Contrato | Versão | Regra material |
| --- | --- | --- |
| `document-processing-state` | 2.0.0 | estados operacionais e de revisão são explícitos e falham fechados |
| `person-ingestion` | 2.0.0 | cadastro, retry e persistência são idempotentes e serializados no banco |
| `human-profile-review` | 1.0.0 | revisão possui rascunho, revisões imutáveis, mudanças por campo e aprovação humana |
| `document-operation-idempotency` | 1.0.0 | mesma chave e fingerprint retornam o mesmo resultado; payload diferente conflita |
| `professional-profile` | 1.1.0 | perfil aprovado preserva proveniência da revisão e mantém somente uma versão atual |

## Estados

Documento: `pending`, `received`, `processing`, `processed`, `ready_for_review`, `in_review`, `approved`, `failed`, `extraction_failed`, `needs_manual_review`, `unsupported_format`.

Revisão: `not_started`, `draft`, `in_review`, `approved`, `rejected`. Operação: `started`, `completed`, `failed`.

Estado desconhecido, versão incompatível, sessão ausente, tenant não autorizado ou papel insuficiente bloqueiam a mutação.

## Operações críticas

| RPC | Resultado |
| --- | --- |
| `register_person_document` | cria uma versão documental e tentativa inicial idempotentes |
| `record_document_failure` | registra falha sanitizada sem promover perfil |
| `persist_person_extraction` | persiste páginas, draft, evidência e estado de revisão de forma atômica |
| `start_profile_review` | abre ou devolve o rascunho existente para a tentativa |
| `save_profile_review` | cria revisão imutável e mudanças por campo com lock otimista |
| `approve_profile_review` | cria e promove a versão de perfil na mesma transação |

O cliente deve gerar uma chave por intenção do usuário e reutilizá-la somente em retry da mesma intenção. Reuso com fingerprint diferente retorna conflito. Números de versão nunca são calculados no frontend.

## Proveniência e auditoria

Cada mudança identifica campo, valor extraído, valor revisado, decisão e evidência aplicável. A aprovação referencia documento, tentativa, review e revisão. Eventos registram IDs, estado, ator, método e versão; texto integral do documento e payload integral do perfil são proibidos.

## Compatibilidade

Consumidores M2-B que não conhecem revisão não podem gravar diretamente nas tabelas críticas. Leitura histórica permanece válida; novas mutações devem usar as RPCs M2-C.
