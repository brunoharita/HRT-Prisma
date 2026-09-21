# Contrato de Acordos — <Movimento>

## Objetivo

- Versão do contrato:
- Fonte da decisão / tarefa:
- Contrato anterior e delta, se for correção de comportamento já aprovado:

## DEVE — Inegociável

- D-01 —

## PROIBIDO

- P-01 —

## FORA DE ESCOPO

- F-01 —

## AUTONOMIA DE ENGENHARIA

- A-01 —

## PENDÊNCIAS

- Q-01 —

## CRITÉRIOS DE ACEITE

- CA-D01 — Dado, quando, então; teste e evidência esperados.

## MAPA DE IMPACTO E PRESERVAÇÃO — obrigatório em movimento material

Registrar antes da implementação. O mapa deve ser revisado se surgir dependência, capacidade ou risco novo.

| Área / capacidade | Relação (`direct` \| `plausible_indirect` \| `critical_transversal` \| `no_impact_identified`) | Dependência / mecanismo | Baseline mínimo (ambiente, SHA/versão, cenário, evidência) | Regressão proporcional / evidência prevista |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

Separar funcionalidades novas das capacidades preservadas. `no_impact_identified` somente após análise proporcional; ausência de arquivo alterado não é prova suficiente. Relações diretas exigem regressão, relações plausivelmente indiretas exigem prova proporcional e jornadas transversais críticas exigem smoke quando houver consequência material.

## FIDELIDADE VISUAL — obrigatório quando houver referência

- Classificação de cada referência: alvo normativo | inspiração | contraexemplo | exemplo de conteúdo.
- D-UX-01 — Topologia, hierarquia, proporções, agrupamentos, densidade, alinhamentos, ordem e posição relativa das ações que devem permanecer reconhecíveis.
- P-UX-01 — Divergências estruturais proibidas, inclusive o que “não copiar literalmente” não autoriza mudar.
- A-UX-01 — Conteúdo ilustrativo, tokens, componentes acessíveis e detalhes de acabamento delegados à engenharia.
- Q-UX-01 — Ambiguidade material de estrutura, interação ou responsividade; remover ou resolver antes do prompt final.
- CA-UX-01 — Comparação no mesmo estado, com dados equivalentes e no mesmo viewport, mais viewports responsivos aplicáveis; evidência renderizada e divergências registradas no AoT.

## ESTADO

- `draft` | `agreed` | `superseded`

## APROVAÇÃO

- Product Owner:
- Data:
- Evidência de aprovação:
- Referência imutável para o prompt: versão deste contrato ou Git revisão/hash.
