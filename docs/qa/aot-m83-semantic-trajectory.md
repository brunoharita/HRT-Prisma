# AoT — M8.3 Interpretação da trajetória

Contrato: `docs/qa/agreement-m83-semantic-trajectory.md` v1.0.0; execução homônima; ADR-073. Baseline main `967209240a6eab0acd6bf154f93d2b3dd7ba7165`.

## Matriz de Acordos

| ID | Implementação prevista | Teste/evidência | Status |
| --- | --- | --- | --- |
| D-01/D-02 | Classificações fechadas + regras em semanticMatching; requisitos intactos | Testes direcionados de domínio/regressão, incluindo revisão independente | PASS |
| D-03 | Cache/lease/versões M83 | SQL e Edge negativos/replay; seis conexões concorrentes, uma linha/um lease | PASS |
| D-04 | Busca, comparação, drawer, pendências neutras | Build/tipos; smoke autenticado local desktop/mobile em estado degradado; sucesso/reabertura ainda pendentes | PARTIAL |
| D-05 | Piloto backend, método legado fora | Prompt 1.1.0: 12 bases, 60 variantes, 120 leituras frescas válidas e corretas, nenhuma divergência | PASS |
| D-06 | Autorização, minimização, validação de evidências | Negativos SQL/Edge/contexto e revisão independente | PASS |
| D-07 | Política financeira provider-authoritative | Revisão, testes de concorrência/timeout/replay; nenhum teto monetário no código | PASS |
| D-08 | Main, banco, Edge, web e smoke | Dispatcher e evidência operacional | NOT TESTED |

## Proibições verificadas

| ID | Guardrail | Evidência | Status |
| --- | --- | --- | --- |
| P-01 | Sem nota livre, uso de atributos sensíveis, mutação de fatos ou contratação | Domínio/contexto/prompt, SQL/Edge e revisão independente | PASS |
| P-02 | Sem equivalência de ferramenta inventada, recência ou replay incompatível | Domínio: requisitos preservados, histórico válido, metadados incompatíveis recusados | PASS |
| P-03 | Tenant e fonte no backend; logs sanitizados | Negativos SQL/Edge, snapshot forjado recusado, cache revogado não envenena outro ator | PASS |

## Mapa de impacto e preservação

Mapa inicial integral no acordo. Áreas diretas: matching, busca/comparação, cache e release. Auth/RLS/PII são transversais críticas. Knowledge e M6.2 são indiretamente afetados. Parser e publicação de Perfil não mudam: reutilização da política financeira não altera o serviço Parser. Nenhuma área protegida pode receber PASS sem sua evidência proporcional.

Novidade: interpretação derivada versionada. Preservação: requisitos 35/15 e pesos provados no domínio; fatos, decisões humanas, tenant, M6.2 e histórico dependem também do gate SQL/Edge. Baseline de produção citado no acordo é histórico, não alvo artificial de ranking. Nenhuma referência visual normativa foi fornecida para esta melhoria; preservar componentes e jornada existentes.

Extensão identificada na revisão: o snapshot semântico deve ser recalculado no backend e não aceitar score do cliente. `match_evaluations` e M6.2 passam a ser relações diretas. Motor de domínio e decoder puro da aplicação são gerados para a Edge, com teste de igualdade à fonte no CI. Sem SDK/browser no bundle gerado. A transação de commit revalida fontes; não contém chamada de IA. A leitura de fontes inclui Knowledge/evidências existentes, sem criar curadoria ou segunda base de fatos. Regressão proporcional: falsificação de snapshot, requisito exato, fonte alterada, decisão humana, revogação, replay e compatibilidade M6.2.

Revisão final de preservação: as projeções web e backend de Knowledge precisam concordar. A consulta compartilhada de Perfis passa a exigir conceito aprovado no escopo global/empresa, mantendo a observação original e marcando resolução indisponível como `unresolved`; nenhuma linha é alterada. Rótulos de requisitos também usam somente conceitos aprovados, sem apagar o vínculo persistido na definição. Ordenações de requisitos, observações, sinais e Evidências Demonstradas ganham desempate por ID para reprodutibilidade. Descoberta de Perfis é `plausible_indirect`, com regressão do contrato de leitura. O backend devolve o fingerprint da avaliação confirmada e a tela não habilita M6.2 se divergir da análise exibida. Bloqueios SQL do snapshot são sem espera; contenção não aguarda curadoria nem altera fontes.

## Fora de escopo

F-01: aprendizado, nota manual, alteração de pesos e validação universal não implementados.

## Validação, ambiente e limitações

Local sintético é QA; único Supabase remoto existente é produção. Cache estável e concordância do modelo não demonstram justiça universal; corpus do piloto não é holdout independente. Dados escassos podem produzir empate entre Bruno e Diego. Não há obrigação de produzir vencedor. Minimização de texto livre não garante anonimização completa; contexto sensível ambíguo gera abstenção.

### Evidência local até o gate de publicação

- `pnpm run build`, `pnpm run typecheck:web`, `pnpm run build:web`: PASS. Avisos preexistentes de tamanho de chunk/importação dinâmica, sem mudança de dependências.
- Sete arquivos Node direcionados: `semanticTrajectory`, `semanticTrajectoryReview`, `matchingRuntime`, `matchingScore`, `vacancyIntelligence`, `m62VerificationJourney`, `productRelease`: 164 testes PASS antes dos testes adicionais de consistência final. Não foi executado `pnpm validate` local integral.
- Revisão independente cobriu negação junto a atributo sensível, nomes de duas letras, limites Unicode sem corromper termos técnicos, identidade canônica da evidência e ausência de corroboracão artificial. Correções de geração de tela impedem respostas antigas de reabrir drawer; processamento tem polling limitado e cancelamento.
- Navegador autenticado local `127.0.0.1:5555`: sete Perfis em seção neutra alfabética com Edge ainda ausente; detalhe de Diego abre sem snapshot falso; comparação Bruno/Diego preserva requisitos e não recomenda prioridade. Desktop e viewport 390 × 844 inspecionados, sem transbordamento horizontal; viewport restaurada. Nenhuma alteração de Perfil, Posição ou decisão humana.
- Piloto real com `gpt-5.6-luna`, fontes exclusivamente sintéticas e `store:false`: prompt 1.0.0 FAIL (119/120 válidas, 105/120 leituras corretas, 4 divergências/59 pares válidos). Esclarecimento da rubrica existente no prompt 1.1.0, sem mudar rótulos esperados: PASS 120/120 válidas/corretas, 130/130 itens corretos, 0/60 divergências, 12/12 bases estáveis nas cinco variantes. Seis chamadas diagnósticas intermediárias. Não confundir este corpus de desenvolvimento com validação universal/holdout.
- Backend final: Deno check/lint e 24 testes PASS (handler/snapshot/decoder). `scripts/test-m83-postgres.ps1` PASS com transação encerrada em ROLLBACK: isolamento, spoofing, revogação, fontes alteradas/expiradas, M6.2 com requisito exato e rejeição de outro requisito, versões legadas 4/5 preservadas. `scripts/test-m83-concurrency.ps1` PASS: seis conexões independentes, um lease/uma linha; quatro contenções recusadas em 0,25–0,82s. DB sintético `m72_semantic_trajectory_race_20260925144054` preservado para inspeção, sem reset/drop. Revisão independente reproduziu deadlock com bloqueios antigos; versão final `NOWAIT`/try-advisory recusa contenção com `55P03` recuperável.
- Revisão final adicionou dez testes de fingerprint/Knowledge (21 testes próprios PASS), incluindo evidência nova com mesmos IDs, mesma nota com fonte diferente, ordem de arrays e conceito desativado. FNV32 do score é detector de coerência da tela, não proteção criptográfica; autoridade e fingerprint transacional SHA-256 ficam no backend.
- Preflight remoto somente leitura: nova tabela/migration ainda ausentes, `m72_require_profile_reader` presente e baseline M6.2 compatível. `origin/main` continua `9672092`. Publicação ainda pendente nesta revisão documental.

## Git / produção / conclusão

Branch `codex/m83-semantic-trajectory`. Sem publicação até concluir os gates. Não usar db push geral nem repair do ledger histórico. Untracked anteriores `.tmp.driveupload/` e `services/paddle/Dockerfile.gpu` preservados. Conclusão pendente, não declarar entregue.
