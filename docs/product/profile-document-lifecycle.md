# Ciclo de vida de Perfil e documentos

## Resultado esperado

O operador controla o estado vigente com o menor número possível de ações, sem perder histórico e sem precisar interpretar mensagens técnicas.

## Publicação

- **Atualizar Perfil**: combina a revisão com o Perfil vigente. Informação omitida permanece. Por bloco, o operador pode `Adicionar`, `Atualizar`, `Substituir`, `Manter atual` ou `Remover do novo Perfil`.
- **Substituir Perfil**: a revisão passa a ser o Perfil completo. Omissões saem da versão vigente, mas continuam nas versões históricas.

O sistema resolve correspondências determinísticas e apresenta ambiguidades. Nunca decide silenciosamente qual bloco deve ser substituído.

## Reversibilidade

- **Restaurar versão** cria uma nova versão vigente; nunca reabre nem sobrescreve a antiga.
- **Reiniciar Perfil** deixa a Pessoa temporariamente sem Perfil vigente e preserva documentos e versões.
- **Excluir documento** remove arquivo, documento e dependências exclusivas. Conhecimento validado, Evidência Demonstrada, verificações concluídas e dados sustentados por outras fontes não são apagados.

Se o documento excluído sustentar a versão vigente, o Prisma cria uma nova versão coerente a partir da fonte anterior ainda válida. Sem fonte válida, nenhuma versão fica vigente.

## Mensagens e interação

Toda falha corrigível informa o que falta e oferece a ação correspondente. Falha interna não culpa um campo do operador. Confirmação adicional existe apenas para exclusão física e reinício do Perfil, pois representam risco material. Metadados de auditoria são automáticos.
