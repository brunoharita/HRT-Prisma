# AoT — Correção acadêmica v2.0.12

Contrato congelado: `docs/qa/agreement-profile-education-read-fix.md` v1.0.0; baseline2ad6afa85418d76d2f77c8c43d50cde970b45511, aplicação7db478f. Correção autorizada em06/10/2026; branchcodex/profile-education-read-fix.

## Matriz de acordos

| ID | Implementação | Teste/evidência | Status / limitação |
| --- | --- | --- | --- |
| D-01 | readEducation passa metadados válidos ao resolvedor existente | profileEducationRepository.test percorre método real/decoder/canônica/card; baseline reproduz card vazio; snapshot/método/fontes/revisão preservados | PASS sintético sem rede |
| D-02 | títulos de qualificação, empates e fallback genérico | MBA/spec explícitos/revisados; legado/andamento/inferido/string true/metadata inválida; profileHighlights | PASS |
| D-03 | layout/4cards/8respostas/origens preservados |6UI1448/390 com loadPersonProfile real contra transporte sintético; identidade/experiências/versão; sem fetch IA | PASS no escopo, Pessoa real NOT TESTED |
| D-04 | método1.0.1, produto2.0.12; docs/testes/build |49testes PASS; tipos raiz/web/build PASS; CI/main/web/smoke/contextos pendentes | PARTIAL até publicação |

## Proibições e fora de escopo

P-01 PASS: teste negativo impede string true e inferência não revisada; metadata inválida continua desconhecida. Transporte rejeita leitura sem tenant/subject, conta as mesmas7operações; nenhuma operação de escrita. Diff não altera RLS/SQL/IA/matching/Parser/worker nem snapshots persistidos. F-01 PASS: sem backfill/taxonomia/dependência/PII real/suíte integral local. Snapshot acadêmico válido preservado, conteúdo malformado descartado pelo resolvedor existente.

## Mapa de impacto e preservação

| Capacidade | Relação | Baseline / regressão / evidência | Status |
| --- | --- | --- | --- |
| Repositório/card | direct | Baseline reproduz vazio; caminho real corrigido preserva metadata e títulos; testes | PASS |
| View canônica/Perfil completo | plausible_indirect | Identidade, contato disponível, experiências, versão e metadados acadêmicos; testes do caminho real | PASS projeção; tela completa real NOT TESTED |
| Tenant/escopo de leitura | critical_transversal | Mock exige org/person/profile; nenhum novo acesso, teste/diff | PASS na fronteira afetada; RLS inalterada |
| Outros cards/seções/fontes | plausible_indirect |4cards/8seções/sem provider, origem da formação;6reports/render1448/390 | PASS |
| Registry/main/web | direct |2.0.12 inalterado/teste registry; build; publicação pendente | PARTIAL |
| SQL/IA/matching/Parser/worker | no_impact_identified | Diff reutiliza classificador somente para leitura; plano/saúde VPS pendentes | PARTIAL até prova operacional |

Novidade: nenhuma metadata perdida; título explicita qualificação, mantendo nível genérico quando desconhecida. Preservação: confirmação humana/aceitação explícita já registradas, inferência não revisada indisponível; todos os cursos empatados, fontes e respostas. Nenhuma relação reclassificada. QA sintético não prova jornada autenticada real ou veracidade curricular universal.

## Fidelidade visual

Screenshot do incidente é contraexemplo. Referência normativa continua acordo2.0.12: quatro cards desktop, coluna mobile e respostas completas. Mesmo viewport1448/390 e dados fictícios no caminho real, renders `docs/qa/evidence/profile-education-read-fix/education-explicit-1448.png` e `education-reviewed-390-full.png`. Comparação visual direta confirma hierarquia/topologia/alinhamento/ordem/ações; única mudança autorizada é qualificação no título e conteúdos corretos antes ausentes. Reports seis cenários no mesmo diretório. Dados reais do screenshot não são fixtures.

## Validação / Git / ambientes

49testes dirigidos: profileEducationRepository, profileHighlights, educationClassification, productRelease. Tipos raiz/web e buildweb PASS. Avisos preexistentes de chunk grande/import dinâmico sem mudança de divisão. Nenhuma suíte completa local. Contexto/CI/publicação/smoke/sincronização pendentes.

## Desvios / conclusão

Nenhum desvio de produto identificado. Fonte do diagnóstico: código e leitura produtiva limitada ao Perfil vigente de Bruno no turno anterior; nenhum dado real versionado. Implementação comprovada sinteticamente; não declarar fechamento de D-04 antes da publicação.
