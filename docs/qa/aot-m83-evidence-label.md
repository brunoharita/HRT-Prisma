# AoT — rótulo de ausência de evidência

Acordo e execução homônimos v1.0.0; baseline/mapa no acordo.

| Acordo | Implementação e evidência | Status |
| --- | --- | --- |
| D-01/D-02 | Três testes dirigidos PASS; smoke local autenticado e inspeção visual confirmam título/descrição aprovados | PASS |
| D-03/P-01 | Diff restrito à apresentação; 11 itens e 47/100 preservados; publicação pendente | PARTIAL |

Escopo somente web/documentação. Tipos raiz/web, build web, três testes `matchingEvidenceLabel`, geração/check de contexto e diff check PASS. A mudança de runtime é de duas linhas JSX: título/descrição do bucket e suporte opcional à descrição. Nenhum algoritmo, dado, fonte, classificação, CSS ou contrato persistido alterado. Tela local autenticada: Bruno/Diego continuam 47/100, cobertura 50%, 11 itens; outros buckets e C recolhido preservados. Inspeção visual em 1265×712 confirmou quatro colunas, quebra natural do novo texto e ausência de sobreposição. Captura registrada na tarefa; nenhuma ação humana de confirmação executada.

Publicação pendente. Resíduos alheios preservados: `.tmp.driveupload/`, `services/paddle/Dockerfile.gpu`, `tests/matchingRuntime (1).test.ts`.
