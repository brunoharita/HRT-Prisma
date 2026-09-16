# Execução — ponte Paddle hospedada

Implementar integralmente `docs/qa/agreement-hosted-paddle-bridge.md` versão 1.0.0, lido por completo, com D-01 a D-05, P-01 a P-04, F-01, A-01 e CA-D01 a CA-D05 sem reinterpretar. Acordo incorpora os CA-01 a CA-17 do anexo do PO.

Sequência: diagnóstico existente -> branch isolada do deploy f1cc983 -> gateway de transporte reutilizando Auth/RLS -> SSH reverso -> negativos/adapter/build -> implantação reversível -> jornada real hospedada -> AoT e contexto gerado. Gateway não contém parser, modelo nem regra de extração; usa Node já adotado pelo repositório e nenhuma biblioteca nova. Não executar validação integral sem autorização adicional. Não publicar Perfil nem ativar Parser IA M5.7. Se acesso autenticado/qualidade/tempo impedir prova, registrar PARTIAL/BLOCKED no AoT, sem declarar encerramento.
