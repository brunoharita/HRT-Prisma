# ADR-073 — Interpretação derivada da trajetória

Estado: accepted para escopo autorizado M8.3, rollout condicionado à validação. Data: 2026-09-25. Acordo: `docs/qa/agreement-m83-semantic-trajectory.md` v1.0.0.

## Reuso e alternativas

O score M6.1 já decompõe quatro dimensões e requisitos com evidência. A heurística de títulos/área não diferencia bem liderança de execução. Reutilizar esse cálculo e suas telas é suficiente; não há necessidade de outra biblioteca de ranking ou base profissional. Um bônus independente de IA duplicaria evidências. Substituir todo o score descartaria contratos úteis. Optamos por estender somente a interpretação de área/função no piloto, sem peso novo.

## Decisão

Contexto mínimo é construído no backend a partir de versões publicadas. Experiências enviam cargo e descrição, não empregador/datas; declarações não viram experiência. Dados pessoais conhecidos e contatos são removidos. Texto livre continua sendo dado não confiável; minimização não é garantia absoluta de anonimização.

Duas leituras independentes classificam cada trecho em sete categorias fechadas, sem nota nem justificativa livre. Citações são validadas como substrings da fonte. Discordância produz estado indeterminado, não média. Concordância tampouco prova correção: fixtures contrastadas e variantes são requisito separado.

A rubrica mantém faixas preexistentes: execução backend 20 (direta), desenvolvimento de software sem especialização backend 17 (mesma família de execução, transferência ainda não comprova ferramentas), análise de software 12 (adjacente), liderança técnica 8 (contexto profissional), menção sem atuação técnica não produz elegibilidade. Só execução backend forma grupo A; execução genérica/análise/liderança formam B; menção/declarativo forma C. Área de software demonstrada por experiência vale 30; declaração isolada pode explicar 24, mas não torna um Perfil elegível sozinha. O melhor nível sustentado em experiência é preservado, inclusive histórico, sem bônus por quantidade/repetição/duração. Não se presume senioridade. Requisitos mantêm método existente; o significado dos pontos fica explicitamente versionado.

Não se força que Diego vença Bruno: se ambos possuem execução histórica comprovada, podem receber a mesma classificação de função. Prioridade requer evidência discriminante da Posição, não uma preferência por pessoa.

Cache derivado pertence ao tenant e vincula fontes/método/prompt/modelo. Lease atômico e timeout reduzem duplicação e travamento; erro não cria score e não sobrescreve fatos. Não há orçamento monetário paralelo: política do Parser/provedor. Chamadas não ficam dentro de transações SQL.

O snapshot semântico persistido é recalculado no backend, que recebe somente IDs, lê as fontes autorizadas e reutiliza o mesmo motor puro de matching da aplicação. O bundle da Edge é gerado desses módulos e verificado contra a fonte; não há segundo algoritmo de pontuação. INSERT/UPDATE de avaliações semânticas concluídas pelo cliente é bloqueado. Revogação do solicitante não esgota o cache compartilhado de outros operadores autorizados. A interpretação e outro campo do mesmo Perfil não constituem fontes independentes.

O decoder puro já existente também é extraído por AST para preservar IDs legados, listas e defaults, sem levar SDK ou código de navegador à Edge. A leitura web/SQL de conceitos só considera aprovados no escopo global/empresa. O commit revalida o fingerprint das fontes com bloqueios curtos sem espera, inclusive contra alterações concorrentes; contenção retorna indisponibilidade recuperável. O fingerprint autoritativo do score é comparado ao exibido antes de habilitar verificações M6.2. Uma evidência que mudou exige atualização da análise, não associação silenciosa de tela antiga a snapshot novo.

O prompt 1.0.0 falhou na primeira avaliação de constância. A versão 1.1.0 esclarece atividade declarada versus experiência e a classificação ocupacional de títulos explícitos, sem mudar pesos ou resultados esperados. Datas e atributos conhecidos são minimizados; contexto sensível que não possa ser isolado sem remover evidência/negação exige abstenção, não remoção arbitrária de frases.

Conjunto parcialmente avaliado fica disponível para análise humana, com pendências em seção neutra e sem ordenação numérica enquanto houver dependência material. No piloto, scores provisórios continuam visíveis, mas não estabelecem prioridade segura. Isso supersede D-016 do acordo M6.1 apenas no piloto. Métodos legados e snapshots mantêm suas versões.

## Limites e operação

Primeiro piloto: títulos explicitamente de desenvolvimento backend, excluindo direção/gestão e posições de estágio. Demais ocupações conservam método anterior identificado; não alegar validação universal. Histórico sem descrição pode não discriminar candidatos. Nenhuma rejeição automática. Regressão modelo é distinta de cache/determinismo. Mudanças de rubrica/modelo exigem versão e revalidação. Rollback web/Edge preserva tabela histórica e snapshots; nenhuma migration destrutiva necessária.
