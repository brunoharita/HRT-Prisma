# Evidência QA do Movimento 1

- Data: 2026-08-24
- Ambiente: Prisma-QA (`ioldpnqqvobprjiontre`)
- Dados: exclusivamente sintéticos e identificados por `[QA]`
- Produção: não executada

## Estado persistido

| Organização | Papel persistido do usuário disponível | Pessoas | Perfis atuais | Vagas abertas |
| --- | --- | ---: | ---: | ---: |
| Prisma | admin | 2 | 1 | 1 |
| Prisma QA Beta | recruiter | 1 | 1 | 1 |

## RLS conectado

| Cenário | Resultado |
| --- | --- |
| Admin A sem membership B | 2 pessoas e 1 contato da A; 0 linhas por ID conhecido ou PII da B |
| Recruiter B sem membership A | 1 pessoa, 1 contato e 1 documento da B; 0 linhas por ID conhecido da A |
| Hiring Manager B | 1 pessoa, perfil, evidência e inferência; 0 PII privada e 0 documentos |
| Authenticated sem membership | 0 organizações, pessoas, perfis e PII privada |

Os cenários que alteraram memberships ou papel foram executados em transações independentes com rollback. Nenhuma policy, grant ou migration precisou ser alterada.

## Aplicação

- Adapter único: `web/src/infrastructure/supabase/prismaRepository.ts`.
- Home: contagens persistidas de pessoas, perfis atuais e vagas abertas.
- Pessoas: lista, busca por nome, filtro por lifecycle e navegação para perfil.
- Perfil: fatos estruturados, competências, evidências, proveniência, inferências, incertezas e campos não identificados.
- PII: consulta condicional apenas para Admin e Recruiter; Hiring Manager não executa a consulta e continua negado por RLS.
- Tenant: organização ativa explícita em queries e remount do conteúdo na troca.

## Limitação aberta

O QA possui um único usuário Auth utilizável. O cadastro público não criou identidades adicionais e não houve manipulação direta de `auth.users`. A validação visual autenticada desktop/mobile depende de login manual com a credencial QA já provisionada. Até essa evidência existir, o movimento não deve ser declarado integralmente concluído.
