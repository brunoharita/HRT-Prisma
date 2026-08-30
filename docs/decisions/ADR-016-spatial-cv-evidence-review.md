# ADR-016: Evidência espacial na revisão de currículo

- Status: accepted
- Data: 2026-08-27
- Owners: application, data, security, product

## Contexto

O M2-C preservava a evidência textual original e a revisão por campo, mas não vinculava uma intervenção humana a uma região verificável do PDF. Uma correção poderia ser auditada pelo valor anterior e posterior, sem provar qual página e qual área sustentaram a decisão.

## Decisão

- A revisão mantém o PDF original visível ao lado dos campos estruturados e trata o documento como fonte primária.
- Evidência espacial nasceu no contrato `spatial-evidence` 1.0.0 e evoluiu de forma compatível para 1.1.0: `document_id`, `document_version`, página e retângulo normalizado no intervalo de 0 a 1.
- Seleção textual usa a camada local do PDF.js. Quando ela não fornece texto, somente a região selecionada pode passar por OCR local com Tesseract.js. Nenhum documento é enviado a LLM ou serviço externo.
- Evidência extraída permanece imutável. Evidência humana cria nova região, vínculo, revisão e evento. Substituição encerra o vínculo anterior sem apagá-lo.
- Correção, complemento, substituição e criação de informação suportada passam pela RPC transacional `record_profile_review_evidence`, com lock otimista e idempotência.
- DML direto nas três tabelas M5 é revogado. A RPC `security definer` usa `search_path` vazio e valida sessão, tenant, papel, estado, versão documental, página e coordenadas.
- Registros históricos sem coordenadas continuam válidos como evidência original. Coordenadas nunca são inferidas ou fabricadas no backfill.
- Em 1.1.0, seleção nativa usa `pdfjs-character-region-v2`: o arraste inicial resolve um conjunto explícito de caracteres, o texto é montado desse conjunto e o destaque pendente é redesenhado com as mesmas caixas. Esquerda, topo e base continuam usando o centro visual; no limite direito, no máximo um caractere contíguo pode ser recuperado dentro de tolerância subpixel. A região final se ajusta ao contorno das caixas resolvidas. Métricas de fonte de fallback que ultrapassem o próximo item da mesma linha são proporcionalmente encaixadas no intervalo visual disponível, e a faixa de status é reservada antes do arraste para impedir deslocamento do PDF durante o gesto. Interseção parcial com uma linha ou `span` não autoriza incluir todo o texto.
- O ADR-021 substitui a compensação subpixel acima para novas execuções do mesmo método: o `TextLayer` recebe a escala total correta e todas as unidades são normalizadas antes da seleção. Evidências históricas permanecem válidas e nenhuma região é reinterpretada.
- O visualizador apresenta somente regiões do escopo semântico aberto. Em Experiência e Formação, o escopo é o índice do registro; nas demais abas, é o conjunto de campos renderizado conjuntamente. Regiões fora desse contexto permanecem preservadas e voltam a aparecer ao abrir o registro ou a aba correspondente.

## Consequências

A decisão humana fica navegável e verificável no documento, sem misturar extração original com revisão. O contrato exige uma região explícita para novas evidências espaciais e bloqueia coordenadas inválidas ou versão documental divergente. O filtro contextual reduz ruído visual sem apagar ou reclassificar evidência; por ser uma regra de apresentação compatível, não exige nova versão de `spatial-evidence`. Em telas menores, documento e revisão alternam por um controle de visão sem duplicar estado.

O advisor sinaliza a RPC pública como `security definer`. O uso é intencional e segue a exceção controlada do ADR-011: autorização interna explícita, DML direto revogado, trilha imutável e testes negativos.

## Evidência

- Migrations `20260827034147_m5_spatial_cv_evidence.sql`, `20260827041613_m5_spatial_evidence_fk_indexes.sql` e `20260827042829_m5_spatial_evidence_idempotent_replay.sql`.
- Componentes `DocumentEvidenceViewer` e `StructuredReviewPanel`.
- Testes `tests/m5SpatialEvidence.test.ts`.
- Migration `20260828160707_strict_pdf_character_region.sql`.
- Evidência conectada `docs/qa/m5-spatial-evidence.md` no Prisma-QA.

## Rollback

Desabilitar as ações espaciais no frontend e revogar `execute` da RPC por forward fix. Não apagar regiões, vínculos, eventos ou revisões já registrados. A leitura M2-C e as evidências originais permanecem compatíveis.
