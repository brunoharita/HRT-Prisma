# Registry de prompts

## Política

Prompt controlado possui nome, owner, versão, propósito, entrada, saída, schema, função lógica de modelo, parâmetros, consumidores, dados enviados, dados proibidos, guardrails, golden tests, ativação e histórico. String produtiva escondida no código é proibida.

## Registry atual

| Nome | Owner | Versão | Propósito | Modelo lógico | Consumidor | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| `no-llm-extraction` | AI engineering | 1.0.0 | Registrar que o provider local não usa prompt | deterministic extractor | `processResume` | ativo local |

### `no-llm-extraction` 1.0.0

- Entrada: texto de fixture representativa.
- Saída: `ExtractionDraft` por regras locais.
- Schema: `src/domain/types.ts`.
- Parâmetros: regras versionadas no código.
- Dados enviados externamente: nenhum.
- Dados proibidos: não aplicável a provider externo; PII real continua proibida no fluxo local sem autorização.
- Guardrails: allowlist de formato, validação mínima, documento como dado, fail-closed.
- Golden tests: `tests/golden/extraction`.
- Ativação: 2026-08-20, somente local.
- Histórico: versão inicial.

## Entrada futura obrigatória

Antes de ativar um prompt LLM, criar entrada com texto ou hash imutável do template, Structured Output schema, modelo lógico, provider técnico, temperatura e demais parâmetros, dados enviados/proibidos, threat controls, custo, latência, golden baseline, aprovação QA e data de rollout.

Alteração relevante do prompt cria nova versão e não modifica resultados históricos.
