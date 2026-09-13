# AoT — Base compartilhada de UX

Data: 2026-09-13. Contrato: `docs/qa/agreement-ux-foundation.md` 1.0.0, execução `docs/qa/execution-ux-foundation.md` 1.0.0, apresentação `prisma-ux-foundation-1.0.0`. Baseline `1d907344c19c2f72c8d54871b0d5b621eea698b2`. Escopo: padrões dos grupos 3, 16, 17 e 18 e base compartilhada, com estados do grupo 15.

## Evidências e método

- E-01: `pnpm run build`, `pnpm run typecheck:web` e `pnpm run build:web` concluídos. Build web mantém aviso de chunk Ant Design maior que 900 kB; nenhuma biblioteca adicionada.
- E-02: 99 testes dirigidos aprovados, zero falhas, incluindo nove testes da fundação. Arquivos: `uxFoundation`, `webProtectedRoutes`, `platformUsersContract`, `profileDelta`, `personActionCenter`, `reviewFieldLifecycle`, `vacancyIntelligence`, `competencyVerification`, `competencyVerificationExecution` e `assessmentItemGovernance`, todos em `tests/*.test.ts`. Execução compilada com `node --test --test-reporter=tap dist/tests/<nome>.test.js`. A asserção de texto de exclusão foi atualizada para a nova redação; cancelamento auditável e preservação de histórico continuam testados.
- E-03: inspeção do navegador na interface local `http://127.0.0.1:5555`, sessão autenticada existente, amostra sintética `[QA] Marina Dados`. Lista em 320, 390, 768 e 1440 CSS px; Central e formulário em celular/desktop; páginas públicas indisponíveis em 390 px. Filtros de tablet e cartões com conteúdo longo corrigidos após inspeção. Documento e viewport medidos em 320 px sem overflow horizontal da página. Tabela de Posições mantém rolagem bidimensional identificada, região focável e ações acessíveis por teclado.
- E-04: navegação Pessoas → cadastro/Central → retorno preservou filtro; Central → perfil → retorno preservou aba Documentos e versões. Formulário com texto de teste abriu diálogo; Continuar editando preservou texto; voltar pelo navegador foi cancelado e manteve URL/formulário; sair confirmado retornou à lista. Navegação limpa saiu sem pergunta. Nenhum cadastro de teste foi salvo.
- E-05: diálogo de saída focaliza Continuar editando; menu móvel fecha com Escape e devolve foco a Abrir navegação; região da tabela respondeu a ArrowRight. Rótulos, roles de estado, skip links, foco visível e detalhes nativos inspecionados. Contrastes dos tokens de texto/ações sobre branco >= 4,5:1 e borda dos controles >= 3:1 em teste automatizado. Reflow em 320 CSS px cobre a largura equivalente à ampliação; não equivale a teste de todos os navegadores/leitores de tela.
- E-06: revisão do diff e dos contratos: alterações limitadas à apresentação, continuidade, testes e documentação. Nenhuma migration, serviço de domínio, política RLS, parser ou arquivo de evidências geométricas alterado. Fotografias locais e TAP ficam em `tmp/ux-foundation/`, ignorado pelo Git; não são enviados ao repositório. Relato reproduzível abaixo integra a entrega.
- E-07: após a observação do PO sobre a busca por “assistente de marketing”, o campo de referência passou a informar a origem da consulta, mostrar carregamento, quantidade de resultados, ausência de correspondência e erro com nova tentativa. Respostas fora de ordem são descartadas; o rascunho permanece preservado. A escolha de referência com conteúdo já preenchido usa diálogo Ant Design contextual, sem confirmação nativa.
- E-08: após a reprovação visual do PO, o cartão de início foi recomposto como fluxo de escolha: três opções equivalentes em cartões, uma alternativa independente por descrição e um guia explícito da ordem Knowledge interna → referências oficiais catalogadas. A tabela de referência agora agrupa Empresa e Base global; o carregamento e a consulta oficial mantêm anúncios acessíveis. A validação técnica desta correção foi repetida com build e 43 testes dirigidos; a captura de aprovação visual deverá ser feita no ambiente autenticado após a atualização.

## Matriz de Acordos

| ID | Implementação | Teste / evidência | Status | Ambiente / limitação |
| --- | --- | --- | --- | --- |
| D-3.1 | PrismaApplication/PrismaAppShell agrupam capacidades permitidas. | E-02, E-03; contratos de papéis e rotas. | PASS | Sessão visual Super Admin; outros papéis cobertos por contratos, sem troca de permissões real. |
| D-3.2 | Verificações oferece Preparar verificação; `/matching` e rotas de necessidade preservadas, fora do menu isolado. | E-02, E-03; ida e retorno observados. | PASS | Aceite de navegação; serviço legado falhou ao carregar necessidades, conforme limite L-01. |
| D-3.3 | Posições nos textos operacionais; nomes internos preservados. | E-02, E-03, E-06. | PASS | Dados históricos e termos de fontes não reescritos. |
| D-3.4 | Jornadas no owner de UX; guarda apenas para edição pendente. | E-02, E-04. | PASS | Sequências de domínio não redesenhadas integralmente. |
| D-3.5 | Central preserva perfil, pendências e manutenção; cartões responsivos. | E-03; amostra com várias pendências e conteúdo longo. | PASS | Fonte sintética com extração preexistente, sem alteração do parser. |
| D-3.6 | Cache temporário por sessão/identidade/papel/empresa; filtros, seleção, página, aba e rolagem integrados. | E-02 isolamento/limpeza/terceira seleção; E-04 retorno de filtro e aba. | PASS | Cache de navegação reinicia na recarga completa; rascunho preexistente de posição tem chave contextual. |
| D-3.7 | Placeholders fora do menu; recuperação para links legados. | E-02, E-03 e revisão das rotas. | PASS | Não cria módulos administrativos novos. |
| D-15.1 | PrismaState/PrismaMetric; Pessoas, Verificações, áreas públicas e métricas integradas. | E-02 ausência versus zero; E-03 vazio filtrado/erro/carregamento. | PASS | A base não substitui todas as mensagens dos grupos 4–14. |
| D-15.2 | Guarda compartilhada em editores integrados; sucesso limpa guarda após resposta; recuperação mantém edição. | E-02, E-04; revisão dos handlers de sucesso. | PASS | Save real não exercitado nesta amostra; contratos de publicação/cadastro testados. |
| D-15.3 | 404, pessoa/documento e necessidade inexistentes sem primeiro registro arbitrário. | E-02 casos ausentes; E-03 URL inexistente. | PASS | Nenhuma autoridade concedida para contornar erro. |
| D-16.1 | Tokens, azul, marca e sidebar existentes; efeitos reduzidos. | E-03, E-06. | PASS | Sem mudança de identidade de marca. |
| D-16.2 | CSS compartilhado de cabeçalhos e ações, quebra de texto e hierarquia. | E-03 lista/detalhe/formulário. | PASS | Destruição conserva estilo danger e confirmação de domínio. |
| D-16.3 | PrismaDisclosure em cadastro, critérios de busca e diagnóstico. | E-03, E-05; inspeção de details/summary. | PASS | Detalhes permanecem disponíveis. |
| D-16.4 | Cores semânticas e rótulos; estado desconhecido neutro. | E-02, E-03, E-06. | PASS | Termos oficiais não convertidos em conclusões. |
| D-16.5 | Ant Design e componentes Prisma reutilizados. | E-01, E-06. | PASS | Sem segunda biblioteca. |
| D-16.6 | Layouts de lista, Central, formulário e filtros adaptados. | E-03. | PASS | Tabela de Posições usa rolagem horizontal local. |
| D-16.7 | PrismaPublicShell compartilhado por verificação e Meus dados. | E-03 links sintéticos indisponíveis; E-06. | PASS | Sessão participante válida não iniciada; conteúdo funcional preservado. |
| D-17.1 | Locale pt-BR, validações e textos compartilhados. | E-03, E-06. | PASS | Revisão limitada às superfícies desta base. |
| D-17.2 | Glossário de interface e navegação aplicados. | E-02, E-03, E-06. | PASS | Domínio distingue posição e necessidade internamente. |
| D-17.3 | Gerar link de convite, salvar/publicar e exclusão com efeitos explicitados. | E-02 contratos, E-06 handlers/textos. | PASS | Nenhum convite gerado/enviado para validar a redação. |
| D-17.4 | Estados com título, orientação e recuperação; diagnóstico recolhido. | E-03, E-06. | PASS | Erro legado identificado em L-01. |
| D-17.5 | Métricas ausentes não viram zero; zero observado preservado. | E-02; calibração, fontes e lista revisadas. | PASS | Sem alterar cálculos analíticos. |
| D-17.6 | Nomes humanos para estados de conhecimento e termos comuns. | E-02, E-06. | PASS | Sem backfill ou tradução de documentos. |
| D-18.1 | Critérios acessíveis incorporados ao owner e a este aceite. | E-03, E-05. | PASS | Inspeção dirigida, sem certificação integral. |
| D-18.2 | Foco, teclado, labels, skip links e anúncios compartilhados. | E-04, E-05. | PASS | Leitor de tela real não exercitado. |
| D-18.3 | Contraste dos tokens, controles alcançáveis e reflow reduzido. | E-02, E-03, E-05. | PASS | Não mede todas as combinações cromáticas históricas. |
| D-18.4 | Amostra de larguras celular/tablet/desktop e 320 px. | E-03. | PASS | Não representa as 127 superfícies da auditoria integral. |
| D-18.5 | Builds, testes, inspeção e limites explícitos. | E-01 a E-06. | PASS | Sem alegação de rollout ou certificação global. |

## Proibições verificadas

| ID | Guardrail / teste negativo | Evidência | Status |
| --- | --- | --- | --- |
| P-01 | Auth/RLS/grants/PII e regras de autorização preservados; contratos de acesso continuam negando casos inválidos. | E-02, E-06. | PASS |
| P-02 | Sem alteração de parser, matching semântico, IA, fontes, publicação ou decisões profissionais. | E-02 regressões de domínio; E-06 diff. | PASS |
| P-03 | Cache em memória com escopo/limpeza; sem armazenamento de registros, respostas ou credenciais; URLs públicas não duplicadas no cache de rolagem/metadados iniciais. | E-02 testes negativos de contexto/storage; revisão de PrismaNavigation. | PASS |
| P-04 | Desconhecido permanece ausente, ID inválido não seleciona outro item; confirmação de saída não anuncia salvamento. | E-02, E-04. | PASS |
| P-05 | Ferramentas/evidências e rotas preservadas; nenhuma geometria/destaque M5 alterada. | E-02 regressões de revisão; E-06 diff. | PASS |
| P-06 | `.tmp.driveupload/` preservado; nenhuma mensagem externa, operação destrutiva, merge ou produção. | E-06 e escopo Git. | PASS |

## Fora de escopo preservado

| ID | Evidência no diff | Status |
| --- | --- | --- |
| F-01 | Fundação e integrações representativas; sem execução integral dos agrupadores 4–14. | PASS |
| F-02 | Sem migration, backfill, biblioteca, provedor novo, custo externo ou produção. | PASS |
| F-03 | Não há estudo com usuários nem certificação WCAG integral. | PASS |

## Limitações observadas

**L-01 — serviço legado de preparação de verificações.** A navegação Verificações → Preparar verificação chega a `/matching`, mas a chamada existente `load_m51a_verification_workspace` falha com a mensagem de competência exigida ausente. A implementação prévia dessa RPC inclui `ensure_m51a_demo_need` durante o carregamento, conforme migration `20260901124345_m51a_workspace_item_bank_summary_fix.sql`. Não foi alterada nem invocada novamente para tentar produzir registros. A tela agora apresenta indisponibilidade, retorno e diagnóstico sob demanda. Preparação operacional ponta a ponta permanece **BLOCKED nesse ambiente**; nenhum sucesso de domínio ou geração de convite é alegado. Corrigir essa dependência requer movimento de domínio separado (F-02).

**L-02 — alcance da inspeção.** Amostra local com sessão existente e dados sintéticos; não houve publicação de perfis, envio de formulários, geração de convites, exclusão, troca de permissões ou chamada paga de IA. O backend configurado não foi implantado/alterado. Testes de unidade/contrato complementam a inspeção; não substituem estudo de usabilidade ou certificação.

**L-03 — desempenho de distribuição.** O build segue emitindo aviso do chunk Ant Design de aproximadamente 1,27 MB minificado. Não foi incluído projeto de divisão de bundle nesta fundação.

**L-04 — consulta de referência.** O campo de referência pesquisa a Knowledge aprovada da empresa e a base global. Quando não há correspondência, o título da Posição aciona a resolução nas fontes oficiais catalogadas; isso não é uma pesquisa aberta na Web. Se o RPC de sugestão estiver indisponível, a tela informa o estado e oferece nova tentativa sem apagar o rascunho.

## Desvios do contrato

Nenhum desvio dos critérios da base compartilhada. O PASS de D-3.2 se refere à preservação e integração da navegação, conforme CA-3.2; L-01 impede afirmar que o fluxo de domínio esteja operacional ponta a ponta. Funcionalidades futuras dos grupos específicos não são tratadas como entregues.

## Mudanças autorizadas durante a execução

Nenhuma nova decisão material. Medidas, redação, disposição, foco e ajustes de componentes exercem A-01/A-02/A-04; documentação, testes, commit e push exercem A-03. A escolha Posições substitui a sugestão anterior de Vagas, conforme decisão expressa do PO.

## Validação final e Git / ambiente

Build TypeScript, typecheck web, build web e 99 testes dirigidos: PASS. `pnpm run generate:prisma-context` e `pnpm run check:prisma-context`: PASS (cinco fontes canônicas). `git diff --check`: PASS. Não executado `pnpm run validate`, pois a validação proporcional cobre as fronteiras afetadas.

Branch de entrega: `codex/ux-shared-foundation`, origin existente `git@github.com:brunoharita/HRT-Prisma.git`. O commit desta entrega contém este AoT; o hash e o resultado do push são registrados na resposta de fechamento. Implementação local, sem merge nem implantação hospedada/produção. Capturas e dados locais de teste não integram o commit.

## Conclusão

Padrões aprovados formalizados e base compartilhada implementada para orientar os próximos agrupadores. A busca de referências agora torna explícitas sua origem e evolução. Critérios da fundação atendidos com os limites L-01 a L-04 explicitados.
