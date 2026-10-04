# AoT — Período de formação permanece acessível, v2.0.4

Contrato: [agreement-education-period-v204.md](agreement-education-period-v204.md), 1.0.0; autorização de Bruno em 04/10/2026. Baseline `03044b41fb66c53d9348293e460b9d96213add55`, web `4111e554f74b1fab0448d2be7899aa4671715d24b4f05353bb7bbd457d0d0958`. Risco B, correção de apresentação, sem suíte integral local.

## Matriz de Acordos

| ID | Implementação | Teste/evidência | Status | Limite |
| --- | --- | --- | --- | --- |
| D-01 | Visibilidade do período usa fonte/rascunho atual e persistido, seleção e campos abertos por revisão/caminho estável, independente do erro transitório | Edge: limpar, digitar 2/20/200/2004, blur, segunda/terceira formação, abas e remount do rascunho sintético | PASS | Componente real local, sem persistência remota |
| D-02 | Feedback continua reativo; Input conserva identidade/foco/valor; fonte e outros registros preservados; nova revisão não herda campos abertos | 28 verificações em cada viewport 1416/390; baseline falha exatamente ao limpar o campo; 70 testes lifecycle/feedback/datas/classificação/versão | PASS | Nenhuma Pessoa real editada |
| D-03 | Registro de release v2.0.4 e docs/Context Pack; plano somente web | Tipos/build PASS, entrega/CI/smoke ainda em andamento | PARTIAL | Concluir após publicação |

## Proibições verificadas

| ID | Guardrail | Evidência | Status |
| --- | --- | --- | --- |
| P-01 | Sem invenção/alteração de validadores/classificador/evidências/tenant ou publicação de Pessoa real | Diff restrito a UI/registro/fixture/documentação; testes dirigidos e fixture sem API/auth/gravação remota | PASS |

## Mapa de Impacto e Preservação

| Capacidade | Relação | Baseline / regressão / evidência | Status |
| --- | --- | --- | --- |
| Formação/período/navegação | direct | Baseline 03044b4: ensino médio perde Input ao apagar; cenário negativo detecta a desconexão/foco perdido. Correção passa em 1416/390 | PASS |
| Validação/evidência/rascunho/classificação | plausible_indirect | Mesmos handlers/modelo/validadores; fonte antiga e segunda formação preservadas, feedback removido após correção; 70 dirigidos | PASS |
| Web/versão/Context Pack | direct | Tipos/build e registro v2.0.4 PASS; restante em andamento | PARTIAL |
| Auth/tenant/RPC/publicação | no_impact_identified | Análise do diff: nenhum código de RPC/serviço/payload/gate mudou; lifecycle/feedback preservados | PASS |
| Parser/OCR/IA/matching/Knowledge | no_impact_identified | Nenhum consumidor/domínio compartilhado mudou; plano seletivo e imagens remotas a conferir | PARTIAL |

Novidade: o campo corrigível permanece acessível; não há novo campo nem mudança de formato. Preservação: fonte, regras objetivas e classificação, cartões extraído/revisado, abas/IDs/navegação, confirmação humana. Sem nova dependência ou reclassificação do mapa.

## Fora de escopo e desvios

F-01 preservado no diff. Nenhum desvio do contrato. Referência enviada é contraexemplo do bug, não redesenho normativo. Renders locais `tmp/education-period-v204-desktop.png` e `tmp/education-period-v204-mobile.png` mostram o campo presente após edição/blur, mesma estrutura em colunas/empilhamento; sem overflow em 390. Textos/pessoas sintéticos, não réplica de dados pessoais.

## Validação final

- `tmp/education-period-v204-baseline.json`: FAIL esperado no componente 03044b4, `clearing retains input identity and focus`.
- `tmp/education-period-v204-desktop.json` e `tmp/education-period-v204-mobile.json`: 28/28 PASS por viewport; identidade/foco durante digitação, navegação, reabertura e ausência de vazamento entre revisões.
- `tmp/education-period-v204-directed.log`: 70/70 PASS.
- Typecheck web/root e build web PASS; build com avisos prévios de tamanho/importação de chunks. Typecheck separado do harness PASS com tipos `vite/client`; invocação inicial sem estes tipos não resolvia imports `?url`, corrigida no comando sem alteração de produto. Lint/foundation e Context Pack em snapshot do índice PASS, sem incluir documentos alheios não rastreados.
- CUA e inicialização Computer Use indisponíveis por erro de assets do kernel; Edge headless já instalado executou fixture local sem alterar proteções nem instalar software.
- Salvamento/reabertura do rascunho é simulado localmente com o componente real; jornada autenticada com currículo/Pessoa real continua NOT TESTED. Não confundir esse limite com falha do teste do componente.

## Git / produção

Publicação em andamento. Atualizar SHA, CI, web/imagens preservadas, HTTPS/assets/rollback e sincronização ao concluir.
