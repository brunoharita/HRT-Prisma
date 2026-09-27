# AoT — triagem antes da IA

Contrato/execution homônimos v1.0.0. Baseline e mapa no acordo.

| Acordo | Implementação/evidência | Estado |
| --- | --- | --- |
| D-01/P-02 | Gate compartilhado frontend/Edge, antes do cache/provedor; testes de chamada A/B e rejeição C/fora/injeção de grupo | PASS |
| D-02 | C determinístico recolhido; fora filtrado; smoke local autenticado confirma João sem opção de IA, quatro fora ausentes | PASS |
| D-03/P-01 | Mesmo score/prompt, snapshot e decisões; regressão dirigida, notas Bruno/Diego 47 provisórias preservadas | PASS |
| D-04 | Baseline real lido sem alterações; release/smoke pendentes | PARTIAL |

Baseline confirmado: Bruno A, Diego B, João C, Beatriz/Júlia/Ivan/Vagner fora. Nenhuma chamada de IA na conferência. Material de outros trabalhos preservado: `.tmp.driveupload/`, `services/paddle/Dockerfile.gpu`, `tests/matchingRuntime (1).test.ts`.

## Validação local em 2026-09-27

175 testes Node dirigidos PASS: semanticTriage, semanticTrajectory, semanticTrajectoryReview, matchingRuntime, matchingScore, vacancyIntelligence e m62VerificationJourney. 27 testes Deno de handler/snapshot PASS, incluindo autorização, fontes divergentes e bloqueio antes de service/cache/provedor. Tipos raiz/web, build web, Deno lint, lint do repositório, geração/check de contexto e `git diff --check` PASS. Nenhuma suíte integral local executada.

Smoke autenticado em `127.0.0.1:5555`, mesma Posição e sete Perfis: progresso 0/2; Bruno/Diego em B final com 47/100 provisórios e cobertura 50%; C inicialmente recolhido (1), expansão mostra João, sem pendência nem ação de IA. Quatro fora não aparecem. Aviso de comparação incompleta permanece corretamente pela cobertura dos elegíveis; banners/redesign fora do escopo. Nenhuma confirmação humana ou dado de Perfil foi alterado.

Publicação e smoke de produção ainda pendentes. QA desta mudança: testes sintéticos locais e frontend local autenticado contra fontes existentes; não foi criado outro ambiente remoto.
