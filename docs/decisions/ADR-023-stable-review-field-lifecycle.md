# ADR-023: Ciclo de vida estável dos campos de revisão

Status: accepted
Data: 2026-08-30

## Contexto

Campos opcionais vazios impediam o salvamento e registros repetíveis eram endereçados pela posição no array. Ao remover ou inserir uma experiência ou formação, as posições seguintes mudavam e podiam deixar evidência e histórico associados ao registro errado. A interface também não oferecia um caminho explícito e reversível para acrescentar ou retirar conjuntos de campos.

## Decisão

- Nome completo é obrigatório.
- Telefone ou e-mail é obrigatório, considerando o valor revisado ou o contato privado canônico já existente.
- O currículo precisa conter ao menos uma informação profissional material.
- Campos escalares opcionais vazios são persistidos como `null`; listas vazias são `[]`; itens repetíveis completamente vazios são descartados no salvamento.
- Experiência exige Empresa ou Cargo e preserva os quatro campos Empresa, Cargo, Período e Descrição.
- Formação exige Curso ou Instituição.
- Experiência, formação e resultado possuem inclusão e remoção explícitas. A remoção é anunciada como pendente até salvar e oferece Desfazer.
- Novas experiências e formações recebem IDs estáveis. Caminhos históricos numéricos continuam legíveis, sem reescrita retroativa.
- Evidência, refinamento e aprendizado adaptativo aceitam simultaneamente caminhos históricos e estáveis. Novas extrações e novos salvamentos falham fechados se não respeitarem o contrato estável.
- A validação existe na interface e no PostgreSQL. A interface direciona o operador ao campo; o banco impede bypass por cliente alternativo.

## Consequências

O operador pode limpar conteúdo incorreto sem criar valores artificiais, acrescentar novos conjuntos e retirar itens com recuperação imediata. Inserções e remoções não deslocam a identidade semântica dos registros seguintes. Payloads históricos continuam acessíveis, mas toda nova escrita usa o contrato atual.

## Versões

- `review-field-lifecycle` 1.0.0;
- `adaptive-resume-extraction` 4.0.0;
- `extraction-draft` 5.0.0;
- `person-ingestion` 7.0.0;
- `human-profile-review` 4.0.0;
- `professional-profile` 3.0.0.

`spatial-evidence` permanece 1.2.0 porque a geometria, a seleção e o significado de uma região não mudaram.

## Reversão

O frontend pode ocultar as novas ações sem apagar registros. A reversão do schema precisa restaurar as expressões de caminho anteriores somente depois de comprovar que nenhum vínculo estável foi criado. IDs já persistidos nunca devem ser convertidos em índices.
