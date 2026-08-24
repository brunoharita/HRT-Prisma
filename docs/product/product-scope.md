# Escopo do produto

## Escopo funcional pretendido

- Pessoas com lifecycle profissional unificado.
- Documentos profissionais e suas versões.
- Perfil estruturado com fatos, inferências, proveniência e incertezas.
- Competências normalizadas e contextuais.
- Estrutura organizacional com unidade, papel, posição e vaga.
- Busca em linguagem natural.
- Matching pessoa-vaga e, futuramente, pessoa-papel.
- Explicações reproduzíveis sem nova chamada obrigatória ao modelo.
- Revisão humana, auditoria, retenção, exclusão e exportação.

## Status por capacidade

| Capacidade | Estado | Observação |
| --- | --- | --- |
| Importar currículo textual representativo | implementado localmente | CLI e fixture sintética |
| Perfil, evidência e inferência versionada | implementado localmente | Provider determinístico |
| Busca natural estruturada | implementado localmente | Vocabulário limitado |
| Matching explicado | implementado localmente | Sem score absoluto |
| PostgreSQL, modelo multi-tenant e RLS | ativo no remoto interno | Foundation, M2-A, M2-B e M2-C aplicados |
| Upload de PDF e OCR | implementado e comprovado | PDF nativo, OCR local seletivo, Storage privado e proveniência por página |
| UI e Auth | implementado e comprovado | Frontend local conectado ao Supabase remoto |
| Revisão humana de perfil | ativo no remoto interno | rascunho, mudanças por campo, comparação e aprovação versionada |
| Embeddings vetoriais e LLM produtivo | não implementado | Depende de benchmark e ADR |
| Mobilidade interna, sucessão e workforce planning | planejado | Fora do piloto inicial |

## Fora de escopo atual

ATS completo, entrevistas, calendário, onboarding, folha, performance management, LMS, assessment psicológico, inferência de personalidade, análise facial, análise de voz, ranking eliminatório, mobile, microserviços, data lake, feature store, billing completo e integrações extensivas.

## Regra de expansão

Uma nova capacidade só entra quando responder a uma decisão ou ação operacional clara, possuir contrato, owner, status, segurança, avaliação e critério de aceite. Estrutura futura não deve ser descrita como comportamento ativo.
