---
prisma_context_id: current-state
owner: engineering-operations
status: current
version: 1.1.0
last_verified: 2026-08-23
---

# Estado atual do Prisma

## Repositório

- Raiz local oficial: `C:\Users\Bruno\Documents\Prisma`.
- Branch de trabalho verificada: `codex/prisma-foundation-governance`.
- Remoto Git configurado: `git@github.com:brunoharita/HRT-Prisma.git`.
- Stack local: Node.js, TypeScript e pnpm.

## Disponível localmente

- CLI de vertical slice.
- Shell web isolado com Vite, Supabase Auth no browser, seleção de organization ativa e route guards por papel, com convenção local `5555` principal e `5556` QA.
- Importação de currículo textual UTF-8 representativo.
- Extração determinística de identidade, experiências, educação, certificações, idiomas, competências e contextos reconhecidos.
- Perfil profissional estruturado com fatos, evidências, proveniência, inferências, incertezas e campos não identificados.
- Persistência JSON filtrada por organização.
- Busca natural por conceitos conhecidos.
- Matching por requisito com atendido, parcial, sem evidência, gaps, suficiência e explicação.
- Confiança metodológica determinística.
- Telemetria básica de processamento.
- Testes técnicos, golden tests, build, lint, typecheck e demo.
- Typecheck e build do shell web.

## Implementado como contrato, não ativado

- Migration PostgreSQL/Supabase com organizações, memberships, papéis, posições, vagas, pessoas, documentos, perfil, evidência, inferência, competências, matching e uso de IA.
- RLS, grants, índices e integridade multi-tenant na migration.
- Políticas de autorização para admin, recruiter e hiring manager.
- Consulta local de `organization_memberships` protegida por sessão Supabase validada com `getClaims()`.

## Evidência remota

- Projeto Supabase QA remoto ativo: `Prisma-QA` (`ioldpnqqvobprjiontre`).
- Migration inicial do Prisma aplicada em QA em 2026-08-23.
- Organization `Prisma` criada em QA com membership administrativa inicial para o shell web.

Não existe evidência de rollout em produção.

## Não implementado

- Adaptador Supabase de runtime para dados do domínio.
- API HTTP/BFF.
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
- Schema/RLS ainda precisa de execução e testes conectados, inclusive para o shell web.
- Base legal, retenção, storage, auditoria e subprocessadores não estão aprovados.
- Contrato de perfil não deve ser congelado antes da amostra real autorizada.

## Última evidência local

Em 2026-08-23, a base local adicionou o shell web `web/` com build Vite aprovado e guard testado localmente para sessão, membership e papel. No mesmo dia, o projeto remoto `Prisma-QA` recebeu a migration inicial e a membership administrativa necessária para o primeiro login funcional. O gate local `pnpm run validate` precisa ser reexecutado sempre que a documentação material mudar; a existência de QA não comprova rollout em produção.
