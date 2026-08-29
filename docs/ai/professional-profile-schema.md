# Contrato do perfil profissional

## Identificação

Owner: AI and domain engineering. Contrato: `professional-profile`. Versão atual: `1.2.0`. Implementação: `src/domain/types.ts` e `web/src/domain/personIngestion.ts`. Estado: schema compatível ativo em QA; runtime e apresentação web locais.

Cada perfil contém `id`, `organizationId`, `personId`, `createdAt` e versões de extraction, inference, embedding/retrieval, matching, prompt e model.

## Estrutura

```text
ProfessionalProfile
  fullName
  experiences[]
    organization, role, startDate?, endDate?, description, evidenceIds[]
  education[]
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

## Evidência e inferência

Evidência contém tipo, fato, documento, bloco, página quando disponível, trecho exato, versão e data. Inferência contém tipo, valor, justificativa, evidências de suporte, versão e data. Inferência nunca é serializada como evidência.

## Ausência e soft skills

Campos não localizados entram em `notIdentified`; ambiguidades entram em `uncertainties`. Nenhum autoriza conclusão negativa. Comunicação, criatividade, resiliência, inteligência emocional e atributos similares não são extraídos como fatos pelo provider atual.

Na interface, `uncertainties` é apresentado como `Pendências de interpretação` e `notIdentified` como `Informações não localizadas`. Áreas personalizadas são fatos somente quando possuem conteúdo explícito e evidência. Elas não geram automaticamente competência, inferência ou decisão de matching.

## Compatibilidade

Patch corrige representação sem alterar semântica. Minor adiciona campo opcional ou sinal compatível. Major altera significado, obrigatoriedade ou classificação. Versão desconhecida deve bloquear consumo sensível e encaminhar reprocessamento ou revisão.

## Evidência de validação

Os golden tests revelaram e corrigiram flexão verbal em "analisou dados" e o cabeçalho inglês "Experience". O contrato foi mantido; o parser foi ampliado. Dados reais ainda não validaram este schema.
