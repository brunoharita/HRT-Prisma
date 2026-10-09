# AoT — Cards compactos do acompanhamento

Acordo/execução compact-follow-up-cards v1.0.0; baseline fe35d88a7a67a124bc542f2bc5799db746bdadb4; 2.2.1 mantida. Evidências em evidence/compact-follow-up-cards.

| Regra | Implementação e evidência | Status |
| --- | --- | --- |
| D-UX-01/CA-01 | Card compacto, referência aprovada, antes/depois mesma fixture e viewport, quadrado 50px, rodapé horizontal | PASS |
| D-02/CA-02 | Nome/cargo/cidade-UF/Score; idade no detalhe, ausências honestas, zero e conteúdo longo; unitários e browser | PASS |
| D-03/CA-03 | RPC retorna apenas city/state; fonte real privada atual que recebe contato publicado, sem PII integral. SQL 48 verificações, gates e tenant/version/score/history preservados | PASS |
| D-04/P-01 | Cinco etapas/colunas iguais, drag/Escape/falha/conflito/rascunhos/formulários explícitos; browser proporcional; sem IA/mutação de Perfil/Knowledge | PASS |
| CA-04 | CI/publicação migration+web/smoke/sincronização pendentes | PARTIAL |

Mapa aplicado: direct layout e leitura RPC; plausible_indirect lista/drawer/ações, regressão browser; critical_transversal gates/tenant/Score, negativos SQL; no_impact_identified para IA/ingestão/ocupação/Knowledge, sem alteração de serviços ou escritores. A migração só adiciona projeção de leitura aos mesmos joins e gates. Descoberta do contrato de persistência confirmou que contato não fica no JSON público do Perfil: city/state_code do cadastro privado são a fonte existente, explicitada no D-03. Nenhuma permissão ampliada ou dado pessoal alterado.

Referência antiga tem quatro etapas ilustrativas; somente card é normativo, as cinco atuais são preservadas. Largura mínima 320px desktop preserva leitura com rolagem local; mobile 390/320 usa uma coluna. Sem desvio funcional material. SQL executado no PostgreSQL17 local vazio, transação com rollback. Sem QA remoto separado; jornada autenticada real NOT TESTED. Browser sintético e smoke público não comprovam operação autenticada real. Versão permanece 2.2.1. Arquivos alheios preservados.

Local: 8 testes de domínio/rotas, 34 checks de regressão browser e 12 cenários visuais desktop1448/mobile390/320 PASS. Cards comuns 179px contra baseline323–351px, redução44–49%; longos quebram linhas sem overflow. Referência Bruno56/Diego62 e mobile inspecionados. Migração aplicada como 20261009023359_position_follow_up_location no projeto confirmado ioldpnqqvobprjiontre. Corpo normalizado get_position_follow_up 2cb4301c6a74c7833154d2ddb337ad7b confere com arquivo; autorizador/mutador/grants/search_path preservados. Advisors mantêm exatamente os achados do baseline, sem ampliação; URLs em backend-release.json. Nenhuma leitura ou mutação de Pessoa real para prova. Ledger aditivo registrado; db push histórico continua proibido. Rollback backend: republicar corpo anterior de get_position_follow_up da migration 20261008120000, mantendo gates/grants; UI lida com campos opcionais ausentes.
