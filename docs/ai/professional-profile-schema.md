# Contrato do perfil profissional

## Identificação

Owner: AI and domain engineering. Contrato: `professional-profile`. Versão atual: `1.0.0`. Implementação: `src/domain/types.ts`. Estado: implementado localmente, não ativado em ambiente remoto.

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

## Compatibilidade

Patch corrige representação sem alterar semântica. Minor adiciona campo opcional ou sinal compatível. Major altera significado, obrigatoriedade ou classificação. Versão desconhecida deve bloquear consumo sensível e encaminhar reprocessamento ou revisão.

## Evidência de validação

Os golden tests revelaram e corrigiram flexão verbal em "analisou dados" e o cabeçalho inglês "Experience". O contrato foi mantido; o parser foi ampliado. Dados reais ainda não validaram este schema.
