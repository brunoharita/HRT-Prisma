# Acordo e execução — linha do tempo da questão 1.0.0

Bruno aprovou em 14/10/2026 a recomendação de cronologia factual, marcos de resposta e contexto conjunto, com integração/main/publicação. Registro vigente 2.5.4; incremento autorizado para 2.5.5. Baseline main5316236f8964f57abc247e2d1f1cda51c13b31f9; runtime8a6a181/web83ac4e53. Classe D pela validação de eventos no banco.

- D-01: exibir linha do tempo por questão, ordenar intervalos pelo início válido e eventos pontuais pelo horário observado; desempatar por sequência/id sem alterar registros originais. Resumos acumulados permanecem identificados como resumos, sem inventar pausas.
- D-02: registrar cada exibição efetiva da questão, primeira escolha e troca de alternativa. Novo método position-assessment-response-timeline-1.0.0; somente metadados e IDs de opções oficiais. Revisão geral não representa exibição de uma questão. Retornos, autosave e envio explícito são preservados.
- D-03: reunir resposta final/salva, situação e registros na questão; indicar marcos ausentes e limitações. Registros antigos e snapshots de IA permanecem parciais, sem reconstrução retroativa ou cobertura contínua presumida.
- D-04: validar no servidor token, tenant, questão/versão, método, campos e alternativas oficiais; preservar idempotência, conflito de replay, grants/RLS, resultados e dados reais.
- D-05: publicação 2.5.5 com migrations/web estritamente derivados do diff, evidência e sincronização.
- P-01: não inferir leitura, intenção, consulta externa ou fraude; não penalizar, decidir contratação, alterar Score/Perfil/etapa/IA/tarifa, coletar texto livre ou inventar história.
- F-01: análise narrativa por IA, comparação de candidatos, precisão cognitiva, telemetria contínua, novo serviço/dependência, backfill de marcos.
- A-01: estender cards de acontecimentos existentes com contexto compacto e lista cronológica acessível; desktop/celular com quebra de texto. Reusar pipeline, validação e componentes; sem nova arquitetura visual de modal.
- CA-01: teste de início de intervalo versus encerramento, empate e entradas antigas; mesmas contagens/evidências originais.
- CA-02: navegador verifica exibição, primeira escolha, troca com IDs, não emissão em revisão, buffer/retorno e ausência de envio/IA implícitos.
- CA-03: navegador desktop/celular com resposta e lacunas, sem overflow; registros antigos legíveis.
- CA-04: SQL sintético local com aceitação/replay, rejeição de IDs/versões/métodos/campos e tenant, dados/grants preservados. Sem fixture em produção.
- CA-05: tipos/build, release registry, contexto, CI e smoke de publicação; sem alegar teste autenticado real.

## Mapa de impacto e preservação

Resultados/atividade/portal/events RPC direct: baseline código e fixtures atuais; regressão dos marcos, foco/mouse, resposta/envio e histórico. Preparação/convites plausible_indirect: nenhuma chamada ou mudança nesses consumidores; checagem de diff e teste dirigido do portal. Tenant/grants/idempotência critical_transversal: SQL negativos e inventário remoto antes/depois. IA/Score/Perfil/etapas/tarifas no_impact_identified: novos marcos não entram nos padrões/contratos existentes, diff sem seus escritores e dados protegidos no SQL. Runtime adjacente no_impact_identified: inventário de containers e release seletivo sem rebuild desses serviços.

Conclusão objetiva: D-01..D-05 e P-01 comprovados, documentação/contexto atualizados, CI e superfícies autorizadas sincronizados. Repetir apenas checks afetados por correção concreta. AoT/evidência neste mesmo movimento; não reabrir escopo no fechamento.
