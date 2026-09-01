---
owner: qa
status: verified_in_prisma_qa
version: 0.3.1
last_verified: 2026-09-01
---

# QA do M5.1 - Verificação de Competências

## Estado

Plano completo do M5.1 e evidência local, conectada e visual do M5.1B. Além do M5.1A, existem testes executáveis para scoring, métricas ligadas à questão ativa, incidente técnico separado, integridade, confiança, Evidência Demonstrada independente e limites de grants/RLS da migration. O smoke conectado e os dois contextos visuais foram executados somente com dados sintéticos.

## Estratégia

O M5.1 é classe D/E quando implementado: envolve tenant, PII profissional, avaliação, IA potencial, políticas, telemetria, integridade e impacto em matching. A validação futura deve combinar unit, contract, integration, security, golden, UX e regressão de fairness/acessibilidade.

Para M5.1A, a validação local cobre:

- `evaluateEvidenceSufficiency` com política obrigatória, recomendação por criticidade e evidência demonstrada vigente.
- `composePreparedAssessment` com seleção determinística de itens ativos compatíveis e falha fechada quando a cobertura do banco é insuficiente.
- Migrations M5.1A com RLS em todas as tabelas, grants explícitos, ausência de `auth.role()`, RPC com `search_path` fixo e hardening de grants herdados.
- Typecheck base e web.
- Test suite técnica completa.

## Matriz futura

| Área | Casos mínimos |
| --- | --- |
| Contratos | versionamento, versão desconhecida fail-closed, compatibilidade histórica |
| Tenant/RLS | item Organization privado, policy tenant-scoped, usuário sem membership, papel insuficiente |
| Verification Need | criação, recomendação, exigência por policy, cancelamento, expiração, inconclusivo |
| Sufficiency Engine | suficiente, opcional, recomendado, obrigatório por política, informação insuficiente |
| Policy | criticidade, nível mínimo, recência, modalidade aceita, reutilização, tentativas |
| Item Bank | item não aprovado não selecionado, deprecated/compromised bloqueado, Global não recebe Organization |
| Composer | respeita blueprint, nível, dimensão, dificuldade, cooldown, exposição e família |
| Attempt | autosave, replay, reconexão, timeout, refresh, tentativa duplicada e expiração |
| Rubrica | resultado bruto preservado, nível demonstrado explicado, inconclusivo permitido |
| Telemetria | questão ativa correta, timestamps, blur/focus, page hidden/visible, duplicidade |
| Integridade | flags determinísticas, nenhum evento isolado acusa fraude, incidente técnico separado |
| Evidência | demonstrada independente, divergência preservada, matching reavaliado sem decisão automática |
| Acessibilidade | teclado, leitor de tela, foco, contraste, tempo adicional e tecnologia assistiva |

## Golden fixtures futuras

Fixtures devem cobrir:

- assessment normal;
- múltiplas saídas curtas;
- saídas prolongadas em itens difíceis;
- conexão instável;
- mudança de dispositivo;
- tempo muito rápido;
- tempo muito lento;
- item fora de calibração;
- evidências divergentes;
- verificação inconclusiva;
- policy obrigatória para competência crítica;
- ausência de evidência demonstrada sem interpretação negativa;
- item Organization impedido de aparecer em outro tenant;
- assessment composto sem LLM quando Item Bank cobre o blueprint.

## Critérios de aceite futuros

Implementação só poderá ser promovida quando:

- contratos e versões estiverem documentados;
- migrations tiverem RLS, grants e índices revisados;
- DML direto de tabelas críticas estiver revogado quando aplicável;
- tests negativos de tenant e papel passarem;
- composer respeitar blueprint em regressão determinística;
- attempt preservar respostas em refresh/reconnect;
- telemetria estiver ligada à questão ativa;
- integridade não alterar resultado bruto;
- evidência demonstrada não sobrescrever perfil;
- matching mostrar impacto sem decisão automática;
- UX cobrir estados vazios, erro, conflito, expiração, inconclusivo e autorização insuficiente;
- acessibilidade estiver validada em desktop e mobile;
- Context Pack estiver regenerado.

## Evidência esperada

Registrar ambiente, branch, commit, migrations, versões de contratos, dados sintéticos, comandos, resultado, limitações, screenshots quando houver UI, transações revertidas quando houver banco remoto e status de produção separado.

Produção permanece fora do M5.1 até aprovação explícita e ambiente dedicado.

## Evidência M5.1A local

Em 2026-09-01:

- `CI=true pnpm run typecheck` aprovado.
- `CI=true pnpm run typecheck:web` aprovado.
- `CI=true pnpm run test` aprovado com 124 testes.
- Migração criada via Supabase CLI como `20260901082542_m51a_verification_intelligence.sql`.
- Migração corretiva criada via Supabase CLI como `20260901111841_m51a_grant_hardening.sql`.
- Busca por travessão nos arquivos verificados retornou zero ocorrências.

Limitações remanescentes:

- A preparação M5.1A isolada não teve smoke visual registrado naquele movimento; o monitoramento autenticado do M5.1B foi validado na sequência.
- Migrations M5.1A aplicadas ao Prisma-QA por `supabase db query --linked --file` e registradas no histórico remoto por `supabase migration repair --linked --status applied`.
- Validação remota confirmou nove tabelas com RLS, três RPCs disponíveis somente para `authenticated`, catálogo sintético com 1 definition, 1 blueprint, 1 rubric, 15 itens e 2 policies, além de grants críticos somente de leitura em `verification_needs`, `prepared_assessments` e `verification_audit_events`.
- Nenhuma verificação real foi enviada ou executada.
- Nenhuma evidência demonstrada foi gerada.

## Evidência M5.1B local

- Domínio puro cobre resultado bruto, métricas de visibility/focus, execução normal com itens não calibrados, incidente técnico inconclusivo e proveniência da Evidência Demonstrada.
- Migration exige RLS nas dez novas tabelas, revoga `anon`, restringe mutações críticas às RPCs e reserva `m51b_public_access` para `service_role`.
- Edge Function aplica CORS explícito, token SHA-256, rate limit, erros sanitizados e nunca registra token bruto ou answer key.
- UI implementa as 12 superfícies do storyboard em dois contextos: App Shell do operador e experiência pública sem sidebar.
- Produção e Pessoas reais permanecem fora de escopo.

## Evidência M5.1B conectada no Prisma QA

Em 2026-09-01:

- migrations `20260901115938_m51b_verification_execution`, `20260901124012_m51b_submission_dimension_coverage_fix` e `20260901124345_m51a_workspace_item_bank_summary_fix` aplicadas por `supabase db query --linked --file` e registradas no histórico remoto;
- Edge Function `assessment-access` publicada com validação própria de token opaco e `verify_jwt=false`; isso não concede acesso anônimo a tabelas ou à RPC interna;
- dez tabelas M5.1B confirmadas com RLS; `anon` não possui leitura de tentativa nem execução da RPC pública interna, `authenticated` não possui INSERT de tentativa nem execução dessa RPC, e apenas `service_role` a executa;
- CORS aceitou `http://localhost:5555` e a resposta pública omitiu answer key, dificuldade, rubrica e dados internos;
- convite sintético criou uma tentativa com 15 Question Instances, salvou 15 respostas, preservou 52 eventos e gerou 15 métricas;
- submissão produziu avaliação determinística, integridade `adequate`, confiança `adequate`, qualidade metodológica `limited`, Evidência Demonstrada, Need resolvida e exatamente uma reavaliação de matching;
- o primeiro submit revelou incompatibilidade com `jsonb_object_length`; a transação foi revertida, a causa foi corrigida em migration fail-closed e o mesmo submit foi concluído;
- `supabase db lint --linked --level warning --schema public` não reporta erro M5.1A/M5.1B após a correção. Permanecem dois warnings históricos de cast no currículo e um erro histórico em `enqueue_knowledge_observation`, fora deste movimento.
- `CI=true pnpm run validate` aprovou lint de 225 arquivos, foundation, Context Pack, dois typechecks, build web, 133 testes técnicos, 19 golden tests e demonstração `VERTICAL_SLICE_OK`.
- smoke visual da Pessoa aprovado em desktop e `390x844`, incluindo autosave, pausa, retomada e preservação da resposta; um overflow horizontal identificado no primeiro passe foi corrigido com `min-width: 0` nos grids e controles com wrap, e a repetição confirmou `documentWidth <= viewport`. O segundo convite sintético usado nessa inspeção foi revogado ao final, sem apagar o ledger.
- a origem local foi consolidada em `5555`: o script e a configuração Vite de `5556`, os redirects Auth e a origem CORS redundante foram removidos. Isso permitiu reutilizar a sessão Supabase já autenticada, sem duplicar login por origem.
- `assessment-access` foi republicada no Prisma-QA após a consolidação. O preflight de `http://localhost:5555` retornou HTTP 200 com `Access-Control-Allow-Origin` correspondente; o mesmo preflight pela origem removida `http://localhost:5556` retornou HTTP 403 e `Access-Control-Allow-Origin: null`.
- smoke visual do operador aprovado em desktop e `390x844`: a lista exibiu os convites sintéticos revogado e concluído, o registro concluído abriu o detalhe com resultado bruto, confiança e integridade, e a página móvel confirmou `documentWidth = viewport = 390`.
- o primeiro passe do detalhe revelou os enums técnicos `adequate`; a UI foi corrigida para `Adequada` em confiança e integridade e revalidada sem o valor técnico exposto.

Não foram usados nomes ou dados de Pessoas reais. O registro de QA foi criado como `Pessoa Sintética M5.1B QA` com domínio `example.invalid`. Nenhum e-mail ou WhatsApp foi enviado.
