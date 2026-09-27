# AoT — rótulo de ausência de evidência

Acordo e execução homônimos v1.0.0; baseline/mapa no acordo.

| Acordo | Implementação e evidência | Status |
| --- | --- | --- |
| D-01/D-02 | Três testes dirigidos PASS; smoke local autenticado e inspeção visual confirmam título/descrição aprovados | PASS |
| D-03/P-01 | Diff restrito à apresentação; 11 itens e 47/100 preservados em produção; main, CI e deploy web confirmados | PASS |

Escopo somente web/documentação. Tipos raiz/web, build web, três testes `matchingEvidenceLabel`, geração/check de contexto e diff check PASS. A mudança de runtime é de duas linhas JSX: título/descrição do bucket e suporte opcional à descrição. Nenhum algoritmo, dado, fonte, classificação, CSS ou contrato persistido alterado. Tela local autenticada: Bruno/Diego continuam 47/100, cobertura 50%, 11 itens; outros buckets e C recolhido preservados. Inspeção visual em 1265×712 confirmou quatro colunas, quebra natural do novo texto e ausência de sobreposição. Captura registrada na tarefa; nenhuma ação humana de confirmação executada.

## Publicação e smoke em 27/09/2026

Runtime `91db60f298baf9b2e7d004ea18316223ec9c5ecc`, main/origin e VPS no SHA funcional. CI [36320731488](https://github.com/brunoharita/HRT-Prisma/actions/runs/36320731488) PASS. Dispatcher publicou somente prisma-web; banco/Edge/parser não acionados. Imagem `sha256:f78ed4ffefd156e323e5b6bed11a469ae78a471d8c8cad28125a1edc3393e83f`, running, zero reinícios. O probe imediato teve 404 durante a troca; verificação posterior HTTPS 200, sem repetir deploy. Rollback `prisma-web:rollback-before-91db60f298ba` preservado.

Smoke autenticado e captura em produção, mesmos dados e viewport 1265×712 do local: título exato com 11, explicação exata, quatro categorias na ordem original, quebra natural e nenhuma sobreposição. Bruno/Diego mantêm 47/100; C recolhido. Capturas local e produção registradas na tarefa. Sem decisões humanas, alteração de dados ou novas análises provocadas para teste. Outros rótulos e banners não foram revisados nesta correção. Desvios do acordo: nenhum. Fechamento documental posterior não exige republicar runtime.

Resíduos alheios preservados: `.tmp.driveupload/`, `services/paddle/Dockerfile.gpu`, `tests/matchingRuntime (1).test.ts`.
