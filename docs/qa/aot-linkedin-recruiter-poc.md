# AoT — PoC Prisma Recruiter / LinkedIn MCP

Contrato: `agreement-linkedin-recruiter-poc.md`1.0.0, aprovado por Bruno em25/10/2026. Baseline Prisma b052be8751e66d495c160959839e4cb133ea5ae4. Relatório proprietário: `../product/linkedin-recruiter-poc.md`.

## Matriz de Acordos

| ID | Implementação e teste | Evidência | Status / limite |
| --- | --- | --- | --- |
| D-01 | Clone SHA0c5f14ba/4.28.0, venv próprio, licença e dependências identificadas | summary.json/dependencies.txt; guard do SHA e diff upstream | PASS; resolução pip capturada, não uv lock |
| D-02 | 12witnesses +106testes selecionados sobre módulos reais/mocks; chamada MCP em memória | prisma-witness.txt/upstream.xml,106PASS0skip | PASS; LinkedIn/DOM real NOT TESTED |
| D-03 | Inventário20tools, revisão sessão/HTTP/erros/traces/tenant/proveniência, negativos de host/origin e filtros | tool-inventory.json, testes e referências do relatório | PASS; análise delimitada, não auditoria de segurança completa |
| D-04 | Matriz de adequação/comparação, custos/lacunas e recomendação de não integrar diretamente | relatório experimental1.0.0 | PASS; adoção não autorizada |

## Proibições verificadas

| ID | Guardrail e prova | Status |
| --- | --- | --- |
| P-01 | Sem login/cookies reais/coleta/mensagem/conexão/LLM/Supabase/VPS/deploy; extratores e navegador simulados, transporte inprocess, guard de sockets externos. Único evento bloqueado esperado é a prova negativa DNS | PASS |
| P-02 | Nenhum código/tabela/cadastro/Perfil/Score/decisão de produto alterado; liveLinkedInTested=false e limites explícitos | PASS |

## Mapa de Impacto e Preservação

| Área | Relação | Baseline / prova proporcional | Status |
| --- | --- | --- | --- |
| Harness/relatório | direct | Contrato novo1.0.0;118testes focados +pip check, evidências sintéticas | PASS |
| Posição/Knowledge/revisão futura | plausible_indirect | Contratos originais somente consultados; sem integração ou persistência nova | PASS por ausência de consumidor alterado |
| Sessão/PII/autoridade | critical_transversal | Nenhuma conta/dado real; rede de teste bloqueada, dotenv off e venv separado, mocks de efeitos | PASS |
| Produção/web/backend/modelos/Score/schema | no_impact_identified | Diff somente script experimental/docs/evidência/contexto; sem acesso operacional nem publicação | PASS; estado produtivo não reinspecionado, preservado por ausência de ação |

Novidade: avaliação reproduzível e recomendação. Preservação: runtime3.3.0 e origem canônica de dados sem mudanças. Descoberta material: importação automática de sessão, HTTP direto sem auth e saída textual exigiriam fronteira específica antes de qualquer integração; isso não amplia o escopo da PoC. Relações do mapa original mantidas.

## Fora de escopo e visual

F-01 PASS: sem integração, piloto real, benchmark de precisão/recall, persistência/filtros sensíveis ou decisão arquitetural definitiva. Visual não aplicável: nenhum componente/tela foi criado ou alterado.

## Desvios e validação

Nenhum desvio do contrato, nenhuma nova mudança de escopo. Defeitos do harness (socketpair Windows e assert de posicionais) corrigidos sem alterar upstream; primeira execução interrompida e rodada final estabilizada. Repetição final foi necessária para sanitizar hostname do XML e registrar contagens estruturadas, não para retestar produto inalterado. Pip check e diff upstream PASS. Gerador/check de contexto e lint PASS no snapshot rastreado exato, excluindo rascunhos alheios. Dispatcher classifica somente contexto/documentação/tooling, todas as superfícies operacionais skip;22testes de release-tooling PASS (`evidence/linkedin-recruiter-poc/release-tooling.txt`). Nenhuma suíte integral Prisma solicitada/executada localmente; CI obrigatório da branch permanece independente.

## Git / ambientes / conclusão

Branch codex/linkedin-recruiter-poc. Entrega experimental em branch própria; main e produção não recebem a PoC. Código upstream/venv/logs intermediários ficam ignorados em tmp. Rascunhos alheios preservados. Sem incremento da versão do produto; avaliação1.0.0 e runtime3.3.0 mantido.

PoC concluída no escopo local: atende parcialmente como acesso, não é base de produção pronta. Busca/filtragem reais, pertinência de resultados e segurança de conta permanecem NOT TESTED e não são critérios prometidos nesta PoC sintética. Recomenda-se discutir busca assistida ou fonte integrada autorizada antes de implementar o Prisma Recruiter.

## Adendo1.1.0 — leitura real autorizada, concluída

Decisão posterior do PO e substituição delimitada de P-01/F-01 em `agreement-linkedin-recruiter-poc.md`1.1.0. Baseline branch83b94789533639800d3e9311c82cdbde8be2a1a9. O resultado original acima refere-se à rodada offline, não impede este novo escopo autorizado.

| ID | Prova | Status |
| --- | --- | --- |
| D-05 | E-mail principal conferido nas configurações e corresponde à conta de teste solicitada. Nome público não foi usado como único comprovante | PASS |
| D-06 | Fonte real/UI: location textual descartado e10resultados fora de Bauru; geoUrn selecionado pela UI e10cartões de Bauru. Vendedor/Sales Representative10cada, sobreposição0na primeira página. Agregados em live-source.json | PASS no navegador; não prova execução MCP |
| D-07 | Perfil exclusivo/auto-import off/traces off; login manual registrado após mudar timeout para0. E-mail confirmado na UI, operador confirmou janela própria e nome público coincide no self-profile MCP. Três buscas stdio com10referências cada,4,15/4,60/5,10s; close_session concluído | PASS; alias /in/me não resolvido e contato falhou, sem presumir e-mail diferente |
| P-03/P-04 | Sem mensagens/conexões/reações, salvamento/cadastro, configuração/produção ou publicação de identidades dos encontrados | PASS para a leitura executada |

Mapa adicional conforme acordo: fonte real/sessão são direct; identidade/minimização critical_transversal; produto futuro plausible_indirect; produção/Score/Knowledge no_impact_identified por ausência de ação. Fonte trouxe divergência concreta no filtro location; não se implementou adaptação silenciosa do upstream. Sem benchmark estatístico de qualidade/recall, sem promessa de ausência de bloqueio. A autenticação do MCP usa janela fora do painel Codex; o login existente no navegador integrado não é exportado/importado.

`evidence/linkedin-recruiter-poc/live-mcp.json` conserva somente agregados/diagnósticos, tempos e método de identidade. Nenhum nome, contato ou URL identificável dos encontrados; o e-mail de login não aparece no artefato. URLs de retorno ecoam location solicitado, mas não comprovam aplicação; geoUrn ausente e texto sem Bauru, em conjunto com a observação da UI, corroboram a falha. Não foram30pessoas distintas comprovadas nem perfis avaliados:10referências por resposta.

A chamada get_my_profile inicial iniciou login quando não havia sessão salva; o harness encerrou ao receber erro antes de busca. Após autenticação válida, a exigência inicial de URL canônica também interrompeu antes da busca, pois retornou /in/me. Uma leitura de contato falhou com OverlayRootNotFoundError. A confirmação composta (e-mail UI + declaração do operador + nome próprio MCP) resolveu a identificação sem fingir que o conector validou e-mail. Nenhuma alteração no pacote upstream. Os ensaios adicionais respondiam a essas falhas concretas, não repetiram buscas já aprovadas.

Todas as obrigações do adendo comprovadas, sem desvio de escopo: leitura real básica validada; integração não executada. Banco/VPS não foram acessados, main não foi alterada. Perfil de autenticação exclusivo permanece local/ignorado e navegador foi fechado pelo MCP. Publicação da evidência ocorre apenas na branch experimental. CI da etapa anterior c4d76d27/40192306235 SUCCESS; validação documental final e contexto sem repetir testes de produto ou leituras reais. Recomendação atualizada: ensaio de adaptação de geoUrn antes de integração; depende de nova decisão do PO, sem autorização implícita para corrigir o conector.

## Adendo1.2.0 — adaptação local, sem integração

Contrato1.2.0 aprovado pelo PO neste chat após filtros gratuitos/controles de operação. Baseline c61eb0d5bf2369f6f2654ae8939fb01c3117785c. Execução conforme mapa1.2; runtime3.3.0. D-08..11 implementam preparação de filtro/controle técnico, P-05 impede disfarce/contorno/sensíveis, F-03 exclui integração e domínio, A-02 permite extensão fora do clone.

| ID | Implementação / teste / evidência | Status e limite |
| --- | --- | --- |
| D-08 | NativeSelection, Search, verify_filters; URLs usam construtor fixado e recibos exigem controle+URL final. UI2cidades/2cargos e sete filtros combinados; negativos eco/ignorado/ambiguidades. filters-ui.json, filters-replay.json, filters-tests.* | PASS para preparação/verificação local e ensaio UI; witness adicional MCP real PARTIAL, sem recibo bem-sucedido |
| D-09 | Trial: início/resume explícitos, arquivo exclusivo por conta, orçamento e timeout, tentativas contam, pausa sem retry, retorno após progresso. Tests Execution/McpBoundary | PASS nos testes determinísticos; não prova resistência a bloqueio/execução distribuída. O witness real parou e fechou navegador |
| D-10 | profile_root/digests salgados, checkpoint sem nomes/URLs/textos, erro/ausência/vazio distintos, retomada pula concluídos e preserva contadores. Tests Execution/Filters; replay real agregado | PASS;40referências entre quatro páginas não são candidatos avaliados |
| D-11 | CAPABILITIES e matriz do relatório separam filtro nativo de evidência de experiência/formação/idioma; sem aliases novos ou desemprego inferido | PASS; parser/contextualização/Knowledge em runtime fora de escopo |
| P-03/P-04/P-05 | Sem mensagens/conexões/reações, novos cadastros ou dados pessoais publicados. Única ferramenta local run_readonly_trial, auto-import/traces off; testes negativos de identidade e falhas. filters-mcp.json: parada/fechamento, zero processos do perfil dedicado | PASS no escopo executado; desconhecimento da exceção não equivale a restrição da conta |
| F-03 / GOV-02 | Somente scripts experimentais/docs/evidências/contexto. Nenhum writer/entidade/consumidor de domínio, banco, VPS ou produção | PASS por ausência de acesso e revisão de superfícies; sem alegar smoke produtivo |

### Mapa e preservação

`direct`: scripts de preparação/controle/runner/tests e cinco observações UI mais tentativa MCP. Baseline sem adaptador1.2;26testes finais PASS e replay agregados provam capacidades locais. `critical_transversal`: conta reconferida por e-mail nas configurações; self-profile MCP coincide; driver sem ferramentas de escrita; sessão exclusiva e navegador fechado. `plausible_indirect`: Posição/Knowledge/revisão, origem única/GOV-02 consultada; nenhuma integração/consulta produtiva, taxonomia ou decisão nova. `no_impact_identified`: Score/pesos/Perfil/histórico/decisões humanas/web/backend/schema/RLS/produção, preservados por ausência de consumidor/executável/serviço alterado e plano de release, sem inspeção produtiva.

### Resultado negativo que permanece aberto

O sexto ensaio, FastMCP em memória com navegador real, confirmou identidade e parou em invalid_observation_or_driver_error antes de obter um recibo. Não foi registrada classe/etapa naquela revisão; causa exata desconhecida. Evidência preservada sem reescrever o resultado. Nenhum retry real, nenhum bloqueio atribuído à fonte sem prova, nenhum filtro dito aplicado pelo MCP. O controle de orçamento encerrou essa rodada. Adaptador MCP em fonte real: **PARTIAL / não liberado para integração**. Esse limite não invalida a aplicação dos filtros observada no navegador interno nem os testes locais, e estes não o substituem.

Revisão posterior registra classe/etapa sem mensagem privada e tem três testes de fronteira com navegador simulado, incluindo erro na captura e identidade divergente. Não foi revalidada na fonte. A primeira edição desses testes posicionou métodos na classe errada; erro local de harness corrigido antes da rodada final, não relacionado ao resultado do LinkedIn. O teste real pode ter alcançado a navegação de busca; não houve perfil de terceiro aberto ou contato. Não contar a tentativa como busca concluída ou candidata a ranking.

### Encerramento e validação

Ensaio local entregue com limitação de conector explícita; não representa entrega do Prisma Recruiter. Nenhum desvio de autoridade, seis tentativas de busca no máximo, nenhuma repetição real.26testes finais/zero falhas/erros/skips, rede bloqueada no harness; nenhuma suíte integral Prisma local. Gerador/check/lint/dispatcher/CI registrados no fechamento após execução. Versão experimental1.2.0/contexto2.96.3; versão pública3.3.0 preservada. Main e produção permanecem fora da entrega. Nenhuma capacidade protegida de domínio foi alterada ou declarada testada operacionalmente.

Verificações locais finais:22testes de release-tooling PASS; generate/check de contexto PASS em snapshot dos arquivos rastreados, excluindo rascunhos alheios; lint PASS2125arquivos antes do registro técnico final. Dispatcher somente context-pack/documentation/tooling, banco/Edges/web e demais destinos skip. Evidência consolidada em `evidence/linkedin-recruiter-poc/filters-validation.json`; CI da branch é independente dos testes Python locais. Resultado do conector real permanece PARTIAL mesmo com checks de código/documentação aprovados.

## Adendo1.2.1 — correção do erro real concluída

Pedido explícito do PO para resolver a falha, acordo/adendo1.2.1, baseline5d50955db2659ff641ccd82ba2d2215ef9e86fdf. Implementa D-12; mantém D-08..11/P-03..05/F-03, A-03 para rodada delimitada e extensão fora do clone. O status PARTIAL anterior é histórico; não foi apagado ou convertido retroativamente em sucesso.

| ID / capacidade | Implementação, teste, evidência | Status |
| --- | --- | --- |
| D-12 / causa e correção | Upstream classify_link retorna /in/...; profile_root rejeitava todas as referências relativas. Diagnóstico real por classe/etapa, regressão vermelha antes e verde depois, aceitação estrita apenas na origem verificada | PASS; fix-121-diagnose-initial/reference.json, teste Filters.test_actual_upstream_person_reference_is_relative_and_must_normalize |
| D-12 / prova real | Terceira chamada explícita MCP inprocess/Edge real: conta confirmada, completed,10referências, location source_applied por URL final+controle, zero inválidas | PASS; fix-121-live-mcp.json, sem prova emprestada de UI/replay |
| D-08/D-10 / preservação | Filtro continua exigindo recibo; dedupe relativo/absoluto e URL externa recusada com diagnóstico sanitizado, checkpoints anteriores preservados | PASS;30testes finais offline, fix-121-tests.*; formato checkpoint1.2.0 mantido |
| D-09 / tentativa única | SectionCapture.capture tinha retry interno para vazio suspeito; wrapper reutiliza _capture_once no escopo da busca. Teste real de componente com método simulado comprova1chamada/zero espera | PASS; McpBoundary.test_upstream_noise_only_capture_is_not_retried; clone inalterado |
| P-03..05 / autoridade e dados | Perfil exclusivo, identidade conferida antes da busca, nenhuma ferramenta de escrita/contato, nada de produção/Score/Knowledge; browser fechado e zero processos dedicados | PASS; agregados e diff, nenhuma lista identificável de pessoas publicada |

Mapa revisado conforme acordo: normalização/controlador `direct` por causa comprovada; wrapper/captura `direct` por preservação de D-09; sessão/identidade/minimização/parada `critical_transversal`, sem alterações de autoridade; consumidores futuros `plausible_indirect` sem integração; produto/Posição/Knowledge/Score/pesos/histórico/schema/produção `no_impact_identified`, preservados por ausência de writer/executável/consumidor ou acesso produtivo. Não se alegou smoke de produção.

Validação proporcional:30testes offline PASS, rede bloqueada e mocks da UI; teste usa o classificador verdadeiro para não repetir o falso pressuposto dos mocks antigos (só URLs absolutas). Novo teste de captura inicialmente importava CapturePlan do módulo errado; import corrigido antes da rodada final, sem atribuir esse erro de harness ao LinkedIn. As chamadas reais1/2isolaram ValueError e reference_normalization; chamada3comprovou a correção. Não houve retry automático ou busca adicional após sucesso. Nenhum desvio do contrato.

Encerramento: defeito específico resolvido; sem integrar o Prisma Recruiter nem ampliar garantia para todos os filtros/escala/banimento. Documentação/contexto2.96.4 atualizados, produto3.3.0 e checkpoint1.2.0 mantidos. Verificações administrativas consolidadas em `evidence/linkedin-recruiter-poc/fix-121-validation.json`; CI auditável pelo SHA da branch, independente dos30testes Python locais. Sem merge na main/deploy. Evidências anteriores preservadas e rascunhos alheios não entram na entrega.

## Adendo1.3.0 — ensaio de100referências, leitura parcial

Pedido explícito do PO: tentar100. Acordo1.3.0 e mapa previamente registrados, baseline64d8fa80f57f6cf80c8b57fcf86264e89a61a303. D-13..15/P-06/F-04/A-04 preservam escopo experimental, separação entre busca/leitura/análise e autoridade humana. Não há novo motor produtivo ou integração.

| ID | Implementação / teste / evidência | Resultado |
| --- | --- | --- |
| D-13 | Search.page/Observation.active_page, captura compartilhada e Trial.target_unique; URL final+controle PáginaN, localidade nativa, dedupe e término no alvo. pilot-130-live.json:10páginas/100únicas/identidade confirmada | PASS para coleta desta amostra; não mede recall nem melhores100 |
| D-14 | Runner lê experiência com método upstream; revisão consultiva pelo assistente, trecho literal validado/hash/razão em artefato privado; agregado7+8+24+3+3+5=50, sem Score.50textos tiveram ruído lateral/rodapé removido offline, zero cortes | PARTIAL para meta100:50lidos/analisados,1falha e49não tentados; não declarar amostra completa |
| D-15 | Exclusão por conta, até20páginas/200refs/100tentativas de perfil, timeout70s e tentativa única; status/checkpoint/retomada preservam concluídos/incertos. AuthenticationError na tentativa51pausou e fechou browser, zero processos dedicados | PASS para parada/contagem neste ensaio e retomada offline; retomada real após erro NOT TESTED |
| P-03..06 | Conta exclusiva, auto-import/traces off, upstream fixado/inalterado, ferramenta única de leitura, ACL/dados privados; nenhum contato, atributos sensíveis, Score, cadastro/Knowledge/decisão ou produção | PASS no escopo executado; não é garantia antibanimento |
| F-04/GOV-02 | Somente scripts de ensaio/documentação/evidência agregada/contexto; sem catálogo/tabela/consumidor produtivo | PASS por diff e ausência de acesso; sem smoke de produção alegado |

Mapa final: `direct` controlador/captura/runner/tests e amostra; `critical_transversal` identidade/minimização/parada, conta própria confirmada e browser fechado; `plausible_indirect` checkpoint antigo e distinção leitura/análise, cobertos por testes; `no_impact_identified` runtime3.3.0/web/backend/schema/RLS/nota/pesos/histórico/decisões/Knowledge/produção por ausência de consumidor, writer, destino ou acesso alterado. Sem smoke produtivo porque produção foi explicitamente excluída.

38testes offline PASS/zero falhas/erros/skips, rede externa bloqueada;22release-tooling PASS. Novos cenários: paginação/recibo divergente, dedupe/alvo100, fim nativo, retomada sem releitura, limite/estado incerto, ACL, leitura distinta de análise, parcialidade sem retry e remoção de sugestões/rodapé preservando texto desconhecido. Erro inicial de ACL do harness foi corrigido usando criação segura já existente; não se enfraqueceu proteção. O sanitizador de fronteira entrou após início da rodada e foi aplicado offline aos mesmos textos, sem reiniciar busca/ler pessoas novamente. Não foi alterado driver de navegação durante a operação.

Resultado do conector nesta escala: **PARTIAL**. Causa exata de AuthenticationError não estabelecida; nenhuma atribuição de banimento, expiração ou desafio sem prova, nenhuma insistência para completar100. Não existe evidência de100trajetórias lidas; as50concluídas foram efetivamente revisadas com evidência privada rastreável. Não declarar conclusão integral de D-14. Dados ausentes não viram reprovação. Mantida recomendação experimental, sem integrar/publicar em produção. Checkpoint/artefato privado permitem retomada futura explícita, que não foi executada nesta rodada.

Produto3.3.0 preservado; contexto2.96.5. Evidências históricas intactas e rascunhos alheios excluídos. Validação final de contexto/lint/plano/branch/CI registrada em `evidence/linkedin-recruiter-poc/pilot-130-validation.json`; sem merge/main/deploy, sem leitura adicional da fonte após a pausa.
