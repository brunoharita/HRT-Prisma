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

Cada requisito comparável consulta exclusivamente sua dimensão correspondente, preservando termo, campo, origem e conceito Knowledge quando disponível. Correspondência exata ou canônica pode ser `met`; substring ou aproximação na mesma dimensão é `partially_met`; narrativa nunca comprova requisito. A ausência de dimensão na Vaga não cria gap na Pessoa, e requisitos ainda sem classificação não impedem que os Perfis publicados sejam descobertos.
