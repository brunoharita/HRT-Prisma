# AoT — medição de IA 3.1.2

Contrato: agreement-ai-cost-metering-v312.md v1.0.0; execução homônima v1.0.0. Baseline e120387846bc6ed317cd401e59f1b9c0d09d0e07. Implementação/QA e publicação concluídos no SHA funcional32fc381d7b240ef97c8dc348b4d3d1678c3e533c, versão3.1.2.

## Mapa de Impacto e Preservação

| Área/capacidade | Relação | Baseline e preservação | Validação necessária | Estado |
| --- | --- | --- | --- | --- |
| Ledger, calculadora e consultas | direct | ADR-080; metadata writer, custos desconhecidos, replay e RLS | 191 testes dirigidos + SQL integrado/negativos | PASS local |
| Reservas/entregas e origem do saldo | critical_transversal | ADR-083; tarifas e liquidações existentes; seis reservas históricas, nenhum pacote vendido na auditoria | 259 asserções SQL, incluindo regressão Tokens/atividade/conteúdo e correlação sem novo débito | PASS local |
| Parser/Synthesis | direct | workers hosted, cache privado, job/lease e resultado validados | fixtures de transporte/erro/cache/retry; imagens do SHA validado e health produtivo | PASS |
| Knowledge/matching/questões/atividade | direct | wrappers e dois consumidores manuais; contratos/prompt/modelo preservados | calculadora, controladores reais com transporte fake e regressões de matching/normalização/Pessoas | PASS local |
| Gestão de Tokens / Super Admin | direct | card resumido de custos; padrão visual compacto | 16 checks browser em1448/390, SQL nega anon/owner/recruiter/member/Super inativo | PASS local |
| Perfis, decisões humanas e Score | plausible_indirect | nenhuma alteração da lógica, dados e prompts | snapshots SQL preservados e regressões dirigidas do matching/ingestão | PASS local |
| Auth/config financeira/infra adjacente | no_impact_identified | só leitura de identidade ativa; nenhum novo segredo/provedor/serviço | revisão do diff; autenticação existente e escopos mantidos | PASS local |

## Acordos / Proibições

| ID | Implementação | Evidência | Estado |
| --- | --- | --- | --- |
| D-01 | ai_requests/ai_usage_events, agrupamento por job, falhas preservadas | unit-tests.txt; sql/sql.txt | PASS local |
| D-02 | measureAiResponse e validação SQL com preço versionado/cache/ferramentas/tier e desconhecidos | testes aiCostMeasurement/aiCostConsumers, replay e proibição de payload livre | PASS local |
| D-03 | vínculo capturado por operação, reserva única, origens e interno/cache zero sem falsa equivalência de unidades | SQL: 2 tentativas/1 reserva, mensal+adicional, cache sem cotação, falha libera sem ocultar API | PASS local |
| D-04 | job estável + snapshot comercial por lease, replay não religa cotações | SQL de duas leases/binding alterado e worker real com fetch fake | PASS local |
| D-05 | tab Super Admin, ações25/tentativas50 por cursor, detalhes progressivos | browser/checks.json e renders1448/390; 60 tentativas em duas páginas SQL | PASS local |
| D-06 | colunas aditivas, writers anteriores aceitos, sem reprecificação/backfill | snapshots históricos SQL iguais; arquivos remotos de quatro Edge Functions equivalentes ao baseline após normalizar CRLF | PASS local |
| D-07 | QA offline/tipos/build, CI branch/main, integração e rollout seletivo concluídos | production.json, production-public.json e seção operacional abaixo | PASS |
| P-01 | mocks de transporte e guarda de rede durante191 testes; browser permite sólocalhost; SQL local com ROLLBACK | unit-tests.txt, browser/checks.json, sql/sql.txt | PASS local |
| P-02 | tarifas/franquia/modelos/prompts/decisões intactos, cálculo legado de teto de questões preservado | diff, testes reais de controlador e snapshots SQL | PASS local |
| P-03 | chaves técnicas estritas e report Super ativo; nenhum segredo/PII ou writer do navegador | negativos SQL/transporte e revisão | PASS local |
| P-04 | calculado/parcial/desconhecido separados de observado, ausência não vira zero | fixtures cache/tier/ferramentas e UI “Não conciliado” | PASS local |

Não há referência visual normativa nova; componentes e tipografia da Gestão de Tokens preservados. Quatro renders desktop/celular mostram listagem/detalhe com dados fictícios equivalentes. Tabelas têm rolagem própria e nenhum overflow global. São evidências sintéticas, não jornada humana autenticada em produção.

## Novidade, preservação e limites

Consulta interna é somente leitura e não pode renovar saldo ou gerar IA. Rebind explícito conserva as definições/grants atuais das fronteiras worker/activity start para invalidar planos do writer anterior; activity finish mantém a transação original e anexa somente metadata validada. O cache local prova zero débito sem confundi-lo com vínculo comercial ausente. Scripts administrativos/benchmarks, faturas, novas credenciais, preços, margem líquida e backfill permanecem fora do escopo (F-01–F-03 PASS no diff). Não foram alterados contratos humanos, Auth, planos ou rotas de outros módulos.

Sem desvios do acordo. Custos históricos ausentes não foram recuperados; tiers/modelos/ferramentas sem preço validado ficam desconhecidos. Conciliação financeira automática está fora do acordo. A consulta paginada foi testada com60 tentativas, sem benchmark de grande volume produtivo. Não houve nova inferência para validar.

## Validação final local

191 testes Node dirigidos PASS e 15 checks finais da calculadora/transporte PASS (com sobreposição), com bloqueio de rede a provedores reais; 259 asserções PostgreSQL local PASS/ROLLBACK; 16 checks de UI PASS em1448/390. Build TypeScript, typecheck web, build web e tipos especializados do Parser PASS. Warning preexistente de bundle >900kB. SQL, logs e screenshots em `docs/qa/evidence/ai-cost-metering-v312`. As únicas falhas intermediárias foram corrigidas: nome SQL ambíguo, duplicação de membership na fixture, contrato ausente no teste do controller e executor Chrome indisponível (usado Chromium headless já instalado) e imports da fixture ajustados ao NodeNext. Nenhuma dessas ocorrências disparou IA.

## Git / QA / ambiente

Branch codex/ai-action-cost-metering. PostgreSQL local 127.0.0.1:55479 disponível; único Supabase remoto produtivo, sem QA remoto separado. Arquivos não rastreados preexistentes preservados e fora dos commits/contexto gerado.

## Publicação e preservação operacional

CI obrigatória branch39169652890/main39169775910 SUCCESS. Release plan1.0.6 do diff indicou banco, quatro Edge Functions, Parser/Synthesis e web; nenhuma superfície adicional publicada. As rotas de validação foram deduplicadas e a sugestão genérica de suíte integral local foi substituída pelas regressões dirigidas acima conforme AGENTS10; CI integral permaneceu obrigatória e passou. Main/local/GitHub/VPS receberam o SHA32fc381; fechamento posterior altera somente documentação, ledger de migrações e recibos, sem novo build de runtime.

Migração ai_action_cost_metering aplicada como20261018215345; canonicalização strip-CR/trim idêntica ao arquivo revisado (SHA256151bb9a29f31f7386767d59182ae7207e2e342bb790d0a043f57fcbbbbc39aff). Permaneceram90 requests,90 events e US$0,0757296 calculados; metadata nova0, sem backfill. Grants do navegador para escrita/writer legado negados e relatório estável somente leitura. Smoke produtivo BEGIN READ ONLY/ROLLBACK vinculou uma identidade Super ativa existente à sessão, confirmou contrato/página e negou ausência de identidade; nenhum usuário/dado foi criado ou alterado. Isso não prova login humano pelo navegador.

Edge Functions ACTIVE: position-assessment6 (JWTfalse, autenticação própria preservada), knowledge-agent24, matching-trajectory20, assessment-item-generator9 (JWTtrue); todos os arquivos remotos equivalentes ao SHA validado. Parser5178559d9de2 e Synthesisd0fe2c984bc4 healthy/0reinícios; web8c6c75a9fe84 running/0. Rollbacks dos três consumidores presentes; gateway, mail e Traefik mantêm início17/10 e não foram recriados. O smoke imediato da web retornou404 durante a recriação; conferência independente após estabilização comprovou11 rotas/assets HTTP200 e cinco invariantes de SHA/versão/tela/RPC/distinção de conciliação, sem rebuild. Nenhuma nova chamada de IA para validação.

Todos D-01–D-07 e P-01–P-04 PASS no escopo demonstrado; os rótulos PASS local acima identificam o ambiente da prova funcional, complementada pelo rollout/smoke. Nenhum desvio do contrato. Limites mantidos: sem backfill, sem conciliação de fatura, sem benchmark produtivo de grande volume e sem jornada humana autenticada. Evidências: `evidence/ai-cost-metering-v312/production.json` e `production-public.json`. Rollback restaura imagens/funções consumidoras anteriores e conserva esquema aditivo, registros e dados; não executar down destrutivo.
