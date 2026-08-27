---
prisma_context_id: current-state
owner: engineering-operations
status: current
version: 2.0.0
last_verified: 2026-08-27
---

# Estado atual do Prisma

## Repositório

- Raiz local oficial: `C:\Users\Bruno\Documents\Prisma`.
- Branch integrada verificada: `main`; movimento M5 em validação na branch `codex/m5-cv-evidence`.
- Remoto Git configurado: `git@github.com:brunoharita/HRT-Prisma.git`.
- Stack local: Node.js, TypeScript e pnpm.

## Disponível localmente

- CLI de vertical slice.
- Shell web React com Vite, Ant Design, App Shell autenticado reutilizável, sidebar responsiva, Supabase Auth no browser, seleção de organization ativa e route guards por papel, com convenção local `5555` principal e `5556` QA.
- Adapter Supabase web tipado e centralizado para memberships, operador autenticado e leituras de domínio.
- Movimento M2-A implementado localmente com distinção formal `Usuário != Pessoa`, menu `Usuários`, listagem/edição/cadastro de operadores e fluxo apresentado ao produto como `username + senha`.
- Movimento M2-B implementado com cadastro/edição de Pessoa, entrada manual e PDF, extração nativa por página, OCR local seletivo, evidência, draft, perfil versionado e timeline.
- Movimento M2-C implementado com central documental, detalhe/tentativas/auditoria, retry vinculado, revisão humana por campo, comparação de versões e aprovação transacional.
- Movimento M5 implementado com PDF original e revisão estruturada lado a lado, navegação campo/evidência, seleção espacial normalizada, OCR local por região, vínculos e histórico imutável.
- Fluxo principal currículo-first implementado localmente: upload PDF antes da Pessoa, identidade mínima determinística, deduplicação por tenant, decisão humana em correspondência ambígua e retomada idempotente.
- Movimento 4 implementado localmente: Knowledge canônica Global e Organization overlay, tipos conceituais explícitos, aliases, relações, mappings, source catalogue/version, Inbox, proposals/approvals, normalização com precedência e módulo administrativo Conhecimento.
- Knowledge Agent implementado e implantado no Prisma-QA como Edge Function com JWT obrigatório, Responses API, Web Search, Structured Outputs, allowlist persistida, no-PII, budget, cooldown e deduplicação; pesquisa externa permanece desativada por ausência deliberada de configuração/credencial/orçamento.
- Impactos e reinterpretação Knowledge implementados localmente: somente perfis relacionados, default organizacional `off`, dispatch idempotente e draft reutilizando M2-C sem alterar evidência ou perfil aprovado.
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
- 57 testes técnicos aprovados, incluindo contratos M2-A/M2-B/M2-C/M5/currículo-first, PDF inválido, idempotência, concorrência, coordenadas, revisão imutável, auditoria e Member sem documento bruto.

## Implementado como contrato

- Foundation migration PostgreSQL/Supabase com organizações, memberships, papéis, posições, vagas, pessoas, documentos, perfil, evidência, inferência, competências, matching e uso de IA; ativa no único projeto remoto atual.
- Migration local `20260824113000_m2_users_people` com `organization_groups`, `platform_users`, `platform_user_audit_events`, `organizations.group_id`, username case-insensitive normalizado, auditoria material e evolução de `membership_role`.
- RLS, grants, índices e integridade multi-tenant ativos em QA.
- Políticas de autorização da foundation para admin, recruiter e hiring manager ativas em QA.
- Boundary local em Edge Functions para `operator-sign-in`, `operator-password-reset` e `platform-users`.
- Migrations M2-B com bucket privado `person-documents`, tentativas, páginas, drafts, eventos e RPC transacional `persist_person_extraction`.
- Migrations M2-C com ledger de operações, locks de versão/tentativa, retries vinculados, revisões/alterações imutáveis e RPCs de aprovação atômica.
- Migrations M5 `20260827034147_m5_spatial_cv_evidence`, `20260827041613_m5_spatial_evidence_fk_indexes` e `20260827042829_m5_spatial_evidence_idempotent_replay` com regiões normalizadas, vínculos, eventos append-only, RLS, índices e RPC transacional.
- Migrations `20260826114333_curriculum_first_resume_intake` e `20260826125000_curriculum_first_idempotent_completion` com staging privado, RLS, índices de identidade e cinco RPCs transacionais de início, identificação, resolução, conclusão idempotente e falha.
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
- M2-B aplicado em QA com bucket privado, índices, RPC atômica e versões sintéticas v2 a v5 para `[QA] Marina Dados`.
- Login `harita.super` validado no app local contra QA; módulos Pessoas e Usuários renderizados com a sessão Super Admin.
- Fluxo conectado texto manual -> extração -> draft/evidência -> Perfil Prisma versionado comprovado no QA.
- PDF sintético nativo persistido como documento v4 com uma página, 161 caracteres úteis, método `pdfjs-5.4.296/native-v1` e OCR não necessário.
- PDF sintético image-only persistido como documento v5 com uma página, 360 caracteres úteis, método `tesseract.js-7.0.0/por+eng-v1` e Perfil Prisma v3 gerado explicitamente.
- M2-C conectado criou versões documentais concorrentes 1/2/3, repetiu uma chave sem duplicação, vinculou tentativa 2 e rejeitou lock stale.
- Revisão `d0c80fbf-ddcb-4e25-ba60-e8e7c9da5828` aprovou atomicamente o perfil `b00c35f6-5409-4621-b02f-4ee7611b5449` v1; nove eventos foram verificados sem texto-fonte integral.
- Super Admin, Owner, Admin e Recruiter foram autorizados no escopo; uma sessão Member recebeu zero documentos e não iniciou revisão.
- Auditoria pós-rollout confirmou zero versões/tentativas/perfis atuais duplicados, RLS nas quatro tabelas M2-C e zero foreign keys novas sem índice de cobertura.
- Intake currículo-first aplicado em QA em 2026-08-26; transação sintética comprovou replay sem duplicação, criação e vínculo documentais atômicos, candidato duplicado, DML direto negado, `Member` negado e auditoria sem texto-fonte.
- Movimento 4 aplicado em QA em 2026-08-26 pelas migrations `20260826204413_m4_knowledge_foundation` e `20260826205027_m4_knowledge_indexes_rls`; 16 tabelas estão com RLS, 17 policies, zero grants anônimos de RPC Knowledge, zero colunas vetoriais e CBO/ESCO/O*NET catalogados com versões sem checksum inventado.
- Transações sintéticas com rollback comprovaram precedência Organization sobre Global, fallback Global, falha segura para aliases ambíguos, leitura Global por autenticado sem vínculo e ocultação de Knowledge de outra organização.
- Edge Function `knowledge-agent` v2 está `ACTIVE` com `verify_jwt=true`; não houve chamada externa porque flag, modelo, credencial e budgets continuam intencionalmente inativos.
- M5 aplicado em QA em 2026-08-27: três tabelas com RLS e DML direto revogado; 18 evidências originais vinculadas sem coordenadas inventadas; zero regiões ou vínculos inválidos.
- Transações sintéticas revertidas comprovaram registro espacial por Admin, replay idempotente com `reused = true`, rejeição de coordenada fora do intervalo e negação de sessão Member. O advisor não aponta foreign key M5 sem índice de cobertura.
- Frontend desktop e mobile continuam somente locais, conectados ao único projeto Supabase remoto.

Não existe ambiente de produção separado por decisão explícita atual; o projeto remoto é usado somente pela equipe interna, sem clientes.

## Não implementado

- API HTTP/BFF.
- Malware scan/quarentena.
- Embeddings vetoriais e LLM externo.
- Snapshots CBO/ESCO/O*NET efetivamente carregados, validados, diffados e publicados; o catálogo existe sem checksum fictício.
- Auditoria de visualização/exportação além do domínio de usuários.
- Ambiente de produção isolado, deployment e rollback automatizados.
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
- A configuração local do M2-A endurece requisitos mínimos de senha, mas a proteção contra senhas vazadas do Supabase ainda não foi comprovada no ambiente remoto deste movimento.
- O hardening M4 eliminou do advisor as foreign keys Knowledge sem cobertura e a policy Knowledge sobreposta. Os índices novos aparecem como ainda não utilizados porque as filas estão vazias. O advisor de segurança sinaliza quatro RPCs Knowledge `security definer`; o uso é intencional e controlado por `search_path` fixo, autorização interna por papel/tenant e DML direto revogado.
- O advisor de segurança também identifica RPCs públicas M2-C e currículo-first como `security definer`; ADR-011/ADR-012 registram o uso controlado. A proteção contra senhas vazadas continua desabilitada.
- O advisor identifica a RPC M5 `record_profile_review_evidence` como `security definer`; o uso intencional, a autorização interna, o `search_path` vazio e o DML direto revogado estão registrados no ADR-016. Índices M5 recém-criados aparecem como não utilizados porque nenhum evento espacial foi persistido após os testes revertidos.
- O build e os contratos responsivos do workspace M5 estão aprovados, mas a inspeção visual autenticada desktop/mobile permanece pendente porque o navegador disponível não possuía sessão e não havia credencial de QA no ambiente.
- O isolamento entre QA e produção foi adiado por decisão de produto enquanto apenas a equipe interna usa o Prisma; antes de receber clientes, será obrigatório provisionar ambientes separados, backup, rollback e hosting controlado.
- O CI usa a política fail-closed do pnpm para scripts de instalação de dependências; o `postinstall` não funcional do `tesseract.js` foi revisado e explicitamente negado em `pnpm-workspace.yaml`.
- Os snapshots oficiais CBO/ESCO/O*NET ainda não foram baixados, validados por checksum, diffados ou publicados. O catálogo e os adapters estão prontos, sem simular uma carga que não ocorreu.
- Licenças e atribuições CBO/ESCO/O*NET estão catalogadas, mas a redistribuição de pacotes adaptados, especialmente CBO CC BY-ND, exige revisão jurídica antes de qualquer exposição externa.
- Base legal, retenção, storage, auditoria e subprocessadores não estão aprovados.
- Contrato de perfil não deve ser congelado antes da amostra real autorizada.

## Última evidência local

Em 2026-08-27, M2-A, M2-B, M2-C, currículo-first, M4 e M5 estão aplicados ao único projeto remoto Prisma-QA. O M5 comprovou contrato espacial normalizado, compatibilidade histórica sem coordenadas fabricadas, RLS, papel de revisor, rejeição de coordenadas inválidas e índices de foreign keys. O Knowledge Agent está implantado, mas a chamada externa permanece deliberadamente desativada. Os frontends continuam locais; não há hosting nem ambiente de produção separado por decisão atual de operação interna.
