# ADR-019: Áreas personalizadas e aprendizado estrutural por organização

Status: accepted
Data: 2026-08-28

## Contexto

Currículos reais apresentam seções que não cabem em um catálogo fechado, como publicações, projetos relevantes, trabalho voluntário ou experiências internacionais. Transformar cada título em uma chave JSON livre quebraria contratos, auditoria e busca, enquanto descartar a seção reduziria a qualidade da primeira extração. As categorias `uncertainties` e `notIdentified` também estavam visualmente misturadas com fatos do perfil, apesar de serem diagnósticos da importação.

## Decisão

O perfil recebe `customSections[]`, uma extensão estruturada e limitada. Cada área possui `id`, `name`, `format`, `source` e `items[]`; cada item possui identificador estável e valor. Evidências apontam para `customSections.<sectionId>.items.<itemId>.value`, mantendo navegação, destaque, substituição, retirada auditável e histórico já existentes no M5.

A criação ocorre na aba `Outros` e começa por uma região explícita do currículo. Nomes canônicos e duplicados são recusados. `uncertainties` passa a ser apresentado como `Pendências de interpretação` e `notIdentified` como `Informações não localizadas`, separados dos fatos do currículo.

Após a aprovação integral da revisão, o Prisma persiste somente metadados estruturais da área por organização: chave, nome normalizado, formato, versão e contagem de confirmações. Cada confirmação também referencia de forma append-only a revisão aprovada que a originou. Valores dos itens e trechos do currículo não entram nesse catálogo nem no ledger. Em importações futuras, um título aprendido precisa coincidir exatamente após normalização; o conteúdo é novamente lido do documento e recebe evidência própria. Ausência do título não cria pendência nem fato negativo.

## Consequências

- currículos não canônicos podem ser representados sem proliferar campos arbitrários;
- a organização melhora a primeira extração futura sem copiar dados pessoais;
- colisões, formatos desconhecidos, estruturas inválidas e tenant desconhecido falham fechados;
- matching e inferência não transformam automaticamente conteúdo personalizado em competência;
- apagar ou renomear histórico não é necessário para evoluir o rascunho; revisões anteriores permanecem imutáveis;
- a promoção segue `local -> QA -> evidência`; esta decisão não prova rollout remoto.

## Contratos e evidência

- `custom-profile-section` 1.0.0;
- `organization-custom-section-definition` 1.0.0;
- `adaptive-resume-extraction` 2.1.0;
- `extraction-draft` 3.1.0;
- `person-ingestion` 5.1.0;
- `human-profile-review` 2.1.0;
- `professional-profile` 1.2.0.

Implementação: `web/src/domain/customProfileSections.ts`, `web/src/domain/adaptiveResumeExtraction.ts`, workspace de revisão e migrations locais `20260829021015_custom_profile_sections` e `20260829024200_custom_section_learning_provenance`. Testes: `tests/customProfileSections.test.ts`. Estado: migrations aplicadas no Prisma-QA como `20260829023309_custom_profile_sections` e `20260829024007_custom_section_learning_provenance`. O frontend continua local e o smoke visual autenticado permanece pendente.
