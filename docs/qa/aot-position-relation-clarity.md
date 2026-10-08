# AoT — Clareza da avaliação de relação com a Posição

Contrato `docs/qa/agreement-position-relation-clarity.md` v1.0.0, execução correspondente, autoridade explícita em08/10/2026. Baseline `3b0fcbafe5f0e18bc9050f86a826ca9e792309d9`, produto2.2.1. Evidência em `docs/qa/evidence/position-relation-clarity/`.

## Matriz de Acordos

| ID | Acordo / implementação | Teste / evidência | Status | Ambiente / limite |
| --- | --- | --- | --- | --- |
| D-01 | Título/pergunta dinâmica em CandidateMatchCard | browser-results.json; desktop/mobile/título longo | PASS | sintético |
| D-02 | Três ações com descrições visíveis e selos contextuais no card/comparação | browser-results.json; vacancyIntelligence/own-diff | PASS | sintético; comparação renderizada |
| D-03 | Orientação permanente abaixo das ações | renders e browser-results.json | PASS | sintético |
| D-UX-01 | Consultar/revisão/relação preservados e textos responsivos | before/after1537/390, limites768/320, review | PASS | sintético |
| D-04 | Handlers/gates/loading/erros/refresh/inclusão independente; web e versão2.2.1 | browser/43dirigidos+5tooling; publicação pendente | PARTIAL | local PASS; produção pendente |

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
| Release/contexto | direct | registry2.2.1; contexto PASS; CI/smoke/sincronização pendentes | PARTIAL |

Novidade: clareza textual e significado permanente das ações. Preservação: mesmas decisões e serviços. Selos repetidos identificados na comparação, com quebra de texto delimitada necessária: essa apresentação passa a direct; sem mudança funcional de comparação. Demais relações preservadas; sem jornada transversal crítica alterada. Baseline sintético usa mesmos dados/estado/viewport antes/depois; não comprova qualidade de matching ou persistência autenticada real.

## Fora de escopo preservado

F-01: sem redesign amplo, mudança de score/denominador, Kanban, curadoria, dados ou versão. PASS por diff dirigido; registry inalterado.

## Evidência de fidelidade visual

Screenshot anexado é contraexemplo de clareza; não há novo mockup normativo. Comparação equivalente: before/after1537 e390, mesmas pessoas/Posição sintéticas, card e ações existentes. Ordem de título/pergunta/ações+descrições/orientação prevista; review e estados separados. Descrições tornam o bloco mais alto, consequência direta autorizada da explicação permanente. Inspeção visual antes/depois PASS: mesmas superfícies, agrupamentos, cores, hierarquia e ordem; apenas textos e altura necessária mudam. Comparação390 inspecionada após corrigir quebra do selo e preservar dimensão circular do avatar; comparison-regression.json confere limites/forma.

## Desvios e mudanças durante execução

Nenhuma mudança material autorizada adicional. Nenhum desvio material no resultado final, após revisão do diff e renders. Testes ajustaram limiar760px conforme CSS existente e usam operação sintética controlada para observar loading sem corrida de tempo, com seletor de texto estável porque ícone loading integra o nome acessível; sem mudança do produto por esses ajustes.

## Validação final

Tipos/build web/root PASS;43testes vacancyIntelligence/trajectoryReviewModal e5tooling de rotas/avisos PASS. 75checks browser +9checks de regressão delimitada da comparação PASS (quatro larguras normais, seis estados mobile, review desktop/tablet, comparação desktop/mobile e handlers). Contextos/lint/foundation/diff PASS; CI/publicação pendentes. Avisos de chunks/import dinâmico preexistentes não impedem build. Sem IA paga ou banco produtivo como teste.

## Git / QA / ambiente

Branch `codex/position-relation-clarity`; baseline main/origin/VPS confirmado no SHA acima. Web baseline5300ddff running0; Parser/Synthesis healthy0/gateway running0. Dados pessoais e arquivos alheios preservados. QA autenticado real NOT TESTED; produção ainda pendente.

## Conclusão

Em execução; não declarar entrega antes do smoke e fechamento dos D-*.
