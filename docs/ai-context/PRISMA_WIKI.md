---
prisma_context_id: product-wiki
owner: product
status: current
version: 1.0.0
last_verified: 2026-08-20
---

# Prisma Wiki

## Produto

Prisma é uma camada de Talent Intelligence para transformar currículos e informações profissionais em conhecimento estruturado, pesquisável, comparável, explicável, auditável e versionável.

Não é ATS completo, banco de currículos, chatbot de PDF ou IA decisória. Pode coexistir com ATS, HCM, HRIS e ERP.

## Hipótese inicial

Transformar bases de currículos em conhecimento profissional estruturado e permitir busca e matching explicável. A viabilidade técnica local foi demonstrada; valor comercial e qualidade com dados reais permanecem hipóteses.

## Regras funcionais

- Pessoa unifica candidata, colaboradora e demais lifecycles profissionais.
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

## Usuários do piloto

Admin administra organização e acessos. Recruiter importa, consulta PII necessária, busca e configura vagas. Hiring manager busca e vê perfil/matching explicado sem currículo bruto ou contato privado.

## Escopo atual e futuro

O slice local cobre texto, perfil, evidência, inferência limitada, retrieval, matching e um shell web isolado para Supabase Auth com rotas protegidas. PDF, OCR, storage, revisão humana, embeddings, LLM, adaptador Supabase de domínio e operação real continuam futuros e dependem dos gates do piloto.

Mobilidade interna, sucessão, concentração de competências e workforce planning pertencem à visão futura, não ao runtime atual.
