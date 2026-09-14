# Matriz canônica Perfil Prisma ↔ Vaga

Contrato: `vacancy-structure-profile-aligned-2.1.0`. Fonte profissional: `professional-profile` 5.0.0. A Vaga reutiliza `vacancy_versions` e `vacancy_requirements`; não cria um segundo Perfil nem altera Pessoas.

| Dimensão Perfil | Campo Vaga | Tipo | Matching | Natureza | Multiplicidade | Knowledge | Ausência |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `professionalTitle` | referência ocupacional/título | direct | sim, quando resolvida | comparável | um | aplicável | definido explicitamente ou pendente |
| `experiences` | requisito `experience` | direct | sim | comparável | lista | aplicável | sem requisito |
| `competencies` | `competency`/`knowledge` | direct | sim | comparável | lista | aplicável | sem requisito |
| `toolsAndTechnologies` | `technology` | direct | sim | comparável | lista | aplicável | sem requisito |
| `education` | `education` | direct | sim | comparável | lista | aplicável | sem requisito |
| `certifications` | `certification` | direct | sim | comparável | lista | aplicável | sem requisito |
| `languages` | `language` | direct | sim | comparável | lista | aplicável | sem requisito |
| `professionalObjective` | Sobre a posição | contextual | não | narrativo | um | não | vazio |
| `experiences` | responsabilidades | derived | não | narrativo | lista | não | vazio |
| `keyResults` | resultados esperados | contextual | não | narrativo | lista | não | vazio |
| `professionalContexts` | consolidado em Sobre a posição | contextual | não | narrativo | lista | não | vazio |

Narrativa não é requisito automático. A relação ocupacional é calculada separadamente da aderência detalhada e pode usar referência oficial, alias publicado, relação Knowledge aprovada, título profissional e cargos de experiências. Uma relação textual aproximada aparece apenas como possibilidade e exige confirmação humana.

As linhas indicam a organização preferencial e a proveniência, não uma barreira de recuperação. Cada requisito comparável consulta todo o conteúdo profissional publicado e preserva o campo real, a origem e o conceito Knowledge quando disponível. Termo explícito delimitado e não negado ou equivalência canônica pode ser `met` para requisito genérico; correspondência parcial ou termo sem o nível exigido é `partially_met`. A definição narrativa da Vaga nunca comprova requisito da Pessoa. A ausência de dimensão na Vaga não cria gap na Pessoa, e requisitos ainda sem classificação não bloqueiam a análise. Um Perfil só é retornado quando ao menos uma relação ou evidência rastreável existe, ou quando há confirmação humana anterior.
