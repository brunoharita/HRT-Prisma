---
prisma_context_id: product-wiki
owner: product
status: current
version: 1.4.0
last_verified: 2026-08-26
---

# Prisma Wiki

## Produto

Prisma é uma camada de Talent Intelligence para transformar currículos e informações profissionais em conhecimento estruturado, pesquisável, comparável, explicável, auditável e versionável.

Não é ATS completo, banco de currículos, chatbot de PDF ou IA decisória. Pode coexistir com ATS, HCM, HRIS e ERP.

## Hipótese inicial

Transformar bases de currículos em conhecimento profissional estruturado e permitir busca e matching explicável. A viabilidade técnica local foi demonstrada; valor comercial e qualidade com dados reais permanecem hipóteses.

## Regras funcionais

- Pessoa unifica candidata, colaboradora e demais lifecycles profissionais.
- Usuário opera o Prisma; Pessoa é representada pelo Prisma.
- Papel, posição e vaga são entidades diferentes.
- Fato possui evidência e proveniência.
- Inferência é derivada, versionada e separada.
- Recomendação não altera fatos.
- Decisão humana e resultado observado são registros distintos.
- Ausência de evidência não é atributo negativo.
- Matching existe no contexto de vaga ou papel.
- Gap é requisito obrigatório sem evidência identificada.
- Insuficiência precisa ser uma saída válida.
- IA não decide contratação ou rejeição.
- Currículo é uma entrada operacional principal: o arquivo pode existir em intake antes da Pessoa, mas a Pessoa só é criada após identidade mínima válida e verificação tenant-scoped de correspondência.
- Correspondência é sinal explicável, não decisão; vínculo a cadastro existente ou criação apesar do sinal exige ação humana explícita.

## Usuários do piloto

Super Admin possui autoridade global da plataforma. Owner administra todas as empresas do próprio grupo. Admin administra um subconjunto explícito de empresas do grupo. Recruiter opera Talent Intelligence no próprio escopo sem administrar usuários. Member atua operacionalmente em uma única empresa sem gerenciar papéis ou permissões.

## Escopo atual e futuro

O slice local cobre texto, PDF, OCR seletivo, perfil, evidência, inferência limitada, retrieval, matching e um shell web conectado ao Supabase com rotas protegidas. O M2-A distingue `Usuário != Pessoa`; o M2-B cadastra Pessoas e extrai documentos privados; o M2-C centraliza documentos, torna cadastro/retry idempotentes, permite revisão humana por campo, comparação de versões e aprovação rastreável. O fluxo currículo-first recebe PDF, extrai apenas identidade mínima, verifica correspondências e então cria ou vincula a Pessoa antes de reutilizar M2-B/M2-C. O backend está comprovado no único projeto remoto interno; não há ambiente de produção separado nem frontend hospedado no estágio atual.

Mobilidade interna, sucessão, concentração de competências e workforce planning pertencem à visão futura, não ao runtime atual.
