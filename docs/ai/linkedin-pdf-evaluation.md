# Avaliação de extração do PDF LinkedIn

Contrato experimental: `linkedin-pdf-evaluation-1.0.2`. Protótipo, sem mudança do registry/runtime de produto. Acordo: `../qa/agreement-linkedin-pdf-evaluation.md`. Evidência: `../qa/aot-linkedin-pdf-evaluation.md`.

## Alternativas e trabalho interno

| Alternativa | Reutilização e trabalho interno | Limite |
| --- | --- | --- |
| Baseline | PDF.js e buildAdaptiveExtraction atuais | Não representa Paddle nem interface integral |
| Local especializada | PDF.js, StructuredDraft, IDs/evidências/classificador; organização de colunas e registros | Heurísticas experimentais dependem de estrutura observada; desconhecidos permanecem pendentes |
| Local + GPT | Propostas locais e trechos necessários, schema e verificação local de citações | Só acrescenta valor se reduzir erros/correção; seleção de trechos pode omitir contexto |
| PDF + GPT | PDF completo, texto/imagens pelo fornecedor e schema; alinhamento/verificação posterior de evidências | Mais dados enviados, processamento visual e potencial custo; schema não prova fidelidade |

A estrutura de benchmark M5.6 foi consultada. Seu cutover exige 8-12 documentos e meta própria de 90%, não aprovada para este movimento. Esta avaliação não altera nem dispensa esse gate. Reutiliza conceitos de campo/prova/desempenho; não reutiliza comparação por índice como prova de associação nem transforma ausência de referência em zero erro.

## Pacote externo proposto, ainda não executável

- Fornecedor candidato: OpenAI Responses API, somente `https://api.openai.com/v1/responses`.
- Modelo experimental candidato: `gpt-5.6-luna`, economicamente compatível com texto/imagens e Structured Outputs; não é escolha definitiva para Extraction. O catálogo consultado em 2026-09-12 não apresentou snapshot distinto; registrar nome retornado, data, hash do prompt e parâmetros, reconhecendo limite de alias mutável.
- Preços consultados: US$ 0,20/1M tokens de entrada e US$ 1,20/1M de saída abaixo de 272K entrada. Custos de imagem devem ser contabilizados; não equiparar bytes de PDF a tokens.
- Proposta de teto: US$ 2 no total, sem recarga/retry automáticos, até 10 chamadas (5 documentos x 2 alternativas), timeout 120 s, saída máxima 12.000 tokens/chamada. Reservar custo conservador antes de cada chamada; timeout continua consumindo reserva, sem supor gratuidade.
- Dados: somente cinco fontes fornecidas nesta tarefa; local + GPT minimiza trechos, excluindo contatos sem necessidade. PDF completo implica dados pessoais e contatos contidos na fonte. Esta diferença deve constar da autorização específica, sem chamar PDF completo de anonimizado.
- `store:false`, sem ferramentas, sem Files API/vector store, nenhum prompt integral em logs; arquivo como conteúdo direto evita um objeto Files persistente, mas não elimina retenção de monitoramento.
- Documentação declara ausência de treinamento por padrão e monitoramento de abuso por até 30 dias, salvo controles/exceções aplicáveis. Não prometer ZDR nem exclusão imediata de logs do fornecedor. Região, controles efetivos e subprocessadores da conta precisam ser documentados antes do envio.
- Credencial: nenhuma OPENAI_API_KEY encontrada no processo ou na configuração local pertinente em 2026-09-12. Não extrair/cooptar o secret remoto de Knowledge; não pedir segredo na conversa.
- Decisões ainda materiais: condições efetivas de dados/conta e aceite do pacote. Desenvolver o bloco local autorizado não é aprovação silenciosa deste pacote.

Fontes oficiais verificadas: [modelo](https://developers.openai.com/api/docs/models/gpt-5.6-luna), [tratamento dos dados](https://developers.openai.com/api/docs/guides/your-data), [entrada PDF](https://developers.openai.com/api/docs/guides/file-inputs).

## Evidência e referência

PDF do PO é ajuste; quatro PDFs adicionais são avaliação. Relatórios privados precisam guardar fonte, propostas, páginas/trechos, versão e latência. Referência deve ser revisada por humano com a fonte, antes de calcular fidelidade ou esforço real. Métricas distinguem valor incorreto, omissão, associação incorreta, invenção e citação inválida. Comparar registros por identidade/evidência, nunca apenas posição no array. Sem referência aprovada: contagens são inventário, qualidade permanece NOT TESTED.

Proveniência/links fornecem rastreabilidade, não autenticidade do perfil nem veracidade profissional. Idiomas conservam proficiência no string existente. Localização não mapeável permanece em evidência/pendência, sem inferir cidade/estado. Classificação acadêmica reutiliza o classificador compartilhado: a partir da regra aprovada em 2026-09-12, versão 1.1.0, curso declarado sem indicação contrária assume conclusão inferida. O snapshot identifica a versão e a origem; resultados anteriores não devem ser comparados sem considerar essa mudança. O protótipo offline preserva períodos textuais para avaliação da extração; a aplicação padroniza as datas ao construir/salvar o rascunho.

## Execução local reproduzível

Criar manifesto **privado** em `tmp/linkedin-evaluation/manifest.json` com `version: 1` e `cases` contendo `id` pseudônimo, `split` (`adjustment`, `evaluation` ou `regression`), `path` absoluto, `sha256` e `authorizedLocal: true`. Máximo cinco fontes; repetir ID/hash é erro. A autorização no manifesto é uma declaração do operador, não substitui autorização real do titular/responsável.

Executar `pnpm run benchmark:linkedin tmp/linkedin-evaluation/manifest.json rodada-unica`. Cada rodada usa diretório novo, recusa sobrescrita e congela código antes de ler os documentos. Fonte é somente lida; derivados pessoais ficam em `tmp/`, nunca anexados a relatório público. Para comparar uma versão histórica, usar as fontes de `frozen-source` e o lockfile correspondente em ambiente apropriado; nunca sobrescrever o checkout ativo ou o original pessoal.

Para cada rota/caso, `*.review.private.json` contém propostas e template **não aprovado**. O humano deve primeiro registrar fatos esperados a partir da fonte, com IDs próprios e citações; depois mapear cada proposta a um fato esperado ou a `null` (sem suporte), julgar associação/evidência e registrar tempo se efetivamente medido. `scoreHumanReview` verifica vínculo ao hash da fonte/implementação, completude das decisões e duplicatas, sem parear registros por índice ou aprovar automaticamente o resultado. Esta é ferramenta de benchmark offline, não um segundo fluxo de revisão/publicação do Prisma.

A primeira rodada dos quatro PDFs foi independente. Depois de observar defeitos e criar correções, os mesmos quatro passaram a regressão conhecida. Não reutilizar resultados posteriores como avaliação cega. Os dois defeitos de campo e a headline decorativa foram corrigidos em 1.0.1; 1.0.2 corrigiu a separação de telefone/e-mail contíguos. Não há alteração de runtime/contrato de produto.
