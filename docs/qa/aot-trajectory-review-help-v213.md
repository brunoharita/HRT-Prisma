# AoT: ajuda na revisão de divergências v2.1.3

Contrato integral `agreement-trajectory-review-help-v213.md` 1.0.0 e execução correspondente. Baseline `98830fd`, produção v2.1.2. Mapa e capacidades protegidas registrados no acordo antes da implementação.

| ID | Implementação | Evidência | Estado |
| --- | --- | --- | --- |
| D-01 | Descrição sempre visível e Popover por hover/foco, clique/Enter explícito, Escape e Fechar ajuda | Browser real: 969/390/320, descrição associada ao rádio, Tab/Enter/Escape/toque; imagens antes/depois | PASS |
| D-02 | Ajuda das 12 categorias válidas e da indeterminação, impacto condicionado à evidência | Browser cobre todas as categorias; 138 testes dirigidos de revisão/semântica/score/registry | PASS |
| D-03 | Aviso ao salvar e fluxo existente preservado | Browser: gate parcial/integral, payload exato, indeterminação/conclusão, não autorizado/legado/excesso/erro | PASS |
| D-04 | Registry v2.1.3, main/produção seletiva | CI branch/main, HTTP/assets/SHA/infra e produção verificados | PASS |
| P-01 | Ajuda não escolhe/salva/reprocessa; sem mudança no matching/score/serviço/banco/IA | Browser registra zero chamadas novas ao abrir ajuda; diff/revisão e testes dirigidos | PASS |

## Validação e limites

Somente dados sintéticos para gravação/revisão nos testes. Nenhuma IA paga ou teste mutacional sobre Pessoa real. Browser usa o componente real, Ant Design, tema/reset/foundation de produção e adaptador de serviço sintético, bloqueando tráfego externo. 13 cenários/140 verificações PASS, sem erro runtime nem chamada externa. Abrir ajuda não altera escolhas, payload, contador ou callbacks; Fechar ajuda/Escape preservam o modal. Indeterminação chama o mesmo salvamento, mantém a tela e não aciona resolução. Conclusão íntegra mantém payload/callback existentes. Testes semânticos comprovam preservação real do cálculo; o stub de browser não pretende recalcular score.

Referência é baseline da arquitetura visual. Imagens `before-top/choice-969/390.png` usam componente/CSS do Git `98830fd`; `after-top/choice-969/390.png` usam o componente alterado com o mesmo cenário, tema, dados e viewport. `help-open-969/390/320.png` mostra a ajuda, e `after-*-320.png` documenta reflow estreito. Inspeção visual confirmou pergunta/trecho/pares, corpo rolável e rodapé persistente; a classificação ganha três linhas para acomodar descrições, conforme a proposta aprovada. Sem desvio material identificado. Não se alega identidade de texto/Pessoa com a captura privada fornecida. Evidências em `docs/qa/evidence/trajectory-review-help-v213/`.

A validação detectou interferência entre foco e toggle de clique no Popover: foco/clique simultâneos podiam fechar a ajuda. Corrigido com hover/foco no Popover e abertura explícita no botão; Escape e Fechar ajuda encerram. O teste aguarda conteúdo e animação antes de medir/capturar. Comparação foi refeita com o tema real do Prisma. Tipos/build e 138 testes dirigidos PASS; lint (974 arquivos), foundation, Context Pack e diff-check PASS. CI/produção verificados por smoke público/infra; jornada autenticada real NOT TESTED.

## Publicação, preservação e fechamento

D-01 a D-04 e P-01 PASS, sem desvio de contrato. CI branch37614002658 e main37614117438 success. SHA funcional 30d4f792615b2beaf96f641ca757cded394a1547 em main/origin/VPS, somente web publicada. Imagem sha256:c1d54ee059f7970a61d19fb15da45ee8777c390549cc2ef53d47dcd865833d38, running/0, entry /assets/index-cFAsS5C0.js, CSS /assets/index-CYOKCXBz.css.

19 HTTP200, 7 checks de SHA/versão/ajuda/visual/assets e 7 de infraestrutura PASS. Parser/Synthesis/gateway mantêm IDs/imagens/reinícios; workers healthy. Rollback prisma-web:rollback-before-30d4f792615b conserva imagem sha256:931e15b9f40ce8ba7b7e52950d3723ded3ba794d32c5708e4847be9e44ab5991. Banco/Edge/IA permanecem fora dos destinos do plano.

Smoke imediato do deploy retornou HTTP404 durante a recriação, fazendo dispatcher sair1/SSH22. Estabilização e smoke independente PASS sem reconstrução adicional. Evidências release-plan.json, release.json, production-smoke.json, infrastructure.json e imagens/browser-results.json neste diretório. Não confundir HTML200 com interação autenticada: esta continua NOT TESTED em produção, enquanto componente real/fluxos sintéticos e publicação dos marcadores de ajuda foram verificados.

Context Pack gerado/conferido em espelho dos rastreados mais documentos próprios, sem incorporar arquivos locais alheios. Referências históricas do CurrentState preservadas integralmente ao baseline anterior, conferidas na revisão final antes do push. Servidores de teste desta tarefa encerrados. Fechamento documental sincroniza Git por fast-forward sem reconstruir o runtime validado; arquivos locais alheios permanecem fora dos commits.
