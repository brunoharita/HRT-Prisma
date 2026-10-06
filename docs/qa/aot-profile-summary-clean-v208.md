# AoT — Leitura limpa do Resumo v2.0.8

Acordo `agreement-profile-summary-clean-v208.md` v1.0.0. Baseline a0037fc/webcfa50e0. Mapa/aceite no acordo; risco C/B. Movimento único: UI e versão pública, sem novas fontes/IA/schema/bibliotecas.

| ID | Implementação | Teste/evidência | Estado |
| --- | --- | --- | --- |
| D-UX01 | Overview e oito eixos abertos, todas afirmações/lacunas/perguntas, destaques duplicados retirados |46reports1416/390, fixture longa com quatro afirmações por eixo, texto integral antes/depois/fontes abertas/fechadas, sem clamp | PASS |
| D-UX02 | Fontes inicialmente ocultas, acionadores/painel/cache por clique, foco e scroll restaurados |46reports; toggle zero source/request/retry, fonte selecionada só uma consulta, troca de referência/cache, Enter/Escape, desktop420px/mobile100%, fechar mantém scroll/foco | PASS |
| D-UX03 | Interpretação discreta, motivos locais, fonte/erro por analysisId/sourceId, histórico próprio, fallback |45testes domínio/worker/registry; UI falhas múltiplas/overview/render/fonte/abertura, snapshot antigo fechado na atualização e novo só após clique, versão anterior2 versus atual3 identificada | PASS |
| D-UX04 | Toolbar/meta/narrativa larga/grid aberto2col/1col, sem sidebar explicativa permanente |Screenshots mesma fixture1416/390, consulta/investigação e comparação do modelo abaixo | PASS |
| D-REL01 | v2.0.8 e salto7 explícito, incremento futuro normal, release seletivo |5testes registry incluídos nos45, 256person-flow/19tooling PASS; Tipos/build/Context/lint/foundation PASS, CI branch37402418043/main37402528218 PASS, runtime.json SHA/web/HTTP/rollback | PASS |
| P-01 | Sem ocultar resposta, chamada extra ou mutation humana |Negativos domínio; contadores da fixture, conteúdo integral e falhas locais em46reports; backend/contratos inalterados | PASS |

Jornada autenticada real e qualidade da IA: NOT TESTED; testes sintéticos não as provam. Sem nova chamada paga necessária.

## Evidência visual e preservação

Referência aprovada: `evidence/profile-summary-clean-v208/approved-reference.png`, SHA256 `b14e8dac25dfe4a6e7411877717fc40fe188cb388b74b78ef0317b3558b4ff55`. Normativa para composição da aba; conteúdo curto/pessoa/header global ilustrativos. Implementação preserva shell/header reais, toolbar, narrativa ampla, oito seções abertas em duas colunas e investigação opcional à direita. Telas `summary-1416-full.png`/`source-1416.png` da mesma base, `summary-390-full.png`/`source-390.png`, `long-content-*-full.png` e `multiple-errors-1416.png`; conferência visual desktop/mobile realizada. Textos/títulos contratuais completos exigem mais altura que a imagem curta, sem truncamento. Drawer nativo ocupa altura da janela e celular; variação de posicionamento e tokens conforme componente acessível existente, mantendo a composição acordada. Nenhuma alteração de navegação global.

46reports únicos em `ui-results.json`: 23 estados por viewport, com regressão dirigida das interações após ajuste de foco. O teste envia Enter completo (incluindo caractere) pelo protocolo do navegador e Escape; não substitui teclado por click. Primeiro ciclo encontrou disputa/ausência de callback ao fechar durante animação; retorno agora observa transição de seleção e fechamento nativo, guarda reabertura/unmount e restaura após commit. Origem/erro usam chave do snapshot para evitar trecho antigo durante troca. Problemas de sincronização da fixture foram corrigidos; relatórios finais todos PASS, sem diagnósticos de depuração no produto.

Preservação:45testes domínio/worker/registry,256person-flow e19tooling PASS. Conteúdo/perguntas/contratos1.1.0/prompt/modelo/banco e imagens worker8526717/Parser8682af7/gatewayd061cea não alterados. Baseline VPS a0037fc e imagens conferidos antes de publicar. CSS modificado somente no bloco `.prisma-synthesis`; abas/curadoria/publicação não alteradas. Salto de versão7 explícito não cria entrega fictícia; próximo incremento e históricos originais testados. Tipos/build/Context/CI e rollout abaixo.

## Publicação e fechamento

SHA funcional `e50250f0131a0c24f0d2996ccc961a5827ddbf11`, CI branch37402418043/main37402528218 success. Release plan: somente web, sem migrations/Edge/Parser/worker. Tipos/build finais PASS; contextos regenerados/check PASS em snapshot dos arquivos autorizados, lint867files/foundation18tables/6versions PASS. Arquivos alheios não incorporados. Avisos anteriores de tamanho/dynamic import permanecem fora do escopo.

VPS `/opt/prisma`: web `f22a01f8f955488947625614395c946664a44abb20a303ba0d09e778695e84c9`, running0; entrada `index-B1nbqs-I.js` contém SHA/entrega2.0.8/Mostrar fontes. `/`, `/login`, `/people`, JS/CSS novos e entradas anteriores `index-Bx4s26MG.js`/`index-BiucK513.js` HTTP200. Checagem imediata404 durante recriação estabilizou sem rebuild adicional. Rollback antes de e50250f0131a retém webcfa50e0. Worker8526717/Parser8682af7 healthy0 e gatewayd061cea running0 preservados. Evidência segura `evidence/profile-summary-clean-v208/runtime.json`.

Todos D-* e P-01 PASS; sem desvio contratual material. Complemento final é documentação/evidência do mesmo movimento, sincronizado em main/VPS sem novo build. Smoke público não comprova jornada autenticada real ou qualidade da geração de IA; ambas NOT TESTED. Nenhuma mutation de Pessoa ou chamada real de IA realizada. Servidor/navegador sintéticos encerrados.