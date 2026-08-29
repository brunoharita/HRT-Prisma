# Versionamento

## Regra geral

Contratos materiais usam versão semântica `major.minor.patch` e nome estável. A versão persiste com o artefato produzido quando necessária para reconstruir comportamento.

- Patch: correção sem mudança semântica material.
- Minor: evolução compatível, como campo opcional ou regra adicional controlada.
- Major: incompatibilidade, mudança de significado, obrigatoriedade ou decisão.

Nunca alterar silenciosamente o significado de contrato persistido.

## Contratos versionados

Perfil profissional, extraction, inference, parser, intake de currículo, retrieval/embedding, matching, confidence, prompts, modelos, taxonomias, contratos de busca, DTOs/APIs, eventos, regras de privacidade e Context Pack.

## Compatibilidade

Todo consumidor deve declarar versões aceitas. Versão ausente, desconhecida, futura ou incompatível falha de forma segura em operação sensível. A resposta deve registrar código de erro e indicar reprocessamento, migração ou revisão humana; nunca assumir a versão atual.

## Promoção

1. atualizar contrato e owner;
2. classificar patch, minor ou major;
3. atualizar código e persistência;
4. executar testes de contrato e golden tests;
5. comparar custo, latência e regressões;
6. registrar ADR se houver decisão duradoura;
7. atualizar Context Pack;
8. promover local, QA, evidência e aprovação antes de produção.

## Rollback e histórico

Versões anteriores permanecem identificáveis. Rollback reativa artefato anterior sem reescrever resultados históricos. Mudança de prompt ou modelo relevante cria nova versão mesmo quando o schema de saída não muda.

## Versões atuais

As constantes de IA vigentes estão em `src/domain/versions.ts`; contratos de ingestão/revisão estão em `document-review-contract.md`; e o catálogo proprietário está em `contracts.md`. `TUDO_SOBRE_PRISMA.md` usa versão própria de contexto, não substitui versões de domínio.

A segunda geração adaptativa mantém `pdf-native-extraction` 2.0.0 e usa `spatial-evidence` 1.1.0, e avança `adaptive-resume-extraction` para 2.0.0, `extraction-draft` para 3.0.0, `person-ingestion` para 5.0.0 e `human-profile-review` para 2.0.0. `spatial-evidence` 1.1.0 introduz `pdfjs-character-region-v2`: evidências históricas `1.0.0`/`pdfjs-text-layer-v1` permanecem legíveis, mas novas seleções nativas usam contenção estrita por caractere. A releitura imediata por bloco é document-local e exige aceite humano. Somente a aprovação integral da revisão promove sinais estruturais tenant-scoped para a primeira extração futura. Versão desconhecida nunca muda silenciosamente o significado de um contrato persistido.

A correção de validação do modal de evidência em 2026-08-28 não altera payload, persistência, autoridade ou significado de `human-profile-review` 2.0.0 e `spatial-evidence` 1.1.0; portanto, não exige nova versão contratual.

As áreas personalizadas são uma evolução aditiva, mas material. Elas avançam `professional-profile` para 1.2.0, `adaptive-resume-extraction` para 2.1.0, `extraction-draft` para 3.1.0, `person-ingestion` para 5.1.0 e `human-profile-review` para 2.1.0, além de introduzir `custom-profile-section` 1.0.0 e `organization-custom-section-definition` 1.0.0. Payloads históricos sem `customSections` continuam legíveis como lista vazia. A versão 2.1 não autoriza transformar áreas personalizadas em competências ou matching automaticamente.

O refinamento subtrativo é uma evolução compatível e material. Ele avança `spatial-evidence` para 1.2.0, `human-profile-review` para 2.2.0 e `person-ingestion` para 5.2.0. Regiões 1.0 e 1.1 continuam legíveis; somente a RPC refinada produz 1.2 com texto bruto, texto efetivo e ledger de decisões. Ausência desses campos em evidência histórica significa apenas que não houve refinamento registrado, nunca que uma subtração foi inferida retroativamente.

A aderência visual da seleção em 2026-08-29 preserva `pdfjs-character-region-v2` e `spatial-evidence` 1.2.0. O payload continua usando a mesma região normalizada e os mesmos campos persistidos; antes da confirmação, porém, o cliente resolve os caracteres, ajusta essa região ao contorno das caixas selecionadas e usa o mesmo conjunto para destaque, texto bruto e refinamento. A tolerância subpixel é limitada a um caractere contíguo na direita; métricas de fonte invisível que ultrapassem o próximo item visual da mesma linha são encaixadas proporcionalmente nesse limite, e a altura da interface permanece estável durante o arraste. Esquerda, topo, base, autoridade e histórico permanecem inalterados. Trata-se de um reforço compatível da representação visual do método existente, sem nova versão contratual.
