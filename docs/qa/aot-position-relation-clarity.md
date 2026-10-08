# AoT — Clareza da avaliação de relação com a Posição

Contrato `docs/qa/agreement-position-relation-clarity.md` v1.0.0, execução correspondente, autoridade explícita em08/10/2026. Baseline `3b0fcbafe5f0e18bc9050f86a826ca9e792309d9`, produto2.2.1. Evidência em `docs/qa/evidence/position-relation-clarity/`.

## Matriz de Acordos

| ID | Acordo / implementação | Teste / evidência | Status | Ambiente / limite |
| --- | --- | --- | --- | --- |
| D-01 | Título/pergunta dinâmica em CandidateMatchCard | browser-results.json; desktop/mobile/título longo | PASS | sintético |
| D-02 | Três ações com descrições visíveis e selos contextuais no card/comparação | browser-results.json; vacancyIntelligence/own-diff | PASS | sintético; comparação renderizada |
| D-03 | Orientação permanente abaixo das ações | renders e browser-results.json | PASS | sintético |
| D-UX-01 | Consultar/revisão/relação preservados e textos responsivos | before/after1537/390, limites768/320, review | PASS | sintético |
| D-04 | Handlers/gates/loading/erros/refresh/inclusão independente; web e versão2.2.1 | browser/43dirigidos+5tooling; CI/plano/smoke/rollback | PASS | sintético + rollout público |

## Proibições verificadas

| ID | Guardrail | Prova | Status |
| --- | --- | --- | --- |
| P-01 | Sem aprovação seletiva, confirmação de requisitos, regra global ou promessa de score | texto/handlers/diff/testes atuais | PASS |
| P-02/P-UX-01 | Sem mudanças de serviços/dados/IA/permissões e sem explicação apenas em tooltip | diff/plano/browser sem chamada externa | PASS |

## Mapa de Impacto e Preservação

| Área / capacidade | Relação | Baseline / regressão / evidência | Status |
| --- | --- | --- | --- |
| Card e selos da comparação | direct | baseline SHA; render/textos/estados/botões reais, comparação renderizada | PASS |
| CSS de ações compartilhado | plausible_indirect | apenas classes novas de relação; Consultar e review1537/768/390/320 | PASS |
| Decisão/proposta | direct | mocks dos métodos atuais, confirmed/dismissed, gates, loading/falha/retry | PASS |
| Inclusão Kanban/comparação | plausible_indirect | add RPC sintética separada/navegação/zero seleção implícita | PASS |
| Matching/requisitos/backend/tenant/IA | no_impact_identified | serviços/contratos intocados,43testes atuais/plano | PASS |
| Perfil/overview | no_impact_identified | novos seletores só no grupo de relação; tipos/build | PASS |
| Release/contexto | direct | registry2.2.1; contextos/CI/plano/smoke/rollback/sincronização | PASS |

Novidade: clareza textual e significado permanente das ações. Preservação: mesmas decisões e serviços. Selos repetidos identificados na comparação, com quebra de texto delimitada necessária: essa apresentação passa a direct; sem mudança funcional de comparação. Demais relações preservadas; sem jornada transversal crítica alterada. Baseline sintético usa mesmos dados/estado/viewport antes/depois; não comprova qualidade de matching ou persistência autenticada real.

## Fora de escopo preservado

F-01: sem redesign amplo, mudança de score/denominador, Kanban, curadoria, dados ou versão. PASS por diff dirigido; registry inalterado.

## Evidência de fidelidade visual

Screenshot anexado é contraexemplo de clareza; não há novo mockup normativo. Comparação equivalente: before/after1537 e390, mesmas pessoas/Posição sintéticas, card e ações existentes. Ordem de título/pergunta/ações+descrições/orientação prevista; review e estados separados. Descrições tornam o bloco mais alto, consequência direta autorizada da explicação permanente. Inspeção visual antes/depois PASS: mesmas superfícies, agrupamentos, cores, hierarquia e ordem; apenas textos e altura necessária mudam. Comparação390 inspecionada após corrigir quebra do selo e preservar dimensão circular do avatar; comparison-regression.json confere limites/forma.

## Desvios e mudanças durante execução

Nenhuma mudança material autorizada adicional. Nenhum desvio material no resultado final, após revisão do diff e renders. Testes ajustaram limiar760px conforme CSS existente e usam operação sintética controlada para observar loading sem corrida de tempo, com seletor de texto estável porque ícone loading integra o nome acessível; sem mudança do produto por esses ajustes.

## Validação final

Tipos/build web/root PASS;43testes vacancyIntelligence/trajectoryReviewModal e5tooling de rotas/avisos PASS. 75checks browser +9checks de regressão delimitada da comparação PASS (quatro larguras normais, seis estados mobile, review desktop/tablet, comparação desktop/mobile e handlers). Contextos/lint/foundation/diff PASS; CI/publicação/smoke PASS. Avisos de chunks/import dinâmico e depreciação maskClosable preexistentes não impedem execução. Sem IA paga ou banco produtivo como teste.

## Git / QA / ambiente

Branch `codex/position-relation-clarity`, integrada por fast-forward em main na origem oficial HRT-Prisma. SHA funcional `c87ad10a4fca2429918bcb17be074aa7e584e0cd`, CI branch37858859651/main37858998861 success. Pipeline existente verificou831testes/golden/demo/ledger/script seletivo/auditoria (sem vulnerabilidades conhecidas). Local não repetiu suíte integral. Recibos ci-branch.json/ci-main.json e release-plan.json/release-dry-run.json.

Plano de34arquivos: web/hosting/documentação/contextos/testes, sem banco/Edge/Parser/Synthesis. Dispatcher fez push/CI/integração/build/recriação apenasweb; curl imediato404 encerrou SSH com22/dispatcher com1 durante recriação. Não houve novo deploy: verificação posterior independente confirmou16HTTP200/14checks PASS, SHA/2.2.1/novos textos/orientação/CSS/assets novos e antigos, estado dos serviços e rollback. `publication-recovery.json` mantém essa distinção; `production-before.json`/`production-after.json` registram baseline e resultado.

Web `e40c0f1ceccbe71a94ed0474d3b54ec0398ebabdb99d55bc2311f1e1d4ada3c1`, imagem `sha256:25f949ba8dad826bfa3ab6797fb861d6bfaebc807f92973e78164680b314de42`, running/zero reinícios. Rollback `prisma-web:rollback-before-c87ad10a4fca` preserva imagem5300ddffa5b81c6faa535ee4fa6bb4d0a5a944f427d059f1ba0361a9c48f58c6. Bundle index-DwEGF6pC.js e CSS index-BJ2-6jFV.css. Parser/Synthesis conservam IDs/imagens/healthy0; gateway conserva ID/imagem/running0. Dados e arquivos alheios preservados. Aviso de orphan/maintenance de worktrees não autoriza limpeza e nenhum desses recursos foi removido.

Fechamento documental/evidências/contextos sincroniza local/origin/main/checkout da VPS sem reconstruir runtime, que conserva o SHA funcional acima. Servidor temporário5703 encerrado. QA/jornada autenticada real NOT TESTED: smoke público e fixtures não provam persistência de decisão real nem qualidade de matching.

## Conclusão

Todos os D-* e P-* aplicáveis PASS, F-01 preservado, sem desvio material no resultado final. Entrega textual/visual e preservação funcional comprovadas com componentes reais e dados sintéticos; rollout web verificado. Limite autenticado real permanece explícito.
