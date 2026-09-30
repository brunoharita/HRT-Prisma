# Acordo — avisos causais da interpretação no matching v1.0.0

Decisão explícita de Bruno em 2026-09-29: os avisos devem dizer o que ocorreu, a consequência e a ação possível, em linguagem simples. Este delta refina os avisos de busca e comparação do matching; não altera o acordo de preservação `docs/qa/agreement-matching-ai-failure-fallback.md` v1.0.0.

## DEVE

- D-01: usar o estado e o motivo público da tentativa para explicar separadamente discordância entre leituras, evidência insuficiente, prazo, indisponibilidade, resultado não validado, dados alterados, acesso e andamento. Motivos mistos não viram uma causa única inventada.
- D-02: informar que o grupo, a nota e as evidências apresentados vêm do cálculo interno desta consulta e que a interpretação não foi aplicada. Identificar os perfis afetados nos próprios cartões.
- D-03: oferecer atualização somente quando houver andamento ou nova tentativa disponível; não recomendar repetição para discordância da mesma versão. Causa desconhecida permanece explicitamente desconhecida.

## PROIBIDO

- P-01: chamar toda indeterminação de discordância ou atribuir ao provedor um erro interno, de acesso ou de dados.
- P-02: expor códigos internos, texto de perfil, resposta bruta ou detalhes técnicos do provedor no aviso.
- P-03: alterar cálculo, grupos, score, triagem, cache, IA, decisões humanas ou contratos persistidos para mudar a redação.

## FORA DE ESCOPO

- F-01: auditoria e reescrita de todos os avisos do Prisma fora da busca/comparação de Pessoas por Posição.
- F-02: registrar divergência por trecho, mudar o número de leituras, reprocessar perfis reais ou decidir equivalências profissionais.

## AUTONOMIA

- A-01: engenharia escolhe estrutura do tradutor de avisos e redação curta, com testes de cada causa e integração nas duas telas existentes.

## CRITÉRIOS DE ACEITE

- CA-01: `READINGS_DISAGREE` informa duas leituras recebidas e divergentes; `INSUFFICIENT_EVIDENCE`, falhas de serviço e causas desconhecidas não recebem essa explicação.
- CA-02: busca e comparação mostram causa, consequência e ação coerentes; cartões dos perfis afetados usam rótulo causal sem versão técnica.
- CA-03: testes negativos comprovam que causa desconhecida não é inventada e que discordância não oferece repetição; resultado interno e decisão humana permanecem intactos.

## Mapa inicial de impacto e baseline

| Área | Relação | Baseline e preservação | Regressão proporcional |
| --- | --- | --- | --- |
| Aviso e etiqueta na busca/comparação | direct | `main` em `81743ad`: aviso genérico e toda indeterminação chamada de divergência | Testes de causa, estado misto e renderização nas duas telas |
| Resultado determinístico e seleção humana | plausible_indirect | `semanticFallback` apenas anota a tentativa; grupos/score/decisões preservados | Testes existentes de matching e revisão do diff |
| Contrato de resposta, privacidade e autorização | critical_transversal | Motivo público fechado; sem resposta bruta na UI | Teste de causa desconhecida, inspeção de não vazamento |
| Edge, banco, Knowledge, parser e dados reais | no_impact_identified | Sem mudança nessas superfícies | Revisão de diff e plano de release |

Decisão de versão: redação transitória da UI, sem alteração de contrato persistido ou prompt/modelo; o próprio acordo é v1.0.0.
