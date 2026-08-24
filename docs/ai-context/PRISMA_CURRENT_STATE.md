---
prisma_context_id: current-state
owner: engineering-operations
status: current
version: 1.5.0
last_verified: 2026-08-24
---

# Estado atual do Prisma

## Repositório

- Raiz local oficial: `C:\Users\Bruno\Documents\Prisma`.
- Branch de trabalho verificada: `codex/m2-users-people`.
- Remoto Git configurado: `git@github.com:brunoharita/HRT-Prisma.git`.
- Stack local: Node.js, TypeScript e pnpm.

## Disponível localmente

- CLI de vertical slice.
- Shell web React com Vite, Ant Design, App Shell autenticado reutilizável, sidebar responsiva, Supabase Auth no browser, seleção de organization ativa e route guards por papel, com convenção local `5555` principal e `5556` QA.
- Adapter Supabase web tipado e centralizado para memberships, operador autenticado e leituras de domínio.
- Movimento M2-A implementado localmente com distinção formal `Usuário != Pessoa`, menu `Usuários`, listagem/edição/cadastro de operadores e fluxo apresentado ao produto como `username + senha`.
- Movimento M2-B implementado com cadastro/edição de Pessoa, entrada manual e PDF, extração nativa por página, OCR local seletivo, evidência, draft, perfil versionado e timeline.
- Home autenticada com contagens persistidas de pessoas, perfis estruturados e vagas abertas da organização ativa.
- Pessoas com tabela, busca por nome/e-mail/telefone, formulário com resumo lateral e perfil profissional estruturado.
- Perfil com fatos, competências, evidências, proveniência, inferências, incertezas e campos não identificados; contato privado somente para perfis administrativos autorizados.
- Importação de currículo textual UTF-8 representativo.
- Extração determinística de identidade, experiências, educação, certificações, idiomas, competências e contextos reconhecidos.
- Perfil profissional estruturado com fatos, evidências, proveniência, inferências, incertezas e campos não identificados.
- Persistência JSON filtrada por organização.
- Busca natural por conceitos conhecidos.
- Matching por requisito com atendido, parcial, sem evidência, gaps, suficiência e explicação.
- Confiança metodológica determinística.
- Telemetria básica de processamento.
- Testes técnicos, golden tests, build, lint, typecheck e demo.
- Typecheck, build e testes locais do shell web.
- 32 testes técnicos aprovados, incluindo contratos M2-A/M2-B, PDF inválido, suficiência, RLS/Storage e member sem documento bruto.

## Implementado como contrato

- Foundation migration PostgreSQL/Supabase com organizações, memberships, papéis, posições, vagas, pessoas, documentos, perfil, evidência, inferência, competências, matching e uso de IA; ativa em QA e ausente em produção.
- Migration local `20260824113000_m2_users_people` com `organization_groups`, `platform_users`, `platform_user_audit_events`, `organizations.group_id`, username case-insensitive normalizado, auditoria material e evolução de `membership_role`.
- RLS, grants, índices e integridade multi-tenant ativos em QA.
- Políticas de autorização da foundation para admin, recruiter e hiring manager ativas em QA.
- Boundary local em Edge Functions para `operator-sign-in`, `operator-password-reset` e `platform-users`.
- Migrations M2-B com bucket privado `person-documents`, tentativas, páginas, drafts, eventos e RPC transacional `persist_person_extraction`.
- Consulta de `platform_users`, `organization_memberships` e domínio protegida por sessão Supabase validada com `getClaims()` e RLS ou boundary server-side, conforme a operação.

## Evidência remota

- Projeto Supabase QA remoto ativo: `Prisma-QA` (`ioldpnqqvobprjiontre`).
- Migration inicial do Prisma aplicada em QA em 2026-08-23.
- Migration `20260824021143_harden_rls_auto_enable_permissions` aplicada em QA; `anon` e `authenticated` não executam diretamente o event trigger de RLS.
- Organization `Prisma` criada em QA com membership administrativa inicial para o shell web.
- Organization `Prisma QA Beta` criada com membership `recruiter` para o mesmo usuário QA disponível.
- Dados sintéticos `[QA]` persistidos em duas organizações: 3 pessoas, 2 perfis atuais, 2 vagas abertas, evidências, inferências, competências e contatos privados sintéticos.
- RLS conectado comprovado para Admin, Recruiter, Hiring Manager, IDs conhecidos cross-tenant e usuário autenticado sem membership. Hiring Manager recebeu zero linhas de PII privada e documentos.
- Corte atômico do enum/papéis e matriz RLS M2-A aplicados em QA; `platform-users` e `operator-password-reset` ativos, além de `operator-sign-in`.
- M2-B aplicado em QA com bucket privado, índices, RPC atômica e versões sintéticas v2/v3 para `[QA] Marina Dados`.
- Login `harita.super` validado no app local contra QA; módulos Pessoas e Usuários renderizados com a sessão Super Admin.
- Fluxo conectado texto manual -> extração -> draft/evidência -> Perfil Prisma versionado comprovado no QA.

Não existe evidência de rollout em produção.

## Não implementado

- API HTTP/BFF.
- Malware scan/quarentena.
- Revisão humana e decisão humana persistida.
- Embeddings vetoriais e LLM externo.
- Auditoria de visualização/exportação além do domínio de usuários.
- Idempotência completa e proteção contra concorrência no versionamento documental.
- Produção, deployment e rollback automatizados.
- Hosting de frontend em QA/produção.
- Retenção, exclusão e exportação de titular.

## Validação factual

- 13 fixtures sintéticas de extração, incluindo prompt injection documental.
- 4 casos de avaliação pessoa-vaga.
- 2 casos de retrieval: empate e ausência de resultado.
- Total golden mais recente esperado: 19 aprovados.
- Dados reais de cliente: não utilizados.

## Riscos e bloqueios

- `RISK: EXTRACTION_NOT_VALIDATED_AGAINST_REAL_CLIENT_DATA`.
- Validação de PDF nativo e OCR real no navegador ainda depende do upload dos fixtures sintéticos preparados e da confirmação de transferência.
- A configuração local do M2-A endurece requisitos mínimos de senha, mas a proteção contra senhas vazadas do Supabase ainda não foi comprovada no ambiente remoto deste movimento.
- O advisor de performance do QA ainda informa foreign keys sem índices de cobertura, índices ainda não utilizados e policies permissivas sobrepostas; não foram alterados fora do escopo deste movimento.
- Não existe projeto Supabase de produção nem hosting configurado para o frontend; criação do projeto tem custo e exige confirmação específica.
- Base legal, retenção, storage, auditoria e subprocessadores não estão aprovados.
- Contrato de perfil não deve ser congelado antes da amostra real autorizada.

## Última evidência local

Em 2026-08-24, M2-A e M2-B foram aplicados ao Prisma-QA. Edge Functions de login, recuperação e gestão de usuários estão ativas; o app local autenticado lista Pessoas e Usuários; a ingestão sintética por texto gerou tentativas, páginas, draft, evidência e novas versões de Perfil Prisma por RPC transacional. PDF.js e Tesseract.js estão empacotados, mas o upload conectado dos fixtures PDF/OCR aguarda confirmação. Produção e hosting continuam não provisionados; QA não comprova rollout em produção.
