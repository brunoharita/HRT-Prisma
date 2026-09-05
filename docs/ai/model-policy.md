# Política de modelos

## Princípio

Modelo é implementação substituível de uma função lógica. O projeto não fixa nomes permanentes em `AGENTS.md`; catálogos e aliases mudam. A escolha técnica atual deve existir somente em registry versionado e ser verificada na documentação oficial do fornecedor no momento da decisão.

## Funções lógicas

| Função | Requisito | Estado atual |
| --- | --- | --- |
| Extraction | Structured output, fidelidade a evidência, baixa alucinação | regras locais |
| Inference | Regra explicável e reprocessável | ontologia local |
| Retrieval | Recuperar sem atravessar tenant | lexical estruturado |
| Matching | Comparar requisitos sem score opaco | regras locais |
| Explanation | Usar dados estruturados existentes | template local |
| Embedding | Vetor estável, versionável e cacheável | não selecionado |
| Knowledge research | Web Search, Structured Outputs e fontes rastreáveis | adapter OpenAI e modelo econômico configurados em QA; chamada bloqueada sem credencial |
| Assessment item generation | Structured Output, aderência metodológica, no PII e custo controlado | provider fake ativo; adapter externo implantado e desativado |

## Seleção

Usar o menor modelo disponível que cumpra segurança, qualidade, contexto, Structured Outputs, privacidade, latência e custo para a função inteira. Mudanças sensíveis ou arquiteturais exigem avaliação por modelo com capacidade maior quando necessário. A seleção deve seguir benchmark representativo, não apenas recomendação genérica do fornecedor.

## Registry técnico atual

| Função | Fornecedor | Modelo técnico | Fallback | Versão | Estado |
| --- | --- | --- | --- | --- | --- |
| Extraction | local | `deterministic-local-1.0.0` | nenhum | 1.0.0 | ativo local |
| Inference | local | `inference-ontology-1.0.0` | nenhum | 1.0.0 | ativo local |
| Retrieval | local | `structured-lexical-1.0.0` | nenhum | 1.0.0 | ativo local |
| Matching | local | `matching-explainable-1.0.0` | nenhum | 1.0.0 | ativo local |
| Knowledge research | OpenAI | `gpt-5.6-luna` | nenhum | 1.0.0 | configurado no Prisma-QA; bloqueado sem `OPENAI_API_KEY` |
| Assessment item generation | local | `fake-deterministic` | nenhum | 1.0.0 | ativo local/QA, sintético |
| Assessment item generation external | não aprovado | nenhum | provider fake | 1.0.0 | desativado |

Para a pergunta contextual de Vagas foi selecionado `gpt-5.6-luna`, indicado no catálogo oficial atual para workloads sensíveis a custo e compatível com Responses API, Web Search e Structured Outputs. A seleção fica em configuração server-side, não no domínio. Caps de QA limitam 10 pesquisas por dia e 100 por mês; no máximo quatro chamadas de Web Search são permitidas por resposta. Sem `OPENAI_API_KEY`, o Knowledge Agent continua falhando de forma fechada.

## Troca de modelo

Troca é material. Exige nova versão, golden tests, prompt injection tests, comparação de omissões/alucinações, custo, média e p95, compatibilidade de schema, privacidade/subprocessador, fallback, QA e aprovação. Alias mutável não é suficiente para reprodução; quando disponível, registrar snapshot técnico.

## Dados e segurança

Enviar somente campos mínimos. Documentar região, retenção, treinamento, subprocessadores e política de exclusão. Secret fica somente em backend/secret store. Modelo não recebe autoridade para autorização, mutação sensível ou decisão de contratação.

## Referências oficiais

A política geral de custo versus capacidade deve ser revalidada no catálogo oficial do fornecedor. Para OpenAI, consultar `https://developers.openai.com/api/docs/models` no momento da seleção; esse link não aprova um modelo para o Prisma.
