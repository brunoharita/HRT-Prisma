# Execução — ponte Paddle hospedada

Implementar integralmente `docs/qa/agreement-hosted-paddle-bridge.md` versão 1.1.0, lido por completo, com D-01 a D-06, P-01 a P-04 (P-03 atualizado pelo PO), F-01, A-01 e CA-D01 a CA-D06 sem reinterpretar. Acordo incorpora os CA-01 a CA-17 do anexo do PO.

Aditivo: reutilizar IdentityForm e identifyResumeIntake para expor correção explícita antes da criação; revalidar correspondências, bloquear resolução durante a edição e preservar o formulário em erro. Não corrigir o algoritmo extrator neste escopo. Implantar o ajuste e repetir a jornada real autorizada sem publicar Perfil.

Sequência: diagnóstico existente -> branch isolada do deploy f1cc983 -> gateway de transporte reutilizando Auth/RLS -> SSH reverso -> negativos/adapter/build -> implantação reversível -> jornada real hospedada -> AoT e contexto gerado. Gateway não contém parser, modelo nem regra de extração; usa Node já adotado pelo repositório e nenhuma biblioteca nova. Não executar validação integral sem autorização adicional. Não publicar Perfil nem ativar Parser IA M5.7. Se acesso autenticado/qualidade/tempo impedir prova, registrar PARTIAL/BLOCKED no AoT, sem declarar encerramento.
