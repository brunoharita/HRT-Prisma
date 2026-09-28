# Acordo — diagnóstico seguro da interpretação de trajetória v1.0.0

Decisão: Bruno autorizou em 2026-09-28 implementar o registro de falhas discutido após duas tentativas `RESPONSE_INVALID` da análise da Beatriz para Analista de Marketing. Este é um delta de observabilidade do contrato M8.6 e do fallback já publicado; não reabre a classificação.

## DEVE

- D-01 — Registrar, para cada uma das duas leituras de uma tentativa problemática, sucesso/falha e a etapa tipificada da falha; incluir status HTTP do provedor, status/incomplete reason permitidos e contagens de tokens quando disponíveis, com correlação ao ID da análise e número da tentativa.
- D-02 — Distinguir falha de transporte, HTTP, envelope, JSON, contrato da leitura/citação, divergência de modelo e discordância entre leituras, preservando os códigos públicos existentes.
- D-03 — O registro é apenas diagnóstico e falha aberta: indisponibilidade da telemetria não altera cálculo, cache, resultado, autoridade nem fluxo manual.

## PROIBIDO

- P-01 — Não registrar texto de perfil/posição, prompt, resposta bruta, citação, erro livre do provedor, chave, token de autenticação ou identificador de pessoa.
- P-02 — Não enviar diagnóstico ao cliente nem usar o log para inferir adequação, grupo ou score.

## FORA DE ESCOPO

- F-01 — Alterar prompt/modelo, limite de tokens, estratégia de retry, regra de matching, banco, interface ou reprocessar perfis reais para testar.

## AUTONOMIA

- A-01 — Formato do evento e mecanismo de log da Edge, desde que os campos sejam fechados, pequenos, testáveis e consultáveis.

## PENDÊNCIAS

- Nenhuma decisão material pendente dentro deste escopo.

## CRITÉRIOS DE ACEITE

- CA-D01 — Testes sintéticos mostram a etapa e ambos os lados da tentativa, inclusive resposta incompleta e citação inválida.
- CA-D02 — Testes preservam códigos públicos e ausência de log com dados sensíveis, também quando o provedor devolve detalhes maliciosos.
- CA-D03 — Teste de falha do logger mantém resposta e persistência inalteradas; cache e chamadas não autorizadas não produzem novo log de provedor.

## MAPA DE IMPACTO E PRESERVAÇÃO — baseline antes da implementação

| Área/capacidade | Relação | Baseline | Regressão proporcional |
| --- | --- | --- | --- |
| Edge `matching-trajectory`, duas leituras e motivo público | direct | `main` em `4d381cf`, Edge v8, `RESPONSE_INVALID` agrupa causas; testes Deno existentes | Testes de etapas, pares e motivos, sem chamada real à IA |
| Logging/privacidade | critical_transversal | Handler não registra conteúdo nem erros do provedor; PII restrita | Testes negativos com dados sensíveis e logger indisponível; revisão do diff |
| Cache, triagem A/B, score e snapshot | plausible_indirect | Fallback publicado em `a20bd84`; testes existentes do handler/snapshot | Regressão Deno focada, nenhuma mutação de perfis reais |
| Banco, prompt, UI e VPS | no_impact_identified | Sem alteração de contrato persistido ou visual pretendida | Plano de release confirma destinos ignorados; smoke público da Edge após publicação |

Estado: agreed. Aprovação: pedido explícito de implementação de Bruno nesta conversa em 2026-09-28.
