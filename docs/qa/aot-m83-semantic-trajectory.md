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

Primeiro runtime `8da013a6d57b26d358e34117ecffe6adcdb5bb3e` integrado em main e publicado. CI [36169263170](https://github.com/brunoharita/HRT-Prisma/actions/runs/36169263170) PASS; 174 testes Node direcionados + 24 Deno + 14 tooling no fechamento local. Migration remota `20260925174830_m83_semantic_trajectory` corresponde ao arquivo local `20260925150000_m83_semantic_trajectory.sql`. Edge `matching-trajectory` v1 ACTIVE, hash `009e0f26165b0eaa7ed2f0aab95dcb0bafb9138290c4443677433af4e124cdf0`; autenticação implementada por `auth.getUser`, smoke sem token retorna 401 `AUTH_REQUIRED`. RLS ativa, clientes sem SELECT de cache nem EXECUTE de commit, service role com EXECUTE. Nenhuma migration anterior reaplicada/reparada.

Web publicada somente em `prisma-web`, imagem `sha256:de63d82db1b8e5a00d9c10220d0223ae2ddc24dc75af5461d2494459c4790cd5`, estado running/zero reinícios; rollback preservado. O smoke imediato do script viu 404 durante a troca; verificação posterior confirmou HTTPS 200, mesmo SHA local/main/VPS, sem segundo rebuild. Parser e gateway não foram publicados.

Smoke autenticado real com prompt 1.1.0: sete Perfis consultados, três interpretações completas/contextuais, duas divergências, duas respostas inválidas. Bruno ficou indisponível; Diego indeterminado. A UI exibiu seção neutra e não atribuiu zero/prioridade. Limitação de qualidade detectada no smoke, não ocultada pelo PASS sintético. Diagnóstico separado de quatro chamadas, sem gravar nova opinião no cache ou resposta bruta: oscilação `Analista de sistema` entre análise e indeterminação; citação não literal em texto longo e diferença em declaração de áreas. Nenhuma Pessoa/Perfil/Posição/decisão humana foi alterada.

Correção em calibração: prompt 1.2.0 explicita flexões e declarações contextuais, exige cópia literal curta e mantém todos os bloqueios. Novo gate sintético inicial: 120/120 válidas/corretas, 130/130 itens, 0/60 divergências, 12/12 bases estáveis. Dataset longo suplementar: três bases com oito fontes cada, cinco variações, 30/30 leituras válidas/corretas, 240/240 itens, 0/15 divergências e 3/3 bases estáveis. Fontes sintéticas escritas separadamente, mas informadas pela rubrica e falhas observadas; não constituem holdout independente. Segundo rollout pendente neste registro. A migration aplicada permanece imutável; nova migration estende compatibilidade sem apagar cache 1.1.0. Corrigido gerador para normalizar CRLF antes da transpilação, garantindo reprodutibilidade após checkout Windows.

Calibração backend: 25 testes Deno + check/lint PASS; SQL comprova compatibilidade 1.1.0/1.2.0, recusa de versões desconhecidas e preservação de histórico; concorrência seis conexões/um lease, contenção `55P03` em 0,28–0,31s. DB sintético `m72_semantic_trajectory_race_20260925150307` preservado. Nenhuma alteração das proteções de citação literal, concordância por item ou cálculo determinístico.

Fechamento local da calibração: 177 testes Node direcionados, build/tipos web, lint e Context Pack PASS. O plano detectou uma dependência compartilhada ainda não roteada: `src/domain/semanticTrajectory.ts` é consumido pela web e pela Edge. Dispatcher 1.0.1 passa a incluir exatamente esses dois destinos, com regressão de roteamento, sem ampliar para Parser ou outros serviços. Mapa de impacto de release atualizado por essa evidência.

Branch `codex/m83-semantic-trajectory`. Untracked anteriores `.tmp.driveupload/` e `services/paddle/Dockerfile.gpu` preservados. Surgiu cópia não criada pelo agente `tests/matchingRuntime (1).test.ts`, mantida fora do commit enquanto sua origem é desconhecida. Conclusão final pendente: não declarar sucesso da comparação Bruno/Diego apenas pelo deploy.
