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
| PostgreSQL, modelo multi-tenant e RLS | implementado como migration | Não ativado em ambiente remoto |
| Upload de PDF e OCR | não implementado | Estado de falha existe |
| UI, Auth e revisão humana | não implementado | Planejado para piloto conectado |
| Embeddings vetoriais e LLM produtivo | não implementado | Depende de benchmark e ADR |
| Mobilidade interna, sucessão e workforce planning | planejado | Fora do piloto inicial |

## Fora de escopo atual

ATS completo, entrevistas, calendário, onboarding, folha, performance management, LMS, assessment psicológico, inferência de personalidade, análise facial, análise de voz, ranking eliminatório, mobile, microserviços, data lake, feature store, billing completo e integrações extensivas.

## Regra de expansão

Uma nova capacidade só entra quando responder a uma decisão ou ação operacional clara, possuir contrato, owner, status, segurança, avaliação e critério de aceite. Estrutura futura não deve ser descrita como comportamento ativo.
