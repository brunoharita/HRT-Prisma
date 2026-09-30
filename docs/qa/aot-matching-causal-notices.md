# AoT — avisos causais do matching

Contrato: `docs/qa/agreement-matching-causal-notices.md` v1.0.0. Movimento restrito à redação e apresentação da tentativa de interpretação na busca e comparação.

## Matriz de Acordos

| ID | Implementação | Teste / evidência | Status | Limitação |
| --- | --- | --- | --- | --- |
| D-01 | Tradutor fechado de motivo/estado em `semanticFallbackNotice.ts` | `semanticFallbackNotice.test.ts`: discordância, evidência insuficiente, prazo, serviço, invalidação, andamento, causas mistas e desconhecidas | PASS | O código público não identifica quais trechos divergiram. |
| D-02 | Alerta nas duas telas e etiqueta causal por Perfil; consequência explicita cálculo interno preservado | Teste de conteúdo + `matchingScore.test.ts`; diff sem mudança de cálculo | PASS | Sem smoke autenticado, que poderia reabrir chamadas pagas para Perfis reais. |
| D-03 | Botão condicionado a andamento ou nova tentativa; discordância não oferece repetição | Testes de retry, espera, esgotamento e discordância | PASS | Estado de retry continua vindo da Edge/cache existente. |

## Proibições verificadas

| ID | Prova | Status |
| --- | --- | --- |
| P-01 | Testes negativos de evidência insuficiente, motivo desconhecido e causas mistas | PASS |
| P-02 | Nenhum código ou resposta bruta é renderizado; tradutor usa somente motivo público e estado. Testes de desconhecido e revisão do diff. | PASS |
| P-03 | Diff limitado a UI, tradutor, testes e documentação; matching, Edge, banco e contratos persistidos inalterados. | PASS |

## Mapa de Impacto e Preservação

| Capacidade / área | Relação | Baseline | Regressão e evidência | Status |
| --- | --- | --- | --- | --- |
| Aviso na busca e comparação, etiqueta | direct | `main` em `81743ad`: erro genérico e toda indeterminação descrita como divergência | Testes causais e estático de uso nas duas telas; build web | PASS |
| Grupo, nota, evidência e decisões | plausible_indirect | Fallback transitório preserva objeto determinístico | `matchingScore.test.ts` e `semanticTriage.test.ts`, 35 testes focados aprovados | PASS |
| Privacidade e autoridade | critical_transversal | Sem payload cru no aviso; backend autoritativo existente | Inspeção do tradutor e diff; nenhuma mudança de Edge/segredo/autorização | PASS |
| Edge, banco, Knowledge e parser | no_impact_identified | Nenhuma superfície afetada pela redação | Diff e plano seletivo 1.0.1: apenas web, documentação e testes; CI passou | PASS |

### Novidade e preservação

- Entrega nova comprovada: mensagens diferentes para causas diferentes, sem instruir repetição inútil.
- Capacidades preservadas: resultados pré-IA, score, grupo, triagem seletiva e acesso manual.
- Dependência descoberta: aviso anterior tratava qualquer `indeterminate` como discordância; agora a causa depende de `reasonCode`.
- Limite: não há prova de que o modelo tenha concordado na análise de Perfis reais; esta mudança não tenta resolver a divergência.

## Fora de escopo preservado

F-01 e F-02: sem auditoria global de telas, reprocessamento, novas leituras ou alteração de classificação. Status: PASS.

## Fidelidade visual

Não aplicável como referência normativa: a captura da tela é evidência do problema, não um layout-alvo. O componente `Alert` e a posição do aviso foram preservados; a redação e o botão mudaram conforme a causa.

## Desvios do contrato

Nenhum identificado na revisão local.

## Validação final

`pnpm run typecheck`, `pnpm run typecheck:web`, `pnpm run build`, `pnpm run lint` e `pnpm run build:web` passaram. Testes direcionados: 36/36. Context Pack gerado a partir das fontes rastreadas e conferido em checkout isolado. Primeiro CI `36662393572` falhou porque a geração local havia incorporado um documento não rastreado e ausente no runner; os artefatos foram regenerados sem mover/editar esse documento. CI final `36662702395` passou, inclusive validação completa, ledger, script seletivo e auditoria de dependências.

## Git / QA / ambiente

Branch `codex/matching-causal-notices` a partir de `main` `81743ad`; SHA funcional `d5aa806e662994e3a7ef981ec2de35af2a825bde` em `main` local/GitHub/VPS. CI branch `36662702395` e main `36662801204` PASS. Arquivos alheios não rastreados preservados. Plano de release publicou só `prisma-web`: imagem `sha256:a20b817629afc87665498542f5102e7e132b0a9356b4cf9d1ef78d3b8e97dec8`, contêiner running, zero reinícios. Rollback `prisma-web:rollback-before-d5aa806e6629` conferido na imagem anterior `sha256:14c69b71dd2d39b6ea909023260e7ac3ab5752a8b0c78752842d0675a12df75b`. O 404 do teste imediato foi transitório; `/`, `/login`, `/index.html` e o asset público retornaram 200 na verificação seguinte. O bundle contém os avisos causais. Sem smoke autenticado ou análise paga em Perfil real.

## Conclusão

Regras de aviso entregues e publicadas. Disponibilidade pública comprovada; apresentação autenticada com Perfis reais não foi verificada para evitar custo e reprocessamento.
