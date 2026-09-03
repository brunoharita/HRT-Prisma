# Evidência M5.2: Normalização de Conhecimento

Data: 2026-09-03
Ambientes: local e Prisma-QA `ioldpnqqvobprjiontre`. Produção inexistente e não alterada.

## Fontes

### CBO

Origem oficial: Ministério do Trabalho e Emprego, página `CBO - Downloads`. Versão operacional: `CBO 2002-2025-06-06`, baseada nos arquivos oficiais disponibilizados na página atualizada em 06/06/2025.

| Arquivo | Bytes | SHA-256 | Registros |
| --- | ---: | --- | ---: |
| `cbo2002-ocupacao.csv` | 108.256 | `ad6d51d5d139125b15ea746464b2a39fa832ae295cdb6aa63dc7eddf2d2bed00` | 2.694 |
| `cbo2002-sinonimo.csv` | 296.747 | `d49e700161106e0da7e69083db97d0a94ec6d7feed3ab874da5a0cd175a1ace1` | 7.778 |
| `cbo2002-familia.csv` | 33.361 | `76a56fa0d2d5844c0f470cca74a560c48400455dff4ec306fb2a2672f8c0f928` | 626 |

O parser validou Windows-1252, headers, campos obrigatórios, contagens e hashes. O pacote preparou 3.320 registros conceituais e 2.694 relações `is_a`; o Perfil Ocupacional foi avaliado e excluído por não acrescentar valor lexical imediato. O diff apontou 3.320 conceitos novos e zero removidos. A publicação auditada criou Knowledge Global v1 com 3.320 conceitos, 11.097 termos e 2.694 relações. Source version: `2c3304ad-21ff-4dfd-aba8-8dd716d92e0e`. A repetição da publicação retornou `reused = true` e as mesmas contagens, sem criar nova versão ou duplicar registros.

### ESCO

Origem oficial: Comissão Europeia, portal ESCO Download. Versão confirmada: v1.2.1, atualização de 10/12/2025. O portal exige etapa humana e entrega do link por e-mail. Nenhum pacote, checksum ou source version foi inventado. Para retomar: selecionar `ESCO dataset v1.2.1`, conteúdo `classification`, formato `CSV`, idiomas `Portuguese` e `English`; baixar também `delta`, versão v1.2.1, conteúdo `delta`, idioma `language-independent`, formato `CSV`.

O importer e a fixture mínima PT/EN estão aprovados localmente. Labels de idiomas diferentes convergem pela URI estável; relações só são carregadas quando os dois conceitos existem no pacote.

## Contrato e segurança

Migrations `20260903094700`, `20260903100340`, `20260903101644` e `20260903102721` estão ativas no Prisma-QA. A segunda corrige forward-only a ambiguidade PL/pgSQL encontrada no primeiro lote, revertido. A terceira remove o check M4 que ainda exigia o estado antigo `normalized` e o substitui pelo invariante `resolved -> concept_id`. A quarta substitui a tabela temporária interna por mappings persistidos da source version; o lint remoto encerrou sem erro M5.2 e preservou apenas warnings históricos de outros movimentos.

Staging tem RLS, leitura de Super Admin e nenhuma escrita direta para `authenticated`. Apenas `service_role` executa stage/finalize/diff/publish; publicação exige Super Admin ativo explícito. Aliases Organization exigem autoridade e não cruzam tenant. Não há extensão vetorial, `pg_trgm`, score ou LLM no resolver.

## Smoke sintético

`supabase/qa/m52_knowledge_normalization_verification.sql` executou em transação e terminou com rollback. Resultado:

- `Administrador` e `Administrador de empresas` convergiram ao conceito CBO `CBO:occupation:252105`;
- busca por `Administrador` retornou duas Pessoas sintéticas com termos originais distintos;
- alias intencionalmente duplicado permaneceu `ambiguous`;
- termo inexistente permaneceu `unresolved` e entrou na Inbox;
- decisão humana criou alias Organization auditado;
- a mesma expressão permaneceu `unresolved` no segundo tenant;
- três observações mantiveram evidência e Perfil;
- tentativa de INSERT direto no staging por `authenticated` foi negada;
- hashes de `profile_data` ficaram inalterados antes e depois da resolução;
- rollback removeu todas as Pessoas, Perfis, documentos, evidências, aliases e conceitos de prova.

## Validação local

`pnpm run test` aprovou 213 testes após o M5.2. `pnpm run typecheck:web` e `pnpm run build:web` foram aprovados. O smoke visual autenticado não foi executado: o único navegador disponível abriu `/sign-in` sem sessão reutilizável. Nenhuma credencial foi criada ou alterada para contornar o bloqueio. Desktop e mobile permanecem pendentes de inspeção autenticada, embora o build responsivo esteja aprovado.
