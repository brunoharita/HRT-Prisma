# Prompt de brainstorming — Lominger no Perfil do candidato

Quero explorar uma funcionalidade futura do Prisma, sem implementar código nesta conversa.

## Contexto

O Prisma importa currículos, cria ou atualiza uma Pessoa e, após revisão humana, publica um Perfil profissional estruturado. Quero estudar uma camada visual dentro desse Perfil para organizar conhecimentos, habilidades, atitudes e outras dimensões de competência do candidato em grupos de leitura rápida.

A intenção é oferecer uma visão global e progressiva do candidato, com gadgets visuais, agrupamentos e classificações compreensíveis, permitindo abrir cada item e consultar a evidência correspondente no currículo ou no Perfil publicado.

O documento-base da exploração é o PDF anexado a esta conversa: **The CAREER ARCHITECT® Development Planner 4th Edition**, associado localmente no Prisma a `.prisma-data/knowledge-sources/lominger/lominger_career_architect_development_planner.pdf`.

Se o PDF não estiver anexado ou acessível nesta conversa, não invente o conteúdo da metodologia. Informe isso e peça que eu anexe o arquivo.

## O que preciso que você faça

1. Leia o PDF e identifique os conceitos da metodologia que podem ser relevantes para uma leitura visual de um Perfil profissional.
2. Separe claramente o que vem da Lominger, o que é interpretação sua e o que é proposta de adaptação para o Prisma.
3. Proponha de duas a quatro direções de experiência para a tela do Perfil: hierarquia, agrupamentos, gadgets, filtros, detalhes e comportamento responsivo.
4. Explique como conhecimentos, habilidades, atitudes e competências poderiam ser relacionados sem misturar fato extraído, inferência, recomendação e decisão humana.
5. Mostre como cada visualização poderia levar o usuário à evidência de origem e comunicar informação ausente, incompleta ou não verificada sem transformá-la em algo negativo.
6. Compare as alternativas por utilidade para o usuário, velocidade de leitura, explicabilidade, risco de interpretação indevida, complexidade de implementação, manutenção e possível dependência de conteúdo proprietário.
7. Aponte conflitos ou riscos em relação às regras do Prisma e liste as decisões de produto que precisam ser tomadas antes de qualquer desenvolvimento.

## Guardrails do Prisma

- A funcionalidade deve apoiar a decisão humana; não pode decidir contratação, rejeição, senioridade, acesso ou promoção.
- Não crie score, ranking, aderência, nível de confiança ou classificação automática sem explicação, evidência, versão e aprovação explícitas.
- Ausência de evidência não é deficiência.
- Preserve a distinção entre fatos, inferências, recomendações, decisões humanas e resultados observados.
- Não invente dados do candidato nem use PII real como exemplo.
- Não trate a Lominger como metodologia já ativada no Prisma nem declare conformidade oficial.
- Considere a necessidade de verificar licença antes de reproduzir nomes, escalas, instrumentos ou conteúdo proprietário.
- Esta conversa é somente brainstorming. Não escreva código, não altere arquivos, não proponha migração e não produza um prompt de execução.

## Formato da resposta

Entregue a análise nesta ordem:

1. entendimento da intenção;
2. conceitos da fonte relevantes para a exploração;
3. princípios de experiência;
4. alternativas de tela com wireframes textuais simples;
5. exemplo de jornada após a importação e revisão do currículo;
6. mapeamento preliminar entre evidências do Prisma e elementos visuais;
7. comparação e recomendação provisória;
8. riscos, limites de licença e pontos de decisão;
9. perguntas objetivas para o Product Owner.

Marque cada afirmação como **fonte**, **inferência**, **hipótese de design** ou **decisão pendente** quando isso ajudar a evitar confusão. Não encerre com uma conclusão de implementação.
