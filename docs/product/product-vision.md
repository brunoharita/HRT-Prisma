# Visão do produto

## Problema

Organizações possuem informações fragmentadas e pouco estruturadas sobre candidatos, colaboradores, competências, posições e necessidades futuras. Currículos e registros profissionais são difíceis de pesquisar, comparar e reutilizar com explicabilidade.

## Tese

O Prisma transforma essas informações em uma camada de Talent Intelligence estruturada, pesquisável, comparável, explicável, auditável e versionável.

## Posicionamento

O Prisma não é um banco de currículos, ATS tradicional, chatbot de PDF ou motor autônomo de decisão. Ele deve coexistir com ATS, HCM, HRIS e ERP, acrescentando inteligência reutilizável sobre pessoas, papéis, posições, vagas e evidências.

## Wedge inicial

Hipótese ainda não validada comercialmente: transformar bases existentes de currículos em conhecimento profissional estruturado e permitir busca e matching explicável em linguagem natural.

## Princípios de produto

- Evidência antes de inferência.
- Ausência de evidência não é evidência de ausência.
- Avaliação existe somente no contexto de vaga ou papel.
- Explicabilidade vem antes de score.
- IA apoia decisão humana e não possui autoridade decisória.
- Gaps e incertezas permanecem visíveis.
- Currículo não autoriza inferência indiscriminada de atributos sensíveis.
- Isolamento, privacidade, avaliação e versionamento nascem junto com o produto.
- Currículo-first é o fluxo principal de entrada de Pessoas; cadastro manual é secundário.

## Entrada de Pessoas

Um currículo pode iniciar o cadastro de uma Pessoa sem que ela tenha sido previamente cadastrada. O Prisma extrai identificação mínima, verifica correspondências somente dentro da organização e cria a Pessoa quando há nome, contato válido e nenhuma ambiguidade relevante. Possível duplicidade ou identidade insuficiente exige resolução humana. Falha nunca cria uma Pessoa sem identidade suficiente.

## Resultado de longo prazo planejado

O Prisma poderá apoiar recrutamento, mobilidade interna, descoberta de competências, arquitetura organizacional e continuidade de posições. Essas capacidades são visão futura; não estão disponíveis no runtime atual, salvo o slice mínimo descrito em `PRISMA_CURRENT_STATE.md`.
