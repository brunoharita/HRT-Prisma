# ADR-047: aprendizado genérico de padrões de registros no documento

- Status: accepted
- Data: 2026-09-10
- Decisores: Product Owner e engenharia Prisma

## Contexto

O reconhecimento anterior de experiências dependia parcialmente de títulos, vocabulário de cargos e posição do cabeçalho. Isso impedia que uma revisão humana de um bloco ensinasse o Prisma a encontrar registros visualmente equivalentes em outra coluna, página ou posição. Formação, cursos e certificações não usavam o mesmo ciclo document-local.

PP-StructureV3 já fornece regiões, rótulos, caixas e ordem de leitura. PDF.js e Tesseract já fornecem linhas posicionadas. Substituir essa base por outro parser duplicaria o documento canônico e não resolveria, por si só, a indução governada a partir da revisão humana.

## Decisão

Reutilizar o documento canônico existente e introduzir um motor determinístico provider-neutral de padrões relativos. O motor segmenta e compara topologia, tipografia, ordem, tipo de bloco, posição relativa de período e corpo, sem usar página, coluna ou coordenada absoluta como identidade.

Quando o provedor canônico entrega `blockId`, `blockType` e `blockReadingOrder`, linhas de uma mesma região são agrupadas antes da interpretação semântica. Isso cobre, por exemplo, currículos que repetem `Empresa -> Cargo -> Período` em duas colunas, mesmo sem intervalo cronológico convencional. A delimitação espacial da seção usa página e eixo vertical; a ordem serial do PDF não pode encerrar prematuramente a outra coluna.

A interpretação semântica permanece em adaptadores de experiência, formação e curso ou certificação. O parser propõe primeiro. Uma correção humana completa e com evidência espacial confirma o tipo do bloco e dispara a procura de irmãos sem clique adicional. Cada candidato é relido na própria região e mantém seus próprios valores e evidências.

Sugestões fortes ou possíveis continuam sujeitas à decisão humana. Aceite, revisão, evidência e caso de aprendizado são persistidos atomicamente na organização da revisão. Nada é publicado diretamente no Perfil e nenhum conteúdo pessoal é promovido como padrão organizacional por esta decisão.

A região selecionada pelo revisor confirma qual bloco de origem foi corrigido. O texto humano pode corrigir OCR imperfeito e não precisa repetir literalmente a leitura defeituosa; os irmãos, porém, continuam sendo relidos em suas próprias regiões e nunca recebem por cópia o valor corrigido na âncora.

## Alternativas consideradas

- Substituir o pipeline por Docling, Unstructured ou LayoutParser: rejeitado neste movimento porque acrescentaria outro documento intermediário, dependência e superfície operacional, sem oferecer o ciclo Prisma de confirmação humana e persistência governada.
- Treinar ou chamar um modelo externo: rejeitado por custo, PII, não determinismo e ausência de conjunto avaliado suficiente.
- Ampliar listas de cabeçalhos, cargos e rodapés: rejeitado como estratégia principal porque não generaliza layouts e perpetua regras por posição ou vocabulário.

## Consequências

- `adaptive-resume-extraction` avança para 7.0.0.
- `extraction-draft` avança para 8.0.0 e o runtime para `prisma-layout-adaptive-v8`.
- A revisão adaptativa avança para `prisma-document-learning-v4`, `generic-record-pattern-v1` e `relative-record-signature-v1`.
- Eventos v2 e v3 continuam legíveis. Novas escritas v4 falham fechadas sem tipo, âncora, assinatura, geometria e metadados válidos.
- Currículos históricos não são reprocessados automaticamente.

## Evidência esperada

Testes positivos e negativos por tipo de registro, variação de coluna e página, seleção dentro do corpo, ruído repetido de margem, ausência de geometria, valores próprios e persistência tenant-scoped. Validação real usa somente currículos autorizados e não os adiciona ao repositório.

## Evidência obtida

- No currículo autorizado de Tainá Marques, uma revisão humana da experiência Movile encontrou exatamente Vtex e Catho como irmãos, sem classificar os blocos acadêmicos como experiência.
- No currículo autorizado de Vagner Novais Pereira, uma revisão humana de JAD ZOGHEIB encontrou T-GESTIONA, ORIGEM DO BRASIL, IMEDIATO AMBEV e DURATEX, inclusive na coluna oposta. Cada proposta reteve empresa, cargo, período, descrição e evidência próprios.
- BATERIAS TUDOR, sem o mesmo rótulo de período, e AUTÔNOMO, com estrutura livre, não foram promovidos automaticamente. Permaneceram para revisão individual, preservando o comportamento fail-closed.
- As sugestões foram aplicadas somente ao rascunho auditável. Nenhuma nova versão de Perfil foi publicada.
