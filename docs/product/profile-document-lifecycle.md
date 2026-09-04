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

Excluir um documento não altera automaticamente o Perfil atual. A versão publicada é um snapshot imutável e autossuficiente; quando sua fonte original deixa de existir, a interface informa essa indisponibilidade sem apagar, reconstruir ou fingir a evidência física.

## Recuperação operacional M5.3

- **Criar nova revisão** reutiliza diretamente o Perfil atual, qualquer versão anterior ou um documento existente. A origem continua explícita e imutável.
- **Restaurar versão** publica uma nova versão idêntica ao snapshot escolhido. **Usar como base** cria um rascunho editável, sem publicar nada.
- **Corrigir Pessoa vinculada** move o documento e seus artefatos documentais para a Pessoa correta, preservando todos os Perfis publicados.
- **Mesclar Pessoas** mantém uma Pessoa principal, preserva a origem da absorvida e pergunta somente por contatos ou Perfis realmente conflitantes.
- **Alterar vínculo** não reprocessa currículo nem publica Perfil. **Arquivar Pessoa** remove o cadastro do trabalho corrente e **Reativar Pessoa** o devolve, sem perda histórica.
- Revisões interrompidas reaparecem como **Continuar revisão**; fontes reutilizáveis descartadas reaparecem como **Reabrir** ou **Revisar novamente**. Novo upload só é solicitado quando não existe conteúdo preservado suficiente.

O processamento local de PDF pode pausar quando o navegador é fechado. O Prisma preserva o último checkpoint seguro e retoma sem repetir upload ou etapas já concluídas; não promete processamento em segundo plano que a arquitetura atual não executa.

## Mensagens e interação

Toda falha corrigível informa o que falta e oferece a ação correspondente. Falha interna não culpa um campo do operador. Confirmação adicional existe apenas para exclusão física e reinício do Perfil, pois representam risco material. Metadados de auditoria são automáticos.
