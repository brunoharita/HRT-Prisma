# ADR-020: Refinamento subtrativo de evidência espacial

Status: accepted
Data: 2026-08-29

## Contexto

Uma região retangular pode conter corretamente todos os caracteres visuais escolhidos e, ainda assim, englobar cabeçalhos ou valores que já sustentam outros campos do mesmo registro. Editar apenas o texto recuperado resolve a aparência do valor, mas perde a distinção auditável entre a região bruta, o conteúdo descontado e o texto efetivamente usado pelo campo. Seleções livres ou polígonos também aumentariam a complexidade da interação sem aproveitar as evidências espaciais já existentes.

## Decisão

O Prisma mantém o retângulo como origem bruta e introduz uma máscara subtrativa composta por regiões espaciais já vinculadas a campos irmãos do mesmo registro. A elegibilidade exige mesma organização, revisão, documento, versão, página, escopo semântico e sobreposição geométrica real. Regiões humanas aparecem excluídas por padrão; regiões automáticas permanecem como sugestão explícita. O revisor pode excluir ou reincluir cada candidato antes de aplicar.

O runtime opera sobre caracteres da camada PDF.js ou símbolos posicionados do OCR. Nenhum conteúdo externo ao retângulo bruto pode entrar no resultado. A região persiste `raw_selected_text` e mantém `selected_text` como texto efetivo. Cada candidato gera uma decisão append-only `excluded` ou `included`, vinculada à região nova e ao vínculo espacial preexistente. O banco recalcula autoridade, escopo e sobreposição antes de aceitar a decisão; o frontend não é a autoridade dessa regra.

Regiões históricas `1.0.0` e `1.1.0` permanecem legíveis. Somente operações pela nova RPC recebem `spatial-evidence` 1.2.0. A RPC antiga continua compatível e produz 1.1.0, sem fabricar refinamentos históricos.

## Consequências

- a seleção retangular permanece simples e visualmente fiel;
- conteúdo previamente mapeado pode ser descontado sem apagar a evidência de origem;
- reutilização legítima de um trecho continua possível por reinclusão explícita;
- decisões automáticas não são confundidas com confirmações humanas;
- a subtração fica limitada a campos irmãos do mesmo item, impedindo vazamento entre experiências ou formações;
- o histórico registra decisões e referências, sem copiar novamente o texto para o ledger;
- novos tipos de registros compostos exigem extensão explícita do escopo permitido.

## Contratos e evidência

- `spatial-evidence` 1.2.0;
- `human-profile-review` 2.2.0;
- `person-ingestion` 5.2.0.

Implementação: `web/src/domain/spatialEvidence.ts`, `DocumentEvidenceViewer`, `ProfileReviewPage`, `personIngestionService` e migrations locais `20260829111414_spatial_evidence_refinement` e `20260829113452_spatial_evidence_refinement_rpc_fix`, aplicadas no Prisma-QA como `20260829113031` e `20260829113502`. Testes determinísticos: `tests/m5SpatialEvidence.test.ts`. O frontend permanece local e não houve ação de produção.
