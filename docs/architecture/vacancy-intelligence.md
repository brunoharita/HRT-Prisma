# Arquitetura de Vagas M5.4

## Reuso

A implementação reutiliza `job_roles`, `positions`, `vacancies`, `vacancy_requirements`, `professional_profiles`, profile-discovery, Knowledge, eventos e RLS. Não existe cadastro paralelo de Pessoa, Perfil, competência ou ocupação.

## Persistência

- `vacancies` mantém a identidade atual e aponta para `current_version_id`.
- `vacancy_versions` preserva snapshots imutáveis da definição.
- `vacancy_requirements.stable_id` mantém a identidade conceitual de um requisito entre versões.
- `vacancy_requirement_relations` registra sinais relacionados confirmados, com origem, ator, instante e versão da Vaga.
- `vacancy_requirement_dimension_feedback` audita somente correções humanas de dimensão e alimenta o `knowledge_inbox` existente no escopo da organização; não publica nem altera Knowledge Global.
- `positions.occupant_person_id` representa a Pessoa atual somente quando a posição está `occupied`.
- `match_evaluations.vacancy_version_id` prende cada avaliação à definição usada.
- `vacancy_events` registra metadados operacionais, sem copiar Perfil ou currículo.
- `vacancy_advisor_research_runs` registra organização, ator, versões, consumo, resposta e fontes da pesquisa, sem armazenar a pergunta, Perfil ou PII no metadata do assunto.

`save_vacancy_definition` é a fronteira autoritativa de escrita. A RPC valida papel, tenant, Pessoa ocupante, referência Knowledge, listas, categorias e relações; cria posição e primeira versão ou acrescenta uma nova versão sem reescrever a anterior.

## Matching

O cliente pagina todos os Perfis publicados do tenant por meio da fundação de profile-discovery, em ordem estável, e informa quantos foram analisados do total acessível. Não existe teto silencioso. A descoberta ocupacional é separada da aderência detalhada: referência oficial, alias/relação Knowledge aprovada, título profissional e cargos de experiências podem explicar por que uma Pessoa apareceu. Aproximação textual permanece possível relação até confirmação humana, auditada no `match_evaluations` existente.

Cada requisito consulta somente a dimensão canônica correspondente. Igualdade textual ou canônica publicada pode atender; substring na dimensão correta é parcial; relação confirmada permanece `related_signal`; campos narrativos nunca comprovam requisito. Requisito `unclassified` continua permitido apenas no rascunho, mas não bloqueia a descoberta: a UI mostra a pendência e mantém a aderência detalhada incompleta. Todo Perfil publicado elegível é analisado, porém Perfis sem relação ocupacional, evidência direta, parcial, sinal relacionado ou confirmação humana não são retornados.

## Assistência

`vacancy-structure-deterministic-1.0.0` identifica somente padrões locais explícitos e separa derivações visíveis, inicialmente desmarcadas. O Assistente contextual compõe `Na sua empresa` deterministicamente a partir da Vaga aberta, Vagas e funções já autorizadas na tela e conceitos/relações publicados visíveis pela RLS; a composição não usa Web Search, agente ou mutação. O estado explícito é `sufficient`, `partial` ou `insufficient`; a insuficiência não é inferência negativa. Toda pergunta não vazia aciona por padrão o modo `vacancy_advisor` do Knowledge Agent para o bloco separado de mercado; somente a escolha explícita `Somente fontes internas` impede a chamada. O provider recebe pergunta, título, área, idioma e data, sem Perfis, Pessoas, organização ou descrição interna da Vaga. Web Search é server-side, limitado a fontes aprovadas, Structured Output, `store: false`, orçamento compartilhado e cache tenant-scoped de 24 horas. Respostas acima do limite de apresentação são compactadas sem perder a análise interna nem descartar fontes validadas. Falha externa preserva integralmente a leitura interna. Resposta, recomendação e fontes permanecem orientativas e não alteram a Vaga automaticamente.

`vacancy-structure-profile-aligned-2.1.0` estrutura somente a descrição fornecida: narrativa fica em Sobre a posição, responsabilidades e resultados; contexto relevante é consolidado em Sobre a posição. O Prisma propõe a dimensão, mas nunca a obrigatoriedade. A matriz versionada [Perfil ↔ Vaga](vacancy-profile-matrix.md) é a fonte única dessa correspondência. `structure_source` preserva texto original e offsets/metadados por item na versão imutável, sem PII de Pessoa, Web Search ou enriquecimento. A reestruturação compara delta e preserva correções humanas e requisitos manuais.

## Compatibilidade e rollback

Vagas históricas recebem versão inicial sem alterar sua identidade. A UI pode ser retirada e a execução da RPC revogada sem apagar os snapshots. Avaliações existentes sem `vacancy_version_id` continuam legíveis; novas avaliações da M5.4 sempre informam a versão.
