# ADR-047: Document Intelligence desacoplada e self-hosted

Status: aceita para implementação, cutover bloqueado por benchmark real

Data: 2026-09-10

## Contexto

O pipeline M5 já usa PDF.js, Tesseract.js, `normalized-page-v1`, extração semântica Prisma e revisão humana. Currículos com duas colunas, scans e layouts complexos exigem leitura documental mais rica, mas um engine de OCR não pode assumir autoridade sobre empresa, cargo, período, formação, competências, Perfil ou publicação.

## Decisão

Adotar `DocumentIntelligenceProvider` como porta substituível e `CanonicalDocument` 1.0.0 como contrato sob autoridade Prisma. Apenas o adaptador de infraestrutura conhece o JSON do Paddle. Ele converte dimensões, blocos, linhas, ordem, polígonos, scores e proveniência para `normalized-page-v1` antes de alcançar M5.

O provider inicial é PaddleOCR 3.7.0 self-hosted. PP-StructureV3 com PP-OCRv6 atende estrutura, layout, reading order e OCR. PaddleOCR-VL 1.6 fica restrito à recuperação visual de página que permaneceu insuficiente. O parser semântico Prisma continua produzindo `ExtractionDraft`; labels Paddle são somente sinais documentais genéricos.

O preflight escolhe:

1. `native-fast`: PDF.js quando texto e geometria nativos são suficientes;
2. `structure`: PP-StructureV3 para texto nativo com layout complexo;
3. `vision`: PP-StructureV3 com orientação, correção e OCR para scan ou página sem texto útil;
4. `recovery`: PaddleOCR-VL por imagem de página elegível e, se falhar, Tesseract.js por página.

`VITE_DOCUMENT_INTELLIGENCE_MODE` aceita `baseline`, `shadow` ou `enabled`. Ausência ou valor desconhecido retorna a `baseline`. O cutover para `enabled` depende de benchmark real autorizado, meta de 90% nos documentos claros suportados, superioridade sobre baseline e ausência de regressão crítica.

## Segurança e operação

Os serviços escutam somente em loopback e não dependem de API Paddle externa. O documento permanece na infraestrutura controlada. A telemetria persistida é tenant-scoped, possui RLS e grants explícitos, armazena apenas rota, versões, categorias e tempos, sem conteúdo integral. Falha de telemetria opcional não bloqueia o operador.

## Compatibilidade e rollback

PDF.js, Tesseract.js, `ExtractionDraft`, evidência espacial, revisão, publicação e perfis históricos permanecem inalterados semanticamente. Rollback define a flag como `baseline` e interrompe os containers; documentos e perfis não são reescritos.

## Consequências

- ganho potencial de estrutura sem acoplar o domínio ao fornecedor;
- custo local de modelos, memória e latência de aquecimento;
- runtime Windows recomendado via Docker ou WSL;
- runtime e qualidade ainda precisam de prova local com daemon funcional e amostra real autorizada;
- produção permanece fora de escopo.
