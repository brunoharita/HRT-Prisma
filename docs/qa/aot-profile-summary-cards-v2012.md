# AoT — Painel executivo enriquecido v2.0.12

Contrato: `docs/qa/agreement-profile-summary-cards-v2012.md` v1.0.0 congelado, autorização de Bruno em 06/10/2026. Baseline main/origin/VPS b2f8bdb629fd04c68aa358fc5eea6f4f4ce16ba9, aplicação42308e72, produto2.0.10. Sem dados pessoais reais em fixtures/evidência. Registro2.0.11 permaneceu rascunho, salto declarado.

## Matriz de Acordos

| ID | Acordo / implementação | Teste / evidência | Status | Ambiente / limite |
| --- | --- | --- | --- | --- |
| D-UX-01 | Quatro cards, narrativa larga, oito eixos abertos / ProfileHighlightCards, Surface, CSS | Desktop1448/mobile390, mesma Marina fictícia da referência; ui-results.json e renders completos | PASS | Sintético local |
| D-DATA-01 | Área ligada à experiência por menção explícita; contexto/áreas gerais separados | Testes domínio menções, negação, relação ausente, fontes; UI área/posição distinta | PASS | Não é taxonomia nem equivalência semântica universal |
| D-TIME-01 | União mensal, posição e área separadas, precisão suficiente / profileHighlights | Sobreposição, lacunas, duplicatas, futura no mesmo mês, data inválida, ano sem mês, mês atual | PASS | Aproximação mensal de relato aprovado |
| D-POS-01 | Andamento/recência, empates, anterior só sem sobreposição | Testes dois ativos, ordem invertida, sobreposição, período desconhecido; UI atual/anterior/empresa/período | PASS | Não verifica vínculo atual externamente |
| D-EDU-01 | Nível concluído seguro, empates e organizações | Testes inferida/humana/qualificação desconhecida/MBA/especialização/clientes; UI instituições/empresas | PASS | Fonte é Perfil aprovado |
| D-KEEP-01 | Conteúdo completo, fontes/cache/snapshot, fallback e falha local | 16 reports UI em1448/390: executive/source/failed/render/source-switch/refresh/multiple-errors/long-content; 40 testes contrato/síntese | PASS | Sem provider real; erro de render injetado apenas no servidor sintético |
| D-REL-01 | Registry2.0.12, skips7/11, main/web/CI/smoke | 5 registry, tipos/build/contextos/lint/foundation PASS; entrega operacional pendente | PARTIAL | Atualizar após publicação |

## Proibições verificadas

| ID | Guardrail | Prova negativa | Status |
| --- | --- | --- | --- |
| P-01 | Sem corte/invenção/overlap/snapshot incorreto/provider novo | Datas/área/conclusão negativos; texto longo integral e não clamped; cache/foco/scroll/versionamento/fontes sem geração | PASS |
| P-02 | Sem perfil humano/auth/schema/matching/Parser modificado | Diff restrito a projeção/UI/testes/docs/registry, zero chamada mutacional/provider | PASS |

## Mapa de Impacto e Preservação

| Capacidade / relação | Baseline | Regressão / evidência | Status |
| --- | --- | --- | --- |
| Cards/Resumo/CSS / direct | 2.0.10 sem cards; referência escolhida1 |16UI, captura1448 e390, oito eixos completos | PASS |
| Datas/área/formação / direct | parseResumePeriod/classificação existentes |10testes dirigidos, negativos/dedupe/union/unknown | PASS |
| Fontes/cache/snapshot/fallback / plausible_indirect | Consulta lazy2.0.8 |source-switch/refresh/long-content/failed/render, providers0 e cache/foco preservados | PASS |
| Perfil/leitura/abas / critical_transversal | Modelo aprovado já carregado e autorizado | Tipos/build, header/nav preservados, onOriginal funcional, nenhum fetch/auth novo | PASS |
| Matching/schema/IA/Parser/worker / no_impact_identified | Fora do diff funcional | Helpers isolados; contratos persistidos intactos; estado VPS após release pendente | PARTIAL |
| Registry/login/sidebar/web / direct |2.0.10/entryDxCL2PFY |5testes, única entrega12 com skips; CI/runtime/smoke pendentes | PARTIAL |

Novidade: painel executivo enriquecido. Preservação: conteúdo integral, consulta leve, fonte lazy, erro parcial/fallback, autoridade e cache. Nenhuma relação material acrescentada ao mapa. Limites de baseline: não existe prova de qualidade universal/Person real autenticada; não se declara tal capacidade PASS. Nenhuma nova biblioteca.

## Fora de escopo

F-01 PASS: taxonomia, IA/perguntas/prompt/modelo/banco/backfill/curadoria/perfil humano/matching/Parser/worker e suíte integral local não alterados. CI obrigatório permanece intacto.

## Fidelidade visual

Referência normativa `evidence/profile-summary-cards-v2012/approved-reference.png`, SHA2567D9A3B16E7048D8B34D86866E38A3F338626873053771BB8FCC61034E2E0119D. Imagem aprovada1, conteúdo fictício ilustrativo, shell global ilustrativo. Render `cards-executive-1448-full.png`: quatro destaques na mesma linha, ícones azuis suaves, rótulos discretos e conteúdo forte; síntese larga com acento azul; oito eixos abertos em duas colunas. `cards-executive-390-full.png`: uma coluna, texto integral/altura livre, fontes sob demanda. Comparação visual manual feita nos mesmos dados fictícios Marina/estado publicado/viewport1448. Enriquecimento torna cards mais altos, mantém topologia/hierarquia; autorizado por Bruno para períodos/duração e experiência anterior. Shell existente e texto das oito perguntas preservados, sem copiar navigation ilustrativa. Sem desvio estrutural não autorizado. Falha injetada revelou overflow do aviso no celular: ação movida para linha própria e cenário revalidado PASS; outros conteúdos continuaram intactos.

## Desvios e decisões

Nenhum desvio do comportamento acordado identificado na revisão. Escolha conservadora de vínculo por menção explícita documentada antes da implementação, conforme autonomia e ausência aceita. Área livre não ganhou taxonomia implícita. Data sem mês também impede ordenação segura; não se usa mês inventado. Mês atual em andamento pode gerar Menos de1mês, distinto de informação inexistente. Rascunho2.0.11 e arquivos de outras tarefas preservados fora do commit. Plano amplo de testes será substituído pela regressão proporcional autorizada; dispatcher/CI não serão enfraquecidos.

## Validação final

15testes domínio/registry e40contrato/worker sintéticos PASS; 16UI PASS. Tipos root/web PASS; build web PASS com avisos preexistentes de chunks/dynamic import. Contextos/lint/foundation PASS no snapshot Git rastreado: 896 arquivos, 18 tabelas públicas/6 versões de processamento. Geração isolada preserva arquivos não relacionados. Nenhum teste pago, provider real ou banco produtivo como teste. Jornada autenticada de Bruno/Beatriz NOT TESTED. Evidência em `docs/qa/evidence/profile-summary-cards-v2012/`.

## Git / produção

Pendente CI branch/main, plano seletivo, publicação web, smoke e sincronização. Não declarar operação concluída antes da evidência.

## Conclusão

Implementação e preservação local verificadas. Fechamento operacional em andamento.

