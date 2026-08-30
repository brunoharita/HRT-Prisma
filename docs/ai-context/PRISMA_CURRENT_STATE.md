---
prisma_context_id: current-state
owner: engineering-operations
status: current
version: 2.3.3
last_verified: 2026-08-30
---

# Estado atual do Prisma

## Repositório

- Raiz local oficial: `C:\Users\Bruno\Documents\Prisma`.
- Branch integrada verificada: `main`; a evolução adaptativa v2 está implementada na branch `codex/adaptive-review-learning-v2`, construída sobre a fundação `codex/adaptive-resume-extraction`.
- Remoto Git configurado: `git@github.com:brunoharita/HRT-Prisma.git`.
- Stack local: Node.js, TypeScript e pnpm.

## Disponível localmente

- CLI de vertical slice.
- Shell web React com Vite, Ant Design, App Shell autenticado reutilizável, sidebar responsiva, Supabase Auth no browser, seleção de organization ativa e route guards por papel, com convenção local `5555` principal e `5556` QA.
- Adapter Supabase web tipado e centralizado para memberships, operador autenticado e leituras de domínio.
- Movimento M2-A implementado localmente com distinção formal `Usuário != Pessoa`, menu `Usuários`, listagem/edição/cadastro de operadores e fluxo apresentado ao produto como `username + senha`.
- Movimento M2-B implementado com cadastro/edição de Pessoa, entrada manual e PDF, extração nativa por página, OCR local seletivo, evidência, draft, perfil versionado e timeline.
- Movimento M2-C implementado com central documental, detalhe/tentativas/auditoria, retry vinculado, revisão humana por campo, comparação de versões e aprovação transacional. A central `Processamento e revisões` usa composição legível para Pessoa e Documento, larguras semânticas, colunas operacionais compactas e rolagem interna responsiva, sem alterar consulta, filtros ou navegação.
- Movimento M5 implementado com PDF original e revisão estruturada lado a lado, navegação campo/evidência, seleção espacial normalizada, OCR local por região, vínculos e histórico imutável. A seleção nativa `pdfjs-character-region-v2` resolve um conjunto explícito de caracteres e usa as mesmas caixas para texto, refinamento e destaque visual pendente; na direita, somente um caractere contíguo pode ser recuperado por tolerância subpixel, sem ampliar esquerda, topo ou base. A geometria de fonte de fallback é limitada pelo próximo item visual da mesma linha e a faixa de status é reservada antes do arraste, evitando invasão do conteúdo vizinho e deslocamento do PDF durante o gesto. Evidências `pdfjs-text-layer-v1` permanecem históricas.
- Destaques espaciais persistidos são filtrados pelo contexto de revisão aberto: Experiência e Formação exibem somente o registro atual; cada outra aba exibe apenas seus campos renderizados. O filtro é local, não destrutivo e não modifica o contrato `spatial-evidence` 1.2.0.
- Evidências originais históricas sem região persistida recebem um fallback somente visual quando o valor extraído do campo ativo possui uma única correspondência exata na camada textual da página original. A região não é persistida nem tratada como evidência espacial inferida; zero ou múltiplas correspondências falham fechadas e não produzem destaque.
- O modal M5 aplica texto reconhecido e não editado sem justificativa, exige explicação somente para interpretação ou conteúdo manual e apresenta validação/falha dentro da própria janela.
- Refinamento espacial 1.2 implementado localmente: uma nova seleção preserva o texto bruto, identifica regiões sobrepostas de campos irmãos do mesmo registro, desconta por padrão somente áreas humanas e permite reinclusão explícita. A subtração usa caracteres PDF.js ou símbolos posicionados do OCR; nenhum texto externo ao retângulo participa.
- Extração adaptativa v2 implementada localmente: PDF.js preserva linhas e geometria; a estruturação reconhece blocos completos, períodos abreviados, empresa em linha distinta e permanências com cargos subordinados; cada campo pode possuir região original navegável. Padrões organizacionais aprovados funcionam como sinais estruturais allowlisted, nunca como templates executáveis.
- Revisão adaptativa v2 implementada localmente: evidência humana pode ser retirada sem apagar histórico; superfícies extraída/revisada navegam para suas respectivas regiões; uma correção relê a fonte original dos blocos irmãos, sugere cargo/empresa/período/descrição separadamente, preserva campos já revisados e mantém registros ambíguos sem alteração.
- Aceite adaptativo implementado com seleção por campo, persistência atômica, lock otimista, replay idempotente, histórico metadata-only e recarga do rascunho sincronizado. A seleção de nova evidência permanece disponível após aplicar sugestões.
- Áreas personalizadas implementadas na revisão, com schema ativo em QA e frontend local: criação evidence-first sob `Outros`, estrutura limitada por seção/item, navegação e destaque pelo mesmo contrato M5, persistência versionada e apresentação no perfil. `Pendências de interpretação` e `Informações não localizadas` aparecem separadas dos fatos do currículo.
- Aprendizado de títulos personalizados ativo no schema QA e consumido pelo runtime local: somente após aprovação integral, o catálogo tenant-scoped registra chave, título normalizado, formato, versão e confirmação. Conteúdo pessoal não é copiado; uma importação futura relê o documento e cria evidência própria para cada item.
- Fluxo principal currículo-first implementado localmente: upload PDF antes da Pessoa, identidade mínima determinística, deduplicação por tenant, decisão humana em correspondência ambígua e retomada idempotente.
- Movimento 4 implementado localmente: Knowledge canônica Global e Organization overlay, tipos conceituais explícitos, aliases, relações, mappings, source catalogue/version, Inbox, proposals/approvals, normalização com precedência e módulo administrativo Conhecimento.
- Knowledge Agent implementado e implantado no Prisma-QA como Edge Function com JWT obrigatório, Responses API, Web Search, Structured Outputs, allowlist persistida, no-PII, budget, cooldown e deduplicação; pesquisa externa permanece desativada por ausência deliberada de configuração/credencial/orçamento.
- Impactos e reinterpretação Knowledge implementados localmente: somente perfis relacionados, default organizacional `off`, dispatch idempotente e draft reutilizando M2-C sem alterar evidência ou perfil aprovado.
- Home autenticada com contagens persistidas de pessoas, perfis estruturados e vagas abertas da organização ativa.
- Pessoas com tabela, busca por nome/e-mail/telefone, formulário com resumo lateral e perfil profissional estruturado.
- Perfil com fatos, competências, áreas personalizadas, evidências, proveniência, inferências e pendências diagnósticas; contato privado somente para perfis administrativos autorizados.
- Importação de currículo textual UTF-8 representativo.
- Extração determinística de identidade, experiências, educação, certificações, idiomas, competências e contextos reconhecidos.
- Perfil profissional estruturado com fatos, evidências, proveniência, inferências, incertezas e campos não identificados.
- Persistência JSON filtrada por organização.
- Busca natural por conceitos conhecidos.
- Matching por requisito com atendido, parcial, sem evidência, gaps, suficiência e explicação.
- Confiança metodológica determinística.
- Telemetria básica de processamento.
- Testes técnicos, golden tests, build, lint, typecheck e demo.
- Typecheck e build do shell web aprovados.
- 82 testes técnicos aprovados, incluindo contratos M2-A/M2-B/M2-C/M5/currículo-first, legibilidade estrutural da central de processamento, extração adaptativa v2.1, áreas personalizadas, aprendizado metadata-only, contenção textual estrita, recuperação subpixel do último caractere, encaixe geométrico antes do próximo item visual, filtro contextual de destaques por aba/registro, fallback visual exato para evidência original histórica, refinamento espacial com subtração de áreas irmãs, aplicação contextual da seleção, PDF inválido, idempotência, concorrência, coordenadas, revisão imutável, auditoria e Member sem documento bruto.

## Implementado como contrato

- Foundation migration PostgreSQL/Supabase com organizações, memberships, papéis, posições, vagas, pessoas, documentos, perfil, evidência, inferência, competências, matching e uso de IA; ativa no único projeto remoto atual.
- Migration local `20260824113000_m2_users_people` com `organization_groups`, `platform_users`, `platform_user_audit_events`, `organizations.group_id`, username case-insensitive normalizado, auditoria material e evolução de `membership_role`.
- RLS, grants, índices e integridade multi-tenant ativos em QA.
- Políticas de autorização da foundation para admin, recruiter e hiring manager ativas em QA.
- Boundary local em Edge Functions para `operator-sign-in`, `operator-password-reset` e `platform-users`.
- Migrations M2-B com bucket privado `person-documents`, tentativas, páginas, drafts, eventos e RPC transacional `persist_person_extraction`.
- Migrations M2-C com ledger de operações, locks de versão/tentativa, retries vinculados, revisões/alterações imutáveis e RPCs de aprovação atômica.
- Migrations M5 `20260827034147_m5_spatial_cv_evidence`, `20260827041613_m5_spatial_evidence_fk_indexes` e `20260827042829_m5_spatial_evidence_idempotent_replay` com regiões normalizadas, vínculos, eventos append-only, RLS, índices e RPC transacional.
- Migration local `20260828160707_strict_pdf_character_region`, aplicada no Prisma-QA como `20260828161125`, preserva evidências `1.0.0`, ativa default `spatial-evidence` 1.1.0 e libera `pdfjs-character-region-v2` na constraint e na RPC.
- Migrations locais `20260829111414_spatial_evidence_refinement` e `20260829113452_spatial_evidence_refinement_rpc_fix`, aplicadas no Prisma-QA como `20260829113031` e `20260829113502`: a primeira adiciona texto bruto, ledger imutável de exclusão/reinclusão, RLS, DML direto revogado e RPC refinada; a segunda elimina de forma fail-closed a ambiguidade PostgreSQL do `ON CONFLICT` descoberta pela primeira transação conectada.
- Migration `20260828055309_adaptive_resume_extraction` aplicada no Prisma-QA com layout por página, evidência espacial por campo, casos de aprendizado tenant-scoped e RPC auditável de retirada de evidência.
- Arquivos locais `20260828111135_adaptive_review_learning_v2`, `20260828112737_adaptive_review_learning_v2_rpc_fix` e `20260828115300_adaptive_review_learning_v2_fk_indexes` aplicados no Prisma-QA como migrations remotas `20260828112434`, `20260828112756` e `20260828115139`, com eventos append-only, RPC de aceite transacional, padrões pós-aprovação e cobertura das novas foreign keys.
- Migration local `20260829021015_custom_profile_sections`, aplicada no Prisma-QA como `20260829023309_custom_profile_sections`: valida `customSections`, amplia caminhos M5 e auditoria de mudanças, cria catálogo estrutural com RLS/DML revogado e aprende metadados somente na aprovação.
- Migration local `20260829024200_custom_section_learning_provenance`, aplicada no Prisma-QA como `20260829024007_custom_section_learning_provenance`: cria confirmações append-only ligadas à revisão aprovada, com RLS e DML direto revogado, sem valores dos itens.
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
- Uma transação revertida adicional comprovou que `record_profile_review_evidence` aceita `pdfjs-character-region-v2`; o rollback restaurou o lock 8 e deixou zero regiões/operações de teste.
- Transações adaptativas revertidas comprovaram negação de sessão sem JWT, aceite atômico, incremento de lock, replay idempotente e promoção de padrão somente após `approve_profile_review`. Os testes deixaram zero eventos adaptativos e zero padrões organizacionais residuais.
- As migrations de áreas personalizadas foram verificadas remotamente com RLS ativo nas duas tabelas, uma policy tenant-scoped por tabela, zero grants diretos de escrita, cinco constraints de shape validadas, ledger imutável, gatilho presente e RPCs de evidência/salvamento reconhecendo `customSections`. Payload histórico e shape válido foram aceitos; nome canônico e chave inesperada foram rejeitados. Catálogo e ledger permaneceram com zero linhas. O advisor sinaliza apenas índices novos ainda sem uso, além dos avisos históricos já documentados.
- O refinamento espacial 1.2 foi aplicado no Prisma-QA. A tabela está com RLS, policy tenant-scoped, `authenticated` somente com leitura, `anon` sem leitura e sem execução da RPC, e ledger imutável. Transação revertida comprovou rejeição de sobreposição falsa e registro diferente, persistência conjunta de texto bruto, texto efetivo e decisão excluída, e rollback sem resíduos. Sessão autenticada sem membership foi negada. O advisor acrescenta somente a RPC `security definer` intencional, protegida por autorização interna, e índices novos ainda não utilizados.
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
- A aba autenticada mostrada pelo usuário não foi exposta à sessão controlável do navegador; a inspeção local alcançou somente o login. As causas geométrica e de validação do modal foram reproduzidas por testes determinísticos, mas o smoke visual autenticado permanece pendente.
- A persistência adaptativa v2 está em QA e o runtime web permanece local. O advisor não aponta RLS ausente nem foreign key adaptativa sem índice; registra somente os novos índices ainda sem uso e a RPC `security definer` intencionalmente executável por `authenticated`, protegida por autorização interna e DML revogado. A qualidade possui regressões sanitizadas para HRT, Bencato, Scaffold, Servimed e NM Systems, mas ainda não foi medida em lote de currículos reais autorizados nem recebeu smoke visual autenticado.
- O schema de áreas personalizadas e seu aprendizado estrutural está em QA; o frontend permanece local. O fluxo criar área -> evidência -> aprovação -> nova extração ainda precisa de smoke autenticado com dado sintético. Nenhuma revisão aprovada real foi rebaixada para simular o gatilho.
- O schema do refinamento espacial 1.2 está ativo em QA e o frontend permanece local. A cobertura determinística e as transações revertidas comprovam subtração, limites do contrato, autorização e ausência de resíduos; ainda falta smoke visual autenticado com sobreposição real no PDF.
- O isolamento entre QA e produção foi adiado por decisão de produto enquanto apenas a equipe interna usa o Prisma; antes de receber clientes, será obrigatório provisionar ambientes separados, backup, rollback e hosting controlado.
- O CI usa a política fail-closed do pnpm para scripts de instalação de dependências; o `postinstall` não funcional do `tesseract.js` foi revisado e explicitamente negado em `pnpm-workspace.yaml`. A geração do Context Pack normaliza finais de linha para manter hash e conteúdo determinísticos em Windows e Linux.
- Os snapshots oficiais CBO/ESCO/O*NET ainda não foram baixados, validados por checksum, diffados ou publicados. O catálogo e os adapters estão prontos, sem simular uma carga que não ocorreu.
- Licenças e atribuições CBO/ESCO/O*NET estão catalogadas, mas a redistribuição de pacotes adaptados, especialmente CBO CC BY-ND, exige revisão jurídica antes de qualquer exposição externa.
- Base legal, retenção, storage, auditoria e subprocessadores não estão aprovados.
- Contrato de perfil não deve ser congelado antes da amostra real autorizada.

## Última evidência local

Em 2026-08-30, `CI=true pnpm run validate` aprovou lint de 171 arquivos, fundação, Context Pack, dois typechecks, build web, 82 testes técnicos, 19 casos golden sem regressão e demonstração `VERTICAL_SLICE_OK`. A cobertura inclui o fallback visual fail-closed para evidência original histórica sem coordenadas. O smoke autenticado com o acesso QA salvo confirmou, na revisão de Bruno Harita, página 2 e campo `experiences.0.role`, exatamente um destaque `Original` sobre “Fundador & Diretor Executivo”; as demais regiões visíveis pertenciam somente aos campos irmãos do mesmo registro `experiences.0`, preservando o filtro contextual. O resultado permaneceu correto após `Ajustar largura` e não criou nem persistiu coordenadas. O frontend continua local e não há hosting nem ambiente de produção separado por decisão atual de operação interna.
