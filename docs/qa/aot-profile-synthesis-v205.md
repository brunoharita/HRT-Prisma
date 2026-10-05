# AoT — Síntese profissional v2.0.5

Acordo integral: `agreement-profile-synthesis-v205.md` v1.0.0, incluindo prompt e referências1/3. Baseline main/origin/VPS `6c5bf38051e29afe4e3fec209a0077d4274e81d8`, web66503ec, Parser8682af7, gatewayd061cea. Risco E/D. Autorização explícita de Bruno para implementar/publicar v2.0.5 e autorização permanente AGENTS seção7.

## Acordos -> implementação -> testes -> evidência

| ID | Implementação | Teste/evidência | Status |
| --- | --- | --- | --- |
| D-01 | Oito perguntas profundas fixas, schema, limites/naturezas | Contrato/fixtures/benchmark rich/sparse; `evidence/profile-synthesis/benchmark-*.json` | PASS |
| D-02 | Leitores TS e validatorSQL; fonte por afirmação; vazio=zeroIA | 20 testes worker/contrato; SQL rejeita missing/null/refs inventadas/replay; benchmark injeção | PASS |
| D-03 | Base/hash/snapshot/versão; resumo original; fonte sob demanda | SQL stale base + snapshot anterior + fonte autorizada; UI não faz eager fetch; identidade/contato omitidos | PASS |
| D-04 | Três tabelas/RLS/tenant/RPC, audit optional, lease/retry | Migração inteira aplicada novamente em transação QA, fixture rollback: auth/outsider/inativo/anon, duplicidade, fila vazia, falha optional/audit, lease, retry, exclusão | PASS |
| D-05 | Worker independente sem service_role; hash privado/segredoVPS; Responses | HTTP fake claim/provider/complete, bounded attempts, benchmark três chamadas; VPS running/healthy/idle, zero reinícios, sem portas; RPC/token inválido HTTP401 | PASS |
| D-UX-01 | Narrativa70/30, cartões contextuais, fonte60/40, disclosure/mobile | Seis estados x1416/390, fontes após clique/8 eixos/no overflow; renders no caminho abaixo | PASS |
| D-06 | v2.0.5, docs/ADR/contexto/release seletivo | Tipos/build/localQA dirigidos; CI branch37247895726/main37247963476 PASS; main/VPS497b2ee, migração/worker/web e smoke HTTPS PASS | PASS |

## Proibições

| ID | Evidência | Status |
| --- | --- | --- |
| P-01 | Rich/sparse/injection conferidos: sem score, contratação, personalidade, senioridade ou fato típico inventado; schema rejeita campo extra e verificação sem fonte | PASS |
| P-02 | Resultado separado do Perfil; nenhum write de fatos/Knowledge pelo worker; SQL tenant/role/exclusão; não houve publicação de Pessoa real de teste; segredo só na VPS, sem logging de corpo de erro | PASS |
| P-03 | Queue idempotente +3 tentativas; leitura/aba/rascunho fora do provider; Parser/matching sem mudança; falha opcional não bloqueia audit | PASS |
| F-01 | Parser/matching/Knowledge/Assessment como domínios preservados; só leitura elegível de evidências existentes | PASS |

## Mapa de impacto e preservação

| Capacidade | Relação | Baseline / regressão | Status |
| --- | --- | --- | --- |
| Síntese/IA/tela/dados | direct | Baseline sem sínteseIA; schema/worker/SQL/benchmark/renders | PASS local |
| Auth/tenant/persistência | critical_transversal | Leitor M72 reutilizado; roles negativas, fonte de outro tenant, grants, token/lease/replay, cascade no banco real local | PASS local |
| Publicação humana/resumo canônico | plausible_indirect | Eventos audit existentes; enqueue malformado não interrompe audit; person-flow proporcional | PASS local |
| Parser/matching | plausible_indirect | Nenhum arquivo funcional alterado; checker matching PASS; Parser8682af7/gatewayd061cea preservados em runtime | PASS |
| Release/docs | direct | Tipos/build/docs/Context Pack; CI, publicação seletiva/migração/worker/web e smoke | PASS |

## Evidência visual

Renders: `evidence/profile-synthesis/summary-1416.png`, `source-1416.png`, `summary-390.png`, `source-390.png`; demais estados/relatórios na mesma pasta. Referências: `references/profile-synthesis-01.png` e `profile-synthesis-03.png`.

Comparação manual: hierarquia narrativa antes das perguntas, principal70%/lateral30%, três contextos agrupados dentro da síntese, sustentação abaixo, perguntas na lateral; fonte aberta principal60%/fonte40%, afirmação selecionada azul, trecho com destaque e ação de origem quando documento existe. Mobile empilha, cabeçalho adapta e abas continuam roláveis sem overflow global. Textos/pessoas/contagens são ilustrativos. Preservar shell/componentes/tokens reais, conforme exceção explícita D-UX-01; não copiar navegação/logos inventados pelo gerador. Fonte é o snapshot do campo publicado, sem inventar coordenadas do PDF. Nenhum desvio material de composição identificado.

## Limites e evidência nova/preservação

Benchmark: 13.817/7.127/8.189ms; 1041/920/972 tokens de entrada; 1376/740/840 de saída. Schema/refs e revisão qualitativa local não estabelecem qualidade universal nem fairness. Nenhuma Pessoa real publicada/alterada para testar; jornada autenticada de Pessoa real NOT TESTED. Auth/RLS foram executados em PostgreSQL local, não apenas mocks. Health e smoke público não equivalem a leitura autenticada real. Relação opcional de vínculos exige tabela instalada; produção foi verificada somente por schema, sem exportar dados humanos.

## Publicação e preservação

SHA funcional `497b2ee6927c781dfe4bc21ac9f393944f89e766`: CI branch `37247895726` e main `37247963476` PASS. Migração remota `20261005003404_profile_synthesis`, aplicada a partir do SQL desse commit; três tabelas com RLS e SELECT direto negado a anon/authenticated; três triggers existentes conferidos. Bootstrap somente do hash administrativo de worker, sem dado de Pessoa. Banco remoto não recebeu fixtures.

VPS `/opt/prisma`: worker imagem `1f233fe274f1aa45bb217b3b7877f97bdb8c2492e243015bfb8d6c4723537f5b`, healthy/idle/zero reinícios/sem porta; config400 UID1000, sem service_role. Web imagem `b8d913860d8f4cf703bbb5ba64bfddfa324e9782ef790c9307c9c9c98e2ab91d`, running/zero reinícios, entry `/assets/index-rtOypyJ0.js`, versão2.0.5/síntese no bundle. `/`, `/login`, `/people`, entry novo e assets anteriores `index-S0Dgydwu.js`/`pdf-Du5hpUXa.js` HTTP200. Rollback web `66503ec` preservado; primeiro worker pode ser parado sem apagar fila/resultados. O smoke imediato do script web retornou404 durante recriação; repetição após estabilização passou sem rebuild. Parser/gateway continuam nas imagens baseline. RPCs load/source anônimas e claim com token inválido HTTP401; nenhuma Pessoa real foi acessada/mutada por esses probes.

Evidência compacta: `evidence/profile-synthesis/production-verification.json`. Desvios do contrato: nenhum desvio material identificado. Fechamento documental sincronizado separadamente, sem reconstruir runtime funcional.

## Proteção da transição de base (D-03 / D-UX-01)

Na conferência final, fonte aberta da análise anterior poderia continuar selecionada após terminar a análise atual. Cenário dirigido reproduziu a mistura em1416/390 (`refresh-before-*.json`, FAIL esperado). Seleção agora inclui analysisId e é ignorada na troca; cache por análise preservado, fonte atual somente após novo clique. Advertência de análise anterior distingue falha/insuficiência de preparação. Regressão dos seis estados anteriores mais transição: 14 reports/renders PASS, tipos/build dirigidos; nenhuma alteração ao worker, SQL ou matching.

Publicado no SHA `ed4e328403e394f7c64cef143475580a88c4532e`, CI branch37249189433/main37249281571 PASS. Somente web reconstruída: imagemd59809c/entry `index-BjB3jE2B.js`, running/zero reinícios. Worker1f233fe healthy/idle/zero reinícios, Parser/gateway iguais ao baseline. `/`, `/login`, `/people`, entry novo, entry inicial2.0.5 e assets2.0.4 HTTP200; rollbackb8d9138 preservado. O404 imediato foi transitório e smoke após estabilização passou sem novo build. Evidência `evidence/profile-synthesis/production-ui-final.json`. D-03/D-UX-01/D-06 e preservação P-03 PASS; demais provas/limites acima permanecem. Trabalho alheio preservado, QA temporário encerrado, fechamento documental não altera runtime.
