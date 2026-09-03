# Evidência QA: monitoramento das fontes centrais de Knowledge

Data: 2026-09-03
Ambiente: Prisma-QA (`ioldpnqqvobprjiontre`)

## Escopo

Monitor mensal de CBO, ESCO e O*NET, histórico append-only, retentativas, segurança da invocação e resumo para a Home. Detecção e catalogação não autorizam publicação de Knowledge.

## Rollout

- Migrations `20260903161003_knowledge_source_monitoring` e `20260903163053_knowledge_source_monitor_grants_fix` aplicadas e registradas no histórico.
- Edge Function `knowledge-source-monitor` publicada com `verify_jwt=false` e segredo adicional obrigatório validado contra o Vault.
- Cron `prisma-knowledge-source-monitor-due` ativo em `0 * * * *`; o scanner consulta somente `next_check_at` vencido.
- Próxima execução mensal das três fontes: `2026-10-01 04:00:00+00`, equivalente a 01:00 em `America/Sao_Paulo`.

## Primeira checagem oficial

| Fonte | Versão detectada | Data oficial | Estado | Publicada no Prisma |
| --- | --- | --- | --- | --- |
| CBO | `CBO 2002-2025-06-06` | 2025-06-06 | `current` | sim |
| ESCO | `v1.2.1` | 2025-12-10 | `action_required` | não |
| O*NET | `31.0` | 2026-08-01 | `action_required` | não |

Todas registraram `consecutive_check_failures = 0` e `last_check_error_code = null`. A CBO também comparou os SHA-256 dos três CSVs oficiais com o manifesto da versão publicada.

## Segurança e validação negativa

- Chamada HTTP sem `x-prisma-monitor-secret` retornou HTTP 401 e `UNAUTHORIZED_MONITOR_INVOCATION`.
- As três RPCs de operação têm `EXECUTE` somente para `postgres` e `service_role`.
- `knowledge_source_checks` tem RLS ativo; `anon` não possui grant e `authenticated` possui apenas SELECT, filtrado por policy de Super Admin.
- A função não contém nem chama `publish_knowledge_source_version`.
- `db lint` e advisors não introduziram aviso específico do monitor. Permanecem warnings históricos de casts/imutabilidade, RPCs intencionais autenticadas, leaked-password protection e policies permissivas de outros domínios.

## Validação local

`pnpm run typecheck`, `pnpm run typecheck:web`, `pnpm run build:web` e `pnpm run test` aprovados. A suíte contém 219 testes técnicos, incluindo parsers das três fontes, estados, comparação de hashes CBO, segurança da migration, segredo da Edge Function e boundary da Home.

O smoke visual autenticado da Home ficou pendente porque o navegador interno abriu `/sign-in` sem sessão salva e o repositório não guarda credenciais de QA. Nenhuma credencial foi criada ou alterada para contornar essa ausência.
