# AoT — evolução de UX 3.1.0

Contrato integral `agreement-ux-v310.md`1.0.0, prompt `execution-ux-v310.md`. Decisão explícita Bruno17/10/2026: preservar estado, implementar seis etapas, main e publicação3.1.0. Baseline be1b049/runtimee7ea4df/3.0.7. Branch codex/ux-v310. Evidências: `evidence/ux-v310/`.

## Matriz de acordos

| ID | Implementação | Teste/evidência | Status | Ambiente/limitação |
| --- | --- | --- | --- | --- |
| D-00 | tag remota, ZIP íntegro, imagem/backup restritos e runbook | baseline.json, CRC ZIP, hashes/tag/imagem na VPS | PASS | recuperação da aplicação, sem descartar dados posteriores |
| D-01 | discovery nav, filtros/chips, colunas, busca da sessão, seleção e registros mobile | browser real e regressão dirigida | PASS | browser/checks.json; agrupamento padrão sem rolagem horizontal desktop |
| D-02 | Home factual/por perfil, tarefas e recentes de sessão | papéis, acesso e negativos browser | PASS | tarefas de revisão/entrevista/decisão reais; limites por perfil |
| D-03 | síntese primeiro, quatro destaques, oito análises e seis seções | browser/render e regressão Pessoa | PASS | person-preservation.json180checks/15cenários |
| D-04 | comparação por requisito/fontes/diferenças/resumo | utilitários negativos e browser real | PASS | comparação mantém algoritmo/estados/fontes e decisão humana |
| D-05 | simulador com tarifa vigente e saldo real | testes puros + browser | PASS | tokens-regression48checks; simulador não reserva/debita/inicia IA |
| D-06 | fila serial10PDFs, identidade/revisão existentes, recuperação/pausa/escopo | serial/cancelamento negativos, browser | PASS | browser serial/duplicidade/identidade/revisão/pausa/troca de empresa |
| D-07 | tokens atuais/layouts aprovados, mobile e disclosure | capturas1448/390, limites320 e comparação visual | PASS | capturas desktop/mobile inspecionadas; largura320 sem overflow |
| D-08 | registro3.1.0/documentação/contexto/release | tipos/build/testes/CI/main/runtime | PASS | branch39075647513/main39075768011; runtime1a5630e/26smokes; docs sincronizadas após registro |

## Proibições e preservação

P-01/02/03 e P-UX-01 PASS: diff integral limitado ao frontend e aos testes/documentação. Negativos cobrem ausência/tarifa inválida/overflow numérico, estados desconhecidos, fila serial/cancelamento, papel comum e troca de contexto. Nenhuma mutation de publicação/compra/IA é chamada por busca/simulação/comparação. F-01/F-02 preservados: APIs de fornecedor futuras e algoritmos/Owner/identidade intactos. Algoritmos, serviços de persistência, Auth/RLS/banco/IA/ledger/Owner permanecem sem alteração; testes sintéticos bloqueiam rede externa. Não há envio real de e-mail, uso pago de IA, publicação de Perfil ou decisão humana em produção para testar.

## Mapa de impacto e preservação

O mapa integral do acordo continua aplicável. Novos arquivos são utilitários/componentes frontend e fixtures. A fila usa o NavigationViewStore existente por sessão/usuário/papel/empresa; nenhum storage persistente de currículos introduzido. A troca de escopo impede despachar o arquivo seguinte; requisição autorizada já despachada pode terminar no contexto original e continua protegida pelo servidor. Nenhuma migration, Edge ou serviço de IA é necessário por causa desta orquestração. A descoberta encontrou a consulta existente de processos/stages, reutilizada pela Home com status active e destinos por processo; não foram criadas contagens estimadas nem leitura operacional para membro. Dados de até50processos recentes são exibidos por processo, sem afirmar um agregado completo. Fontes de autorização das rotas foram conferidas: membro não recebe atalho/consulta de Posições. Essa dependência atualiza o mapa Home/processos (direct de apresentação; serviço existente inalterado).

| Capacidade protegida | Relação final | Evidência/prova de preservação | Status |
| --- | --- | --- | --- |
| Pessoas/filtros/seleção/colunas/dados profissionais | direct | browser da lista, navegação e visão mobile; data/cargo/área/empresa preservados, agrupamento padrão evita largura excessiva | PASS |
| Início/pendências/processos/recentes | direct | fatos derivados, erros distintos de zero, Owner/Super/Recruiter/comum; nenhuma escolha ou decisão inventada | PASS |
| Perfil/fontes/oito análises/seis seções/dirty/history | direct | person-preservation180checks/15cenários e negativos de leitura/geração | PASS |
| Comparação/Score/evidências | direct | assinaturas de diferenças e resumo, fonte e estados; algoritmos intocados | PASS |
| Carteira/tarifas/reservas/histórico | direct |48checks da carteira; quantidades/tarifas inválidas/ausentes e sem mutação | PASS |
| PDFs/lote/identificação/revisão/recuperação | direct | serial/pausa/contexto e conferência humana; mais8checks de identidade/loading/aviso e5browser de erro | PASS |
| Auth/tenant/autoridade/publicação/custo | critical_transversal | serviços/gates existentes inalterados, negativos de membro/empresa/late result e acesso público encaminhado ao login | PASS |
| Shell/estilos/estado de navegação | plausible_indirect |18estados responsivos, seis caminhos, volta à fila e fontes; preferências e fila limpas por escopo | PASS |
| IA/banco/Edge/Owner/portais/Knowledge | no_impact_identified | mapa e diff de consumo, sem algoritmo/contrato/serviço alterado; dispatcher skip e cinco containers preservados | PASS |

Novidade: apresentação/coordenação determinística das seis etapas. Preservação: autoridade humana, proveniência, contratos, regras comerciais, identidade, ciclo Owner e dados. Os testes não calibram matching/IA nem provam uso autenticado de pessoas reais. Não existe comparação de fingerprints do banco nesta entrega somente web; não se afirma ausência de atividade concorrente dos usuários.

## Fidelidade visual

Referência normativa: seis propostas HTML/capturas preservadas e hash em baseline.json. Estado equivalente com dados sintéticos,1448/390 e limite320. Conteúdo real dos componentes traz qualificações completas, oito análises integrais, limitações e estados existentes; é adaptação de conteúdo autorizada por A-UX-01, não substituição de composição. Ajustes por inspeção: separação vertical entre áreas e cartões, comparação compacta com explicação sob demanda, informação ausente neutra. Inspeção final também agrupou área abaixo do nome e empresa/período abaixo do cargo, mantendo cidade/data na largura desktop e as colunas individuais disponíveis. A referência indica conteúdo ilustrativo; informações mais ricas (qualificações/limitações/análises completas) são preservadas. Os tokens nativos da carteira e suas fontes/histórico continuam abaixo do simulador; não foram removidos para reproduzir dados fictícios. Sem divergência estrutural não autorizada identificada. Browser com1448/390/320: seis superfícies, um h1 e sem overflow; refinamento de Pessoas/Tokens repetiu só as capturas afetadas.

## Validação e limites

49casos Node únicos PASS (44dirigidos +5do registro3.1.0;12novos utilitários incluídos). Tipos/build raiz e web PASS. Browser das seis superfícies:72checks no ciclo amplo e48na repetição afetada de Pessoas/Tokens+interações; critérios de direitos, fontes e lote continuam PASS. Preservação Pessoa180checks/15cenários e Tokens48checks PASS. Os relatórios de Pessoa consolidam a última prova de cada cenário/viewport; seletor de modal hidden, navegação AntD e montagem do transporte foram corrigidos no harness, sem remover proteção ou alterar produto por falha de fixture. A captura inicial de Tokens estava sem a folha CSS da página no harness; a dependência foi incluída e a imagem correspondente refeita.

Lint do workspace encontrou whitespace em `output/pa-concurrency-baseline.sql`, arquivo não rastreado anterior e fora do escopo. Não foi alterado/apagado. Lint/contexto finais usam fotografia exata dos arquivos rastreados da entrega, evitando incorporar rascunhos ao Context Pack. PNPM recusou reinstalar a junction de dependências do snapshot; não foi forçado purge/CI. Os quatro scripts Node equivalentes foram executados diretamente: lint1906arquivos, foundation e geração/check do contexto PASS, sem alterar dependências. Snapshot final atualizado novamente quando as evidências foram consolidadas. Não foi autorizado nem executado validate integral local.

## Git / QA / produção

CI inicial39075366926 reprovou três pontos antes da promoção: teste textual de identificação não previa a atualização da fila, inventário de loading não previa o wrapper e novo erro do lote precisava de ação explícita. Testes passaram a verificar a delegação real e a atualização somente após sucesso; aviso ganhou Conferir arquivos e serviço. Browser320 desse erro passou5checks, sem IA nem mutação. O scanner local também viu duas cópias não rastreadas de ProcessAssessmentPage; teste do snapshot exclui essas cópias sem removê-las. Segundo CI branch39075647513 e main39075768011 PASS, incluindo a suíte obrigatória completa do workflow, ledger, script e audit. Publicado runtime1a5630e854e1e925678dd625b5a20aa9aac6c857,3.1.0, apenas prisma-web, imagem6fb2f331ac54/container e82f2eb40517, running/restarts0. O script recebeu404 transitório no probe imediato; verificação independente confirmou26checks HTTP/browser/versão/SHA/assets novos e antigos sem reconstruir. Produção/API/serviços atuais são a evidência, não o exit do primeiro curl. Cinco serviços adjacentes mantêm ID/imagem/reinícios/saúde e .env.production é idêntico ao backup restrito. Tag/image de restauração3.0.7 e arquivos comprimidos íntegros preservados; nenhum backend/banco foi publicado. Recibos production.json/public-smoke.json/runtime-before.json/public-before.json/ci-runtime.json. O fechamento documental é commit posterior, sincroniza local/GitHub/VPS sem rebuild. Ambiente de QA é browser/transporte sintético local, sem backend QA separado. Produção3.1.0 confirmada;3.0.7 permanece recuperável. Não alegar jornada autenticada com pessoa real a partir desta evidência.

## Ajuste de preservação do retorno ao lote

Conferência final encontrou um handler de retorno herdado que abria o envio individual dentro de um item do lote. D-06 exige preservar a associação arquivo/intake e o contexto da fila: o botão agora usa o retorno ao lote quando esse contexto existe, mantendo o fallback individual legado somente fora dele. Nenhuma regra de identificação/publicação ou serviço foi alterada. Validação específica e CI da correção serão registrados no fechamento.

## Desvios e conclusão

D-00..D-08 e P/F PASS. Nenhum desvio funcional identificado. Entrega validada, integrada em main e publicada3.1.0; fechamento documental sincronizado sem nova publicação de runtime. Limite F-01 preservado: preparação de integração e API futura não equivalem a um conector operacional.
