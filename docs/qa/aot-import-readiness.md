# AoT — disponibilidade antecipada da importação

Contrato: `docs/qa/agreement-import-readiness.md` 1.0.0; execução: `docs/qa/execution-import-readiness.md`. Baseline `eb561b4ea128f749eac4a34b241b4d7c4b876335`; branch `codex/import-readiness`; risco D.

## Matriz de Acordos

| ID | Implementação | Teste/evidência | Status | Ambiente/limitação |
| --- | --- | --- | --- | --- |
| D-01 | rota gateway e worker read-only | HTTP integrado e resposta autenticada real `200 available/ready` | PASS | local e produção |
| D-02 | Alert acessível, cinco estados, horário e botão | render desktop 1276 px e simulação isolada na aba | PASS | tela real autenticada |
| D-03 | checagem anterior a PDF.js; seleção mantida | PDF sintético selecionado; unavailable/busy bloqueiam; unknown permite tentativa; clique renova check e interrompe antes de PDF.js | PASS | seleção sem envio à IA; remoção de seleção durante check também cancela início |
| D-04 | limites/timeout, autorização existente, sem lock da checagem | HTTP negativos, ocupação, falha sem cooldown | PASS | local |
| D-05 | TTL, escopo por empresa, abort/sequence na desmontagem; parse preservado | domínio/68 testes direcionados incluindo regressão | PASS | local |
| D-06 | worker → gateway → web, main e produção | rollout funcional `e6a9909`, CI e smoke autenticado PASS | PASS | remoto; complemento de seleção acompanha fechamento |

## Proibições verificadas

| ID | Guardrail | Evidência | Status |
| --- | --- | --- | --- |
| P-01 | sem documento/segredo/IA/escrita na checagem | spies de fetch; diretório vazio após consulta; respostas sanitizadas | PASS |
| P-02 | autorização/tenant, lock, parse preservados | negativos e regressão de gateway/worker/parse | PASS |
| P-03 | desconhecido nunca disponível; causa não inventada | schema estrito, worker antigo, timeout, conectividade | PASS |

## Mapa de Impacto e Preservação

Mapa inicial no acordo, sem ampliação de domínio. Importação/gateway/worker `direct`; auth/tenant `critical_transversal`; Paddle/outras entradas de parse e web/assets `plausible_indirect`; dados/matching/Knowledge `no_impact_identified`. Consulta anterior ao intake, sem banco ou payload pessoal. Regressores: `paddleGateway`, `parserIaService`, `parserIaRecovery`, `parserIa`, `parserReadiness`. Baseline operacional atual sem listener 8787 local e sem listener 18787 VPS; não é correlação retrospectiva com horário da captura.

### Novidade e preservação

- Nova disponibilidade comprovada nos testes HTTP/domínio e tela autenticada em produção.
- Parse, recuperação, bloqueio de concorrência, negativas de permissão e Paddle compartilhado passaram nos 68 testes.
- Build TS, typecheck web, build web e lint passaram. Avisos existentes de bundle grande/import dinâmico e update-check do pnpm sem rede não invalidaram comandos.
- Sem suíte integral; seleção proporcional por mapa, não `pnpm run validate`.

## Fora de escopo e fidelidade

F-01/F-02 preservados: sem monitor externo, canal, painel, OCR, modelo/prompt, banco, taxonomia ou dados humanos. Captura é evidência de incidente, não mockup normativo. Estrutura da tela mantida com aviso compacto junto ao botão.

## Desvios e mudanças autorizadas

Nenhum desvio identificado. Usuário autorizou main/produção. Login concluído com credenciais já preenchidas, clicando em Entrar conforme orientação do PO. Simulações de indisponível/ocupado/inconclusivo ficaram somente na aba do agente; interceptação removida e conexão real restaurada ao final. Nenhum PDF foi enviado à IA, intake iniciado ou Perfil publicado.

## Git / QA / ambiente

QA local sintético. Produção única. Arquivos alheios `.tmp.driveupload/`, `services/paddle/Dockerfile.gpu` e `models/` remoto preservados. Rollback: imagens anteriores de gateway/web e revisão anterior do worker; contratos aditivos permitem clientes antigos. Parser e túnel continuam dependentes do PC.

## Evidência operacional de 2026-09-25

- CI GitHub `36138317941` PASS para `e6a990941da765fa849ab14ac605350374b0b312`; main local/remota e VPS promovidas. O CI existente executou seus gates integrais automaticamente; não houve suíte integral local adicional.
- Worker local reiniciado em loopback, PID 8352 nesta sessão; túnel existente restabelecido no loopback VPS 18787, PID SSH 16500. GET anônimo não liberado; readiness local/pelo túnel retornou `200 available/ready`, sem chamada paga.
- Gateway `sha256:d061cea3ae0a785f5cc0879704e1918666d22aa51236ec4ff7384b1387d2cf99`, web inicial `sha256:c295547f29a4694329d16e87736f265ae0bdd0a9369f9e38b67a9f740919ea42`; ambos running, zero restart. Rollbacks `prisma-paddle-gateway:rollback-before-e6a990941da7` e `prisma-web:rollback-before-e6a990941da7` preservados.
- Primeiro curl imediatamente após recriação retornou 404 transitório; checagem posterior confirmou `/profiles/import` 200, containers estáveis, rota anônima recusada com `session_required`. Não houve novo rebuild por esse retorno transitório.
- Navegador autenticado mostrou `Serviço de importação disponível`; resposta real sanitizada contém versão, state, reason e checkedAt. Estados checking/available/busy/unavailable/unknown inspecionados. Seleção sintética mantida durante falhas; botão bloqueado antes do envio e liberado sob incerteza consultiva. Ao clicar com último estado available e nova resposta unavailable, permaneceu na etapa Upload, sem inferência.
- Refinamento de preservação: troca/remoção do arquivo durante o await da checagem invalida aquela tentativa; não processar uma seleção anterior. Inspeção móvel a 390 px revelou compressão do texto pelo botão; ajuste scoped posiciona a ação abaixo do texto até 600 px. Nova inspeção após rollout do complemento.
- Bloqueio Git incidental: ref local inválida `.git/refs/remotes/origin/main (1)` apontava objeto ausente e impedia fetch. Conteúdo preservado em `.git/quarantine-import-readiness/origin-main-duplicate.ref`; nenhuma exclusão de commit/ref remota. main legítima conferida contra GitHub antes de retomar fast-forward.
- Dispatcher reconheceu web/hosting/infrastructure/tooling/docs, sem banco/funções. Seu texto de publicação automatiza somente web; worker/gateway foram publicados explicitamente conforme mapa e execução. Testes locais substituíram recomendação genérica `pnpm run test` por regressão direcionada.

## Limites

Não houve nova importação paga ponta a ponta nem validação financeira da OpenAI. Disponibilidade é um retrato do transporte/configuração, não garantia do processamento seguinte. Dependência do PC/túnel e monitor externo permanecem fora de escopo.
