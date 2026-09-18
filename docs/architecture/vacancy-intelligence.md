# Arquitetura de Vagas M5.4

## Extensão local M7.1

O fluxo novo usa `save_position_taxonomy`, que envolve `save_vacancy_definition` e `record_vacancy_structure_source` na mesma transação. A fronteira de autorização legada continua ativa. `taxonomy_snapshot` na versão imutável registra `position-taxonomy-1.0.0`; a nova definição recebe `vacancy-definition-1.3.0`. `taxonomy_origin` no requisito conserva os vínculos da seleção explícita. Não existe nova entidade de Posição ou obrigação paralela.

Ao copiar Posição anterior, `sourceVacancyId` conserva a linhagem e a definição original mantém a descrição assistida; a cópia não se declara uma nova extração assistida. Selecionar função também não carrega a descrição assistida do rascunho substituído. Isso preserva o contrato da RPC de proveniência na transação nova. Falha de proveniência causa rollback integral, coberto pela verificação SQL.

`preview_position_taxonomy` consulta somente Knowledge aprovada/escopada e fontes oficiais correntes; é read-only. `search_position_taxonomy` pagina opções (25) para decisão humana, nunca normaliza por substring. `create_position_knowledge_complement` reutiliza o overlay e a governança Inbox/proposta/aprovação, sem argumento de escopo Global. Funções privadas não são executáveis pelo cliente. `expectedVersionId` é obrigatório ao editar e rejeita conflito; a prévia enviada pelo browser não é autoridade. O ledger ocupacional registra cada versão e o histórico da UI pagina snapshots em lotes de 20.

Aliases/identidades aprovadas e fontes/métricas/versões ficam no snapshot. Título e requisitos humanos não são substituídos pela referência. Correção alimenta Inbox da empresa quando aplicável, sem publicar alias automaticamente. Decisão humana mantida conserva ator/instante próprios, separados do autor da nova versão. NULL continua histórico sem M7.1; desconhecido/inválido falha fechado. Rollback e ordem de ativação no ADR-060. Migration aplicada somente em PostgreSQL local descartável nesta entrega.

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

No matching 5.0.0, a trajetória define A (direta), B (relacionada/transferível) e C (sinais contextuais) antes dos requisitos (ADR-057). Cada requisito continua consultando conteúdo profissional publicado, independentemente da categoria: termo explícito, delimitado e não negado ou equivalência aprovada pode sustentar requisito genérico. Correspondência parcial/nível não comprovado exige revisão; relação confirmada permanece sinal relacionado. Descrição e taxonomia da Posição nunca são evidência da Pessoa. Item unclassified histórico não bloqueia descoberta, mas mantém a leitura incompleta; novos salvamentos exigem classificação conforme M6.1.

O score 1.2.0 é derivado em memória somente para A/B; C conserva score null e não é compatibilidade competitiva. A ordenação respeita grupo, score decrescente (inclusive provisório identificado), decisão humana e desempate por nome/ID. O domínio puro não busca dados, chama IA ou muta fontes. M7.1 preserva fórmula, pesos e entrada de Pessoas; seus metadados são proveniência, não features adicionais de score.

Evidência Demonstrada M5.1 ativa é carregada em lote na fronteira Supabase já autorizada e mapeada por competência exata e versões reconhecidas. Esse carregamento não faz parte da função de score, respeita RLS existente e não concede bônus. O resultado derivado pode ser persistido como snapshot dentro de `match_evaluations` quando o operador abre a explicação; não existe tabela, migration ou cache de score.

## Assistência

`vacancy-structure-deterministic-1.0.0` identifica somente padrões locais explícitos e separa derivações visíveis, inicialmente desmarcadas. O Assistente contextual compõe `Na sua empresa` deterministicamente a partir da Vaga aberta, Vagas e funções já autorizadas na tela e conceitos/relações publicados visíveis pela RLS; a composição não usa Web Search, agente ou mutação. O estado explícito é `sufficient`, `partial` ou `insufficient`; a insuficiência não é inferência negativa. Toda pergunta não vazia aciona por padrão o modo `vacancy_advisor` do Knowledge Agent para o bloco separado de mercado; somente a escolha explícita `Somente fontes internas` impede a chamada. O provider recebe pergunta, título, área, idioma e data, sem Perfis, Pessoas, organização ou descrição interna da Vaga. Web Search é server-side, limitado a fontes aprovadas, Structured Output, `store: false`, orçamento compartilhado e cache tenant-scoped de 24 horas. Respostas acima do limite de apresentação são compactadas sem perder a análise interna nem descartar fontes validadas. Falha externa preserva integralmente a leitura interna. Resposta, recomendação e fontes permanecem orientativas e não alteram a Vaga automaticamente.

`vacancy-structure-profile-aligned-2.1.0` estrutura somente a descrição fornecida: narrativa fica em Sobre a posição, responsabilidades e resultados; contexto relevante é consolidado em Sobre a posição. O Prisma propõe a dimensão, mas nunca a obrigatoriedade. A matriz versionada [Perfil ↔ Vaga](vacancy-profile-matrix.md) é a fonte única dessa correspondência. `structure_source` preserva texto original e offsets/metadados por item na versão imutável, sem PII de Pessoa, Web Search ou enriquecimento. A reestruturação compara delta e preserva correções humanas e requisitos manuais.

## Compatibilidade e rollback

Vagas históricas recebem versão inicial sem alterar sua identidade. A UI pode ser retirada e a execução da RPC revogada sem apagar os snapshots. Avaliações existentes sem `vacancy_version_id` continuam legíveis; novas avaliações da M5.4 sempre informam a versão.
