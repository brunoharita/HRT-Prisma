# AoT — Cadastrar Owner 3.0.1

Contrato `docs/qa/agreement-owner-onboarding-v301.md`1.0.0, aprovado neste chat17/10/2026. Baseline82dee4b, classeD; complemento do acordo V3M0, sem reabertura de planos ou papéis. Versão3.0.1 explícita do Product Owner, histórico2.9.0 preservado.

## Matriz de Acordos

| ID | Acordo / implementação | Teste / evidência | Status | Ambiente / limitação |
| --- | --- | --- | --- | --- |
| D-01 | Botão e rota contextual, UserFormPage reutilizado, quatro campos preenchidos/bloqueados e pessoa editável | browser.json60; rotas reais extraídas no teste; imagens1448/390/320 | PASS | Componentes reais, transporte/ator sintéticos |
| D-02 | Username derivado no SQL, sem alternativa silenciosa | SQL129/Edge: HRT Solutions, conflito, caracteres não suportados e comprimento; UI mostra canonical | PASS | Nenhum Owner existente renomeado |
| D-03 | Contexto service-only, ativo Super, preparação, primeira empresa, contrato; revalidação sob lock, audit e compensação | SQL129 inclui26 novos checks; duas conexões Owner concorrentes, rollback por auditoria; Deno2/19cenários (7 genéricos+12 contextuais) | PASS | PG17 isolado, handler real com fetch sintético |
| D-04 | Fluxo genérico/edição preservados, retorno a grupos, nenhuma ativação implícita | Node25/tooling7 e regressões multiempresa103 incluídas nos129; browser genérico/editável/erro/retorno | PASS | Não substitui jornada humana autenticada |
| D-05 | Contexto/CI e publicação seletiva | Checks locais abaixo; rollout pendente | PARTIAL | Sem mutação de teste em produção |

## Proibições verificadas

| ID | Guardrail / negativo | Evidência | Status |
| --- | --- | --- | --- |
| P-01 | Quatro adulterações, ator/contrato/contexto inválido, colisão, replay e cliente direto negados; identidade existente não substituída | postgres.json, Deno e erro UI sem formulário genérico | PASS |
| P-02 | Sem preço, cobrança, dados de talentos ou migration histórica alterados; Registry preserva histórico | Diff/Node e matriz de destinos; save_platform_user_v3 inalterada | PASS |

## Mapa de Impacto e Preservação

Mapa do acordo mantido. Direct: botão/rota/contexto/formulário, documentação e release. Critical_transversal: Auth/ator/grupo/audit. Plausible_indirect: cadastro genérico/edição/persistência e Owner futuro; SQL de regressão foi executado junto das novas provas. No_impact_identified: matching/Knowledge/Parser/Tokens/portais, sem lógica/helper/serviço alterado. Baseline Git82dee4b; remoto Prisma ioldpnqqvobprjiontre17.6ACTIVE_HEALTHY, platform-users6/JWT=true. save_platform_user_v3 capturada para comparar no pós-rollout. Dados agregados somente leitura antes: usuários7/vínculos9/Pessoas12/Perfis18/movimentosTokens9.

Novidade: quatro campos obrigatórios do contexto. Preservação: dados pessoais editáveis, credenciais existentes e cadastro genérico; SQL e Deno preservam guards/compensação e autoridade existente. Dependência descoberta: seletor de país ocupava o celular em320px; CSS exclusivamente `.prisma-owner-onboarding` passa país/celular a duas linhas no mobile, sem alterar cadastro genérico/desktop. Necessário para preencher o novo fluxo na menor viewport. Nenhuma nova dependência.

## Fora de escopo preservado

F-01 PASS: nenhuma transferência de Owner, renomeação de existente, regra global de username ou melhoria de outro fluxo.

## Evidência de fidelidade visual

Imagem anexada é referência do estado atual/contraexemplo dos quatro campos abertos; conteúdo pessoal é ilustrativo e não foi copiado para fixtures. Topologia existente preservada: cabeçalho/ações, dados básicos em três colunas no desktop, acesso/permissões em três colunas, senha/segurança abaixo, ações finais; mobile conserva ordem em coluna. Render owner-1448/390/320.png; desktop e320 inspecionados. Diferenças previstas: título contextual, campos protegidos e dados sintéticos. Ajuste mobile do celular necessário acima; sem overflow. Sem alegação de identidade pixel a pixel ou comparação de dados reais.

## Desvios e mudanças autorizadas

Nenhum desvio das regras aprovadas. Restrições de username já existentes continuam e são explicitadas, sem inventar transliteração/truncamento. A referência não é um mockup de nova composição. Limites: servidor local é PostgreSQL17 com subset real e Auth.uid de fixture; não é reset integral Supabase. Browser usa transporte sintético; não comprova login humano produtivo. Nenhuma IA/e-mail/identidade real utilizada para testar. Não há QA remoto separado neste fluxo conhecido.

## Validação final

129SQL PASS;60browser PASS em1448/390/320, incluindo quatro locks, reload, criação, contexto inválido, cadastro genérico/edição, erro conservando rascunho e retorno.25Node/7tooling PASS.2Deno/19cenários PASS, incluindo compensação de Auth recém-criado na falha de persistência. Rootbuild, tipos web e build web PASS. Lint/foundation/contexto/ledger PASS; CI e rollout serão registrados no fechamento. Não executado validate integral local.

Ocorrências locais: Deno exigiu objeto estrutural para resposta JSON, corrigido com spread; fixture de browser importava tipos web sem extensão NodeNext e foi isolada com tipo local. Ambos resolvidos e testes dirigidos refeitos. Browser revelou celular sem largura em320px, corrigido apenas no contexto; nova execução60PASS. Warnings AntD/chunk anteriores não são exceções de runtime e não geraram refatoração adjacente.

## Git / QA / ambiente

Worktree de tarefa reutilizado, branch codex/owner-onboarding-v301; checkout canônico e arquivos alheios preservados. Destinos esperados: migration nova, platform-users e web. Rollback web/Edge anteriores preservados; correção SQL forward, RPCs legadas não redefinidas.

## Conclusão

Local PASS; entrega geral PARTIAL até publicação/smoke/CI/sincronização.
