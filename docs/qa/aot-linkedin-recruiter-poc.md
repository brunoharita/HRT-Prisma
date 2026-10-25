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
