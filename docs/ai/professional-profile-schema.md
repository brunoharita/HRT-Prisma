# Contrato do perfil profissional

## Identificação

Owner: AI and domain engineering. Contrato: `professional-profile`. Versão atual: `5.0.0`. Implementação: `src/domain/types.ts` e `web/src/domain/personIngestion.ts`. Estado: evolução acadêmica local; perfil 4.0.0 ativo em QA até aplicação da migration.

Cada perfil contém `id`, `organizationId`, `personId`, `createdAt` e versões de extraction, inference, embedding/retrieval, matching, prompt e model.

## Estrutura

```text
ProfessionalProfile
  professionalTitle?
  areasOfExpertise[]
  professionalObjective?
  summary?  # resumo profissional explícito; ausência não autoriza síntese automática
  keyResults[]
    id, value
  experiences[]
    organization, role, startDate?, endDate?, description, evidenceIds[]
  education[]
    id, source, course, institution, period, evidenceText, page
    originalText
    level(secondary|technical|undergraduate|postgraduate|unknown)
    qualification(technical_course|technologist|bachelor|licentiate|specialization|mba|master|doctorate|postdoctorate|other|unknown)
    status(completed|in_progress|interrupted|suspended|unknown)
    classificationOrigin(explicit|inferred|human|unknown)
    classificationSources(level, qualification, status)
    classificationReasons[], classificationMethodVersion, classificationReviewed
    classifierSnapshot?
  certifications[]
  languages[]
  toolsAndTechnologies[]
  competencies[]
    normalizedName, classification(explicit|inferred), evidenceIds[], contexts[]
  professionalContexts[]
  customSections[]
    id, name, format(text|list), source(extracted|human)
    items[]
      id, value
  evidenceIds[]
  inferenceIds[]
  uncertainties[]
  notIdentified[]
  versions
```

Nome e contato não pertencem ao payload profissional. A revisão pode confirmá-los, mas a aprovação grava nome em `people.full_name` e e-mail, telefone, cidade, estado e LinkedIn em `person_private_data`. A constraint de `professional_profiles` rejeita `identity` e `contact` mesmo que um cliente tente enviá-los.

## Evidência e inferência

Evidência contém tipo, fato, documento, bloco, página quando disponível, trecho exato, versão e data. Inferência contém tipo, valor, justificativa, evidências de suporte, versão e data. Inferência nunca é serializada como evidência.

Na formação, `classifierSnapshot` preserva o resultado determinístico inicial. Ajuste humano altera o valor efetivo e a origem, sem reescrever o snapshot. Inferência e `unknown` permanecem revisáveis; perfil novo rejeita classificação presente e não confirmada. Perfis históricos sem os campos novos são lidos com fallback `unknown`, sem inventar backfill.

## Ausência e soft skills

Campos não localizados entram em `notIdentified`; ambiguidades entram em `uncertainties`. Nenhum autoriza conclusão negativa. Comunicação, criatividade, resiliência, inteligência emocional e atributos similares não são extraídos como fatos pelo provider atual.

`summary` recebe somente o conteúdo de uma seção explícita de resumo/perfil/síntese profissional. O extrator encerra a captura no próximo cabeçalho conhecido, inclusive expertise técnica, competências, formação e experiência. Texto introdutório sem seção identificável não é promovido automaticamente para o campo.

Na interface, `uncertainties` é apresentado como `Pendências de interpretação` e `notIdentified` como `Informações não localizadas`. Áreas personalizadas são fatos somente quando possuem conteúdo explícito e evidência. Elas não geram automaticamente competência, inferência ou decisão de matching.

## Compatibilidade

Patch corrige representação sem alterar semântica. Minor adiciona campo opcional ou sinal compatível. Major altera significado, obrigatoriedade ou classificação. Versão desconhecida deve bloquear consumo sensível e encaminhar reprocessamento ou revisão.

## Evidência de validação

Os golden tests revelaram e corrigiram flexão verbal em "analisou dados" e o cabeçalho inglês "Experience". O contrato foi mantido; o parser foi ampliado. Dados reais ainda não validaram este schema.
