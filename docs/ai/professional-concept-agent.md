# Prisma Knowledge Agent

Contrato `knowledge-research-1.0.0`, prompt `knowledge-agent-1.0.0`, schema `knowledge-proposal-1.0.0` e policy `trusted-sources-1.0.0`.

O provider recebe somente `{ term, language, scope }`. Nome, contato, texto de currículo, `person_id`, `organization_id`, paths e metadata privada são proibidos. O termo é bloqueado quando contém padrões de email, telefone, CPF, UUID ou URL. Termos internos só podem sair quando `allow_external_knowledge_enrichment = true`; o default é `false`.

A ordem lógica é Knowledge da empresa, Global Knowledge, aliases/mappings, snapshots CBO/ESCO/O*NET e, por último, Web Search em fontes aprovadas. Uma fonte primária oficial sustenta proposta. Sem fonte oficial, são necessárias duas fontes secundárias independentes previamente aprovadas.

O resolver 2.0.0 é determinístico e anterior ao agente: alias Organization aprovado, depois termo Global de versão publicada, sempre por igualdade normalizada exata. Prefixo e substring retornam apenas sugestões para revisão. O agente não publica alias, não escolhe entre candidatos ambíguos e não transforma relação semântica em equivalência.

A implementação OpenAI usa Responses API, Web Search, domínio filtrado, Structured Outputs por JSON Schema, limite explícito de saída e `store: false`. Modelo é configuração server-side e deve ser aprovado conforme `model-policy.md`. Resposta e URLs são pós-validadas contra as citações efetivamente retornadas pelo Web Search; classe e publisher vêm do catálogo aprovado, não da afirmação do modelo. Página web é input não confiável e não pode alterar policy, pedir secret, publicar conceito ou adicionar domínio.

Sem `OPENAI_API_KEY`, modelo, flag explícita e caps positivos, o provider falha de forma segura como `implemented, not activated`. Testes obrigatórios usam fixture/mock; o gate local não chama LLM nem web.

## Modo contextual de Vagas

O mesmo Knowledge Agent aceita `vacancy-advisor-request-1.0.0`. Esse modo não cria conceito nem proposta Knowledge. Ele pesquisa somente quando a interface identifica dependência de informação atual, recebe pergunta, título, área, idioma e data, e nunca recebe Perfil, currículo, Pessoa, nome da organização, missão, responsabilidades ou contexto interno.

O prompt `vacancy-advisor-web-1.0.0` e o schema `vacancy-advisor-market-answer-1.0.0` separam síntese factual, recomendação e ressalvas. Toda fonte retornada deve estar tanto nas citações reais do Web Search quanto no catálogo aprovado; publisher, classe e instante de consulta são definidos pelo servidor. Uma fonte oficial basta; sem fonte oficial, são necessárias duas secundárias independentes. O resultado fica em cache tenant-scoped por 24 horas e o ledger não persiste a pergunta.
