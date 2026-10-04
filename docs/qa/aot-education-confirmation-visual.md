# AoT — Estado visual e aceitação acadêmica, complemento v2.0.4

Contrato: [agreement-education-confirmation-visual.md](agreement-education-confirmation-visual.md), 1.1.0; autorização de Bruno em 04/10/2026 e esclarecimento de que informação suficiente dispensa clique redundante. Baseline main/origin/VPS `0f23bafbea0fedc6d594f366b5d0ef6cc0e7dc5d`, web `233af6da318de7caffbbf4dd7413b2ffc27b32b6a2a526262d4df16f5f645615`. Risco revisado B -> C, UI/normalização/preflight, sem mudança de servidor.

## Matriz de acordos

| ID | Implementação | Evidência | Status |
| --- | --- | --- | --- |
| D-01 | Automática = Classificação válida, humana = Confirmada por você, pendência = Confirmar classificação; tag/cartão/button coerentes, sem clique redundante nos estados aceitos | 29 verificações por viewport 1416/390 PASS: automático sem clique, humano, pendente, legenda branca e flag persistida sem origem humana | PASS |
| D-02 | `resolveEducationReviewClassification` restaura apenas aceitação explícita intacta com fontes/método/curso/nível/qualificação/situação iguais ao snapshot, sem desconhecidos. Normalização usa reviewed vigente sem origem/motivo humano inventado; preflight antecipa false. `acceptanceNeedsSync` permite salvar/comparar sem descartar atualização técnica quando normalizações dos dois drafts são iguais | 70 dirigidos e 256 person-flow PASS; negativos de snapshot/classificação, sync pendente/idempotente, imutabilidade e ausência de alteração transitória falsa (proteção de formulário vazio preservada); render save/reopen PASS | PASS |
| D-03 | Owner docs/Context Pack e release seletivo somente web, produto v2.0.4 | SHA funcional bd52c1a, CI branch/main PASS, web/HTTPS/assets/rollback e Parser/gateway preservados | PASS |

## Proibições e fora de escopo

P-01/F-01 preservados: nenhum classificador raiz/RPC/schema/gate de servidor/Parser/matching é alterado, nem nova biblioteca, campo, score ou confiança numérica. Snapshot/fonte são preservados, original não é mutado e aceitação automática conserva origem explícita/ausência de motivo humano. Casos sem garantia continuam pendentes. Nenhuma Pessoa/Perfil real usado em testes. Nova flag reviewed usa semântica existente de aceitação, não afirma decisão humana.

## Mapa de impacto e preservação

| Capacidade | Relação | Prova proporcional | Status |
| --- | --- | --- | --- |
| Botão/tag/cartão/navegação | direct | Três estados reais, ação desabilitada nos aceitos e branca/legível na pendência, desktop/mobile PASS | PASS |
| Normalização/save/compare/publicação | direct | Flag false podia parecer válida e ainda ser recusada pelo trigger existente; restauração conservadora e sync antes de comparar, sem clique humano extra. Negativos de curso/nível/status/qualificação/origem/fontes/snapshot e imutabilidade PASS; 70 dirigidos/256 person-flow | PASS |
| Evidência/classificação/precisão/período | plausible_indirect | Mesmo classificador/snapshot, helper humano e dados; navegação/save/reopen sintéticos, fonte preservada e período acessível PASS | PASS |
| Web/contextos/release | direct | Tipos/build/contextos/lint/foundation PASS; CI branch/main PASS, HTTPS/assets/rollback conferidos | PASS |
| RPC/auth/tenant/Parser/IA/matching | no_impact_identified | Servidor mantém gate reviewed; payload automático tem mesmo shape da aceitação explícita original, sem claims humanos. Gerador de matching extrai somente funções de ID não alteradas; plano web-only, imagens de Parser/gateway preservadas | PASS |

Screenshot é contraexemplo, não layout novo: posição do botão, cartões, abas e evidências preservados. Descoberta proporcional: span de metadados contaminava a cor da legenda; seletores foram restritos e legenda do botão primário tem cor explícita, verificada por estilo calculado. Falha inicial de contraste motivou esse reparo. Sem nova dependência.

## Validação / limites

Tipos web/root/harness e build PASS, com avisos preexistentes de chunks/importações. 70 dirigidos, 256 person-flow e gerador de matching (7 módulos + 2 extratos de IDs/decoder) PASS. Render: 29 verificações por viewport 1416/390, incluindo transporte de flag true com origem explicit, cores, independência dos registros e save/reopen. Evidência: `tmp/education-confirmation-directed.log`, `tmp/education-confirmation-person-flow.log`, `tmp/review-format-confirmation-1416.json`, `tmp/review-format-confirmation-390.json`, `tmp/education-confirmation-desktop.png`, `tmp/education-confirmation-mobile.png`. Render do componente real usa dados sintéticos locais, sem API/auth/gravação remota. Save/reopen simula normalização e estado persistido localmente; jornada autenticada desse currículo real continua NOT TESTED. Nenhum dado de Pessoa real alterado para teste. CUA/Computer Use indisponíveis por assets do kernel já constatados; Edge headless existente reutilizado, sem instalação/alteração de proteções.

## Decisões durante execução / desvios

A versão 1.1.0 substitui explicitamente o rótulo pendente obrigatório da proposta inicial: Bruno determinou que informação suficiente não exige clique apenas para confirmar. Critério conservador reutiliza classificação explícita preservada; não se cria novo limiar de confiança. O mapa incorporou normalização/coordenação de save/compare e preflight; banco e Parser continuam excluídos. Nenhum desvio em relação ao acordo vigente.

## Git / produção

SHA funcional `bd52c1af99a1f0f201d250f19770355c93e114eb`, integrado em main/origin e implantado na VPS existente. CI `37229910086` (branch) e `37230002047` (main) success. Dispatcher 1.0.2: 14 arquivos, somente web; database/functions/Parser skip, unknown vazio. Receipts/logs locais: `tmp/education-confirmation-plan.json`, `tmp/education-confirmation-publish.json`, `tmp/education-confirmation-deploy.log`, `tmp/education-confirmation-smoke.log`. Publicação VPS executada pelo script existente via SSH depois do dispatcher Git; pending_vps_configuration no receipt Git foi resolvido por essa execução e smoke.

Web running/zero reinícios, imagem `66503eced73233fb4151917f4df57d7117d2c3e993506829e134a2f70de3fda5`; novo entry `/assets/index-S0Dgydwu.js`, marcadores v2.0.4/Classificação válida/Confirmada por você conferidos. `/`, `/sign-in`, `/profiles`, entry novo, entry anterior `/assets/index-CKGo3_Dp.js` e PDF `/assets/pdf-Du5hpUXa.js`: HTTPS 200. Primeiro curl retornou 404 durante recriação do container e estabilizou sem rebuild. Rollback `prisma-web:rollback-before-bd52c1af99a1` aponta baseline `233af6da318de7caffbbf4dd7413b2ffc27b32b6a2a526262d4df16f5f645615`. Parser healthy/running/zero reinícios, mesma imagem `8682af7d98e7f4704a3c465020dc62821a32e7ebccad97a3aad1178708044616`; gateway running/zero reinícios, mesma imagem `d061cea3ae0a785f5cc0879704e1918666d22aa51236ec4ff7384b1387d2cf99`. Fechamento documental sincroniza Git sem rebuild dessas imagens.

Trabalho alheio não rastreado preservado: `.tmp.driveupload/`, `docs/qa/agreement-matching-all-positions.md`, `services/paddle/Dockerfile.gpu` e `tests/matchingRuntime (1).test.ts`. Aviso preexistente de Git gc sem permissão para remover metadados de worktrees permanece, sem limpeza destrutiva. Testes sintéticos e smoke público não comprovam jornada autenticada de publicação real.
