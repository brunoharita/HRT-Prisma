# Comparação completa da importação do currículo — 17/09/2026

## Resposta direta

O tempo excessivo vem da etapa Paddle, não do envio do arquivo, do banco ou da tela de revisão. No teste real com o currículo de Ivan, o Paddle trabalhou durante **240,012 segundos** e atingiu o limite de tempo. Depois disso, o Prisma descartou essa tentativa, continuou com a leitura nativa do PDF e concluiu a importação com a IA já armazenada em cache.

O mesmo fluxo, deliberadamente sem Paddle, concluiu as partes automatizadas em aproximadamente **3,51 segundos**, excluindo apenas o tempo em que o operador escolhe a Pessoa correspondente. A qualidade final foi a mesma nos dois casos porque ambos terminaram usando as mesmas 5 páginas de leitura nativa e o mesmo resultado de IA em cache.

Isso não aprova a retirada definitiva do Paddle nem mede uma chamada nova à IA. O teste sem Paddle demonstra que, para este PDF com texto selecionável, a leitura nativa já entrega boa cobertura e evita o atraso de quatro minutos. Ainda é necessário repetir uma vez sem cache para medir o tempo real da IA; a tentativa desta rodada foi bloqueada antes do envio externo e não gerou uma nova resposta.

## O que conta como sucesso

Um teste só é aprovado quando:

1. o PDF é lido;
2. todas as etapas previstas para o cenário terminam sem serem descartadas;
3. a IA organiza o conteúdo;
4. o documento é gravado no Prisma e abre para revisão;
5. a maioria dos blocos relevantes é reconhecida e vinculada corretamente;
6. o tempo é aceitável.

Rapidez sem qualidade não é sucesso. Boa extração obtida depois de um timeout ou por uma rota de emergência também não aprova a etapa que falhou.

## Resultado dos cenários

| Cenário | Fluxo concluído | Qualidade final | Tempo | Resultado geral |
| --- | --- | --- | --- | --- |
| Com Paddle habilitado | O documento chegou à revisão, mas o Paddle expirou e foi substituído pela leitura nativa | Boa, pela leitura nativa + IA em cache | Paddle sozinho: 240,012 s; percurso automatizado conhecido: mais de 242 s | **FAIL** — o Paddle não contribuiu para o resultado |
| Sem Paddle, leitura nativa + IA | Documento v3 persistido e revisão aberta | Boa; mesma cobertura estrutural do cenário anterior | Aproximadamente 3,51 s, sem contar a confirmação humana de identidade | **PARTIAL** — fluxo e qualidade aprovados; tempo de IA nova não medido por causa do cache |

Nenhum Perfil foi publicado. Os documentos de teste ficaram como versões do cadastro de Ivan, todos em estado de revisão.

## Tempo por etapa

### Cenário com Paddle habilitado

| Etapa | Segundos | Resultado |
| --- | ---: | --- |
| Decidir a rota de leitura | 0,056 | Escolheu a rota estrutural |
| Ler o texto nativo do PDF | 0,237 | Sucesso |
| Paddle estrutural | 240,012 | Timeout; resultado descartado |
| IA | 0,914 | Resultado autorizado recuperado do cache |
| Confirmar a Pessoa | Não contabilizado | Ação humana |
| Vincular a Pessoa ao documento | 0,269 | Sucesso |
| Gravar extração estruturada | 0,321 | Sucesso |
| Gravar medição do processamento | 0,102 | Sucesso |
| Finalizar a importação | 0,081 | Sucesso |
| Carregar páginas e rascunho para revisão | 0,098 | Sucesso |

O total não deve ser obtido somando todas as linhas indiscriminadamente, porque algumas consultas de carregamento ocorreram em paralelo. A medição segura é que o cenário ultrapassou 242 segundos e que 240,012 segundos vieram somente do Paddle.

### Cenário deliberadamente sem Paddle

| Etapa | Segundos | Resultado |
| --- | ---: | --- |
| Leitura local e aplicação do resultado de IA em cache | 0,115 | Sucesso; nenhuma chamada ao Paddle |
| Criar a importação no banco | 1,159 | Sucesso |
| Enviar o PDF ao armazenamento privado | 0,581 | Sucesso |
| Identificar possíveis Pessoas | 0,170 | Ivan localizado corretamente |
| Confirmar a Pessoa | Não contabilizado | Ação humana |
| Vincular a Pessoa ao documento | 0,184 | Sucesso |
| Gravar extração estruturada | 0,444 | Sucesso |
| Gravar medição do processamento | 0,166 | Sucesso |
| Finalizar a importação | 0,121 | Sucesso |
| Carregar documento e rascunho | 0,510 | Consultas em paralelo; usado o maior intervalo observado |
| **Total automatizado, sem a escolha humana** | **≈ 3,51** | Fluxo concluído até a revisão |

O valor de 3,51 s é próprio desta repetição com a IA em cache. Não representa o tempo de uma inferência nova.

## Qualidade observada

O PDF original possui 5 páginas. A conferência visual foi feita contra o documento, não apenas contra contagens automáticas.

| Bloco | Esperado no PDF | Extraído | Avaliação |
| --- | ---: | ---: | --- |
| Identidade, localização e contatos | 1 conjunto | 1 conjunto | PASS |
| Título profissional | 1 | 1 | PASS |
| Resumo profissional | 1 | 1 | PASS, com pequenos problemas de espaçamento |
| Experiências | 9 | 9 | PASS para empresa, cargo e período |
| Descrições de experiências | 9 | 6 | PARTIAL; 3 descrições ficaram vazias e foram sinalizadas para revisão |
| Formações | 2 | 2 | PASS; períodos ausentes no PDF não foram inventados |
| Competências explícitas | 10 | 10 | PASS |
| Idiomas | 1 | 1 | PASS |
| Principais resultados em campo próprio | Existentes no texto | 0 cartões próprios | PARTIAL; parte do conteúdo permaneceu dentro das descrições |

A maioria dos blocos foi reconhecida corretamente. O resultado atende ao critério de qualidade mínima para uma revisão humana, mas não está pronto para publicação automática e o próprio Prisma o classificou como “Requer revisão”.

## Por que o Paddle não melhorou o resultado final

O fluxo atual faz duas leituras independentes do mesmo PDF:

1. a importação executa a leitura nativa e tenta o Paddle;
2. em seguida, o serviço de IA recebe novamente o PDF original, relê as páginas com PDF.js e substitui as páginas anteriores pelas páginas que ele próprio produziu.

Assim, mesmo que o Paddle terminasse, a implementação atual não prova que seus blocos estruturais seriam usados pela IA. Nesta rodada ele nem chegou a esse ponto: expirou aos 240 segundos e o Prisma registrou `provider_timeout`, usando a rota efetiva `native-fast`.

Esta é a explicação mais importante para a diferença em relação ao fluxo local antigo: hoje existe uma etapa estrutural longa, com limite de quatro minutos, que não melhora o resultado final deste documento e ainda é seguida por uma segunda leitura do PDF.

## Recursos usados

Durante o Paddle real, o container principal utilizou vários núcleos de CPU e aproximadamente 3,0 a 3,5 GiB dos 6 GiB disponíveis. Não houve indício de falta de memória, reinicialização do container ou encerramento por excesso de memória. Portanto, simplesmente aumentar memória não é a correção mais provável.

Os testes isolados anteriores já mostraram que a configuração original do Paddle pode concluir as 5 páginas em 162,20 s com controle de CPU e que os modelos leves chegam a 44,76 s. Mesmo esses números precisam de validação de integração e qualidade antes de qualquer troca em produção.

## Conclusão e decisão recomendada

Para PDFs com texto selecionável e suficiente, como o de Ivan, a recomendação é que o Prisma use a leitura nativa + IA e não aguarde o Paddle. O Paddle deve ficar restrito a documentos que realmente precisam de recuperação visual, como páginas digitalizadas, texto insuficiente ou estrutura que falhou na verificação de qualidade.

Antes de implementar isso, ainda falta uma decisão de produto e arquitetura: definir o gate objetivo que aciona o Paddle e fazer a IA consumir a saída estrutural quando ele for necessário. Também falta uma repetição sem cache, autorizando especificamente o novo envio deste PDF à OpenAI, para medir a inferência real. Nenhuma alteração de produção foi feita nesta rodada.

## Evidências de execução

- Arquivo: `Ivan Raineri - Linkedin Profile.pdf`, 5 páginas, 67.573 bytes.
- SHA-256: `5a8c36e8427686c915eba475b14c37afb57629930d9f9c55264e0341c253961c`.
- Com Paddle: modo `enabled`, rota escolhida `structure`, rota efetiva `native-fast`, fallback verdadeiro, diagnóstico `provider_timeout`.
- Sem Paddle: servidor local iniciado com modo `baseline`; nenhuma requisição ao endpoint Paddle; Documento v3 e revisão criados no mesmo Supabase do Prisma.
- Resultado em ambos: 7.444 caracteres úteis, 5 seções, 9 experiências, 10 competências e 14 pontos de revisão.
- A Pessoa Ivan Raineri foi criada no primeiro fluxo de recuperação e recebeu os Documentos v1, v2 e v3 de teste. Nenhum Perfil foi publicado. Configuração de produção e imagens Docker não foram alteradas nesta rodada.
