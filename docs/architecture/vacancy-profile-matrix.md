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

Narrativa não é requisito automático. Cada requisito comparável usa a categoria existente, termo observado e, quando disponível, conceito Knowledge. A ausência de dimensão na Vaga não cria gap na Pessoa.
