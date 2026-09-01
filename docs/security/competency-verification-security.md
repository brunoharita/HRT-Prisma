---
owner: security
status: partially_implemented
version: 0.2.0
last_verified: 2026-09-01
---

# Segurança e Privacidade no M5.1 - Verificação de Competências

## Estado

Este documento descreve requisitos do plano completo e controles já aplicados no M5.1A. O M5.1A possui tabelas, RLS, grants explícitos, RPCs internas e auditoria metadata-only para preparação. Não possui storage de respostas, tokens de convite, Edge Functions, telemetria de browser, tentativa real, correção ou evidência demonstrada.

## Ativos

Ativos planejados: Verification Needs, políticas organizacionais, convites, itens globais, itens da organização, blueprints, attempts, respostas, rubricas, telemetria por questão, flags de integridade, evidência demonstrada, decisões humanas, contestação e logs.

## Threat model

| Ameaça | Impacto | Controle planejado |
| --- | --- | --- |
| Vazamento entre tenants | crítico | `organization_id`, FKs compostas, RLS, grants mínimos e testes cross-tenant |
| Exposição de item privado | alto | separação Global/Organization e proibição de promoção automática |
| Pessoa usando acesso operacional | alto | convite separado de `platform_users`, token limitado e finalidade restrita |
| Reuso indevido de convite | alto | expiração, escopo, tentativa, fingerprint e idempotência |
| Alteração de resposta após envio | alto | eventos append-only, lock, versão e fechamento transacional |
| Manipulação de resultado bruto por integridade | alto | resultado bruto imutável; integridade como eixo separado |
| Acusação por telemetria fraca | crítico | reason codes, análise de padrão e proibição de acusação automática |
| Vazamento de conteúdo de item | alto | logs sem enunciado integral quando desnecessário, controle de exposição e status `compromised` |
| Viés por tempo ou acessibilidade | crítico | acomodações versionadas e tempo como sinal contextual, não absoluto |
| Provider externo sem base legal | crítico | nenhum envio a LLM sem DPA, minimização, região, retenção e aprovação |

## Privacidade e LGPD

Respostas e telemetria são dados pessoais ligados a avaliação profissional. Antes de piloto real, precisam de finalidade, base legal, aviso de privacidade, retenção, exportação, correção, exclusão, contestação, subprocessadores e auditoria de visualização.

Pessoa não deve receber automaticamente conta operacional. O convite para assessment deve ter finalidade específica, validade curta, escopo mínimo, revogação e registro de aceite das condições necessárias.

## Telemetria

Eventos técnicos devem registrar somente o necessário para reconstrução e integridade: IDs, questão ativa, timestamps, duração, evento, versão e metadados mínimos. Conteúdo integral de respostas, enunciados e documentos não deve ser duplicado em logs genéricos.

Eventos de browser não provam fraude. Devem ser tratados como comportamento observado, afetado por tecnologia, acessibilidade e contexto. Qualquer impacto em confiança precisa ser explicável, versionado e testável.

## Multi-tenant e autorização

Toda tabela tenant-owned futura deve carregar `organization_id`. Relações críticas devem usar FKs compostas. RLS em schemas expostos é obrigatório. Políticas devem combinar `TO authenticated` com escopo real de organização e papel. `anon` não deve receber grants diretos em dados do assessment.

RPC `security definer`, se necessária, deve ter `search_path` fixo, validação explícita de ator, organização, papel, estado, versão e idempotência, além de DML direto revogado nas tabelas críticas.

No M5.1A:

- Todas as tabelas públicas novas têm RLS habilitado.
- `anon` não recebe leitura nem execução de RPC.
- `authenticated` recebe grants explícitos por causa da mudança recente da Supabase Data API.
- Leitura global de Definition, Blueprint, Rubric, Item Family e Item permite `organization_id is null`; linhas de organização exigem membership.
- Tabelas tenant-owned exigem `private.has_org_role(...)`.
- `verification_needs` e `prepared_assessments` ficam com leitura direta para `authenticated`, mas sem grant direto de escrita; mutações passam pelas RPCs autorizadas.
- RPCs `ensure_m51a_demo_need`, `load_m51a_verification_workspace` e `prepare_m51a_assessment` validam o ator com `private.require_document_reviewer(...)` antes de criar ou alterar registros.
- Auditoria registra IDs, ação, resultado e payload operacional, sem currículo integral, enunciado integral externo ou resposta de Pessoa.

## Integridade

Integridade é controle de qualidade, não mecanismo automático de punição. Nenhum evento isolado, tempo baixo, tempo alto, saída de tela, retorno, mudança de dispositivo ou interrupção deve gerar acusação.

Separar sempre:

| Eixo | Exemplo |
| --- | --- |
| Resultado bruto | respostas corretas/incorretas antes de flags |
| Integridade | sinais técnicos observados |
| Incidente | queda de conexão, refresh, device issue |
| Interpretação | impacto metodológico explicado |
| Confiança | leitura final com reason codes |

## Acessibilidade

Acessibilidade é requisito de segurança e justiça. O M5.1 deve suportar teclado, foco visível, leitor de tela, contraste, tempo adicional por política, retomada após falha e mensagens sem dependência exclusiva de cor.

Tecnologia assistiva não pode ser classificada automaticamente como comportamento suspeito.

## Retenção

Questões abertas antes de implementação: prazo de retenção de respostas, tentativas incompletas, telemetria, itens expostos, convites expirados, logs, flags de integridade, dados usados para calibração, backup e exclusão por titular.
