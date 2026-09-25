# Política de modelos

## Escopo

As funções, registry, benchmarks e gates de troca abaixo governam modelos utilizados pelo produto Prisma. Não são um procedimento para alternar o agente que desenvolve o repositório.

Para o agente de desenvolvimento, respeitar a seleção do usuário e preferir capacidade suficiente com custo proporcional ao risco. Avaliar maior capacidade em mudanças sensíveis ou arquiteturais quando necessário, sem impor benchmarks de produção para uma troca de agente. O agente não deve afirmar que alterou o próprio modelo sem uma operação suportada e comprovada. Segurança, requisitos aceitos e testes proporcionais permanecem iguais entre modelos; nenhuma dispensa depende do nome do modelo.

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
| Knowledge research | Web Search, Structured Outputs e fontes rastreáveis | adapter OpenAI e modelo econômico ativos e validados em QA |
| Assessment item generation | Structured Output, aderência metodológica, no PII e custo controlado | provider fake ativo; adapter externo implantado e desativado |

## Seleção

Usar o menor modelo disponível que cumpra segurança, qualidade, contexto, Structured Outputs, privacidade, latência e custo para a função inteira. Mudanças sensíveis ou arquiteturais exigem avaliação por modelo com capacidade maior quando necessário. A seleção deve seguir benchmark representativo, não apenas recomendação genérica do fornecedor.

## Registry técnico atual

| Função | Fornecedor | Modelo técnico | Fallback | Versão | Estado |
| --- | --- | --- | --- | --- | --- |
| Extraction | local | `deterministic-local-1.0.0` | nenhum | 1.0.0 | ativo local |
| Extraction M5.7 experimental | OpenAI | `gpt-5.6-luna` | leitura local somente por decisão explícita após falha | parser-ia-1.0.0 | implementação DEV/loopback, uma amostra real, sem cutover; ver `parser-ia.md` |
| Inference | local | `inference-ontology-1.0.0` | nenhum | 1.0.0 | ativo local |
| Retrieval | local | `structured-lexical-1.0.0` | nenhum | 1.0.0 | ativo local |
| Matching do vertical slice base | local | `matching-explainable-1.0.0` | nenhum | 1.0.0 | ativo local |
| Matching de Posições | local | `vacancy-matching-explainable-5.0.0` + `matching-score-1.2.0` | nenhum | 5.0.0 / 1.2.0 | ativo local/QA |
| Knowledge research | OpenAI | `gpt-5.6-luna` | nenhum | 1.0.0 | ativo e validado no Prisma-QA |
| Assessment item generation | local | `fake-deterministic` | nenhum | 1.0.0 | ativo local/QA, sintético |
| Assessment item generation external | não aprovado | nenhum | provider fake | 1.0.0 | desativado |

Para a pergunta contextual de Vagas foi selecionado `gpt-5.6-luna`, indicado no catálogo oficial atual para workloads sensíveis a custo e compatível com Responses API, Web Search e Structured Outputs. A seleção fica em configuração server-side, não no domínio. Caps de QA limitam 10 pesquisas por dia e 100 por mês; no máximo quatro chamadas de Web Search são permitidas por resposta. `OPENAI_API_KEY` foi configurada no cofre do Prisma-QA e o smoke vivo foi concluído em 2026-09-04. Ausência futura da credencial continua falhando de forma fechada.

## Troca de modelo

M8.3 reutiliza o modelo server-side `KNOWLEDGE_RESEARCH_MODEL` para interpretação fechada de trajetória, com registry próprio `trajectory-evidence-1.1.0`. Não reutiliza pesquisa Web nem budgets do Knowledge. A decisão do PO em 25/09 («siga o parser») torna limites da conta/projeto OpenAI a autoridade financeira, sem teto monetário paralelo; concorrência, timeout, lease e cooldown de falhas são operacionais. O modelo configurado entra na chave e o modelo retornado é registrado; alias mutável continua uma limitação para futuras chamadas, não motivo para reescrever avaliações persistidas. Ativação depende da evidência do piloto no AoT M8.3, sem alegar validação para todas as ocupações.

M7.3 reutiliza o modelo configurado do Knowledge Agent para normalização de competências declaradas (`declared-competency-normalization-1.0.0`). Recebe apenas termos minimizados, sem Perfil/currículo integral ou identificadores; sem ferramentas/pesquisa, `store:false`, Structured Outputs e cobertura integral validada. Uma chamada por tentativa, com reserva auditada dentro dos limites existentes, timeout 90 s, opt-in organizacional e fallback determinístico explicitamente parcial quando a chamada falha. Nomes produzidos são buscas a reconciliar com aliases aprovados, nunca criação de conceito. Evidência: ADR-063 e AoT M7.3. Este movimento não troca o modelo nem altera a política financeira do Parser IA.

M7.5 mantém provider, modelo, prompt, schema e política de minimização do M7.3, mas separa o teto de normalização dos tetos de pesquisa do Knowledge Agent. Os limites iniciais são 20 chamadas/dia e 200/mês, configurados server-side; ausência, zero, valor inválido ou esgotamento falham fechado. A tentativa falha permanece auditada e o último resultado completo continua como base. Evidência: ADR-066 e AoT M7.5.

Troca é material. Exige nova versão, golden tests, prompt injection tests, comparação de omissões/alucinações, custo, média e p95, compatibilidade de schema, privacidade/subprocessador, fallback, QA e aprovação. Alias mutável não é suficiente para reprodução; quando disponível, registrar snapshot técnico.

## Dados e segurança

Enviar somente campos mínimos. Documentar região, retenção, treinamento, subprocessadores e política de exclusão. Secret fica somente em backend/secret store. Modelo não recebe autoridade para autorização, mutação sensível ou decisão de contratação.

## Referências oficiais

A política geral de custo versus capacidade deve ser revalidada no catálogo oficial do fornecedor. Para OpenAI, consultar `https://developers.openai.com/api/docs/models` no momento da seleção; esse link não aprova um modelo para o Prisma.
