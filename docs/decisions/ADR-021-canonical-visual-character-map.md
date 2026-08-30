# ADR-021: Mapa canônico de caracteres para evidência visual

- Status: accepted
- Data: 2026-08-30
- Owners: application, product, AI, QA

## Contexto

O método `pdfjs-character-region-v2` já usava unidades por caractere, mas calculava suas caixas no espaço de pixels da renderização corrente. No `pdfjs-dist` 5.4.296, o `TextLayer` exige `--total-scale-factor`; sem essa variável, a página no canvas continuava correta enquanto a camada textual invisível herdava fonte de 14 px. No currículo real validado, uma linha que ocupava aproximadamente 289 px no zoom de ajuste à largura recebia uma caixa invisível próxima de 894 px. Os finais de várias linhas eram então excluídos apesar de parecerem dentro da área selecionada.

Zoom, ajuste à largura, densidade do monitor e proporção da tela não podem mudar quais caracteres uma evidência representa. A mesma regra também precisa aceitar unidades posicionadas provenientes de OCR e de futuros renderizadores fixos para imagens ou documentos paginados, sem criar um motor de seleção por formato.

## Decisão

- A renderização PDF define explicitamente `--scale-factor` e `--total-scale-factor` com o `viewport.scale` antes de criar o `TextLayer`.
- Cada adaptador produz unidades visuais identificadas por caractere ou símbolo, com origem, linha, offset, confiança e caixa geométrica.
- As caixas da camada nativa e do OCR são convertidas imediatamente para `normalized-page-v1`. A seleção, o refinamento, o texto recuperado e o destaque pendente operam somente nesse espaço canônico.
- Pixels da tela existem apenas nas bordas de entrada e saída: gesto do ponteiro para região normalizada e região normalizada para desenho. Mudar zoom reconstrói a projeção, nunca o significado da seleção.
- O mesmo conjunto ordenado de unidades alimenta o texto e o destaque. Não existe tolerância fixa de borda nem resgate de caractere fora do contorno canônico.
- O retângulo bruto continua limitando a seleção. Caracteres de outra coluna, linha ou campo não entram apenas por pertencerem ao mesmo `span`.
- PDF nativo usa unidades `native`; OCR usa unidades `ocr`. Futuros adaptadores de imagem ou DOCX devem gerar a mesma representação canônica depois de uma renderização paginada e versionada. Este ADR não declara esses formatos implementados.

## Compatibilidade e versão

O contrato persistido permanece `spatial-evidence` 1.2.0 e o método permanece `pdfjs-character-region-v2`. Tenant, documento, página, região normalizada, texto bruto, texto efetivo, refinamentos, autoridade e histórico não mudam. A alteração corrige a projeção cliente do método já documentado e não reclassifica evidências históricas.

Uma futura persistência de IDs de unidades, uma nova representação de página ou a ativação real de DOCX/imagem exigirá decisão de versão própria. Formato desconhecido continua falhando fechado.

## Consequências

Seleções equivalentes em 57%, 100% e 147% resolvem o mesmo texto. A geometria do PDF.js deixa de depender da fonte herdada pela página HTML. OCR e texto nativo compartilham o motor de contenção e refinamento, mas a confiança textual do OCR permanece explícita e sujeita à confirmação humana.

## Evidência

- `web/src/domain/spatialEvidence.ts` normaliza unidades posicionadas para a página.
- `web/src/components/review/DocumentEvidenceViewer.tsx` corrige a escala do `TextLayer` e alimenta seleção, OCR, refinamento e destaque com coordenadas canônicas.
- `tests/m5SpatialEvidence.test.ts` comprova invariância em 57%, 100% e 147%, além de contenção estrita na borda direita.
- Smoke autenticado no currículo de Bruno Harita mediu a região problemática dentro da página nos zooms 57% e 147%.

## Rollback

Reverter o motor cliente por forward fix mantendo as regiões persistidas. Nenhuma tabela ou registro precisa ser apagado ou convertido.
