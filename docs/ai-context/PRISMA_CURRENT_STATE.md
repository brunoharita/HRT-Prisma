---
prisma_context_id: current-state
owner: engineering-operations
status: current
version: 1.3.0
last_verified: 2026-08-24
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
- Adapter Supabase web tipado e centralizado para memberships e leituras de domínio.
- Home autenticada com contagens persistidas de pessoas, perfis estruturados e vagas abertas da organização ativa.
- Pessoas com listagem, busca por nome, filtro por lifecycle e perfil profissional estruturado.
- Perfil com fatos, competências, evidências, proveniência, inferências, incertezas e campos não identificados; contato privado somente para Admin e Recruiter.
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

## Implementado como contrato

- Migration PostgreSQL/Supabase com organizações, memberships, papéis, posições, vagas, pessoas, documentos, perfil, evidência, inferência, competências, matching e uso de IA; ativa em QA e ausente em produção.
- RLS, grants, índices e integridade multi-tenant ativos em QA.
- Políticas de autorização para admin, recruiter e hiring manager ativas em QA.
- Consulta de `organization_memberships` e domínio protegida por sessão Supabase validada com `getClaims()` e RLS.

## Evidência remota

- Projeto Supabase QA remoto ativo: `Prisma-QA` (`ioldpnqqvobprjiontre`).
- Migration inicial do Prisma aplicada em QA em 2026-08-23.
- Migration `20260824021143_harden_rls_auto_enable_permissions` aplicada em QA; `anon` e `authenticated` não executam diretamente o event trigger de RLS.
- Organization `Prisma` criada em QA com membership administrativa inicial para o shell web.
- Organization `Prisma QA Beta` criada com membership `recruiter` para o mesmo usuário QA disponível.
- Dados sintéticos `[QA]` persistidos em duas organizações: 3 pessoas, 2 perfis atuais, 2 vagas abertas, evidências, inferências, competências e contatos privados sintéticos.
- RLS conectado comprovado para Admin, Recruiter, Hiring Manager, IDs conhecidos cross-tenant e usuário autenticado sem membership. Hiring Manager recebeu zero linhas de PII privada e documentos.

Não existe evidência de rollout em produção.

## Não implementado

- API HTTP/BFF.
- Storage privado, upload real, malware scan, PDF e OCR.
- Revisão humana e decisão humana persistida.
- Embeddings vetoriais e LLM externo.
- Auditoria de visualização/exportação.
- Idempotência completa e concorrência.
- Produção, deployment e rollback automatizados.
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
- Validação visual autenticada conectada em desktop e mobile ainda depende de login manual no usuário QA provisionado.
- O advisor do QA ainda informa que a proteção contra senhas vazadas está desabilitada.
- O advisor de performance do QA ainda informa foreign keys sem índices de cobertura, índices ainda não utilizados e policies permissivas sobrepostas; não foram alterados fora do escopo deste movimento.
- Não existe projeto Supabase de produção nem hosting configurado para o frontend.
- Base legal, retenção, storage, auditoria e subprocessadores não estão aprovados.
- Contrato de perfil não deve ser congelado antes da amostra real autorizada.

## Última evidência local

Em 2026-08-24, o web recebeu um adapter Supabase único e o primeiro slice conectado de Home, Pessoas e perfil. Typecheck, build e 17 testes técnicos passaram no gate final. No Prisma-QA, duas organizações e somente dados sintéticos comprovaram as consultas persistidas; testes RLS transacionais comprovaram isolamento, papéis e restrição de PII sem alterar migration ou policy. A inspeção visual autenticada conectada continua pendente por ausência de credencial no ambiente automatizado. O advisor mantém o alerta de proteção contra senhas vazadas desabilitada. Produção e hosting continuam não provisionados; QA não comprova rollout em produção.
