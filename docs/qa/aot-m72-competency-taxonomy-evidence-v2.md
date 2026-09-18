# AoT — M7.2 v2 Taxonomia de Competências e Perfil de Evidências

Contrato: `agreement-m72-competency-taxonomy-evidence-v2.md` 2.0.0. Prompt: `execution-m72-competency-taxonomy-evidence-v2.md`. Baseline: `ccef68c05e10f3c35cf616f92f9a0d55c552a275`. Estado: `PARTIAL` enquanto o rollout remoto e seu smoke permanecem `NOT TESTED`.

## Agreements -> Implementation -> Test -> Evidence

| IDs | Implementação | Teste e evidência | Status |
| --- | --- | --- | --- |
| D-TAX-01, D-TAX-04, D-TAX-09 | `professional_taxonomy_releases` e Knowledge/Professional Concept compartilhados, com overlay existente preservado | QA SQL confirma releases e isolamento; ADR-065 e diff de schema | PASS |
| D-TAX-02, D-TAX-10, D-TAX-11 | release ocupacional `position-taxonomy-1.0.0` preservado, release de competência independente e RPCs V1/V2/V3 mantidas | `competencyTaxonomy.test.ts`; QA SQL; testes M7.1/M7.4 | PASS |
| D-TAX-03, D-TAX-05, D-TAX-06, D-TAX-12 | `knowledge_concept_type` ganha `competency`; tipos publicados e identidade tipada são reutilizados sem hierarquia ou catálogo paralelo | migration + teste de decoder e busca | PASS |
| D-TAX-07, D-TAX-08 | loader cross-domain expõe relação, fonte, versão, atributos e `createsPersonalEvidence=false`; V4 rejeita ocupação | QA SQL e teste negativo `M7.2 rejeita ocupação` | PASS |
| D-DATA-01, D-DATA-02, D-DATA-04 | release nasce apenas quando já existem conceitos aprovados e reutiliza ESCO/O*NET/Knowledge publicados com proveniência existente | gate `COMPETENCY_TAXONOMY_EMPTY`; QA SQL e consulta de bootstrap | PASS |
| D-DATA-03, D-DATA-05, D-DATA-06 | nenhuma fonte/provider/IA nova; busca mantém ambiguidade e não deriva nível | diff de dependências/fontes; QA de ambiguidade e busca | PASS |
| D-PER-01, D-PER-02, D-PER-03, D-PER-04 | V4 deriva on-read do Perfil vigente e V3, sem reimportar, reescrever ou ler draft | QA SQL verifica V4 e JSON original inalterado; regressão dirigida | PASS |
| D-PER-05, D-PER-06, D-PER-07, D-PER-08 | associação conserva natureza, método, versão, decisão e demonstração; somente M5.1 vigente qualifica | testes de domínio e UI; V3 preservada | PASS |
| D-PER-09, D-PER-10, D-PER-11, D-PER-12 | ausência/issue neutro; sem gap isolado ou score; cadeia de proveniência permanece reconstituível | decoder, UI e busca estática negativa por score/proficiência | PASS |
| D-POS-01, D-POS-02, D-POS-03 | trigger valida conceito não ocupacional em requisito novo e registra a versão; histórico permanece `NULL`; nenhuma inserção automática | QA SQL com insert, bloqueio de ocupação e legado | PASS |
| D-POS-04, D-POS-05 | matching 5.0.0, score 1.2.0, A/B/C e ordenação não foram alterados; loader cross-domain é somente leitura | 40 testes dirigidos de `vacancyIntelligence` e diff | PASS |
| D-UX-01, D-UX-02, D-UX-03, D-UX-05, D-UX-13 | Resumo, Competências e Evidências preservam topologia, hierarquia, densidade, filtros, seleção, detalhe e disclosure das referências | inspeção CUA same-state/same-data no fixture local em desktop | PASS |
| D-UX-04, D-UX-06, D-UX-07, D-UX-08 | sem visual quantitativo; explicação mostra observado/canônico, origem, regra e versões; abertura espacial e fallback explícito | teste UI + inspeção visual | PASS |
| D-UX-09, D-UX-10 | estados existentes permanecem tipados e empty state neutro | testes UI/domínio e revisão de componentes | PASS |
| D-UX-11, D-UX-12 | cards/filtros/detalhe empilham em 390x844, ações persistem, headings/labels/controles são acessíveis sem hover | inspeção CUA 390x844 nas três abas e AX tree | PASS |
| D-SEC-01, D-SEC-02, D-SEC-03 | guards server-side, RLS e filtros Global/organização preservam tenant e papéis | QA SQL bloqueia outro tenant e autoridade; grants revisados | PASS |
| D-SEC-04, D-SEC-05, D-SEC-06 | Knowledge Global não recebe dados de Pessoa; migration e logs não copiam currículo/PII nem inferem sensíveis | diff de schema/runtime e QA SQL | PASS |
| D-SEC-07 | versão, contrato, tenant e domínio incompatíveis falham explicitamente | testes de decoder e SQL negativos | PASS |
| D-CUR-01, D-CUR-02, D-CUR-03 | busca filtra ocupação antes do limite, classifica resultados e não resolve parcial; query curta só aceita exato | QA SQL com `a`, prefixo, ambiguidade e ocupação; teste de domínio | PASS |
| D-CUR-04, D-CUR-05 | candidato traz tipo, termo, autoridade, aliases e referências; painel M7.4 preserva interação existente | testes `competencyTaxonomy` e `profileCompetencyCuration` | PASS |

## Proibições

| IDs | Prova negativa | Status |
| --- | --- | --- |
| P-01, P-02, P-03, P-04, P-05 | domínios/releases distintos; decoder e V4 rejeitam ocupação; relação não gera associação pessoal; sem catálogo paralelo | PASS |
| P-06, P-07, P-08, P-09, P-10 | trigger não cria requisito; UI/domínio sem score, nível ou gap isolado; verificado depende de M5.1 | PASS |
| P-11, P-12, P-13, P-14, P-15 | projeção aditiva preserva snapshots/proveniências, sem reimportação ou alteração de M5.1/matching | PASS |
| P-16, P-17, P-18, P-19, P-20 | nenhum Lominger, fonte/API/Web, parser/OCR, IA/provider ou dado sintético em runtime | PASS |
| P-21, P-22, P-23, P-24 | somente Perfil publicado; autorização negativa; explicação sem chain-of-thought; infraestrutura reutilizada | PASS |
| P-25 | local sem destruição, force push, custo ou mutação de Pessoa; rollout remoto ainda não executado neste snapshot | PASS |

## Critérios de aceite e regressão

- CA-TAX-01 a CA-TAX-07, CA-DATA-01 a CA-DATA-04, CA-PER-01 a CA-PER-08, CA-POS-01 a CA-POS-04, CA-SEC-01 a CA-SEC-04 e CA-CUR-01 a CA-CUR-02: `scripts/test-m72v2-postgres.ps1` terminou em `ROLLBACK` com todos os asserts `PASS`; 61 testes dirigidos passaram.
- CA-UX-01 a CA-UX-07: as três referências normativas foram comparadas com o fixture sintético na mesma composição de dados em desktop e 390x844. Desvio encontrado e corrigido: `Liderança técnica` estava tipada como ocupação no fixture; passou a `competency`, e o decoder agora bloqueia ocupações.
- CA-REG-01 a CA-REG-03: TypeScript raiz e web sem erro; build Vite passou com apenas os avisos preexistentes de chunks/import dinâmico; lint 568 arquivos e foundation 18 tabelas/6 versões passaram.
- CA-DOC-01: owner docs, ADR-065, contratos, Current State e Context Pack fazem parte do mesmo movimento; checker é requisito de fechamento.
- CA-AOT-01: todos os `D-*` e `P-*` aplicáveis estão acima. O movimento só muda para `PASS` após rollout, smoke e sincronização final.

## Evidência local executada

- `scripts/test-m72v2-postgres.ps1`: migrations M7.3/M7.4/M7.2 v2 e QA em PostgreSQL descartável; commit intermediário necessário para o enum; rollback integral ao fim.
- `node node_modules/typescript/bin/tsc -p tsconfig.json` e `-p web/tsconfig.json --noEmit`: PASS.
- `node --test` nos cinco artefatos compilados selecionados: 61/61 PASS.
- build web, lint, foundation e `git diff --check`: PASS; apenas aviso de conversão LF/CRLF do checkout.
- O loader opcional `tsx` não existe nas dependências e uma tentativa não executou testes; o fluxo oficial compilado foi usado e passou.

## Rollout e limites

- Migration Supabase: `NOT TESTED` remoto.
- Commit, `origin`, `main`, VPS e frontend: `NOT TESTED`.
- Smoke autenticado/read-only: `NOT TESTED`.
- Nenhuma curadoria humana, requisito real, importação ou publicação de Pessoa é criada automaticamente por este movimento.
