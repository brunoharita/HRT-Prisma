# Acordo — disponibilidade antecipada da importação

Versão 1.0.0, 2026-09-25. Aprovado pelo PO nesta tarefa: “pode construir isso e já implementar atualizado em main em produção”, sobre a recomendação de implementar primeiro a disponibilidade na tela. Risco D: transporte autenticado e ingestão. Baseline `eb561b4ea128f749eac4a34b241b4d7c4b876335`.

## Requisitos e aceite

- D-01: consultar disponibilidade ao abrir a importação pelo caminho autenticado gateway → túnel → worker. CA-01: HTTP sintético integrado comprova resposta sem documento, inferência ou escrita de dados.
- D-02: mostrar verificando, disponível, ocupado, indisponível ou inconclusivo, horário observado e ação de nova checagem. CA-02: estados renderizados e respostas inválidas nunca verdes.
- D-03: preservar arquivo selecionado e impedir início em indisponibilidade/ocupação confirmadas; atualizar checagem antes de importar. Resultado inconclusivo é consultivo e permite tentativa explícita normal, preservando gates reais de autorização. CA-03: prova dos gates antes de PDF.js/intake e preservação da seleção.
- D-04: checagem tem prazo curto, resposta estritamente sanitizada, mesma autorização de importação, não reserva capacidade nem cria cooldown. CA-04: negativos de sessão, origem, empresa, contrato, timeout, concorrência, worker antigo e corpo inválido.
- D-05: expirar resultados antigos e descartar respostas de contexto anterior; falhas durante a importação continuam explícitas. CA-05: testes de validade e contexto, regressão do transporte de parse.
- D-06: publicar worker, gateway e web compatíveis; comprovar estado em produção sem importar currículo real. CA-06: smoke da tela e rota autenticada, recusas anônimas, SHA e containers verificados.

## Proibições

- P-01: sem PDF, PII, token, chave, detalhes de infraestrutura ou texto de erros nos resultados/logs de disponibilidade; sem chamada OpenAI, retry de inferência ou escrita em banco/cache/ledger na checagem.
- P-02: não contornar autorização, isolamento de empresa, lock de processamento, revisão humana ou integridade do PDF; não prometer que disponibilidade garante sucesso da OpenAI.
- P-03: não substituir estado desconhecido por disponível, nem atribuir falha ao túnel/worker individual sem evidência.

## Limites e autonomia

- F-01: monitor periódico externo, canal de alertas, painel operacional novo, hospedagem permanente do worker e supervisão automática de túnel.
- F-02: OCR, modelo, prompt, banco, migrações, taxonomia M8, publicação de Perfis e reprocessamento real.
- A-01: reutilizar gateway/worker/Ant Design; rota aditiva, estados tipados, limites, textos e testes delegados à engenharia. Sem nova biblioteca.
- Q: nenhuma decisão material pendente nesta primeira etapa.
- Versão: contrato aditivo `parser-ia-readiness-1.0.0`; contratos de parse/persistência e versão pública M8.2 preservados, pois complementa robustez operacional.
- Referência visual: captura é evidência do incidente, não novo alvo normativo. Preservar composição atual e acrescentar aviso compacto próximo da ação.

## Mapa de impacto inicial

| Área/capacidade | Relação | Baseline e preservação | Prova prevista |
| --- | --- | --- | --- |
| Tela de importação | direct | baseline acima: seleção, PDF.js, identidade, revisão existentes | estados, seleção preservada, gate, smoke visual |
| Gateway e worker | direct | POST parse, loopback, lock, erros sanitizados existentes | testes HTTP com mocks e negativos, sem IA real |
| Auth/tenant | critical_transversal | autorizador live do gateway reutilizado | negativos existentes + readiness sem permissão não alcança worker |
| Paddle e outras entradas de parse | plausible_indirect | gateway e worker compartilhados | regressão de ambas rotas, capacidade independente e parse |
| Web/assets | plausible_indirect | Nginx e rollout compartilhados | build, rota exata, preservação de assets, HTTPS |
| Dados, matching, Knowledge | no_impact_identified | checagem sem persistência e anterior ao intake | inspeção do contrato e diff; sem acessos a dados de Pessoas |

Limite do baseline: falha da captura não correlacionada com logs atuais. Checagem não valida saldo/crédito nem disponibilidade futura da OpenAI.
