---
prisma_context_id: current-state
owner: engineering-operations
status: current
version: 1.2.1
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
- Shell web React com Vite, Ant Design, App Shell autenticado reutilizável, sidebar responsiva, Supabase Auth no browser, seleção de organization ativa e route guards por papel, com convenção local `5555` principal e `5556` QA.
- Importação de currículo textual UTF-8 representativo.
- Extração determinística de identidade, experiências, educação, certificações, idiomas, competências e contextos reconhecidos.
- Perfil profissional estruturado com fatos, evidências, proveniência, inferências, incertezas e campos não identificados.
- Persistência JSON filtrada por organização.
- Busca natural por conceitos conhecidos.
- Matching por requisito com atendido, parcial, sem evidência, gaps, suficiência e explicação.
- Confiança metodológica determinística.
- Telemetria básica de processamento.
- Testes técnicos, golden tests, build, lint, typecheck e demo.
- Typecheck, build e validação visual pública em desktop e mobile do shell web.

## Implementado como contrato, não ativado

- Migration PostgreSQL/Supabase com organizações, memberships, papéis, posições, vagas, pessoas, documentos, perfil, evidência, inferência, competências, matching e uso de IA.
- RLS, grants, índices e integridade multi-tenant na migration.
- Políticas de autorização para admin, recruiter e hiring manager.
- Consulta local de `organization_memberships` protegida por sessão Supabase validada com `getClaims()`.

## Evidência remota

- Projeto Supabase QA remoto ativo: `Prisma-QA` (`ioldpnqqvobprjiontre`).
- Migration inicial do Prisma aplicada em QA em 2026-08-23.
- Migration `20260824021143_harden_rls_auto_enable_permissions` aplicada em QA; `anon` e `authenticated` não executam diretamente o event trigger de RLS.
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
- Validação visual conectada das rotas autenticadas em desktop e mobile com usuário QA autorizado.
- Retenção, exclusão e exportação de titular.

## Validação factual

- 13 fixtures sintéticas de extração, incluindo prompt injection documental.
- 4 casos de avaliação pessoa-vaga.
- 2 casos de retrieval: empate e ausência de resultado.
- Total golden mais recente esperado: 19 aprovados.
- Dados reais de cliente: não utilizados.

## Riscos e bloqueios

- `RISK: EXTRACTION_NOT_VALIDATED_AGAINST_REAL_CLIENT_DATA`.
- Validação conectada completa de Auth, RLS e shell web ainda está pendente.
- O advisor do QA ainda informa que a proteção contra senhas vazadas está desabilitada.
- Não existe projeto Supabase de produção nem hosting configurado para o frontend.
- Base legal, retenção, storage, auditoria e subprocessadores não estão aprovados.
- Contrato de perfil não deve ser congelado antes da amostra real autorizada.

## Última evidência local

Em 2026-08-23, o shell web `web/` evoluiu para React e Ant Design com App Shell único, sidebar responsiva, componentes de página e cards reutilizáveis e logos oficiais. O build e a tela pública foram validados localmente em desktop e mobile; a inspeção visual autenticada conectada continua pendente por ausência de credenciais QA no ambiente. No `Prisma-QA`, a migration de hardening revogou execução direta de `public.rls_auto_enable()` para `anon` e `authenticated`; o advisor manteve somente o alerta de proteção contra senhas vazadas desabilitada. Produção e hosting continuam não provisionados. O gate local `pnpm run validate` precisa ser reexecutado sempre que a documentação material mudar; a existência de QA não comprova rollout em produção.
