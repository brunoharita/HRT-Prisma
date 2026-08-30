# Evidência QA: ciclo de vida dos campos de revisão

Data: 2026-08-30. Ambientes: checkout local e Prisma-QA `ioldpnqqvobprjiontre`. Produção não incluída.

## Cobertura local

- normalização de escalares, tags, resultados, experiências, formações e áreas personalizadas vazias;
- validação de nome completo, contato efetivo e conteúdo profissional material;
- Empresa ou Cargo para experiência e Curso ou Instituição para formação;
- IDs estáveis após reordenação e compatibilidade com caminhos numéricos;
- reconhecimento de campos irmãos para IDs estáveis;
- presença das ações Adicionar, Remover e Desfazer e de erro associado ao campo;
- distinção entre formulário transitório vazio e mudança semântica persistível;
- bloqueio de duplicatas vazias, cancelamento sem remoção e descarte sem revisão artificial;
- seleção de evidência para campo novo com validação e persistência atômicas;
- fallback de seleção após remoção e rejeição de caminhos inexistentes;
- confirmação de saída diante de qualquer diferença local;
- typechecks, build e suíte técnica sem regressão.

## Banco Prisma-QA

A migration local `20260830175144_review_field_lifecycle.sql` foi aplicada como `20260830181745_review_field_lifecycle`. As seis constraints de ciclo de vida e a constraint de caminho de evidência estão validadas. Funções privadas usam `search_path` vazio, não são executáveis por `anon` ou `authenticated` e os novos gatilhos protegem extrações e atualizações de rascunho.

Uma transação revertida comprovou:

- rejeição de nome ausente;
- rejeição de telefone e e-mail simultaneamente ausentes, inclusive sem contato canônico de apoio;
- rejeição de currículo sem informação profissional material;
- rejeição de ID estável inválido;
- aceite de payload válido com experiência humana;
- rollback com zero e-mails ou revisões de teste residuais.

O advisor não acrescentou ausência de RLS, grants privados ou foreign keys. Permanecem os alertas históricos de RPCs públicas `security definer`, políticas permissivas sobrepostas, índices ainda não utilizados e proteção de senha vazada desabilitada. As RPCs de revisão continuam intencionalmente expostas somente a `authenticated`, com autorização interna por tenant e papel.

## Smoke autenticado

No navegador interno, com a sessão Super Admin reutilizada, a revisão real carregou sem erro. O smoke confirmou inclusão de uma sexta experiência, caminho estável `experiences.experience_<id>.organization`, remoção pendente, aviso explícito, Desfazer e retorno à contagem anterior. A aba Resumo mostrou Nome completo como obrigatório, Adicionar resultado e três ações visíveis de inclusão em campos de tags. As alterações temporárias foram descartadas e a página terminou sincronizada, sem salvamento ou resíduo.

O smoke complementar autenticado confirmou que formação, experiência e resultado abrem um único formulário transitório mesmo após cliques repetidos. O estado informa que o campo aguarda conteúdo, mantém Salvar desabilitado e permite iniciar a seleção espacial sem justificativa nem salvamento prévio. Cancelar a seleção e depois a inclusão restaura as contagens originais, mantém a aba correta e devolve `Rascunho sincronizado`, sem pendência de remoção ou gravação remota. A suíte técnica cobriu também no-op semântico, caminho removido, seleção defensiva e raízes vazias de Experiência/Formação.
