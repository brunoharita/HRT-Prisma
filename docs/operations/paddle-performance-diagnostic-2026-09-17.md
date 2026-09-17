# Diagnóstico de desempenho do Paddle - 17/09/2026

## Resultado e recomendação

Os testes isolados encontraram ganho real sem reinstalar o Docker: controlar as bibliotecas de cálculo reduziu uma página de **104,90 para 45,36 segundos**, mantendo o mesmo texto normalizado. Com CPU controlada, os modelos originais processaram as cinco páginas em **162,20 segundos**; a variante leve oficial, com reconhecimento de português, em **44,76 segundos**, aproximadamente **72,4% menos tempo** nessa comparação. Estes são tempos do Paddle local de diagnóstico, não da importação completa pelo site.

Recomendação: preparar uma validação de integração da configuração leve, preservando o fluxo Paddle -> IA -> revisão humana. Existe uma alternativa intermediária: manter layout/detecção originais e trocar somente o reconhecedor de texto para português, que concluiu em **110,05 s**, preservando o hash das posições das linhas nas cinco páginas. Não promover automaticamente os modelos nem declarar qualidade semântica aprovada. O ajuste de CPU sem troca de modelos é a alternativa conservadora. Nenhuma das opções foi aplicada ao worker usado pelo Prisma nesta execução.

## Por que a configuração anterior demorava

1. **O reconhecimento do texto era caro para este computador.** Na primeira página, o mecanismo original gastou 13,93 s localizando linhas e 40,48 s reconhecendo seu conteúdo. O conjunto visual acrescentou 20,81 s.
2. **O paralelismo não estava inteiramente controlado pela opção do Paddle.** A versão instalada usa 10 threads por padrão. Havia bibliotecas independentes com 8 ou 10 threads; um processo foi observado com 35 threads no total. Isso não significa que todas estivessem ativas simultaneamente. Limitar apenas o parâmetro do Paddle ou algumas variáveis não bastou. O conjunto completo de limites e política de espera reduziu o tempo; não foi isolado o efeito individual de cada variável.
3. **Havia carga de modelos fora do momento esperado.** A inicialização padrão carregava correção de imagem e fórmulas, embora a requisição desativasse essas operações. Além disso, a primeira chamada da etapa de tabelas carregou outro OCR e consumiu 29,56 s na referência. Nas páginas seguintes da variante leve, a chamada de tabelas ficou abaixo de 0,001 s. A captura de layout não apontou tabelas na página usada; portanto não atribuir esse custo a uma tabela verdadeira ou a um erro comprovado de classificação.
4. **Cancelar a espera não interrompia a inferência do serviço.** O diagnóstico novo usa um supervisor separado e encerra o processo pesado de verdade. Essa proteção existe no teste; o cancelamento do serviço de produção não foi corrigido aqui.

O Windows mostrou aproximadamente 99% do desempenho nominal da CPU em uma amostra sob carga, com plano Equilibrado. Essa amostra não demonstrou redução relevante de frequência, mas não substitui monitoramento térmico. A memória do auxiliar e a recriação do container já tinham sido testadas anteriormente sem resolver o timeout; estes resultados históricos não são tempos de conclusão.

## Comparação controlada

Mesmo PDF autorizado, cinco páginas, mesma imagem CPU original e mesmos pesos onde indicado. Inicialização separada da inferência. Não houve IA, acesso ao Supabase, armazenamento de documentos no Prisma ou publicação de Perfil.

| Caso | Páginas | Análise, segundos | Resultado |
| --- | ---: | ---: | --- |
| Modelos originais, uma thread solicitada | 1 | >60 | Processo encerrado no limite, durante OCR |
| Modelos originais, quatro threads solicitadas | 1 | >60 | Limitar somente essa opção não resolveu |
| Sem MKL-DNN, quatro threads | 1 | >60 | Não demonstrou melhora; não recomendado a partir deste teste |
| Limites parciais nas bibliotecas | 1 | >60 | Biblioteca Intel ainda indicava 10 threads |
| Modelos originais, dez threads, referência | 1 | 104,90 | Análise concluiu; falha posterior na serialização da evidência foi corrigida |
| Modelos originais, limites completos de CPU | 1 | 45,36 | Concluiu; mesmo hash de texto normalizado da referência |
| Modelos leves, limites completos de CPU | 1 | 16,52 | Concluiu; reconhecimento textual diferente, avaliado abaixo |
| Modelos leves, limites completos de CPU | 5 | 44,76 | Concluiu todas as páginas |
| Modelos originais, limites completos de CPU | 5 | 162,20 | Concluiu todas as páginas |
| Só reconhecedor latino, layout/detecção originais, CPU controlada | 5 | 110,05 | Concluiu; geometria das linhas idêntica à referência original |

O caso de referência teve um erro da ferramenta depois de emitir o resultado completo da página, ao tentar serializar coordenadas. O tempo de 104,90 s e o hash de texto foram medidos antes desse erro. Não o apresentar como execução integralmente bem-sucedida do script. A gravação de texto extraído foi removida após bloqueio de segurança; nenhuma cópia desse texto foi persistida. A versão final registra somente métricas, contagens e hashes.

## Tempos por etapa nas três configurações completas

| Etapa, cinco páginas | Originais + CPU ajustada, s | Só reconhecedor latino, s | Conjunto leve, s |
| --- | ---: | ---: | ---: |
| Converter páginas do PDF em imagens | 0,053 | 0,064 | 0,052 |
| Identificar o layout | 11,204 | 12,331 | 0,626 |
| Identificar regiões de leitura | 8,242 | 8,628 | 7,654 |
| Localizar linhas de texto | 48,480 | 52,339 | 4,997 |
| Reconhecer os caracteres das linhas | 86,749 | 28,875 | 24,598 |
| Outras operações internas do OCR | 0,135 | 0,143 | 0,116 |
| Etapa de tabelas, incluindo a carga interna inicial | 7,088 | 7,360 | 6,526 |
| Montagem, comparação local e pequenas transições | 0,247 | 0,309 | 0,188 |
| **Total** | **162,197** | **110,049** | **44,757** |

O subtotal completo de OCR é 29,711 s e já está distribuído nas três linhas respectivas: não somá-lo novamente. O processo gastou mais **20,10 s** importando bibliotecas e carregando os modelos antes da análise; a soma aproximada dessas duas parcelas é **64,86 s** em um processo novo. Não foram medidos rede pública, gateway, IA ou gravação nesta rodada. Não foi feita uma segunda importação quente do documento inteiro; não inventar esse tempo.

## Qualidade: o que foi e o que não foi comprovado

| Página | Tempo com modelos leves, s | Palavras nativas reencontradas | Tokens numéricos reencontrados |
| --- | ---: | ---: | ---: |
| 1 | 15,81 | 99,50% | 100% |
| 2 | 7,87 | 99,37% | 100% |
| 3 | 7,54 | 99,40% | 100% |
| 4 | 7,52 | 99,38% | 100% |
| 5 | 5,92 | 98,80% | 100% |

As métricas são interseções de conjuntos de tokens normalizados com o texto nativo do próprio PDF, calculadas somente em memória. Não medem automaticamente correção de empresas, cargos, períodos, vínculos entre campos, ordem de leitura ou qualidade da revisão. Tokens numéricos preservados não significam datas corretamente atribuídas nem todas as repetições preservadas. Não equivalem à meta semântica de 90% do M5.6.

Na primeira página, os modelos originais tiveram 93,07% de palavras nativas reencontradas; o ajuste de CPU manteve texto normalizado e contagem de 53 linhas. No documento inteiro com os modelos originais, a cobertura por página foi 93,07%, 87,34%, 87,43%, 88,89% e 91,57%. A variante leve teve 52 linhas na primeira página e classificação de blocos diferente. Portanto não há prova de equivalência estrutural para a troca de modelos. A skill de PDF foi usada para conferir visualmente a página de referência; o PDF original não foi modificado.

A troca apenas do reconhecedor latino preservou os hashes das coordenadas de todas as linhas nas cinco páginas e as contagens 53/37/36/37/26. A cobertura textual foi 97,52%/99,37%/99,40%/99,38%/98,80%. Nas páginas 2 a 5, o texto normalizado coincidiu com o da variante completamente leve. Essa é uma evidência favorável à opção intermediária, mas ainda não valida agrupamento semântico ou o adaptador do Prisma.

## Configuração exata testada

Base: imagem original `paddle-structure:rollback-before-recreate-20260916`, PaddleOCR 3.7.0, PaddlePaddle CPU 3.2.0, PaddleX 3.7.2. Container de teste sem rede, 8 CPUs lógicas de teto, 6 GiB de memória sem swap adicional, filesystem somente leitura, PDF e modelos somente leitura. Serviços usuais temporariamente parados para não competir pelos recursos. Essas condições são diferentes de uma chamada HTTP de produção com outros serviços ativos.

Limites completos, somente no container de teste:

```text
PADDLE_PDX_CPU_NUM_THREADS=4
OMP_NUM_THREADS=4
MKL_NUM_THREADS=4
OPENBLAS_NUM_THREADS=1
NUMEXPR_NUM_THREADS=1
KMP_BLOCKTIME=0
OMP_WAIT_POLICY=PASSIVE
```

Além disso, `PaddlePredictorOption(cpu_threads=4)`. A inspeção efetiva mostrou os pools OpenMP em quatro threads e OpenBLAS em uma. `LeanInit` evita carregar na partida operações já desativadas pela requisição: orientação, correção de imagem, orientação das linhas e fórmulas. Não desativa regiões, tabelas ou OCR.

`LeanInit` foi usado somente para estas requisições de PDF. Não aplicar essa opção globalmente ao serviço antes de verificar outras rotas que possam solicitar orientação ou correção de imagem. Os ajustes de teste não são um arquivo de implantação aprovado.

| Componente | Modelo original | Variante leve testada |
| --- | --- | --- |
| Layout | PP-DocLayout_plus-L | PP-DocLayout-S |
| Regiões | PP-DocBlockLayout | Mantido |
| Detecção do texto | PP-OCRv5_server_det | PP-OCRv5_mobile_det |
| Reconhecimento do texto | PP-OCRv5_server_rec | latin_PP-OCRv5_mobile_rec |
| Tabelas | Modelos originais | Mantidos |

Os três modelos novos foram baixados pelo gerenciador oficial para o volume separado `prisma-paddle-benchmark-models-20260917`. O container de download não recebeu o PDF nem credenciais do Prisma. Os testes do currículo ficaram sem rede. A configuração original e seus volumes não foram substituídos.

Fontes oficiais: [opções e modelos do PP-StructureV3](https://github.com/PaddlePaddle/PaddleOCR/blob/main/docs/version3.x/pipeline_usage/PP-StructureV3.en.md), [suporte de português do modelo latino](https://paddlepaddle.github.io/PaddleOCR/latest/en/version3.x/algorithm/PP-OCRv5/PP-OCRv5_multi_languages.html). A configuração instalada e os contadores reais, não apenas a documentação pública, fundamentam as constatações operacionais.

## Reprodução e limites

Ferramentas: `scripts/run-paddle-isolated-benchmark.ps1`, `scripts/paddle-isolated-benchmark.py` e testes sintéticos em `tests/tooling/test_paddle_diagnostic.py`.

```powershell
./scripts/run-paddle-isolated-benchmark.ps1 -PdfPath 'C:\caminho\autorizado.pdf' -Case referencia -Threads 4 -LeanInit -BoundLibraries -Page 0 -InferenceTimeout 180
./scripts/run-paddle-isolated-benchmark.ps1 -PdfPath 'C:\caminho\autorizado.pdf' -Case candidato -Threads 4 -LeanInit -BoundLibraries -ModelVariant mobile -Page 0 -InferenceTimeout 120
./scripts/run-paddle-isolated-benchmark.ps1 -PdfPath 'C:\caminho\autorizado.pdf' -Case intermediario -Threads 4 -LeanInit -BoundLibraries -ModelVariant latin-rec -Page 0 -InferenceTimeout 180
```

Executar somente com autorização para o documento e sem concorrência com os serviços usuais. Os modelos devem estar disponíveis nos volumes indicados; não há download durante a análise. Cada página é renderizada na escala padrão 2 do Paddle e processada sequencialmente, reutilizando a instância entre páginas. Isso permite medir componentes, mas não reproduz a divisão em lotes, transporte ou adaptação de resultados do endpoint HTTP. O resultado não substitui um teste ponta a ponta.

Limites reais: inicialização de até 180 s, inferência configurável até 240 s, supervisor separado com encerramento forçado e limite externo adicional do container. O relatório inclui a prova de que o processo não ficou ativo. Não há retries automáticos, orçamento de IA ou nova dependência no aplicativo.

Evidência bruta sanitizada em `tmp/paddle-perf-20260917/*.json`, ignorada pelo Git. Nenhum texto extraído, contato, currículo integral, token ou credencial pertence à documentação ou ao commit.

## Estado final e próximo passo

O Docker estava desligado no início e foi iniciado para executar a tarefa. Os dois workers usuais foram pausados temporariamente durante as medições e **restaurados com as mesmas imagens, comandos e volumes originais**. Ambos responderam HTTP 200 em `/docs` ao final; nenhum container de diagnóstico ficou em execução. O Docker foi deixado ligado. A disponibilidade local não comprova túnel ou importação hospedada, que não foram acionados nesta rodada.

O volume exclusivo com os três modelos candidatos foi preservado para reprodução. Não contém currículo. O hash do PDF original foi novamente conferido e permaneceu igual. A configuração candidata não constitui rollout. A recomendação depende de uma validação de integração e estrutura, incluindo competências em listas, experiências e datas, e depois autorização explícita para produção. O fluxo completo Paddle -> IA ainda não foi aprovado por este diagnóstico.

### Validação e rastreabilidade do escopo autorizado

| Compromisso do diagnóstico | Evidência | Status |
| --- | --- | --- |
| Assumir testes locais e documentar resultados | Matriz de experimentos e três configurações completas acima | PASS |
| Medir componentes em vez de repetir apenas o timeout integral | Tempos de layout, regiões, detecção, reconhecimento e tabelas | PASS |
| Encerrar trabalho pesado ao exceder o prazo | Casos reais interrompidos; testes sintéticos de timeout na inicialização e inferência | PASS |
| Não persistir conteúdo do currículo | Somente métricas/hashes; teste negativo de texto-canário; nenhuma saída textual privada criada | PASS |
| Preservar arquivo e configuração usada pelo Prisma | Hash do PDF igual; mesmas imagens/comandos; ambos os workers restaurados | PASS |
| Aprovar qualidade semântica ou liberar produção | Não era o escopo autorizado; não houve publicação, IA ou banco | NOT TESTED |

Seis testes sintéticos aprovados, incluindo interrupção efetiva, sucesso, preservação do gerador, ausência de conteúdo textual no resumo e serialização de coordenadas sem persistência. Sintaxe PowerShell validada. Não foi executado `pnpm run validate` nem uma suíte transversal: não houve alteração do aplicativo ou do contrato de ingestão. O Context Pack é atualizado como evidência documental, não como aprovação do candidato.
