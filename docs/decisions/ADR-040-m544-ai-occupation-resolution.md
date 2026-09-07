# ADR-040: resolução ocupacional M5.4.4 por IA e explorador oficial

## Decisão

O contrato `occupation-resolution-on-demand-2.0.0` preserva o M5.4.3 e aplica, nesta ordem: Knowledge da empresa, Knowledge Global, Knowledge Agent sobre snapshots internos ESCO/O*NET, Explorador humano e, apenas após declaração explícita de ausência, conceito ocupacional manual da empresa.

O Agent recebe somente termo normalizado, idioma e candidatos oficiais versionados. Ele não recebe Pessoas, Perfis, currículos, requisitos, relações ocupação-habilidade nem ferramentas de Web Search. Uma decisão só é aceita quando aponta um `externalId` presente no snapshot; se não for segura, a decisão é humana.

## Alternativas avaliadas

- Publicar ESCO/O*NET integralmente: descartada, porque transforma staging em Knowledge Global sem revisão.
- Similaridade lexical ou por competências: descartada, porque confunde ocupações, senioridade e evidência de Pessoa.
- Cadastro manual imediato: descartado, porque perde a tentativa de reconciliação oficial e sua reutilização auditável.
- Serviço novo de IA: descartado; o modo novo estende o `knowledge-agent` existente, com orçamento, autenticação e auditoria já estabelecidos.

## Consequências

- Um título alterado gera nova chave idempotente v2; título igual reutiliza a tentativa v2.
- A seleção humana e o cadastro manual criam somente conceito `organization`, nunca publicação Global e nunca mapping oficial falso.
- Falha técnica não habilita manual: o rascunho permanece e pode ser tentado novamente.
- Nenhuma relação ocupacional alimenta matching ou evidência de Perfil.
