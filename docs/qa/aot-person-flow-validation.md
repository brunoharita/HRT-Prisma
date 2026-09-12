# AoT: validação reproduzível do fluxo da Pessoa

Contrato: [agreement-person-flow-validation.md](agreement-person-flow-validation.md), versão 1.0.0. Execução autorizada por Bruno em 2026-09-11. Classe C: tooling compartilhado e integração entre verificações existentes, sem nova arquitetura de produto ou framework.

## Matriz de Acordos

| ID | Implementação | Teste / evidência | Status | Ambiente / limite |
| --- | --- | --- | --- | --- |
| D-01 | Manifesto em `scripts/test-suites.mjs`, seleção no runner existente | 30 arquivos focados; seleção padrão mantém 44 fontes; testes de argumentos, ausências, órfãos e sentinelas de segurança | PASS | Seleção explícita, não análise automática de impacto |
| D-02 | `pnpm run validate:person-flow` e comandos focados | Build base 5,622 s; typecheck web 18,013 s; build web 2,174 s; fase de testes 3,112 s, todos exit 0 | PASS | Processo local sem serviços externos |
| D-03 | Fábricas sintéticas e PF-01..PF-06 | Seis cenários passaram em funções reais de extração, identidade, Delta, estados e apresentação; instâncias independentes | PASS | Publicação SQL não é implementada em mock nem comprovada |
| D-04 | Relatório metadata-only único e plano interrompido em falha | Nove testes de tooling, incluindo subprocessos reais de sucesso/falha; primeira execução FAIL preservada e segunda PASS | PASS | Tempo local inicial, não medição de ganho |
| D-05 | Runbook, comandos README, plano de testes e Context Pack | Documentação/validação aprovadas; push de `fa50b40` confirmado em 2026-09-12 após autorização explícita | PASS | Branch remota confirmada, sem merge ou deploy |

## Proibições verificadas

| ID | Prova | Status |
| --- | --- | --- |
| P-01 | Diff em `src`, `web`, `supabase` e lockfile vazio; nenhum contrato persistido alterado | PASS |
| P-02 | Somente testes locais, nenhuma chamada de QA/LLM; relatórios registram limites explícitos | PASS |
| P-03 | Testes anteriores preservados, seleção integral disponível; `pnpm run validate` não executado | PASS |
| P-04 | `.tmp.driveupload/` preservado/excluído do commit; relatório contém apenas metadados; temporários de provas criados e removidos pelos próprios testes | PASS |

## Fora de escopo preservado

F-01: nenhum ambiente remoto, container, teste visual ou dado real foi acionado. F-02: nenhuma medição entre modelos ou automação recorrente foi criada. Ambos PASS quanto à preservação do escopo, não quanto à validação dessas superfícies.

## Medição inicial

- Execução aprovada: início `2026-09-11T20:16:10.018Z`, fim `2026-09-11T20:16:39.197Z`; total **29.179 ms** (29,179 segundos).
- Node v24.16.0, Windows; 30 arquivos, 226 testes PASS, zero falhas/cancelados/skips no resultado agregado. Compilação e typecheck continuam usando os tsconfigs existentes, não são reduzidos artificialmente.
- Relatório local: `tmp/validation/person-flow/2026-09-11T20-16-10-018Z-e864a025-1ef5-403a-bf20-380efc668ce5.json`.
- Baseline Git no momento: `e8fb794f04faff41b240210dd497804e74eb8a5d`, dirty=true; inclui a implementação em revisão e o material preexistente não rastreado. Hash dos inputs de validação: `0e254dcf6d92dced2fe568b04f5a98540626b55b5b7b0abca0d80544805da06d`. Escopo do hash no runbook; não identifica sozinho todo o runtime.
- Primeira execução: 31.647 ms, 225/226 testes PASS, uma falha no novo teste de subprocessos. Relatório `tmp/validation/person-flow/2026-09-11T20-14-35-159Z-2c773dff-362a-4e7b-ac99-39c7a7e170d4.json` preservado.

Os valores das duas tentativas não medem economia: houve correção entre elas e efeitos de cache. Não foi executada a suíte integral para fabricar uma comparação de cobertura desigual. O runbook orienta registrar, em entregas posteriores, tentativas, retrabalho, intervenções e tempo por etapa no AoT existente.

## Falha encontrada e corrigida

O Node herda `NODE_TEST_CONTEXT` em subprocessos de testes e, no modo process, pode pular a execução recursiva e sair com código 0. O novo teste que injeta uma falha real detectou isso. A fonte embutida do Node instalado confirmou o comportamento; o runner agora remove somente esse marcador da cópia do ambiente do filho, sem alterar o ambiente global. A repetição executou de fato a falha sintética e confirmou seu código 1. Mensagens de falha intencional dentro dessas provas são esperadas; o agregado final precisa permanecer aprovado.

## Validação final

- `pnpm run test:tooling`: prova inicial do executor; os nove testes finais também executados no pacote completo.
- `pnpm run build` e seis PF isolados: PASS durante a implementação.
- `pnpm run validate:person-flow`: segunda execução PASS, 226 testes e quatro fases aprovadas.
- `pnpm run lint`: PASS (417 arquivos); geração/check do Context Pack: PASS (cinco fontes canônicas); `git diff --check`: PASS.
- Não executados: gate integral, golden completo de matching, benchmark Paddle, SQL/RLS conectado, browser autenticado e produção. Não foram alteradas essas superfícies.
- Build web mantém aviso de chunk maior que 900 kB; nenhuma otimização de bundle foi incluída para ocultá-lo.

## Git, limites e conclusão

Branch `codex/reproducible-person-flow-validation`, baseada em `e8fb794`. A revisão automática inicialmente bloqueou o push. Após Bruno autorizar explicitamente "fazer o push", em 2026-09-12 o commit `fa50b409037523db0d2bf6ccf9bdf35f9566ccc4` foi enviado para `git@github.com:brunoharita/HRT-Prisma.git` e confirmado com `git ls-remote --heads origin codex/reproducible-person-flow-validation`. O bloqueio anterior ficou resolvido para essa entrega; não houve merge ou deploy. Artefatos de compilação e relatórios ficam ignorados; `.tmp.driveupload/` não pertence à entrega.

Estrutura local entregue com evidência reproduzível e commit remoto confirmado; D-05 concluído em 2026-09-12. Não há alegação de E2E conectado, economia de tokens ou regressão zero fora da seleção. Nenhum desvio material de escopo identificado; a correção do executor era necessária ao aceite. Segurança do banco e fluxo visual continuam exigindo evidências próprias quando forem alterados.

## Delta autorizado: confirmação permanente de push

Em 2026-09-12, Bruno pediu retirar a necessidade de nova confirmação e autorizou push ao final das melhorias. O delta de instruções está em `AGENTS.md` 1.1.1: escopo de entrega já aprovado, validação proporcional, destino Prisma confirmado e preservação de trabalho alheio/segredos. O aceite é a regra explícita com esses limites, Context Pack atualizado e checks documentais; não representa alteração das configurações de segurança da plataforma nem autorização de merge/deploy. Nenhum requisito funcional de D-01..D-05 foi alterado.
