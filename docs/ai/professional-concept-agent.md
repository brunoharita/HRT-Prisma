# Prisma Knowledge Agent

Contrato `knowledge-research-1.0.0`, prompt `knowledge-agent-1.0.0`, schema `knowledge-proposal-1.0.0` e policy `trusted-sources-1.0.0`.

O provider recebe somente `{ term, language, scope }`. Nome, contato, texto de currículo, `person_id`, `organization_id`, paths e metadata privada são proibidos. O termo é bloqueado quando contém padrões de email, telefone, CPF, UUID ou URL. Termos internos só podem sair quando `allow_external_knowledge_enrichment = true`; o default é `false`.

A ordem lógica é Knowledge da empresa, Global Knowledge, aliases/mappings, snapshots CBO/ESCO/O*NET e, por último, Web Search em fontes aprovadas. Uma fonte primária oficial sustenta proposta. Sem fonte oficial, são necessárias duas fontes secundárias independentes previamente aprovadas.

A implementação OpenAI usa Responses API, Web Search, domínio filtrado, Structured Outputs por JSON Schema, limite explícito de saída e `store: false`. Modelo é configuração server-side e deve ser aprovado conforme `model-policy.md`. Resposta e URLs são pós-validadas contra as citações efetivamente retornadas pelo Web Search; classe e publisher vêm do catálogo aprovado, não da afirmação do modelo. Página web é input não confiável e não pode alterar policy, pedir secret, publicar conceito ou adicionar domínio.

Sem `OPENAI_API_KEY`, modelo, flag explícita e caps positivos, o provider falha de forma segura como `implemented, not activated`. Testes obrigatórios usam fixture/mock; o gate local não chama LLM nem web.
