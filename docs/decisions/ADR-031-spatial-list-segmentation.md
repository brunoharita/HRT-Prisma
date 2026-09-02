# ADR-031: Segmentação determinística de listas por estrutura espacial

- Status: accepted
- Date: 2026-09-02
- Owners: product, UX, application and QA

## Context

A revisão M5 permite selecionar uma região do currículo e usar seu conteúdo para corrigir um campo estruturado. Em listas visuais, como a grade de competências, o PDF pode entregar caracteres posicionados sem vírgulas ou quebras textuais entre as células. O texto linear resultante preserva as palavras, mas perde a fronteira entre os itens e pode transformar várias competências em um único registro.

## Problem

Converter uma região visual de competências em uma lista correta sem exigir que o operador digite cada item e sem usar espaços comuns como separadores, pois competências como `Gestão de Processos` e `Product Ownership` precisam permanecer inteiras.

## Decision

O Prisma resolve listas de competências em três camadas, nesta ordem:

1. separadores explícitos, como vírgula, ponto e vírgula, quebra de linha, tabulação, barra vertical e marcadores de lista;
2. geometria real dos caracteres ou símbolos, agrupando-os por linha e separando células somente quando existe distância horizontal material em relação à altura do texto;
3. valor único somente quando a seleção não apresenta sinal de múltiplos blocos.

O algoritmo preserva ordem, normaliza espaço e elimina duplicidade equivalente sem alterar a grafia do primeiro valor. Barra comum não é separador, portanto nomes como `BPM/BPMN` permanecem íntegros. Espaço comum nunca separa competências.

Quando existem múltiplas linhas ou blocos, mas nenhuma fronteira confiável, a seleção é marcada como ambígua e não pode ser aplicada silenciosamente. A interface mostra uma orientação objetiva para ajustar a região ou inserir delimitadores. Quando a estrutura é confiável, a prévia apresenta cada competência como um chip antes da confirmação.

## Consequences

- Seleções de grades e tabelas criam um registro por célula sem digitação adicional.
- Colagens com separadores usuais também criam itens independentes.
- Competências compostas permanecem inteiras.
- Texto visualmente ambíguo exige correção humana somente no ponto de ambiguidade.
- O mesmo trecho e a mesma região continuam vinculados ao array resultante; publicação ainda depende da revisão humana existente.

## Rejected alternatives

- Separar por espaços: destruiria competências compostas.
- Usar somente um catálogo conhecido: impediria competências legítimas ainda não catalogadas e confundiria normalização com evidência.
- Pedir Enter para cada item: transferiria ao operador uma estrutura que o PDF já fornece.
- Aplicar um classificador probabilístico: introduziria inferência onde há geometria determinística suficiente.

## Technical impact

Introduz o contrato local `competency-list-segmentation` 1.0.0 e o método `competency-list-spatial-v1`. `resolveSpatialListValues` usa unidades canônicas `normalized-page-v1` ou suas proporções equivalentes. O modal M5 exibe a prévia e bloqueia somente resolução ambígua. O editor direto aceita separadores de lista comuns.

## Data, security and compatibility

Nenhum schema, RPC, RLS, grant ou payload de evidência muda. `reviewedData.competencies` já é um array e passa a receber a estrutura correta antes da mesma RPC transacional. Texto bruto, texto efetivo, região, ator, instante e valores anterior/novo permanecem preservados. Clientes anteriores continuam compatíveis, embora não possuam a segmentação espacial.

## Validation

Testes determinísticos cobrem grade com múltiplas células, competências compostas, `BPM/BPMN`, delimitadores, duplicidade equivalente, valor único e recusa de múltiplas linhas sem fronteira segura. O gate completo do repositório e o smoke visual autenticado devem ser registrados separadamente.

## Replacement criterion

Uma versão posterior pode ampliar a reconstrução de células mescladas ou conteúdo quebrado em várias linhas, desde que preserve geometria real, prévia humana e falha segura diante de ambiguidade.

## References

- `web/src/domain/spatialEvidence.ts`
- `web/src/components/review/DocumentEvidenceViewer.tsx`
- `web/src/pages/ProfileReviewPage.tsx`
- `web/src/components/review/StructuredReviewPanel.tsx`
- `tests/m5SpatialEvidence.test.ts`
- `docs/architecture/document-review-contract.md`
- `docs/qa/m5-spatial-evidence.md`

## Change history

- 2026-09-02: accepted and implemented locally for competency selection and list input.
