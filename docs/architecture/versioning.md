# Versionamento

M7.7 (2026-09-19): Knowledge da empresa é aprovada imediatamente para `owner`/`admin`; cada criação gera contribuição Global sanitizada para decisão exclusiva do Super Admin. Resolução preserva Empresa → Global e a pesquisa externa por IA é explícita e auditável. ADR-069.

M7.6 (2026-09-18): curadoria 4.0.0, descrição opcional, sem justificativa e Global só Super Admin. ADR-067.

Correção de 2026-09-19: a governança de Conhecimento voltou a exibir ao Super Admin as propostas da empresa ativa, além das Globais, sem exibir outra empresa. Não altera contrato persistido, workflow, RLS ou versão pública; Prisma permanece v1.7.6. AoT: `aot-knowledge-proposal-visibility.md`.

M7.5 (2026-09-18) registra a sexta entrega aceita do Movimento 7: **Prisma v1.7.6**. `person-professional-evidence-3.1.0` protege o último resultado completo e expõe tentativa/cobertura; `profile-competency-curation-3.0.0` agrupa pendências e usa `searchTerms` sem decisão automática. Taxonomias 1.0.0, normalização 1.0.0 e contratos anteriores são preservados. Implementação, medição e rollout no AoT M7.5 e ADR-066.

M7.2 v2 (2026-09-18) registra a quinta entrega aceita do Movimento 7: **Prisma v1.7.5**. A infraestrutura Knowledge comum passa a expor Taxonomia Ocupacional `position-taxonomy-1.0.0` e Taxonomia de Competências `competency-taxonomy-1.0.0` como domínios separados. `person-professional-evidence-3.0.0`, busca 1.0.0 e curadoria 2.0.0 são aditivos; contratos históricos permanecem. Implementação, rollout e limites de validação no AoT M7.2 v2.

M7.4 (2026-09-18) registra a quarta entrega aceita do Movimento 7: **Prisma v1.7.4**, publicada em produção. `profile-competency-curation-1.0.0` versiona a decisão contextual, reutilizando a Knowledge. A RPC de leitura `_v3` aplica aliases humanos à projeção `person-professional-evidence-2.0.0`, sem mudar seu formato nem snapshots; V1/V2 continuam disponíveis. Login e menu usam o registro central. Implementação, rollout e limites de validação no AoT M7.4.

M7.3 registra a entrega anterior **Prisma v1.7.3**. `declared-competency-normalization-1.0.0` versiona a interpretação derivada pós-publicação e `person-professional-evidence-2.0.0` explicita declarações, associações, pendências e processamento. Perfis históricos não são reescritos. Rollout e ativação real estão no AoT M7.3, não são presumidos pelo número da versão.

## M7.2 — 2026-09-18

`person-professional-evidence-1.0.0` é um contrato aditivo de projeção somente leitura sobre Perfil publicado, Knowledge normalizada e Evidência Demonstrada existente. Reutiliza `position-taxonomy-1.0.0`; não altera `professional-profile` 6.0.0, `knowledge-normalization` 2.0.0, `demonstrated-evidence` 1.0.0, `vacancy-matching-explainable` 5.0.0 nem `matching-score` 1.2.0. Versão desconhecida falha fechada e nenhum Perfil histórico recebe backfill.

O pedido explícito de implementação e atualização completa da versão registra M7.2 como segunda entrega do Movimento 7. O registro executável calcula **Prisma v1.7.2**, consumida pelo login e pela barra lateral. Após autorização específica, a migration e o frontend foram promovidos ao ambiente único de produção em 2026-09-18; ativação remota é comprovada pelo AoT, não apenas pelo código ou número de versão.

## M7.1 — 2026-09-18

`position-taxonomy-1.0.0` é um novo contrato aditivo de interpretação/proveniência. `vacancy-definition` passa de 1.2.0 a 1.3.0 no novo salvamento atômico, sem alterar required/desired, fórmulas ou consumidores históricos. Versões antigas, inclusive estrutura assistida 2.0.0 histórica, não são reescritas; NULL no novo metadado significa sem interpretação M7.1 registrada. `vacancy-matching-explainable-5.0.0`, `matching-score-1.2.0` e snapshots aceitos pelo M6.2 permanecem.

Na autorização de 2026-09-18 para a evolução institucional da sidebar, o Product Owner aceitou M7.1 como a primeira entrega oficial do Movimento 7. O registro executável passa a calcular Prisma v1.7.1 e as superfícies locais consumidoras usam essa fonte central. Essa decisão explícita supersede a orientação anterior de não inferir a versão apenas pelo nome do movimento. O rollout desta alteração visual não integra o movimento: a implantação hospedada continua em v1.6.4 até autorização posterior, sem nova mudança de Supabase, contratos persistidos ou histórico.

## Ponte Paddle hospedada — 2026-09-16

`paddle-hosted-transport-1.0.0` versiona cabeçalhos HTTP de sessão/organização e guardas do gateway temporário (ADR-058). Não altera payload Paddle, `document-intelligence-provider` 1.0.0, `canonical-document` 1.0.0, adapter 1.1.0, contratos de extração/persistência/revisão ou versão pública v1.6.4. Trata-se de implantação e proteção de transporte, sem nova entrega de produto aceita.

O aditivo 1.1.0 do acordo hospedado expõe a correção de identidade antes da criação usando o formulário e RPC já existentes. É uma correção de acessibilidade do fluxo humano aprovado, sem novo payload, semântica persistida, algoritmo de identificação ou regra de autorização; `resume-intake` permanece 1.0.0 e a versão pública permanece v1.6.4. A edição oculta ações de resolução até confirmação server-side ou cancelamento; correspondências são recalculadas pelo servidor.

## Complemento local M5.7: formação, datas e duração (2026-09-12)

`education-academic-classification` 1.1.0 assume conclusão inferida para curso declarado salvo indicação contrária. `resume-dates-1.0.0` normaliza componentes temporais e calcula diferença entre datas civis; `extraction-draft` 8.2.0 registra essa semântica no payload persistido existente. `adaptive-resume-extraction` 7.2.0 usa runtime `prisma-layout-adaptive-v10`; busca de perfis 1.1.0 substitui estimativa só por anos por duração em dias. Provider determinístico local passa a `deterministic-local-1.1.0`.

O contrato de transporte/prompt/cache `parser-ia-1.0.0` mantém shape e fatos originais; o pós-processamento determinístico e snapshots acadêmicos usam as novas versões. SQL/RPCs, timestamps de auditoria e registros publicados não mudam. Produto permanece v1.5.11, pois esta melhoria complementa o M5.7 aceito. Rollback é reversão do código; históricos preservam snapshots e notas originais, sem backfill reverso. Acordo e AoT: `docs/qa/resume-date-education-rules.md`.

A correção forward-only `20260917164000_preserve_nullable_education_classifier_snapshot` restaura o contrato acadêmico vigente no salvamento de revisão: uma chave obrigatória do snapshot pode continuar presente com valor JSON nulo. Não altera enums, shape aceito, autoridade humana, versão de contrato ou versão pública; portanto não cria nova entrega de produto. O validador permanece fail-closed e nenhum dado histórico recebe backfill.

## Versão de produto exibida no Prisma

O Prisma usa uma versão de produto própria, separada das versões semânticas dos contratos técnicos:

`Prisma v<geração>.<movimento>.<entrega>`

- `geração`: geração principal do produto, atualmente `1`;
- `movimento`: movimento de produto em execução, atualmente `7`;
- `entrega`: contador sequencial das entregas oficiais concluídas dentro do movimento, sem zeros à esquerda.

A versão de produto aceita e publicada é **Prisma v1.7.2**, correspondente à segunda entrega oficial do Movimento 7. Correções, commits e builds não incrementam o contador.

### Registro oficial do Movimento 5

| Entrega | Marco | Situação considerada para o contador |
|---:|---|---|
| 1 | M5: revisão de currículo com evidência espacial | oficial |
| 2 | M5.1A: preparação da verificação de competências | oficial |
| 3 | M5.1B: execução da verificação | oficial |
| 4 | M5.1C: governança do Item Bank | oficial |
| 5 | M5.2: normalização do Knowledge | oficial |
| 6 | M5.3: resiliência operacional | oficial |
| 7 | M5.4: Vagas e matching explicável | oficial |
| 8 | M5.4.2: pesquisa Web contextual | oficial |
| 9 | M5.4.4: resolução ocupacional por IA | oficial |
| 10 | M5.5: exclusão definitiva de Pessoa | oficial |
| 11 | M5.7: Parser IA local | aceite do PO após importação, revisão e publicação humana |

M5.4.6, M5.4.7, a importação de PDF baseado em imagem e M5.6 permanecem fora do contador até terem fechamento e evidência oficial próprios.

### Registro oficial do Movimento 6

| Entrega | Marco | Situação considerada para o contador |
|---:|---|---|
| 1 | M6.1: pontuação determinística e explicável de matching | oficial |
| 2 | M6.1.1: requisito conectado a evidência profissional explícita | aceite do PO para implementação e atualização da versão |
| 3 | M6.2: jornada contextual de verificação | aceite do PO para implementação e atualização da versão |
| 4 | M6.1.2: descoberta por trajetória em três grupos | aceite do PO para implementação e atualização da versão |

### Registro oficial do Movimento 7

| Entrega | Marco | Situação considerada para o contador |
|---:|---|---|
| 1 | M7.1: taxonomia profissional e inteligência de posições | aceite do PO para implementação e atualização da versão |
| 2 | M7.2: perfil de competências e evidências | aceite do PO para implementação e atualização da versão |

### Relação entre versão e build Git

O registro executável de entregas oficiais é `web/src/config/releaseRegistry.ts`, reexportado por `web/src/config/release.ts`. A versão é calculada a partir da geração, do último movimento registrado e da quantidade de entregas aceitas desse movimento. Registrar uma nova entrega atualiza automaticamente contador e texto da versão no próximo carregamento do módulo, sem editar version/displayVersion separadamente. O Vite acompanha esse módulo durante desenvolvimento.

O rodapé público mostra somente Prisma, ano, versão do produto e HRT Solutions. Commit e sufixo dirty não são exibidos. O build Vite conserva o metadado técnico VITE_PRISMA_GIT_COMMIT para diagnóstico interno; ele é capturado no início do servidor/build e não equivale a uma versão de entrega.

Em CI ou release reproduzível, `VITE_PRISMA_GIT_COMMIT` deve receber o SHA exato do commit de origem. Ao fechar uma entrega aceita, acrescentar seu marco ao registro executável e atualizar esta documentação e o Context Pack. Correções não acrescentam entrada, e não há incremento automático por commit ou abertura da tela. Um novo movimento recebe novo grupo e reinicia o contador pela quantidade de entregas nele registradas. Essa regra mantém o aceite humano como origem da versão e automatiza sua apresentação.

## Regra geral

Contratos materiais usam versão semântica `major.minor.patch` e nome estável. A versão persiste com o artefato produzido quando necessária para reconstruir comportamento.

- Patch: correção sem mudança semântica material.
- Minor: evolução compatível, como campo opcional ou regra adicional controlada.
- Major: incompatibilidade, mudança de significado, obrigatoriedade ou decisão.

Nunca alterar silenciosamente o significado de contrato persistido.

## Contratos versionados

Perfil profissional, extraction, inference, parser, intake de currículo, retrieval/embedding, matching, confidence, prompts, modelos, taxonomias, contratos de busca, DTOs/APIs, eventos, regras de privacidade e Context Pack.

## Compatibilidade

Todo consumidor deve declarar versões aceitas. Versão ausente, desconhecida, futura ou incompatível falha de forma segura em operação sensível. A resposta deve registrar código de erro e indicar reprocessamento, migração ou revisão humana; nunca assumir a versão atual.

## Promoção

1. atualizar contrato e owner;
2. classificar patch, minor ou major;
3. atualizar código e persistência;
4. executar testes de contrato e golden tests;
5. comparar custo, latência e regressões;
6. registrar ADR se houver decisão duradoura;
7. atualizar Context Pack;
8. promover local, QA, evidência e aprovação antes de produção.

## Rollback e histórico

Versões anteriores permanecem identificáveis. Rollback reativa artefato anterior sem reescrever resultados históricos. Mudança de prompt ou modelo relevante cria nova versão mesmo quando o schema de saída não muda.

## Versões atuais

O fechamento do M7.2 de 2026-09-18 registra a segunda entrega aceita do Movimento 7 e publica Prisma v1.7.2. A sidebar e o login consomem a mesma fonte executável de release; migration, main/GitHub e Hostinger foram sincronizados no rollout autorizado.

O adendo M6.1.2 de 2026-09-14 avança `vacancy-matching-explainable` para 5.0.0 e `matching-score` para 1.2.0. A trajetória profissional define Grupo A direto, Grupo B relacionado/transferível e Grupo C contextual antes do score. Somente A e B recebem número comparável; C permanece recolhido e rastreável. Posições explicitamente de entrada podem usar formação, projetos ou conhecimentos para o Grupo B. A compatibilidade M6.2 passa a aceitar snapshots 4.0.0 históricos e 5.0.0 atuais por migration forward-only. Produto avança para Prisma v1.6.4.

O ajuste de ordenação de 2026-09-14 avança `matching-score` para 1.1.0. Grupo A permanece antes do Grupo B; dentro de cada grupo, valores numéricos ordenam de forma decrescente, inclusive provisórios devidamente identificados. Score indisponível fica depois dos valores numéricos. Fórmula, pesos, descoberta, inclusão e decisão humana permanecem inalterados. Como correção complementar da experiência vigente, o produto permanece Prisma v1.6.3.

O M6.2 de 2026-09-14 introduz `m62-contextual-verification-journey-1.0.0`, `m62-evidence-sufficiency-1.0.0` e `m62-contextual-verification-policy-1.0.0`. A necessidade nasce de ação humana sobre uma avaliação `vacancy-matching-explainable-4.0.0` e requisito da mesma versão imutável da Posição. Loaders deixam de criar fixtures. O contexto e a linha do tempo percorrem preparação, convite manual, acompanhamento e resultado. Na data da entrega, `matching-score-1.0.0` permanecia inalterado.

O M5.5 de 2026-09-09 introduz `person-definitive-deletion` 1.0.0 e `person-data-self-service` 1.0.0. A saga compartilha o mesmo núcleo para administração e titularidade, mas preserva authorities distintas; seu ledger mínimo independe da linha `people`, o lock `deleting` fecha novas mutações e `completed` exige zero resíduo SQL ou de Storage. Shapes históricos são removidos pelo grafo relacional, sem backfill ou reescrita. A mesma identidade pode ingressar futuramente como nova Pessoa. O contrato está ativo apenas no Prisma-QA.

O M5.4 de 2026-09-04 introduz `vacancy-definition` 1.0.0, `vacancy-matching-explainable` 1.0.0 e `vacancy-structure-assistant` 1.0.0. A definição é um snapshot imutável com requisitos de identidade estável; cada avaliação registra `vacancy_version_id`. Relações confirmadas para uma Vaga permanecem sinais locais, não equivalências do Knowledge. Vagas e avaliações históricas sem versão continuam legíveis, mas novas escritas M5.4 falham fechadas sem versão atual e autoridade tenant-scoped.

O ajuste M5.4 de 2026-09-04 avança `vacancy-matching-explainable` e `vacancy-structure-assistant` para 1.1.0. A categoria técnica permanece legível como metadado interno compatível, mas deixa de limitar a busca: cada requisito consulta todas as áreas profissionais do Perfil publicado e explica as fontes encontradas. O assistente recebe perguntas abertas, combina somente o contexto interno autorizado e separa empresa, mercado não consultado e sugestão. Pesquisa Web continua exclusivamente no Knowledge Agent governado, sem novo agente ou ativação implícita. `vacancy-definition` permanece 1.0.0 porque schema, RPC, snapshot e payload persistido não mudam.

O ajuste M5.4.2 de 2026-09-04 avança `vacancy-structure-assistant` para 1.2.0 e introduz `vacancy-market-research` 1.0.0, request `vacancy-advisor-request-1.0.0`, prompt `vacancy-advisor-web-1.0.0` e schema `vacancy-advisor-market-answer-1.0.0`. A pesquisa reutiliza a Edge Function Knowledge Agent, envia apenas pergunta, título, área, idioma e data, exige fontes Web allowlisted e registra ledger tenant-scoped. `vacancy-definition` e `vacancy-matching-explainable` não mudam.

O ajuste M5.4.9 de 2026-09-07 avança `vacancy-matching-explainable` para 2.0.0: relação ocupacional e aderência detalhada tornam-se leituras separadas; cada requisito consulta somente sua dimensão; igualdade, parcial, sinal relacionado e ausência de evidência permanecem distintos; todos os Perfis publicados elegíveis são paginados e visíveis; decisão humana auditada prevalece na ordenação. Requisito `unclassified` deixa de bloquear descoberta e mantém apenas a aderência detalhada pendente. O mesmo movimento avança `vacancy-structure-assistant` para 1.3.0 porque toda pergunta preenchida passa a pesquisar externamente por padrão, salvo escolha explícita de fontes internas, e excesso de conteúdo é compactado em vez de descartar a resposta. `vacancy-definition`, schema e migrations não mudam.

Em 2026-09-13, a decisão superveniente do Product Owner avança `vacancy-definition` para 1.2.0. `unclassified` permanece compatível para rascunhos assistidos e snapshots históricos, mas deixa de ser aceito em novas versões salvas. Requisitos incluídos manualmente nascem como `required`, exatamente como apresentado na interface; sugestões pendentes exigem escolha explícita entre obrigatório e desejável. Frontend e RPC falham fechados antes da escrita, sem alterar o matching de versões históricas.

O ajuste M5.4.10 de 2026-09-08 avança `vacancy-matching-explainable` para 2.1.0. Todos os Perfis publicados elegíveis continuam paginados e analisados, mas zero relação ocupacional, zero evidência direta, zero parcial e zero sinal relacionado deixam de gerar resultado. Uma confirmação humana anterior continua suficiente para inclusão. A lista vazia diferencia inexistência de Perfil publicado de ausência de sinal para a Vaga. Schema, RLS, Perfil e Knowledge não mudam.

O refinamento de descoberta de 2026-09-13 avança `vacancy-matching-explainable` para 2.2.0. Um domínio profissional distintivo compartilhado entre a referência da Posição e um cargo publicado pode gerar somente `possible_title_relation`, mesmo quando os marcadores de função são diferentes. Marcadores genéricos como Analista, Assistente, Gerente ou Especialista continuam insuficientes isoladamente. A explicação escolhe o cargo relacionado mais específico; não há equivalência automática, score, inferência de competência, migration ou reescrita de Perfil e Knowledge.

O esclarecimento de produto do mesmo dia substitui essa aproximação e avança `vacancy-matching-explainable` para 2.3.0. Experiência na área da Posição torna-se sinal próprio de entrada, separado da proximidade do cargo e da aderência por requisito. Um termo de área isolado deixa de criar `possible_title_relation`; cargos próximos continuam ordenando e explicando por classes determinísticas, sem score exposto. Avaliações futuras registram `areaRelation`; não há migration, reescrita de Perfil ou alteração em Knowledge.

O M6.1 de 2026-09-13 avança `vacancy-matching-explainable` para 3.0.0 e cria `matching-score-1.0.0`. A descoberta 2.3.0 permanece anterior ao score. A nova projeção aplica pesos 30/20/35/15, denominador apenas das dimensões definidas, escala de requisito 100/50/25/0, cobertura independente e estado provisório. O resultado inclui versões e fingerprint; não há migration, cache persistido, LLM ou fonte paralela. A decisão superveniente do PO corrige o aceite matematicamente incompatível: `score <= cobertura`.

O adendo M6.1.1 de 2026-09-14 avança `vacancy-matching-explainable` para 4.0.0. Categoria e grupo permanecem para organização/proveniência, mas deixam de restringir a recuperação de evidência: termo explícito, delimitado e não negado em qualquer conteúdo profissional publicado atende requisito genérico. Nível não comprovado permanece parcial. `matching-score-1.0.0`, Perfil, Vaga, schema, migrations e pesos não mudam.

O ajuste M5.2.1 de 2026-09-09 substitui a publicação row-by-row de `knowledge_source_versions` por operações set-based em lotes para conceitos, termos e relações. O contrato do RPC, a aprovação pelo Super Admin, o change set, a transação única e a compatibilidade das versões publicadas permanecem; a mudança reduz o tempo de publicação de pacotes grandes sem alterar a semântica dos registros.

O ciclo de vida reversível de 2026-09-03 introduz `profile-document-lifecycle` 1.0.0 e avança `profile-publication-delta` para 2.0.0, `professional-profile` para 6.0.0, `person-ingestion` para 11.0.0 e `document-operation-idempotency` para 2.0.0. A mudança é major porque publicação passa a aceitar `merge` ou `replace`, decisões por bloco tornam-se parte do contrato persistido e exclusão física passa a coordenar PostgreSQL e Storage. Leitura histórica permanece compatível; restauração sempre cria nova versão e reset nunca apaga histórico.

O M5.3 de 2026-09-04 introduz `pilot-operational-resilience` 1.0.0 e avança `profile-document-lifecycle` para 2.0.0, `person-ingestion` para 12.0.0 e `document-operation-idempotency` para 3.0.0. A evolução é major porque revisão passa a aceitar fonte documental ou snapshot de Perfil, `people` passa a distinguir situação operacional e absorção, e o ledger passa a coordenar vínculo documental, lifecycle e mesclagem com replay após a mutação terminal. Perfis e documentos históricos continuam legíveis; nenhuma evidência é fabricada ou reclassificada.

As constantes de IA vigentes estão em `src/domain/versions.ts`; contratos de ingestão/revisão estão em `document-review-contract.md`; e o catálogo proprietário está em `contracts.md`. O Context Pack 2.0.0 gera `FONTE_GPT_PRISMA.md` 1.0.0 para autoria de prompts e `TUDO_SOBRE_PRISMA.md` como exportação completa. Ambos compartilham manifesto e não substituem versões de domínio.

O Padrão Prisma de Perfil Profissional de 2026-09-03 introduz os contratos locais `prisma-profile-view` 1.0.0 e `profile-discovery` 1.0.0. A apresentação é derivada do `professional-profile` vigente, e a busca reutiliza RLS, `professional_profiles` e `knowledge-normalization` 2.0.0; por isso nenhum contrato persistido, migration ou versão histórica é reescrito. Formatos legados são normalizados somente na leitura. Versão desconhecida do Knowledge é tratada como não resolvida e nunca amplia silenciosamente um resultado.

A segunda geração adaptativa mantém `pdf-native-extraction` 2.0.0 e usa `spatial-evidence` 1.1.0, e avança `adaptive-resume-extraction` para 2.0.0, `extraction-draft` para 3.0.0, `person-ingestion` para 5.0.0 e `human-profile-review` para 2.0.0. `spatial-evidence` 1.1.0 introduz `pdfjs-character-region-v2`: evidências históricas `1.0.0`/`pdfjs-text-layer-v1` permanecem legíveis, mas novas seleções nativas usam contenção estrita por caractere. A releitura imediata por bloco é document-local e exige aceite humano. Somente a aprovação integral da revisão promove sinais estruturais tenant-scoped para a primeira extração futura. Versão desconhecida nunca muda silenciosamente o significado de um contrato persistido.

A correção de validação do modal de evidência em 2026-08-28 não altera payload, persistência, autoridade ou significado de `human-profile-review` 2.0.0 e `spatial-evidence` 1.1.0; portanto, não exige nova versão contratual.

As áreas personalizadas são uma evolução aditiva, mas material. Elas avançam `professional-profile` para 1.2.0, `adaptive-resume-extraction` para 2.1.0, `extraction-draft` para 3.1.0, `person-ingestion` para 5.1.0 e `human-profile-review` para 2.1.0, além de introduzir `custom-profile-section` 1.0.0 e `organization-custom-section-definition` 1.0.0. Payloads históricos sem `customSections` continuam legíveis como lista vazia. A versão 2.1 não autoriza transformar áreas personalizadas em competências ou matching automaticamente.

O refinamento subtrativo é uma evolução compatível e material. Ele avança `spatial-evidence` para 1.2.0, `human-profile-review` para 2.2.0 e `person-ingestion` para 5.2.0. Regiões 1.0 e 1.1 continuam legíveis; somente a RPC refinada produz 1.2 com texto bruto, texto efetivo e ledger de decisões. Ausência desses campos em evidência histórica significa apenas que não houve refinamento registrado, nunca que uma subtração foi inferida retroativamente.

A aderência visual da seleção em 2026-08-29 preserva `pdfjs-character-region-v2` e `spatial-evidence` 1.2.0. O payload continua usando a mesma região normalizada e os mesmos campos persistidos; antes da confirmação, porém, o cliente resolve os caracteres, ajusta essa região ao contorno das caixas selecionadas e usa o mesmo conjunto para destaque, texto bruto e refinamento. A tolerância subpixel é limitada a um caractere contíguo na direita; métricas de fonte invisível que ultrapassem o próximo item visual da mesma linha são encaixadas proporcionalmente nesse limite, e a altura da interface permanece estável durante o arraste. Esquerda, topo, base, autoridade e histórico permanecem inalterados. Trata-se de um reforço compatível da representação visual do método existente, sem nova versão contratual.

Em 2026-08-30, o ADR-021 substitui a compensação dependente de pixels por um mapa canônico de caracteres em `normalized-page-v1`. A variável `--total-scale-factor` exigida pelo PDF.js é definida explicitamente e unidades nativas/OCR são normalizadas antes da contenção, subtração ou destaque. A semântica persistida continua sendo região explícita e conjunto textual estritamente contido; por isso `pdfjs-character-region-v2` e `spatial-evidence` 1.2.0 permanecem. Ativação real de outro formato, persistência de IDs de unidades ou nova representação de página exigirá nova decisão de versão.

A paridade visual dos campos multilinha comparados em 2026-08-30 altera somente a apresentação local: superfícies extraída e humana compartilham altura e o editor ocupa integralmente a célula correspondente. Valores, decisões, evidências, payloads e persistência não mudam; `human-profile-review` 2.2.0 e os demais contratos permanecem.

O bloqueio explicativo para alterações não salvas, também em 2026-08-30, preserva as mesmas precondições de lock e persistência. Alerta contextual, intenção adiada, foco da justificativa e retomada após salvar ou descartar são coordenação local de interface; `human-profile-review` 2.2.0 permanece porque nenhuma mutação, autoridade, payload ou estado persistido foi alterado.

O resumo estruturado é uma evolução major e material. Ele introduz `structured-resume-summary` 1.0.0, avança `adaptive-resume-extraction` para 3.0.0, `extraction-draft` para 4.0.0, `person-ingestion` para 6.0.0, `human-profile-review` para 3.0.0 e `professional-profile` para 2.0.0. Payloads históricos continuam legíveis e recebem fallback local determinístico a partir das páginas persistidas. Na aprovação, `identity` e `contact` são retirados do perfil profissional e encaminhados às tabelas canônicas privadas; versões desconhecidas ou shapes inválidos bloqueiam a promoção. `spatial-evidence` permanece 1.2.0 porque geometria e semântica de seleção não mudaram.

O ciclo de vida estável dos campos é uma evolução major e material. Ele introduz `review-field-lifecycle` 1.0.0, avança `adaptive-resume-extraction` para 4.0.0, `extraction-draft` para 5.0.0, `person-ingestion` para 7.0.0, `human-profile-review` para 4.0.0 e `professional-profile` para 3.0.0. Novas experiências e formações recebem IDs estáveis e origem explícita; caminhos numéricos históricos continuam legíveis. Novas escritas falham fechadas sem o contrato atual. `spatial-evidence` permanece 1.2.0 porque o significado geométrico não mudou.

O desbloqueio de ações da revisão em 2026-08-30 preserva `review-field-lifecycle` 1.0.0 e `human-profile-review` 4.0.0. A distinção local entre formulário transitório vazio e mudança semântica, a persistência atômica da primeira evidência, os cancelamentos sem resíduo, a seleção defensiva de caminhos e a confirmação de saída corrigem coordenação de interface sem alterar shape, autoridade, payload, persistência ou significado dos contratos.

O hardening da aprovação em 2026-08-30 também preserva `review-field-lifecycle` 1.0.0, `human-profile-review` 4.0.0 e `custom-profile-section` 1.0.0. Ele remove uma ambiguidade de identificador na implementação PL/pgSQL, acrescenta guard estrutural e sanitiza a apresentação de erros sem alterar payload, estado, autoridade, evidência ou significado persistido. A decisão de versão é patch de implementação, sem incremento contratual.

O retorno automático para `Processamento e revisões` após uma aprovação confirmada, também em 2026-08-30, corrige somente a coordenação de navegação da interface. A falha permanece na revisão e nenhum payload, estado persistido, autoridade ou contrato muda; `human-profile-review` permanece 4.0.0.

O redesign da Central da Pessoa em 2026-09-02 introduz `person-action-center` 1.0.0 como contrato local de produto/aplicação/UI. A composição é compatível e derivada: identidade, Perfil vigente, documentos, tentativas e revisões mantêm os mesmos contratos e nenhuma pendência é persistida. `document-presentation` 2.0.0, `resume-product-state` 1.0.0, `human-profile-review` 6.0.0 e `person-ingestion` 9.0.0 permanecem porque payload, autoridade, schema e significado persistido não mudam.

A separação estrutural entre Pessoa, perfil vigente, documento, tentativa e revisão introduz `document-presentation` 1.0.0 e avança `document-processing-state` para 2.1.0. A invalidação auditável avança `document-operation-idempotency` para 1.1.0 porque acrescenta uma nova mutação controlada ao ledger M2-C. Tabelas, enums, `person-ingestion` 7.0.0, `human-profile-review` 4.0.0 e `professional-profile` 3.0.0 permanecem: a nova RPC usa o estado `invalidated` já existente, preserva o perfil atual e não reinterpreta payload histórico.

A visualização curricular de 2026-08-31 avança `document-presentation` para 1.1.0. `Ver documento` passa a resolver a revisão associada e reutilizar o workspace M5 em modo somente leitura, enquanto `Detalhes técnicos` preserva a página operacional anterior. O campo local `verificationReviewId` pertence à projeção de apresentação e não altera schema, payload persistido nem contrato de ingestão; por isso `person-ingestion` 7.0.0, `human-profile-review` 4.0.0 e `spatial-evidence` 1.2.0 permanecem.

A normalização visual de marcadores decorativos em descrições históricas, também em 2026-08-31, preserva `document-presentation` 1.1.0 e `spatial-evidence` 1.2.0. Ela amplia somente a comparação local usada quando uma evidência original não possui região persistida, continua exigindo correspondência única e não altera texto, geometria, payload, autoridade ou persistência.

A recuperação humana de extração parcial em 2026-08-31 avança `document-processing-state` para 2.2.0, `document-presentation` para 1.2.0, `person-ingestion` para 7.1.0 e `human-profile-review` para 4.1.0. A evolução é aditiva e compatível: `failed_structuring` continua registrando que a automação não reconheceu a estrutura mínima, mas uma tentativa com `insufficient_structured_facts`, caracteres úteis, páginas persistidas e draft `insufficient` torna-se entrada autorizada para revisão. Tentativas vazias, outro tenant, papel insuficiente ou ausência de draft/página continuam falhando fechados. Perfil vigente, payload do draft, evidências, histórico e contratos de aprovação não são reinterpretados.

A jornada de seis etapas e a publicação por Delta em 2026-08-31 introduzem `resume-product-state` 1.0.0 e `profile-publication-delta` 1.0.0. Elas avançam `document-processing-state` para 2.3.0, `document-presentation` para 2.0.0, `person-ingestion` para 8.0.0, `human-profile-review` para 5.0.0 e `professional-profile` para 4.0.0. Os majors registram a troca da aprovação cliente direta por composição obrigatória entre perfil-base e proposta: omissão preserva, remoção exige decisão humana registrada e `approve_profile_review` deixa de ser executável pelo cliente. Histórico permanece legível; nenhum contrato de IA, inferência ou evidência espacial muda.

O aprendizado estrutural intra-documento de 2026-09-01 avança `adaptive-resume-extraction` para 5.0.0, `extraction-draft` para 6.0.0, `person-ingestion` para 9.0.0, `human-profile-review` para 6.0.0 e `selective-ocr` para 1.1.0. A mudança é major nos contratos de extração e revisão porque uma correção completa pode criar propostas de experiências antes ausentes; OCR agora preserva linhas posicionadas. `professional-profile` 4.0.0 e `spatial-evidence` 1.2.0 permanecem porque nenhuma proposta publica diretamente e as regiões conservam o mesmo significado. Eventos e RPC v2 continuam legíveis; escritas v3 falham fechadas sem algoritmo, assinatura, âncora e resumos estruturais conhecidos.

A classificação acadêmica estruturada de 2026-09-02 introduz `education-academic-classification` 1.0.0 e avança `extraction-rules` para 2.0.0, `model-selection` para 2.0.0, `adaptive-resume-extraction` para 6.0.0, `extraction-draft` para 7.0.0, `person-ingestion` para 10.0.0, `human-profile-review` para 7.0.0 e `professional-profile` para 5.0.0. Formação passa a separar curso, nível, qualificação, situação e origem por dimensão. Registros históricos permanecem legíveis como `unknown` sem reclassificação retroativa; novas escritas falham fechadas sem o shape atual; inferência ou insuficiência exige confirmação humana antes da publicação. O snapshot determinístico original não é apagado por override humano. `profile-publication-delta` permanece 1.0.0 porque omissão, remoção e autoridade transacional não mudaram, mas a identidade canônica de curso evita duplicidade entre rótulos qualificados e normalizados.

A confiabilidade de interrupções de 2026-09-02 introduz `operation-feedback` 1.0.0 e avança `resume-product-state` para 1.1.0 e `document-presentation` para 2.1.0. A evolução é compatível e local: recuperação passa a derivar páginas e caracteres preservados, erros PostgREST são classificados por código e contrato, e confirmações remotas não são reapresentadas como falhas da mutação quando somente a recarga falha. Nenhum schema, RPC, RLS, grant, payload ou significado persistido muda; `person-ingestion` 10.0.0 e `human-profile-review` 7.0.0 permanecem.

A auditoria factual automática de 2026-09-02 avança `human-profile-review` para 7.1.0. A evolução é compatível: `p_reason` permanece no contrato das RPCs e textos históricos continuam legíveis, mas correções comuns deixam de exigir composição manual. O servidor resolve uma descrição operacional determinística e preserva ator, instante, revisão, campo, valor anterior, valor novo e evidência. O motivo humano continua obrigatório somente para a remoção explícita de fatos já aprovados no Delta; `profile-publication-delta` permanece 1.0.0.

A interação centrada em decisão de 2026-09-02 introduz `decision-centered-interaction` 1.0.0. O contrato é local de produto, aplicação e UI: ações auxiliares ou reversíveis não bloqueiam o fluxo por falha de telemetria, e cliques ou teclas obrigatórios precisam representar julgamento, autoridade ou risco material. O fechamento imediato de sugestões adaptativas não altera payload, schema, RLS, grants nem a validação autoritativa das RPCs; `human-profile-review` permanece 7.1.0 e `adaptive-resume-extraction` permanece 6.0.0.

A segmentação espacial de competências de 2026-09-02 introduz `competency-list-segmentation` 1.0.0 e o método local `competency-list-spatial-v1`. A mudança interpreta delimitadores explícitos e fronteiras reais entre linhas/células antes de preencher o array já existente, exibe a lista resultante para confirmação e falha fechada quando múltiplos blocos não possuem separação confiável. `spatial-evidence` permanece 1.2.0 porque região, texto e coordenadas persistidas não mudam; `human-profile-review` permanece 7.1.0 porque a confirmação, o payload transacional e a autoridade continuam iguais.

A compatibilidade acionável da publicação de 2026-09-02 avança `operation-feedback` para 2.0.0, `profile-publication-delta` para 1.1.0, `person-ingestion` para 10.1.0, `human-profile-review` para 7.2.0 e `professional-profile` para 5.1.0. O servidor normaliza IDs e metadados ausentes em fatos históricos já aprovados sem criar classificação acadêmica; propostas novas ou alteradas continuam exigindo confirmação. Impedimentos corrigíveis carregam motivo estável e caminho do campo, enquanto falhas internas declaram que não existe correção manual. A evolução é compatível na leitura, material na escrita e não altera autoridade, RLS, grants, remoção explícita nem contratos de IA.

O reconhecimento explícito do resumo profissional em 2026-09-02 avança `structured-resume-summary` para 1.1.0, `adaptive-resume-extraction` para 6.1.0 e `extraction-draft` para 7.1.0, com runtime `prisma-layout-adaptive-v7`. A evolução é compatível: o campo opcional `summary` já existia e mantém o mesmo significado, mas passa a reconhecer aliases PT/EN, conteúdo unido ao cabeçalho pelo parser PDF e limites ampliados de seção. Ausência continua nula e registrada em `notIdentified`; não há síntese, inferência, reclassificação retroativa ou mudança em schema, RPC, RLS, perfil, revisão ou evidência espacial.

O aprendizado genérico de registros de 2026-09-10 avança `adaptive-resume-extraction` para 7.0.0, `extraction-draft` para 8.0.0 e o runtime para `prisma-layout-adaptive-v8`. A revisão adaptativa avança para `prisma-document-learning-v4`, `generic-record-pattern-v1` e `relative-record-signature-v1`. A mudança é major porque uma correção humana de experiência, formação, curso ou certificação pode propor registros antes ausentes em qualquer coluna, página ou altura. A posição absoluta deixa de bloquear equivalência, mas geometria real, topologia relativa, conteúdo compatível e evidência própria continuam obrigatórios. Eventos históricos permanecem legíveis, nenhum documento é reprocessado silenciosamente e nenhuma sugestão publica diretamente no Perfil.

A confiabilidade estrutural de 2026-09-11 avança `adaptive-resume-extraction` para 7.1.0, `extraction-draft` para 8.1.0 e o runtime para `prisma-layout-adaptive-v9`. A evolução é compatível: o shape persistido não muda, mas o parser passa a priorizar o detector específico de colunas quando ele e um agrupamento genérico disputam o mesmo bloco, inclui variações femininas no vocabulário de cargo e mantém registros estruturalmente equivalentes sem período como propostas possíveis. `generic-record-pattern-v1`, `relative-record-signature-v1`, publicação e contratos de Knowledge permanecem inalterados. O adaptador Paddle avança internamente para 1.1.0 por diagnóstico tipado e timeout configurável. O vínculo name-only altera somente a precondição da decisão humana de associar a uma Pessoa existente; criação continua exigindo nome e contato, sem mudança de payload ou enum do `resume-intake` 1.0.0.

O plano diretor M5.1 introduz somente o contrato documental `competency-verification-plan` 0.1.0. Ele registra decisões planejadas sobre Verification Need, evidência demonstrada, Evidence Sufficiency, Verification Policy, Verification Definition, Item Bank, blueprint, attempt, integridade, confiança e QA, sem criar versão executável, migration, runtime ou mudança no significado dos contratos persistidos atuais.

O M5.1B avança o plano para 0.3.0 e introduz os contratos executáveis `assessment-invitation`, `assessment-attempt`, `assessment-event`, `assessment-integrity-analysis`, `demonstrated-evidence` e `participant-result-visibility`, todos em 1.0.0. Reprocessamento futuro de scoring, Rubrica, integridade, confiança ou matching cria nova avaliação; não reescreve a avaliação ou evidência histórica.

Correção do login (2026-09-12): o registro inclui o M5.7 aceito; contador e displayVersion são derivados, e o build deixa de aparecer no rodapé. Regressão verifica incremento por entrega, reinício por movimento e rejeição de registros incompletos/duplicados. Gate local pnpm run validate aprovado: 394 testes técnicos e 19 golden, tipos, build, lint, foundation e Context Pack. Sem alteração de Auth, Supabase ou contratos persistidos.

A base transversal de UX de 2026-09-13 introduz `prisma-ux-foundation-1.0.0` (ADR-050). Ela versiona apresentação, linguagem e continuidade de navegação. Posições substitui Vagas apenas na interface; contratos de domínio, URLs e estruturas persistidas mantêm versões e significados. A versão pública permanece v1.5.11: este movimento não adiciona automaticamente uma entrega aceita ao registro de releases. Evidência e escopo em `docs/qa/aot-ux-foundation.md`.
