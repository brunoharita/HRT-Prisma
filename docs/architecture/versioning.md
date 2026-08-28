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
