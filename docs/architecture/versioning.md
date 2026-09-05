# Versionamento

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

O M5.4 de 2026-09-04 introduz `vacancy-definition` 1.0.0, `vacancy-matching-explainable` 1.0.0 e `vacancy-structure-assistant` 1.0.0. A definição é um snapshot imutável com requisitos de identidade estável; cada avaliação registra `vacancy_version_id`. Relações confirmadas para uma Vaga permanecem sinais locais, não equivalências do Knowledge. Vagas e avaliações históricas sem versão continuam legíveis, mas novas escritas M5.4 falham fechadas sem versão atual e autoridade tenant-scoped.

O ajuste M5.4 de 2026-09-04 avança `vacancy-matching-explainable` e `vacancy-structure-assistant` para 1.1.0. A categoria técnica permanece legível como metadado interno compatível, mas deixa de limitar a busca: cada requisito consulta todas as áreas profissionais do Perfil publicado e explica as fontes encontradas. O assistente recebe perguntas abertas, combina somente o contexto interno autorizado e separa empresa, mercado não consultado e sugestão. Pesquisa Web continua exclusivamente no Knowledge Agent governado, sem novo agente ou ativação implícita. `vacancy-definition` permanece 1.0.0 porque schema, RPC, snapshot e payload persistido não mudam.

O ciclo de vida reversível de 2026-09-03 introduz `profile-document-lifecycle` 1.0.0 e avança `profile-publication-delta` para 2.0.0, `professional-profile` para 6.0.0, `person-ingestion` para 11.0.0 e `document-operation-idempotency` para 2.0.0. A mudança é major porque publicação passa a aceitar `merge` ou `replace`, decisões por bloco tornam-se parte do contrato persistido e exclusão física passa a coordenar PostgreSQL e Storage. Leitura histórica permanece compatível; restauração sempre cria nova versão e reset nunca apaga histórico.

O M5.3 de 2026-09-04 introduz `pilot-operational-resilience` 1.0.0 e avança `profile-document-lifecycle` para 2.0.0, `person-ingestion` para 12.0.0 e `document-operation-idempotency` para 3.0.0. A evolução é major porque revisão passa a aceitar fonte documental ou snapshot de Perfil, `people` passa a distinguir situação operacional e absorção, e o ledger passa a coordenar vínculo documental, lifecycle e mesclagem com replay após a mutação terminal. Perfis e documentos históricos continuam legíveis; nenhuma evidência é fabricada ou reclassificada.

As constantes de IA vigentes estão em `src/domain/versions.ts`; contratos de ingestão/revisão estão em `document-review-contract.md`; e o catálogo proprietário está em `contracts.md`. `TUDO_SOBRE_PRISMA.md` usa versão própria de contexto, não substitui versões de domínio.

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

O plano diretor M5.1 introduz somente o contrato documental `competency-verification-plan` 0.1.0. Ele registra decisões planejadas sobre Verification Need, evidência demonstrada, Evidence Sufficiency, Verification Policy, Verification Definition, Item Bank, blueprint, attempt, integridade, confiança e QA, sem criar versão executável, migration, runtime ou mudança no significado dos contratos persistidos atuais.

O M5.1B avança o plano para 0.3.0 e introduz os contratos executáveis `assessment-invitation`, `assessment-attempt`, `assessment-event`, `assessment-integrity-analysis`, `demonstrated-evidence` e `participant-result-visibility`, todos em 1.0.0. Reprocessamento futuro de scoring, Rubrica, integridade, confiança ou matching cria nova avaliação; não reescreve a avaliação ou evidência histórica.
