# ADR-037: Relações ocupacionais oficiais preservam escalas de origem

Status: accepted
Data: 2026-09-06

## Contexto

A Knowledge Global já possui conceitos, termos, relações, versionamento de fonte, staging, diff e publicação humana. ESCO e O*NET precisam relacionar ocupações a habilidades, conhecimentos e tecnologias sem transformar referências de mercado em evidência de uma Pessoa e sem misturar semânticas incompatíveis.

## Decisão

`knowledge_relations.relation_attributes` guarda somente atributos declarados pela fonte. ESCO registra `relevance: essential|optional`; O*NET registra cada medida como `scaleId`, `rawValue`, arquivo e linha de origem. Não existe nível Prisma, média entre fontes ou conversão de `essential` em proficiência.

O pipeline compatível v2 reutiliza staging e publicação M5.2. A publicação mantém a mesma autorização humana e, após a publicação imutável da versão, vincula atributos ao relacionamento publicado por source version e mappings oficiais. A CBO continua no pipeline anterior sem regressão.

O subconjunto O*NET é intencional: Occupation Data, Content Model Reference, Essential Skills, Knowledge e Software Skills. Abilities, tarefas e demais dimensões não são carregadas neste movimento porque não são necessárias para orientar cargo, habilidade, conhecimento e ferramenta.

## Consequências

- Cargo é referência profissional; Perfil e Matching continuam exigindo evidência da Pessoa.
- Vagas podem usar os dados como sugestão contextual, nunca como requisito automático.
- A interface apresenta Essencial, Opcional, Importância e Nível em linguagem humana; detalhes técnicos ficam na proveniência.
- ESCO só pode ser publicado com o snapshot oficial obtido no portal. O*NET 31.0 pode ser preparado a partir do pacote oficial, mas sua publicação segue revisão humana em QA.
