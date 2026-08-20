---
prisma_context_id: current-state
owner: engineering-operations
status: current
version: 1.0.0
last_verified: 2026-08-20
---

# Estado atual do Prisma

## Repositório

- Branch de trabalho verificada: `codex/prisma-foundation-governance`.
- Repositório sem remoto configurado no momento desta verificação.
- Stack local: Node.js, TypeScript e pnpm.

## Disponível localmente

- CLI de vertical slice.
- Importação de currículo textual UTF-8 representativo.
- Extração determinística de identidade, experiências, educação, certificações, idiomas, competências e contextos reconhecidos.
- Perfil profissional estruturado com fatos, evidências, proveniência, inferências, incertezas e campos não identificados.
- Persistência JSON filtrada por organização.
- Busca natural por conceitos conhecidos.
- Matching por requisito com atendido, parcial, sem evidência, gaps, suficiência e explicação.
- Confiança metodológica determinística.
- Telemetria básica de processamento.
- Testes técnicos, golden tests, build, lint, typecheck e demo.

## Implementado como contrato, não ativado

- Migration PostgreSQL/Supabase com organizações, memberships, papéis, posições, vagas, pessoas, documentos, perfil, evidência, inferência, competências, matching e uso de IA.
- RLS, grants, índices e integridade multi-tenant na migration.
- Políticas de autorização para admin, recruiter e hiring manager.

Não existe evidência de migration aplicada em QA ou produção.

## Não implementado

- UI e API HTTP.
- Auth de runtime e sessões.
- Adaptador Supabase de runtime.
- Storage privado, upload real, malware scan, PDF e OCR.
- Revisão humana e decisão humana persistida.
- Embeddings vetoriais e LLM externo.
- Auditoria de visualização/exportação.
- Idempotência completa e concorrência.
- QA remoto, produção, deployment e rollback automatizados.
- Retenção, exclusão e exportação de titular.

## Validação factual

- 13 fixtures sintéticas de extração, incluindo prompt injection documental.
- 4 casos de avaliação pessoa-vaga.
- 2 casos de retrieval: empate e ausência de resultado.
- Total golden mais recente esperado: 19 aprovados.
- Dados reais de cliente: não utilizados.

## Riscos e bloqueios

- `RISK: EXTRACTION_NOT_VALIDATED_AGAINST_REAL_CLIENT_DATA`.
- Schema/RLS ainda precisa de execução e testes conectados.
- Base legal, retenção, storage, auditoria e subprocessadores não estão aprovados.
- Contrato de perfil não deve ser congelado antes da amostra real autorizada.

## Última evidência local

Em 2026-08-20, `pnpm validate` aprovou lint, invariantes de fundação, Context Pack, typecheck, build, 8 testes técnicos, 19 casos golden sem regressão e demo com marcador `VERTICAL_SLICE_OK`. A migration foi validada estaticamente com 18 tabelas públicas protegidas por declaração de RLS. Isso não substitui QA conectado nem comprova rollout.
