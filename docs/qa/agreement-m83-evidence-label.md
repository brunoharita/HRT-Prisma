# Acordo M8.3 — precisão do rótulo de ausência de evidência

Versão 1.0.0. Aprovado por Bruno em 27/09/2026 (resposta “sim” à proposta textual explícita).

- D-01: na coluna da lista de Pessoas para a Posição, substituir o título por “Requisitos sem evidência encontrada (N)”, preservando a contagem dinâmica.
- D-02: exibir “Requisitos da posição para os quais não foi encontrada evidência no Perfil publicado.” junto ao título dessa coluna.
- D-03: preservar itens, classificação, cálculo, fontes consultadas e demais regras; publicar em main e produção.
- P-01: não afirmar ausência de competência ou consulta ao PDF; não alterar regras, IA, score, persistência ou dados reais.
- F-01: revisão de outros rótulos, banners, comparação e redesign da tela.
- A-01: reutilizar MatchBucket, com descrição opcional apenas nessa coluna; validação dirigida e release web.
- Q: nenhuma decisão pendente.
- CA-01: testes do título dinâmico e descrição exclusivos do bucket no_evidence; tipos/build; smoke autenticado com 11 itens e score preservado.

## Mapa de impacto e preservação

Baseline main `512d7d26d4cabbccd15fef908e42fa57d9aa8f51`, web `a5ddd5a`, Edge v3. Classe B, apresentação sem mudança de contrato persistido; produto v1.8.3 mantido.

| Área | Relação | Prova proporcional |
| --- | --- | --- |
| Coluna no_evidence na lista | direct | Texto aprovado e contagem dinâmica; teste e inspeção visual |
| MatchBucket compartilhado | plausible_indirect | Descrição opcional, demais chamadas intactas, quatro colunas preservadas |
| Score, matching, IA, banco, parser e autorização | no_impact_identified | Mudança restrita a JSX de apresentação; diff e score do baseline no smoke, sem novo caminho de dados |
| Web/release | direct | Tipos/build/CI, deploy seletivo e HTTPS/smoke |

A captura fornecida é contraexemplo do texto, não autorização de redesign. Manter ordem, cores, agrupamento e ações; permitir quebra natural do título e uma descrição na mesma coluna. Layout responsivo existente preservado.
