---
owner: ai-quality
status: implemented_for_internal_qa
version: 1.0.0
last_verified: 2026-09-01
---

# IA e Avaliação no M5.1 - Verificação de Competências

## Estado

O M5.1A implementa Sufficiency Engine, Item Bank, Composer, Blueprint e Rubric. O M5.1B implementa tentativa, resposta, correção, métricas, integridade, confiança, Evidência Demonstrada e reavaliação explicável. O M5.1C implementa gap analysis, provider fake, boundary externo desativado, validação, deduplicação, revisão humana, orçamento e analytics sintéticos. Não há LLM vivo, calibração real, provider de delivery ou uso com Pessoas reais.

## Contratos implementados no M5.1C

| Contrato | Versão |
| --- | --- |
| Gap analysis | `m51c-gap-analysis-1.0.0` |
| Proposal schema | `m51c-item-proposal-1.0.0` |
| Deduplicação lexical | `m51c-lexical-deduplication-1.0.0` |
| Prompt de geração | `m51c-ai-item-generation-1.0.0` |
| Analytics | `m51c-item-analytics-1.0.0` |
| Calibração | `m51c-item-calibration-1.0.0` |
| Budget | `m51c-ai-budget-1.0.0` |

O prompt recebe somente competência, nível, dimensão, modalidade, idioma, quantidade e diretrizes metodológicas limitadas. Pessoa, currículo, resposta, e-mail, telefone, tenant secret e pesquisa web são proibidos. Structured Output estrito e validação adicional bloqueiam metadata divergente, alternativas inválidas, tempos incoerentes, PII provável e vazamento de resposta.

Fingerprint exato e Jaccard lexical produzem candidatos explicáveis. Similaridade não aprova nem rejeita por si só. Confidence do modelo é ignorada. A qualidade depende de contrato, validação, revisão humana e futura evidência empírica autorizada.

## Contratos implementados no M5.1B

Scoring múltipla escolha, métricas por questão, integrity ruleset, confidence ruleset, evaluation, demonstrated evidence e matching reassessment são determinísticos e versionados. O resultado bruto permanece imutável; integridade produz fatos, flags e razões, nunca score de fraude. Os itens atuais continuam marcados `[QA/demo]` e geram qualidade metodológica `limited`, não `calibrated`.

## Princípios

- Determinístico primeiro: compor assessment sem LLM quando o Item Bank tiver cobertura.
- IA gera lacunas, não todo assessment por padrão.
- Item gerado por IA não entra no banco global ativo sem revisão humana.
- Resultado precisa ser explicável por blueprint, rubrica, itens e versões.
- Evidência demonstrada não apaga evidência documental, contextual ou humana.
- Confiança é metodológica, não opinião do modelo.

## Contratos implementados no M5.1A

Versões atuais:

| Contrato | Versão |
| --- | --- |
| Sufficiency Engine | `m51a-evidence-sufficiency-1.0.0` |
| Verification Policy | `m51a-verification-policy-1.0.0` |
| Verification Definition | `m51a-verification-definition-1.0.0` |
| Blueprint | `m51a-assessment-blueprint-1.0.0` |
| Rubric | `m51a-assessment-rubric-1.0.0` |
| Item | `m51a-assessment-item-1.0.0` |
| Composer | `m51a-assessment-composer-1.0.0` |
| Prepared Assessment | `m51a-prepared-assessment-1.0.0` |

O composer atual só seleciona itens ativos, compatíveis com competência, nível, modalidade, idioma e distribuição do blueprint. Se a cobertura for insuficiente, falha fechado com `INSUFFICIENT_ITEM_BANK_COVERAGE`.

## Verification Definition

Antes de gerar ou selecionar perguntas, o Prisma precisa saber o que significa demonstrar uma competência. A Verification Definition versionada deve declarar se a competência é verificável, dimensões mensuráveis, modalidades adequadas, níveis verificáveis, sinais de demonstração e limites metodológicos.

Para SQL avançado, por exemplo, múltipla escolha pode cobrir joins, agregações, CTE, subqueries, window functions, otimização e interpretação. Essa modalidade não prova execução prática em ambiente real; essa limitação precisa aparecer no resultado.

## Item Bank

O Global Assessment Item Bank é ativo metodológico do Prisma. Deve registrar origem, status, versão, rubrica, família, variante, exposição, calibração e validade tecnológica.

Estados conceituais:

| Estado | Significado |
| --- | --- |
| `generated` | criado, sem autoridade de uso oficial |
| `under_review` | em revisão editorial, técnica e metodológica |
| `approved` | aprovado para uso controlado |
| `active` | disponível para composição |
| `calibrating` | coletando dados empíricos |
| `calibrated` | possui massa suficiente para parâmetros observados |
| `suspended` | removido temporariamente do uso |
| `compromised` | vazamento ou exposição suspeita/material |
| `deprecated` | conteúdo tecnicamente desatualizado |
| `retired` | mantido apenas para histórico |

Alteração material de enunciado, alternativa, resposta, rubrica ou dificuldade cria nova versão. Assessments históricos permanecem ligados à versão usada.

## Famílias e variantes

Item Family representa capacidade mensurada equivalente. Item Variant altera dados, nomes, números, narrativa, ordem ou contexto, preservando dimensão, objetivo, nível-alvo, dificuldade esperada e lógica metodológica.

Esse modelo reduz memorização, aumenta o acervo, permite randomização controlada e viabiliza geração de variantes com menor custo.

## Dificuldade e tempo

Cada item deve preservar parâmetros iniciais e observados.

| Parâmetro inicial | Parâmetro observado futuro |
| --- | --- |
| dificuldade definida | taxa de acerto |
| tempo mínimo esperado | mediana de tempo |
| tempo típico esperado | P25 e P75 |
| tempo máximo ou faixa | dispersão |
| justificativa metodológica | abandono, alteração de resposta, discriminação quando aplicável |

O parâmetro observado nunca substitui silenciosamente o inicial. Dificuldade e tempo não são universais; proficiência, acessibilidade, idioma, dispositivo e contexto técnico afetam comportamento.

## Blueprint e rubrica

Blueprint define cobertura, não perguntas específicas. Rubrica interpreta o resultado conforme nível-alvo, dimensões, critérios mínimos e limites da modalidade.

Exemplo de blueprint para SQL avançado:

| Dimensão | Cobertura |
| --- | --- |
| joins | 20% |
| agregações | 15% |
| CTE e subqueries | 20% |
| window functions | 20% |
| otimização | 15% |
| interpretação | 10% |

Nível demonstrado deriva da rubrica e da cobertura. Uma questão difícil não equivale automaticamente a competência avançada.

## Uso futuro de IA

IA pode apoiar:

- geração de itens para lacunas específicas;
- criação de variantes;
- revisão assistida de clareza;
- classificação inicial por dimensão e dificuldade;
- explicação textual a partir de dados estruturados;
- análise de anomalias metodológicas.

IA não pode:

- aprovar item global sem revisão humana;
- definir sozinha política organizacional;
- acusar fraude;
- decidir contratação, rejeição ou ranking;
- inventar calibração;
- transformar senioridade em saída do assessment.

## Estratégia de custo

O custo marginal deve cair com reutilização do Item Bank. A primeira fase usa mais autoria ou geração assistida; a fase madura compõe assessments sem chamada obrigatória a LLM.

Métricas planejadas: custo por item gerado, custo por item aprovado, percentual de assessments compostos sem LLM, reutilização por item/família, lacunas por competência e taxa de descarte por revisão.

Não há custo ou fornecedor aprovado no runtime atual.

## Integridade

Questão é a unidade primária de telemetria. Eventos como `page_hidden`, `focus_lost`, saída e retorno precisam estar associados à questão ativa, timestamp, duração, tentativa, dispositivo lógico e versão.

Browser telemetry não é verdade absoluta. Blur, focus e visibility podem variar por navegador, sistema operacional, acessibilidade, conexão e comportamento técnico. Eles são sinais, não prova de fraude.

A análise final deve observar o assessment completo: padrões, recorrência, questões afetadas, tempo esperado versus real, incidentes, retomadas e explicações técnicas.

## Evidência demonstrada

Demonstrated Evidence deve conter:

- competência e conceito normalizado;
- Verification Definition e versão;
- blueprint e versão;
- modalidade;
- nível-alvo;
- nível demonstrado;
- cobertura por dimensão;
- resultado bruto;
- rubrica;
- itens e versões;
- attempt e eventos relevantes;
- integridade e limitações;
- confiança explicável;
- contexto da necessidade;
- timestamp.

## Confiança

Confiança deve ser explicada por razão, não por número opaco. Fatores: cobertura, qualidade dos itens, calibração, recência, consistência, divergência documental/demonstrada, integridade e limitações metodológicas.

Exemplos de reason codes: `blueprint_coverage_met`, `uncalibrated_items_used`, `integrity_signals_present`, `technical_incident_reported`, `evidence_diverges_from_documental`, `assessment_inconclusive`.

## Justiça e vieses

Equivalência exige mesma Verification Definition, blueprint equivalente, distribuição comparável, dificuldade controlada, rubrica comum, cobertura semelhante e itens válidos.

Não assumir que randomização significa justiça. Não usar tempo como proxy absoluto de competência. Não penalizar conexão ruim, tecnologia assistiva, necessidade de tempo adicional, pausa autorizada ou incidente técnico.
