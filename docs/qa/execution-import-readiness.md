# Execução — disponibilidade antecipada da importação

Executar integralmente `docs/qa/agreement-import-readiness.md` versão 1.0.0, incluindo D-01 a D-06, P-01 a P-03, F-01/F-02, A-01 e respectivos CA. Aprovação explícita do PO para implementar, integrar main e publicar produção. Reutilizar ADR-059 e a ponte autenticada existente; nenhuma nova fronteira de confiança.

Ordem: contrato/mapa → rota read-only do worker → gateway autorizado → cliente/tela → testes locais direcionados → Context Pack → commit/plano de release → worker/gateway/web → smoke autenticado sem currículo → AoT. Publicar worker e gateway antes da web; manter imagens anteriores e preservar arquivos alheios. Dispatcher não automatiza worker/gateway: registrar operação complementar exigida pelo mapa, sem ampliar destinos.
