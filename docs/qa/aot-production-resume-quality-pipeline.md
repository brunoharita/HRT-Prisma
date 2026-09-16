# AoT — Qualidade da importação de currículos em produção

Contrato de referência: `docs/qa/agreement-production-resume-quality-pipeline.md` 1.0.0.

## Matriz de Acordos

| ID | Acordo | Implementação | Teste | Evidência | Status | Ambiente / limitação |
| --- | --- | --- | --- | --- | --- | --- |
| D-01 | PDF.js e estruturação inicial | `validateAndProcessPdf` mantém extração/estruturação antes do gate e das etapas externas | person-flow e `documentIntelligence.test.ts` | 229 testes do person-flow; build web aprovado | PASS | Determinístico, sem provider vivo |
| D-02 | Verificação semântica explicável | `resumeSemanticQuality.ts` 1.0.0 e motivo no trace | `resumeSemanticQuality.test.ts` | Caso de cinco páginas sem experiências força rota estrutural | PASS | Não julga candidato nem inventa experiência |
| D-03 | Paddle condicional | Gate visual/textual existente mais gate semântico; modo enabled não é mais desligado pelo Parser IA | domínio, provider e teste autenticado de Ivan | Paddle executou em CPU, mas navegador cancelou após 240 s; gateway registrou 504; worker terminou posteriormente com HTTP 200 | FAIL | Saída Paddle não chegou à importação testada |
| D-04 | Parser IA após etapa documental | Cliente autenticado, capacidade isolada e HTTP nativo preservando Host | 31 testes de gateway/parser e reteste autenticado | Com `9d4375b`, worker retornou 200 em 34.053 ms; ledger confirmou tentativa 7 e resultado partial; tela chegou à identificação | PARTIAL | IA comprovada com leitura preservada; persistência do rascunho após confirmação de identidade e fluxo completo com Paddle ainda não comprovados |
| D-05 | Sequência e falha explícita | Página não força mais baseline e mantém CTA consciente de leitura local | person-flow, recuperação M5.7 | 229 + 33 testes direcionados aprovados | PASS | Falha do worker ainda exige decisão explícita do operador |
| D-06 | Transporte autenticado e mínimo | Gateway 1.1.0 valida origem, sessão, operador, papel, organização, contrato, PDF e hash; remove credenciais | `paddleGateway.test.mjs` e smoke público | 13 testes do gateway; origem indevida 403; sem sessão 401; portas VPS somente 127.0.0.1 | PASS | Sem conteúdo pessoal no smoke/logs |
| D-07 | Revisão humana preservada | Persistência continua usando o draft/evidência e fluxo de revisão existente | person-flow | publicação/revisão e proibições cobertas na suíte dirigida | PASS | Nenhum Perfil publicado nesta execução |
| D-08 | Limites, orçamento e sem retry | Worker loopback mantém 15 MB, 30 páginas, timeout, lock, cache, ledger US$2 e sem retry | `parserIaService.test.mjs` e gateway | budget, concorrência, timeout, corrupção, cache e resposta limitada aprovados | PASS | Ledger observado: 6 tentativas e US$0,64 contabilizados antes do rollout |
| D-09 | Observabilidade aditiva | Migration `20260916203000_production_resume_quality_observability` | teste SQL e verificação conectada | migration aplicada; RLS ativo, 2 policies e 5 colunas estruturais presentes | PASS | Advisors não indicaram falha nova nesta tabela |

## Proibições verificadas

| ID | Guardrail | Teste negativo | Evidência | Status |
| --- | --- | --- | --- | --- |
| P-01 a P-07 | Sem falso positivo por caracteres, exclusão mútua, segredo no bundle, organização confiada ao cliente, fato sem referência, publicação ou retry automático | gates negativos de domínio, gateway, parser e person-flow | 262 testes dirigidos aprovados; bundle sem segredo server-side; smoke 401/403 | PASS |

## Fora de escopo preservado

| ID | Evidência no diff | Status |
| --- | --- | --- |
| F-01 a F-04 | Diff não redesenha revisão, não troca fornecedor/modelo, não reprocessa histórico e mantém dependência do PC/túnel | PASS |

## Desvios do contrato

O teste autenticado contradisse a expectativa de fluxo completo: timeout documental perdeu a saída Paddle e o bloqueio global impediu a IA. Após o cooldown, apareceu uma segunda falha 502. D-03 e D-04 estão `FAIL`; a declaração anterior de ausência de desvios não se sustenta. Os PASS das demais linhas são provas dirigidas locais e não significam sucesso ponta a ponta.

## Reteste autenticado — 2026-09-16

- Operador selecionou o PDF de Ivan no navegador interno; o agente acionou Importar currículo. Nenhum conteúdo do currículo, segredo ou identificador de sessão foi registrado neste relatório.
- Gateway às 19:32:30 UTC: structure 504, 239.964 ms; às 19:32:31 UTC: parser 429, 620 ms.
- Paddle local teve atividade de CPU e respondeu 200 depois do timeout do navegador. Isso prova execução, não aproveitamento da saída nem sua qualidade.
- Repetição manual com leitura preservada às 19:36:27 UTC: parser 429, 827 ms. Após expirar o cooldown, às 19:37:59 UTC: parser 502, 538 ms.
- Ledger permaneceu em 6 tentativas, última de 2026-09-13, aproximadamente US$0,6402342 contabilizados. A chave está configurada e o processo escuta em loopback 8787; isso não prova a execução remota nem explica o 502.
- Correção local: capacidades separadas de Paddle e Parser IA, mantendo ambas as rotas Paddle serializadas, cooldown por serviço, autorização, orçamento e ausência de retry automático. Não há alteração de contrato persistido nem de payload; versões de transporte mantidas por ser correção interna.
- Regressão: 15 testes do gateway aprovados, incluindo timeout sem bloqueio cruzado, serialização das duas rotas Paddle, cancelamento, tenant, sessão, origem e contrato. Correção ainda não implantada em produção.
- Nenhum perfil publicado e nenhuma continuação pela opção de leitura local acionada. Tela e arquivo selecionado preservados.
- Pendências: concluir diagnóstico do 502, ajustar tratamento/duração da etapa Paddle com evidência, implantar correção autorizada e repetir o fluxo completo. Não foi demonstrado que o Parser IA aproveita a saída canônica Paddle; o adaptador atual relê o PDF original para suas próprias linhas-fonte.

## Mudanças autorizadas durante a execução

Autorização original registrada no contrato 1.0.0. Durante a execução, nenhuma ampliação adicional foi feita. A tag da imagem web foi mantida em `1.6.4`, pois correções não criam uma entrega de produto no registry.

## Validação final

- `pnpm run lint`: PASS, 511 arquivos.
- `pnpm run check:foundation`: PASS, 18 tabelas públicas e 6 versões de processamento.
- `pnpm run typecheck:web`: PASS.
- `pnpm run build:web`: PASS, 3.240 módulos.
- `pnpm run test:person-flow`: PASS, 229 testes.
- Testes específicos finais: PASS, 33 testes.
- `git diff --check`: PASS antes do commit inicial.
- Validação integral `pnpm run validate`: não executada; não foi autorizada e a regressão dirigida cobre o risco alterado.

## Git / QA / ambiente

- Branch: `codex/production-resume-quality-pipeline`.
- Implementação: `ee90d43e334901351a5dca948e32a06b5715e612`; alinhamento de tag: `b36287dc12f2e17c1827c18014fcd5a3dab1aa9d`.
- Supabase único `ioldpnqqvobprjiontre`: migration aplicada com sucesso; RLS/policies verificados.
- VPS: `prisma-web:1.6.4` e `prisma-paddle-gateway:1.1.0` ativos; imagem anterior preservada como `prisma-web:rollback-55733a0-resume-pipeline` e gateway anterior como `prisma-paddle-gateway:rollback-55733a0`.
- PC: Paddle 8080/8081 e Parser IA 8787 em loopback; túnel reverso expõe somente VPS loopback 18080/18081/18787.
- Smoke: site 200, Paddle 200/200, worker Parser alcançável, parser público 401 sem sessão e 403 com origem indevida.
- Smoke autenticado: executado com o arquivo selecionado pelo operador; falhou conforme reteste acima.

## Conclusão

Atualização autorizada pelo PO: `7aa8c53` implantado no gateway e worker reiniciado com telemetria mínima. Reteste comprovou `403 PARSER_LOCAL_ONLY`, origem do 502; teste de integração HTTP revelou que o fetch não preservava Host. Correção por HTTP nativo preserva o contrato de loopback, redirects bloqueados e AbortSignal; 31 testes aprovados, incluindo sanitização dos logs. Não altera payload/modelo/prompt e não exige nova versão persistida. A pendência do timeout Paddle continua; resultado do próximo reteste será registrado após o rollout.

Resultado final deste rollout: `9d4375b` implantado, serviço de IA reiniciado e reteste autenticado aprovado na etapa de interpretação. Worker 200/PARSER_OK, 34.053 ms; gateway 200, 35.013 ms. Ledger aumentou de 6 para 7 tentativas, custo US$0,0120815, resultado partial: 56 fatos aceitos, 9 experiências, 2 formações. A tela aguarda confirmação de identidade; nenhuma Pessoa criada ou Perfil publicado pelo agente. Smoke sem sessão 401, 31 testes dirigidos, lint e Context Pack aprovados. Imagem anterior preservada como `prisma-paddle-gateway:rollback-before-7aa8c53`; banco e frontend não alterados neste rollout.

Movimento geral permanece incompleto: D-03 FAIL por timeout Paddle e D-04 PARTIAL pela ausência de prova ponta a ponta até rascunho persistido. O reteste usou leitura preservada após o timeout, não uma nova execução Paddle. A utilização da saída canônica Paddle pelo Parser IA ainda requer validação/correção. Não declarar o fluxo completo corrigido.
