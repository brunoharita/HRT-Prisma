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
