# AoT — M7.3 Normalização de competências declaradas

Contrato: `docs/qa/agreement-m73-competency-normalization.md` 1.0.0. Execução: `docs/qa/execution-m73-competency-normalization.md`. Autorização de produção e reprocessamento recebida de Bruno em 2026-09-18.

## Matriz de acordos

| ID | Implementação | Teste/evidência | Status |
| --- | --- | --- | --- |
| D-01 | Resolver server-side usa Knowledge publicada e tipos M7.1 | QA SQL: alias real, tradução, empresa estrangeira e ocupação | PASS |
| D-02 | Trigger transacional, fila e claim com lease | QA SQL: enqueue idempotente, claim duplicado negado; cron real e Reprocessar autenticado funcionaram | PASS |
| D-03 | `src/knowledge/competencyNormalization.ts` | Golden: Excel/Word, composto, heading/lista legada; QA SQL: dois conceitos distintos | PASS |
| D-04 | Modo novo no Knowledge Agent, sem novo provedor/modelo | Deno worker; schema, cobertura, PII, timeout; execução real concluída e proveniência na UI | PASS |
| D-05 | Estados e pendências expansíveis; Inbox de curadoria existente | Browser sintético desktop/mobile; SQL falha/ambiguidade | PASS |
| D-06 | Enqueue autorizado de todos os aprovados vigentes, snapshots preservados | Sete Perfis vigentes completos; hashes de snapshots/observações inalterados | PASS |
| D-07 | Contagem de entradas originais separada de conceitos e pendências | Teste 43 declarações/zero conceitos; browser 8 declarações, 15 conceitos e uma pendência | PASS |
| D-08 | Scope, perfil, versões, modelo/usage, origem e decisão | QA SQL: decisão humana posterior prevalece; nenhuma natureza demonstrada criada | PASS |
| D-09 | ADR, owners, Context Pack, release central v1.7.3 e rollout | Fechamento operacional abaixo; UI autenticada com agrupamentos e versão | PASS |

## Proibições

| ID | Evidência | Status |
| --- | --- | --- |
| P-01 | Testes Office, ocupação, natureza declarada; matching/score/avaliação não editados | PASS |
| P-02 | Perfis/decisões humanos preservados; QA SQL e revisão de diff | PASS |
| P-03 | Negativos anon/membro/inativo/outsider, FK org/Perfil, decisão ambígua e lease | PASS |
| P-04 | Coverage/source spans, malformed provider, fallback e falha visível | PASS |

F-01/F-02 preservados: nenhuma ontologia, inferência por trajetória, ranking, parser/OCR ou remodelagem visual ampla.

## Fidelidade visual

Referência: composição atual M7.2; screenshot vazio do usuário é contraexemplo funcional. Harness `tests/ui/m72.html`, dados sintéticos equivalentes antes/depois. Browser in-app, 2026-09-18: viewport padrão 1266×714 e móvel 390×844, aba Competências. Mantidos cabeçalho, abas, mapa principal, coluna de leitura e empilhamento móvel. Pendência Arquitetura expandida mostra justificativa e declaração original. Capturas desta execução comprovam leitura das métricas, lista acessível e footer v1.7.3. Foi corrigido overflow dos filtros que invadia a coluna lateral em largura intermediária; ajuste responsivo dentro de A-02. Nenhuma divergência material não autorizada.

## Validação local

- Baseline M7.2 replayada em PostgreSQL 17 descartável, loopback 55471, `m72_m73_baseline`; todos os testes anteriores passaram.
- `scripts/test-m73-postgres.ps1`: migration + fixtures sintéticas em transação integralmente revertida; positivos/negativos passaram.
- `deno check supabase/functions/knowledge-agent/index.ts`: PASS.
- `deno test --allow-env supabase/functions/knowledge-agent/competencyNormalization.test.ts`: 3/3, nenhum modelo real.
- `pnpm run typecheck:web`, `pnpm run build`, `pnpm run build:web`, `pnpm run lint`: PASS. Aviso de chunk grande preexistente no build.
- Testes Node de normalização, mapa M7.2, release e Knowledge: 21/21, incluindo regressão adicional de posições BPM/BPMN.
- Não foi executada validação global não autorizada.

## Rollout / evidência remota

Não há homologação remota separada: PostgreSQL descartável/sintético antecedeu a produção única `ioldpnqqvobprjiontre` e Hostinger.

- Migrations remotas `20260918100714` (camada derivada), `20260918100819` (scheduler) e `20260918101319` (JWT do scheduler) aplicadas. Job `prisma-profile-competency-normalization` ativo, um Perfil por execução/minuto.
- Knowledge Agent v14 ACTIVE, gateway `verify_jwt=true`, hash `326807e5695b59c066ad30ef757e0264fdf03d4f0b116399452b90595286ba28`. A proposta inicial com JWT desativado foi bloqueada e não ativada. A alternativa preserva JWT e exige adicionalmente o segredo do monitor. Provas remotas sem JWT e sem segredo: ambas 401.
- Web v1.7.3, commit `59b8b49`, imagem `sha256:8bbcce5ad320e3e453eb363a63d2e63f769c674177d99f44b505fb334a90e2ff`, HTTPS 200 e sessão autenticada existente. Apenas `prisma-web` foi recriado; gateway/parser não foram modificados. Rollback preservado: `prisma-web:rollback-before-m73-20260918`.
- Três respostas para o Perfil com 43 declarações foram rejeitadas sem perda da fonte; diagnóstico sanitizado identificou `COMPETENCY_RESPONSE_OVERLAPPING_INDEX_2`. O validador confundia prefixos BPM/BPMN com posições sobrepostas. A correção usa posições literais não sobrepostas, com regressões positivas e negativas; não flexibiliza grounding, cobertura ou proibição de inferir Office. Código de erro/index são os únicos dados diagnósticos, sem termos ou identidade no log.
- Hash de todos os 15 snapshots antes/depois: `74a05269b3e4d244bbd4fbfe269d4d13`. Hash dos IDs/termos/conceitos/decisores das observações: `9774350d58b79f38f253d903fcfdc1d8`, também inalterado. A camada derivada não reescreveu revisão nem decisão humana.
- Advisors: RLS sem policy na tabela service-only é intencional; RPCs security-definer autenticadas possuem guards e provas negativas. Alertas preexistentes não foram tratados como regressões nem omitidos como ausência de alertas.
- Resultado final observado às 10:33 UTC: **7/7 Perfis vigentes com processamento completo**, nove chamadas totais dentro do limite existente, nenhuma fila falha restante. O Perfil de Bruno conservou 43 declarações, separadas em 66 itens: sete associações para cinco conceitos distintos, em três agrupamentos; 57 itens sem equivalente e dois ambíguos, totalizando 59 pendências explícitas. Repetições de SQL/Power BI não inflaram o total de conceitos. Completo significa processamento concluído, não cobertura semântica de 100%.
- Smoke autenticado real: aba Competências exibiu 43 declaradas, cinco conceitos, Habilidades/Conhecimentos/Tecnologias e ferramentas e lista de 59 pendências; contextuais/demonstradas permaneceram zero. A evidência de Negociação mostrou fonte literal, Perfil v5, natureza declarada, método semântico, alias aprovado e versões, sem inventar decisão humana. Captura visual desta execução confirmou topologia, filtros sem invasão lateral, rodapé íntegro e v1.7.3. Não foi criada publicação de teste nem alterado o Perfil para demonstrar o trigger; essa prova permaneceu transacional no banco descartável.

## Desvios e conclusão

Nenhum desvio funcional pendente do acordo. O defeito de sobreposição foi corrigido e retestado antes do aceite. A cobertura limitada da Knowledge continua explícita: normalizar não autoriza inventar equivalências ou publicar novos aliases sem curadoria. Nenhum limite de chamadas foi elevado. Material alheio preservado: `.tmp.driveupload/` e `services/paddle/Dockerfile.gpu`.
