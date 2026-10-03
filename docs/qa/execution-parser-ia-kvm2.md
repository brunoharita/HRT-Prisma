# Execução — Parser IA totalmente online na KVM2

Implementar integralmente `docs/qa/agreement-parser-ia-kvm2.md` v1.1.0: D-01 a D-06, P-01 a P-03, F-01/F-02, A-01/A-02 e CA-D01 a CA-D06. Decisão explícita de Bruno inclui chave exata/origem/destino, teste sintético e versão pública v2.0.1/main/produção. Reutilizar Parser/gateway; publicar também web para a versão no login/menu. Não mudar prompt/modelo, reativar OCR ou criar Pessoa de teste em produção.

Registrar ADR sobre a implantação, separando cache persistente de lock volátil. Construir em branch isolada a partir do baseline, validar por mapa e publicar somente superfícies efetivamente necessárias. Transferir apenas credencial backend autorizada por SSH sem revelar valor ou colocar segredo no Git/imagem. Validar com sintético sem persistir Pessoa. Manter evidência de QA local, CI, produção, restart, preservação e rollback no AoT; nenhuma limitação vira PASS fictício.
