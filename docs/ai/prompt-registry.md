# Registry de prompts

## Política

Prompt controlado possui nome, owner, versão, propósito, entrada, saída, schema, função lógica de modelo, parâmetros, consumidores, dados enviados, dados proibidos, guardrails, golden tests, ativação e histórico. String produtiva escondida no código é proibida.

## Registry atual

| Nome | Owner | Versão | Propósito | Modelo lógico | Consumidor | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| `no-llm-extraction` | AI engineering | 1.0.0 | Registrar que o provider local não usa prompt | deterministic extractor | `processResume` | ativo local |
| `knowledge-agent` | AI engineering | 1.0.0 | Propor conceito com fontes aprovadas | `KNOWLEDGE_RESEARCH_MODEL` | Knowledge Agent | encontrado no código; ativação não revalidada nesta auditoria |
| `vacancy-advisor-web` | AI engineering | 1.0.0 | Orientação de mercado para Vaga | `KNOWLEDGE_RESEARCH_MODEL` | Assistente Prisma | encontrado no código; ativação não revalidada nesta auditoria |
| `occupation-resolution-agent` | AI engineering | 1.0.0 | Escolher referência ocupacional equivalente entre candidatos permitidos | `KNOWLEDGE_RESEARCH_MODEL` | resolução ocupacional | encontrado no código; ativação não revalidada nesta auditoria |

Inventário verificado no código em 2026-09-11. A entrada determinística descreve o provider local original, não todos os fluxos atuais de extração. Esta revisão não muda prompts nem demonstra sua qualidade ou rollout. Novos providers devem ter registro próprio antes de ativação.

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

## Prompts LLM encontrados no código

Fonte dos três templates e schemas: `supabase/functions/knowledge-agent/index.ts`, revisão Git `7cfd22bc963c2abc49d9242156c7f53c9c799778`. Os hashes abaixo são SHA-256 dos bytes UTF-8 do valor final de `instructions`, com arrays unidos por um espaço; não incluem input ou schema. A revisão imutável identifica esses outros componentes. Strings em código são permitidas quando registradas e rastreáveis, não quando ocultas do catálogo.

| ID versionado | SHA-256 de instructions |
| --- | --- |
| `knowledge-agent-1.0.0` | `fb89e51010fff426f6aeee65ad406e95a5c9db89081e7afd4d84e06e22808476` |
| `vacancy-advisor-web-1.0.0` | `af42c470bd1ce74594231fdd919115f11a86284f81949da9c9d0ea1f7823deed` |
| `occupation-resolution-agent-1.0.0` | `916acaf7204dd7089c7f45b57b060c494f80deaa55a6a5b63d6ba9d76e0c7673` |

### Knowledge Agent

- Template: `callOpenAi`; entrada: termo, idioma e escopo profissional; saída/schema: `knowledge-proposal-1.0.0`, `proposalSchema`.
- OpenAI Responses, `store: false`, `max_output_tokens: 2000`, `max_tool_calls: 4`; Web obrigatória com domínios aprovados e fontes retornadas. Temperatura não definida no request.
- Guardrails: páginas como dados não confiáveis, fontes oficiais ou duas secundárias aprovadas, sem pesquisa sobre pessoas, publicação ou alteração de políticas. Não enviar currículos, contatos, segredos ou dados privados.

### Assistente de mercado da Vaga

- Template: `callOpenAiForVacancy`; entrada: pergunta, título da posição, área, idioma e data; saída/schema: `vacancy-advisor-market-answer-1.0.0`.
- OpenAI Responses, `store: false`, `max_output_tokens: 1200`, `max_tool_calls: 4`, `safety_identifier` derivado do usuário; Web obrigatória filtrada por domínios aprovados. Temperatura não definida.
- Separar fato, recomendação e incerteza; URLs devem vir da busca. Não inventar números, transformar conselho em requisito, pesquisar pessoas ou enviar dados internos/pessoais. Sanitização e autorização continuam responsabilidade do código.

### Resolução ocupacional

- Template: `handleOccupationResolution`; o request identifica organização/tentativa, mas o input do modelo contém termo, idioma e candidatos ocupacionais permitidos. Saída/schema: `occupation-resolution-answer-1.0.0`, `occupationResolutionSchema`.
- OpenAI Responses, `store: false`, `max_output_tokens: 400`, `safety_identifier` derivado do usuário; sem Web/tools. Temperatura não definida.
- Só escolher equivalência segura de título entre candidatos; incerteza mantém `safe` falso. Não inferir ocupação por competências/senioridade. O servidor verifica allowlist, autoridade, limites e conclusão da tentativa; a resposta não publica Knowledge por conta própria.

### Evidência, custos e lacunas

Os testes locais existentes em `tests/knowledgeFoundation.test.ts` e `tests/vacancyIntelligence.test.ts` incluem inspeções de contratos/guardrails; não equivalem a golden evaluation do texto do LLM. Custos/latência dependem do modelo configurado e uso real, não medidos nesta revisão. Golden baseline de cada prompt, modelo efetivamente ativo, aprovação QA e data de rollout não foram revalidados: consultar owner e evidência operacional antes de afirmar ativação ou qualidade. Os hashes e o registro corrigem rastreabilidade, não preenchem essas lacunas com aprovação presumida.

## Registro para novas ativações

Antes de ativar um prompt LLM, criar entrada com texto ou hash imutável do template, Structured Output schema, modelo lógico, provider técnico, temperatura e demais parâmetros, dados enviados/proibidos, threat controls, custo, latência, golden baseline, aprovação QA e data de rollout.

Alteração relevante do prompt cria nova versão e não modifica resultados históricos.
