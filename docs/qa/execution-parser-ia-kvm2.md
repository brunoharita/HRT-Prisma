# Execução — Parser IA totalmente online na KVM2

Implementar integralmente `docs/qa/agreement-parser-ia-kvm2.md` v1.0.0, lido na íntegra nesta execução: D-01 a D-05, P-01 a P-03, F-01/F-02, A-01/A-02 e CA-D01 a CA-D05. A autorização explícita de Bruno é a fonte do acordo. Reutilizar Docker/Compose/Node e o Parser/gateway existentes. Não reabrir decisões de prompt/modelo ou reativar OCR.

Registrar ADR sobre a implantação, separando cache persistente de lock volátil. Construir em branch isolada a partir do baseline, validar por mapa e publicar somente superfícies efetivamente necessárias. Transferir apenas credencial backend autorizada por SSH sem revelar valor ou colocar segredo no Git/imagem. Validar com sintético sem persistir Pessoa. Manter evidência de QA local, CI, produção, restart, preservação e rollback no AoT; nenhuma limitação vira PASS fictício.
