# ADR-043: revisão e apresentação canônicas da Vaga

## Decisão

`vacancy-definition-1.1.0` separa a narrativa operacional dos requisitos comparáveis. A Vaga pronta mostra apenas `Sobre a posição` quando houver conteúdo, `Responsabilidades`, `Requisitos obrigatórios`, `Requisitos desejáveis` e `Resultados esperados` quando houver conteúdo. Requisitos são agrupados pelas dimensões da matriz Perfil Prisma ↔ Vaga; responsabilidade nunca é requisito bruto de matching.

O estruturador propõe a dimensão, mas registra `unclassified` até a decisão humana de obrigatório ou desejável. Esse estado é permitido em rascunho e bloqueia matching. Requisitos manuais têm origem humana. A correção explícita de dimensão gera ledger tenant-scoped e encaminha o termo ao `knowledge_inbox` já existente da organização, sem publicar ou modificar a Knowledge Global.

Ao alterar uma descrição estruturada, o Prisma produz delta. Itens humanos, classificação e correções têm precedência; item não encontrado requer escolha explícita de manter ou remover.

## Alternativas rejeitadas

- Manter Missão, O que procuramos e Contexto como cards finais independentes.
- Escolher automaticamente obrigatório ou desejável a partir do texto.
- Transformar a correção local em alias ou publicação Global.
- Apagar requisitos não reencontrados durante reestruturação.
