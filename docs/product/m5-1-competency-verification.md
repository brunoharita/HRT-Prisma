---
owner: product
status: planned
version: 0.1.0
last_verified: 2026-09-01
---

# M5.1 - Verificação de Competências

Subtítulo: avaliações práticas para validar o nível demonstrado de uma competência.

## Definição

O M5.1 adiciona ao Prisma uma nova classe de evidência profissional: a evidência demonstrada.

O produto do M5.1 não é o teste. É a redução inteligente da incerteza sobre competências. Uma avaliação não determina o nível absoluto de uma Pessoa; ela produz uma evidência demonstrada sobre uma competência, em determinado contexto, método, versão e momento.

O M5.1 não transforma o Prisma em plataforma genérica de provas técnicas, entrevistas automáticas, ranking ou certificação. Ele identifica quando as evidências atuais são insuficientes para uma necessidade profissional concreta, explica por que a verificação é recomendada ou exigida por política e permite obter uma nova evidência de forma estruturada.

## Problema

Hoje o Prisma estrutura evidências vindas de currículo, contexto profissional e revisão humana. Em uma vaga, busca, mobilidade interna ou pergunta de recrutador, pode haver diferença entre existir alguma evidência sobre uma competência e existir evidência suficiente para sustentar aquela necessidade.

Exemplo:

| Situação | Leitura correta |
| --- | --- |
| Pessoa informa SQL no currículo | evidência declarada existe |
| Experiências indicam uso relevante de SQL | evidência contextual existe |
| Vaga exige SQL avançado crítico | necessidade profissional eleva a exigência |
| Não há avaliação prática recente | evidência demonstrada está ausente |

A pergunta deixa de ser "a Pessoa disse ser boa em SQL?" e passa a ser "para esta necessidade, a evidência disponível sobre SQL é suficiente?".

## Camadas de evidência

Uma competência pode ter camadas independentes, cada uma com proveniência, versão e validade próprias.

| Camada | Exemplo | Regra |
| --- | --- | --- |
| Declarada | SQL aparece no currículo | sinal textual explícito |
| Contextual | SQL aparece em experiências profissionais | sinal ligado a contexto de uso |
| Confirmada | operador autorizado revisou a evidência | decisão humana sobre evidência existente |
| Verificada | assessment produziu evidência prática | evidência demonstrada |

Essas camadas não substituem umas às outras e podem divergir. Se o currículo sustenta SQL avançado e uma avaliação demonstra SQL intermediário, o Prisma preserva a divergência. Ele não sobrescreve "avançado" por "intermediário", nem faz o inverso.

## Gatilhos

O fluxo principal nasce de uma necessidade profissional, não do Perfil individual da Pessoa.

```text
necessidade profissional -> requisito -> competencia -> Pessoa encontrada
  -> evidencias existentes -> analise de suficiencia
  -> necessidade de verificacao -> assessment
  -> evidencia demonstrada -> reavaliacao da necessidade
```

Gatilhos em ordem de importância:

| Gatilho | Comportamento esperado |
| --- | --- |
| Matching ou resposta a vaga | principal. A verificação nasce quando um requisito crítico ou política da organização exige evidência demonstrada |
| Pergunta ou busca do recrutador | a resposta mostra Pessoas com evidência suficiente e Pessoas aderentes com gap de verificação |
| Mapeamento organizacional | uso futuro para verificar competência de um time ou grupo |
| Divergência ou incerteza | uma nova verificação pode ser recomendada quando evidências divergem ou estão antigas |
| Perfil da Pessoa | ação manual complementar, não o gatilho principal |

Mensagem sugerida em matching: "Aderência documental encontrada. Esta competência é crítica para a necessidade e ainda não possui evidência demonstrada no nível requerido."

## Necessidade de Verificação

A Necessidade de Verificação representa a lacuna que precisa ser resolvida antes de qualquer assessment. Ela registra Pessoa, competência, contexto, nível esperado, criticidade, evidências disponíveis, evidência considerada insuficiente, política aplicada, explicação e estado.

Estados conceituais mínimos:

| Estado | Significado |
| --- | --- |
| `open` | lacuna criada para análise |
| `recommended` | verificação recomendada pelo motor de suficiência |
| `required_by_policy` | política organizacional exige verificação |
| `requested` | operador solicitou a verificação |
| `assessment_prepared` | assessment foi composto ou reservado |
| `invited` | Pessoa recebeu convite |
| `in_progress` | tentativa em andamento |
| `completed` | tentativa concluída tecnicamente |
| `evaluated` | resultado interpretado pela rubrica |
| `resolved` | necessidade encerrada com evidência suficiente para o contexto |
| `cancelled` | operador cancelou com motivo auditável |
| `expired` | prazo ou validade operacional expirou |
| `inconclusive` | resultado não permite conclusão segura |

Transições devem ser auditáveis e ter ator, motivo, método, versão e idempotência. O Prisma pode recomendar; a organização pode exigir por política; nenhuma obrigação nasce sem regra explicável.

## Evidence Sufficiency Engine

Capacidade planejada responsável por avaliar se as evidências existentes sustentam uma necessidade.

Entrada conceitual: Pessoa, competência, necessidade, requisitos, evidências existentes, política organizacional, recência e contexto.

Saídas permitidas:

| Saída | Uso |
| --- | --- |
| `sufficient` | evidência atual basta para a necessidade |
| `verification_optional` | verificação pode enriquecer, mas não é recomendação forte |
| `verification_recommended` | lacuna relevante justifica verificação |
| `verification_required_by_policy` | política organizacional exige evidência demonstrada |
| `insufficient_information` | dados não sustentam recomendação segura |

Reason codes mínimos: `critical_competency`, `advanced_level_required`, `missing_demonstrated_evidence`, `organization_policy_requires_verification`, `demonstrated_evidence_expired`, `evidence_divergence`, `insufficient_dimension_coverage`.

Não existe score opaco de necessidade de teste.

## Política da Organização

Verification Policy é tenant-owned e não se mistura com Knowledge Global. Knowledge explica a competência; a organização define qual evidência considera suficiente para seu contexto.

Políticas futuras podem definir competências, cargos, famílias, vagas, nível mínimo, criticidade mínima, modo opcional/recomendado/obrigatório, idade máxima da evidência demonstrada, modalidades aceitas, tentativas, reaplicação, reutilização de verificação anterior e exceções.

## UX

As superfícies abaixo devem permitir que um Product Designer desenhe os fluxos sem redescobrir as regras.

| Superfície | Objetivo e comportamento |
| --- | --- |
| Matching com gap | mostrar aderência, gap de evidência, regra aplicada, CTA para solicitar ou dispensar verificação |
| Busca natural | listar aderentes sem interromper a busca; separar evidência suficiente de verificação recomendada |
| Perfil da Pessoa | exibir evidências declaradas, contextuais, confirmadas e demonstradas separadamente, com divergências visíveis |
| Preparação | mostrar competência, nível-alvo, blueprint, política, prazo, modalidade e destinatário |
| Revisão do assessment | permitir revisão humana de itens, cobertura e rubrica antes do convite |
| Convite | informar finalidade, competência, tempo, validade, privacidade e suporte |
| Pré-início da Pessoa | confirmar instruções, acessibilidade, privacidade, integridade e continuidade |
| Execução múltipla escolha | foco em uma questão por vez, autosave, navegação conforme regra e feedback técnico neutro |
| Interrupção/retomada | preservar respostas e explicar o próximo estado sem acusação |
| Conclusão | indicar recebimento e próximos passos sem declarar aprovação ou reprovação |
| Resultado para operador | apresentar nível demonstrado, cobertura, limitações, divergências e impacto no matching |
| Detalhe por questão | mostrar item, versão, dimensão, resposta, rubrica, tempo e telemetria relevante |
| Integridade | separar comportamento observado, incidente técnico e interpretação |
| Item Bank | administrar itens globais com status, versão, exposição e calibração |
| Item da organização | administrar conteúdo privado do tenant sem promoção automática |
| Blueprints | definir cobertura, dificuldade, modalidade e regras de composição |
| Verification Definitions | definir competência verificável, dimensões, níveis e sinais de demonstração |
| Policies | configurar regras organizacionais de suficiência |
| Histórico | consultar necessidades, tentativas, evidências demonstradas, eventos e decisões |

Estados obrigatórios por superfície: vazio, carregando, erro, conflito, expiração, inconclusivo, autorização insuficiente, dados insuficientes e suporte mobile. Acessibilidade deve cobrir teclado, foco, leitores de tela, contraste e acomodações de tempo.

## Escopo

MVP recomendado:

- múltipla escolha como primeira modalidade operacional;
- competências tecnicamente verificáveis;
- correção determinística;
- blueprint, Item Bank, rubrica e telemetria por questão;
- evidência demonstrada independente do Perfil factual;
- integridade como análise explicável, não acusação.

Fora do M5.1 inicial:

- proctoring por vídeo;
- reconhecimento facial;
- monitoramento de webcam;
- entrevista automática;
- avaliação comportamental subjetiva;
- gamificação;
- certificação externa;
- marketplace;
- ranking de Pessoas;
- decisão automática de contratação;
- senioridade consolidada.

## Métricas planejadas

O sucesso não é aplicar mais testes. O sucesso é reduzir incerteza relevante com custo, justiça e explicabilidade.

Métricas de produto: necessidades criadas, recomendadas aceitas, dispensadas, tempo até conclusão, custo médio de geração de itens, percentual composto sem IA, reutilização do Item Bank, cobertura por competência/dimensão, conclusão, tentativa inconclusiva, reaplicação, divergência documental versus demonstrada e itens suspensos.

Métricas de qualidade: cobertura de blueprint, distribuição de dificuldade, taxa de acerto por item, tempo observado, abandono, exposição, equivalência entre formulários, estabilidade da rubrica, ambiguidade contestada e comportamento por versão.

## Open questions

- Nomenclatura oficial dos níveis de competência.
- Processo de criação e aprovação de Verification Definitions.
- Competências do primeiro catálogo.
- Quantidade inicial de itens por blueprint.
- Resultado visível para a Pessoa.
- Contestação e revisão.
- Reaplicação e validade temporal.
- Retenção de respostas e telemetria.
- Base legal.
- Uso de dados agregados para calibração Global.
- Suporte mobile no primeiro release.
- Ambiente seguro futuro para SQL/código.
- Equivalência estatística em escala.
- Política para IA geradora.
- Efeito de acomodações de acessibilidade em tempo e integridade.
- Quem cria e aprova conteúdo Global.
- Licenciamento de itens externos.
- Critério para marcar item como `compromised`.

## Decisões consolidadas

- Nome oficial: M5.1 - Verificação de Competências.
- Conceito central: evidência demonstrada.
- Assessment não sobrescreve Perfil factual.
- Divergência entre evidências é preservada.
- Gatilho principal nasce da necessidade profissional.
- Verification Need é a entidade central do fluxo.
- Evidence Sufficiency identifica gaps e produz razões explicáveis.
- Policy da organização pode tornar verificação necessária.
- Item Bank Global é compartilhado; itens da organização são privados.
- IA gera prioritariamente lacunas e não precisa gerar todo assessment.
- Itens de IA não entram no Global automaticamente.
- Nível da competência, dificuldade do item e nível demonstrado são conceitos diferentes.
- Senioridade não pertence ao M5.1.
- Questão é a unidade primária de telemetria.
- Resultado bruto, integridade, qualidade e confiança são eixos distintos.
- Sem proctoring invasivo no MVP.
- Pessoa não vira Usuário para realizar assessment.
