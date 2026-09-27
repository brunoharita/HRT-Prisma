# AoT — triagem antes da IA

Contrato/execution homônimos v1.0.0. Baseline e mapa no acordo.

| Acordo | Implementação/evidência | Estado |
| --- | --- | --- |
| D-01/P-02 | Gate compartilhado frontend/Edge, antes do cache/provedor; testes de chamada A/B e rejeição C/fora/injeção de grupo | PASS |
| D-02 | C determinístico recolhido; fora filtrado; smoke local autenticado confirma João sem opção de IA, quatro fora ausentes | PASS |
| D-03/P-01 | Mesmo score/prompt, snapshot e decisões; regressão dirigida, notas Bruno/Diego 47 provisórias preservadas | PASS |
| D-04 | Baseline real, CI, main, Edge v3, web e smoke autenticado confirmados | PASS |

Baseline confirmado: Bruno A, Diego B, João C, Beatriz/Júlia/Ivan/Vagner fora. Nenhuma chamada de IA na conferência. Material de outros trabalhos preservado: `.tmp.driveupload/`, `services/paddle/Dockerfile.gpu`, `tests/matchingRuntime (1).test.ts`.

## Validação local em 2026-09-27

175 testes Node dirigidos PASS: semanticTriage, semanticTrajectory, semanticTrajectoryReview, matchingRuntime, matchingScore, vacancyIntelligence e m62VerificationJourney. 27 testes Deno de handler/snapshot PASS, incluindo autorização, fontes divergentes e bloqueio antes de service/cache/provedor. Tipos raiz/web, build web, Deno lint, lint do repositório, geração/check de contexto e `git diff --check` PASS. Nenhuma suíte integral local executada.

Smoke autenticado em `127.0.0.1:5555`, mesma Posição e sete Perfis: progresso 0/2; Bruno/Diego em B final com 47/100 provisórios e cobertura 50%; C inicialmente recolhido (1), expansão mostra João, sem pendência nem ação de IA. Quatro fora não aparecem. Aviso de comparação incompleta permanece corretamente pela cobertura dos elegíveis; banners/redesign fora do escopo. Nenhuma confirmação humana ou dado de Perfil foi alterado.

QA desta mudança: testes sintéticos locais e frontend local autenticado contra fontes existentes; não foi criado outro ambiente remoto.

## Produção e preservação

Runtime `a5ddd5a2ac9547d6aab6a11aaf8df04726dc48ed`, integrado em main e origin/main pelo dispatcher 1.0.1. CI [36317071235](https://github.com/brunoharita/HRT-Prisma/actions/runs/36317071235) PASS. Plano: somente Edge `matching-trajectory` e `prisma-web`, sem migration. Edge v3 ACTIVE, hash `8edd21c7de87b5c591edee8b15897325e1326a7c596c06092ffcbeb2170467ce`; autenticação própria preservada, POST sem sessão retorna 401 `AUTH_REQUIRED`. Web/VPS no mesmo SHA funcional, imagem `sha256:eab8be92fd71577d4df16c3ebd0645cacc91c1d41fbb04bf6e14173e6c0017ab`, running, zero reinícios, HTTPS 200. Rollback web `prisma-web:rollback-before-a5ddd5a2ac95`; revisão Edge anterior v2 e seu código em `cf8e204` preservados.

Smoke autenticado no navegador interno em 27/09: lista de backend somente Bruno/Diego e C recolhido (João); quatro fora ausentes, sem seção de pendências indevidas; C expandido oferece consulta de sinais, não IA. Comparação dos dois elegíveis abre com 47/100 provisórios, cobertura 50% e os mesmos 11 requisitos sem evidência suficiente. Captura visual da lista e leitura DOM/AX da comparação registradas na tarefa, sem publicação de currículos em arquivos de teste. Consulta posterior confirmou os mesmos IDs de análise de 25/09, completos e uma tentativa cada. Agregados históricos preservados: prompt 1.1 com 7 registros; prompt 1.2 com 7 (4 completos, 3 indeterminados), uma tentativa por registro. Essas três pendências históricas não contaminam a nova descoberta.

Limites: piloto backend mantido; triagem legada não foi reescrita nem validada universalmente por esta entrega. Pesos/prompt/modelo, requisitos, decisões humanas e dados reais não alterados. O aviso de comparação incompleta permanece pela cobertura insuficiente de A/B. Sem nova avaliação paga necessária, pois a semântica não mudou. Desvios do acordo: nenhum. Fechamento documental posterior não exige nova publicação de runtime/Edge.
