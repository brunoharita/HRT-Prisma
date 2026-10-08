# Acordo — Clareza da avaliação de relação com a Posição

v1.0.0, agreed/frozen, 08/10/2026. Autoridade: proposta textual aprovada por Bruno com “pode implementar isso”. Baseline main `3b0fcbafe5f0e18bc9050f86a826ca9e792309d9`, produto2.2.1. Classe B, apresentação delimitada, publicação autorizada pelo AGENTS.md seção7. Decisão de versão: manter2.2.1, pois explicita o significado existente sem modificar contratos ou funcionalidades.

- D-01: substituir “Decisão humana” por “Relação da trajetória com a Posição”; perguntar “A experiência profissional desta Pessoa tem relação com o trabalho de {título da Posição}? Revise as evidências e registre sua avaliação.” Título real, fallback “desta Posição” quando indisponível.
- D-02: botões “Confirmar relação com a Posição”, “Desconsiderar esta relação”, “Enviar relação à curadoria”, com explicações visíveis: “Considero essa trajetória relacionada ao trabalho previsto.”; “Não considero pertinente a associação apresentada neste caso.”; “Proponho que a relação confirmada seja revisada para possível inclusão na Knowledge.” Selos de resultado indicam explicitamente relação confirmada/desconsiderada com a Posição, também na comparação.
- D-03: abaixo das ações, orientação permanente: “Confirmar essa relação não significa atender aos requisitos nem aprovar a Pessoa no processo seletivo. Para acompanhá-la no Kanban, use ‘Adicionar à avaliação’.”
- D-UX-01: preservar Consultar à esquerda e relação à direita, com eventual revisão de divergências na posição existente; título, pergunta, ações/explicações e orientação nessa ordem. Celular empilha sem corte/overflow, texto essencial legível. Screenshot destacado é contraexemplo de clareza e referência de contexto, sem novo mockup normativo.
- D-04: preservar handlers, argumentos confirmed/dismissed, gates de evidência/confirmação/pendência, loading/erro, refresh explícito existente e inclusão no Kanban independente. Publicar somente web e comprovar SHA/versão/assets/rollback/sincronização.
- P-01: não transformar decisão contextual em aprovação/rejeição seletiva, confirmação de requisitos, relação global automática ou promessa de score invariável.
- P-02/P-UX-01: não alterar matching, serviços, persistência, tenant/papéis, dados reais, IA, dependências ou demais telas; sem nova confirmação/preseleção e sem esconder explicação essencial em tooltip.
- F-01: redesign da descoberta, mudanças de score/denominador, Kanban, taxonomy/curadoria e incremento de versão.
- A-01/A-UX-01: reutilizar componentes Ant Design, classes/fixtures e ações atuais; engenharia decide quebra de linhas, espaçamento e testes proporcionais.
- Q-01: nenhuma pendência material.

## Aceite e mapa inicial

CA-01/02/03: render com título dinâmico, três ações/explicações e orientação permanente; nenhum rótulo genérico de descarte. CA-UX-01: comparação antes/depois mesmos dados/viewport1537 e390, limites320/768, estados confirmada/desconsiderada e título longo. CA-04: teste funcional das chamadas, gates, loading/erro/retry, navegação Kanban independente; tipos/build/checks direcionados, publicação web/smoke e limitação de jornada real.

| Área | Relação | Baseline / proteção / evidência prevista |
| --- | --- | --- |
| CandidateMatchCard e selos na comparação | direct | SHA baseline; render desktop/mobile, textos e decisões sintéticas |
| CSS compartilhado de ações | plausible_indirect | seletor restrito ao grupo de relação; Consultar/revisão sem deslocamento arbitrário, responsivo |
| Confirmação/descarte/proposta | direct | handlers/payloads/gates existentes; mocks de serviço, atraso/falha/retry, sem mutação produtiva |
| Inclusão/navegação Kanban e comparação | plausible_indirect | ações separadas; teste de inclusão e navegação, seleção permanece independente |
| Score/requisitos/backend/tenant/IA | no_impact_identified | apenas apresentação, serviços intocados; diff e plano de destinos, testes atuais de vaga |
| Perfil/overview da Posição | no_impact_identified | nenhuma classe nova alcança essas superfícies; tipos/build e revisão seletor |
| Release/contexto | direct | registry2.2.1 inalterado, web/smoke/rollback/documentação |

Não há nova jornada transversal crítica: não são alterados auth, navegação global ou serviços. Limite: fixture sintética não prova persistência autenticada real, nem qualidade de matching.
