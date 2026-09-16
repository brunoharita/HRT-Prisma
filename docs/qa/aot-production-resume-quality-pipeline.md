# AoT — Qualidade da importação de currículos em produção

Contrato de referência: `docs/qa/agreement-production-resume-quality-pipeline.md` 1.0.0.

## Matriz de Acordos

| ID | Acordo | Implementação | Teste | Evidência | Status | Ambiente / limitação |
| --- | --- | --- | --- | --- | --- | --- |
| D-01 | PDF.js e estruturação inicial | `validateAndProcessPdf` mantém extração/estruturação antes do gate e das etapas externas | person-flow e `documentIntelligence.test.ts` | 229 testes do person-flow; build web aprovado | PASS | Determinístico, sem provider vivo |
| D-02 | Verificação semântica explicável | `resumeSemanticQuality.ts` 1.0.0 e motivo no trace | `resumeSemanticQuality.test.ts` | Caso de cinco páginas sem experiências força rota estrutural | PASS | Não julga candidato nem inventa experiência |
| D-03 | Paddle condicional | Gate visual/textual existente mais gate semântico; modo enabled não é mais desligado pelo Parser IA | domínio, provider e smoke dos workers | Paddle 8080/8081 respondeu 200; bundle publicado contém o fluxo | PASS | Importação real pós-fix aguardando repetição do operador |
| D-04 | Parser IA após etapa documental | `VITE_PARSER_IA_MODE=hosted`, cliente autenticado e rota fixa do gateway | parser, cliente por build e transporte | worker 8787 respondeu 422 ao payload sintético inválido; rota pública sem sessão 401; bundle contém `/parser-ia-hosted/parse` | PARTIAL | Navegador disponível estava deslogado; nenhuma chamada OpenAI ou importação real foi fabricada |
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

Nenhum desvio de implementação. A prova autenticada de importação real permanece pendente e, por isso, D-04 está `PARTIAL`.

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
- Smoke autenticado completo: não executado porque a sessão disponível estava deslogada; nenhum login ou currículo real foi forçado.

## Conclusão

Pipeline implementado e ativo em produção, com segurança, observabilidade e regressão local aprovadas. Movimento permanece `PARTIAL` somente até uma nova importação autenticada confirmar Paddle condicional e Parser IA no fluxo real.
