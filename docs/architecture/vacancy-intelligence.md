# Arquitetura de Vagas M5.4

## Reuso

A implementação reutiliza `job_roles`, `positions`, `vacancies`, `vacancy_requirements`, `professional_profiles`, profile-discovery, Knowledge, eventos e RLS. Não existe cadastro paralelo de Pessoa, Perfil, competência ou ocupação.

## Persistência

- `vacancies` mantém a identidade atual e aponta para `current_version_id`.
- `vacancy_versions` preserva snapshots imutáveis da definição.
- `vacancy_requirements.stable_id` mantém a identidade conceitual de um requisito entre versões.
- `vacancy_requirement_relations` registra sinais relacionados confirmados, com origem, ator, instante e versão da Vaga.
- `positions.occupant_person_id` representa a Pessoa atual somente quando a posição está `occupied`.
- `match_evaluations.vacancy_version_id` prende cada avaliação à definição usada.
- `vacancy_events` registra metadados operacionais, sem copiar Perfil ou currículo.
- `vacancy_advisor_research_runs` registra organização, ator, versões, consumo, resposta e fontes da pesquisa, sem armazenar a pergunta, Perfil ou PII no metadata do assunto.

`save_vacancy_definition` é a fronteira autoritativa de escrita. A RPC valida papel, tenant, Pessoa ocupante, referência Knowledge, listas, categorias e relações; cria posição e primeira versão ou acrescenta uma nova versão sem reescrever a anterior.

## Matching

O cliente carrega apenas Perfis publicados do tenant por meio da fundação de profile-discovery. Evidência direta e equivalência canônica publicada podem atender um requisito. Relações confirmadas na Vaga permanecem `related_signal`, sem promoção para Knowledge e sem equivalência forte. Resultados sem nenhum sinal rastreável não são exibidos na descoberta automática.

## Assistência

`vacancy-structure-deterministic-1.0.0` identifica somente padrões locais explícitos e separa derivações visíveis, inicialmente desmarcadas. O Assistente contextual mantém a leitura interna determinística e aciona o modo `vacancy_advisor` do Knowledge Agent somente quando a pergunta depende de informação atual de mercado. O provider recebe pergunta, título, área, idioma e data, sem Perfis, Pessoas, organização ou descrição interna da Vaga. Web Search é server-side, limitado a fontes aprovadas, Structured Output, `store: false`, orçamento compartilhado e cache tenant-scoped de 24 horas. Resposta, recomendação e fontes permanecem orientativas e não alteram a Vaga automaticamente.

## Compatibilidade e rollback

Vagas históricas recebem versão inicial sem alterar sua identidade. A UI pode ser retirada e a execução da RPC revogada sem apagar os snapshots. Avaliações existentes sem `vacancy_version_id` continuam legíveis; novas avaliações da M5.4 sempre informam a versão.
