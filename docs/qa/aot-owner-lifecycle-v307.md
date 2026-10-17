# AoT — Ciclo do Owner /3.0.7

Contrato integral `docs/qa/agreement-owner-lifecycle-v307.md`1.0.0; decisão explícita Bruno17/10/2026. Baseline db45bec/runtime3.0.6, branch codex/owner-lifecycle-v307. ADR-087. Evidências em `docs/qa/evidence/owner-lifecycle-v307/`.

## Matriz de acordos

| ID | Implementação | Teste/evidência | Status | Ambiente/limitação |
| --- | --- | --- | --- | --- |
| D-01 | reconciliação transacional, cadastro/primeiro acesso e regularização inicial | postgres.json: manual/pending/completion/backfill/inativos/audit rollback | PASS | PostgreSQL17 isolado real; rollout pendente |
| D-02 | RPC exclusiva Super, candidato/revisão/Owner esperado, troca atômica e escopo Owner | postgres.json: negativos, memberships/identidade/autoria preservadas; browser seleção explícita | PASS | Contas sintéticas, sem alterar credencial |
| D-03 | ação com motivo/impacto, estado vivo suspende negócio e administração; Super preservado | SQL gates reais/handler/preflight/browser modal e suspensão | PASS | Sessão antiga simulada por mesmo JWT sub; sem sessão real de produção |
| D-04 | situação desejada/motivo separados, reativação preserva suspensão manual/empresa/bloqueado | SQL retomada/primaryinactive/pending/securityblocked; browser | PASS | Nenhum status empresarial sobrescrito por retomada |
| D-05 | locks/revisão/Owner esperado/audit, guard genérico/primeiro acesso, UI foco/30s | SQL concorrência/falhas/audit/grants; Deno conta própria/inativo/bloqueado; Node revalidação/cleanup | PASS | Servidor autoridade; revalidação UI é aviso, sem revogar bytes já vistos |
| D-UX-01 | ações no accordion, Owner nome/username/status, modais e recovery de conflito | browser.json48checks1448/390/320 e screenshots inspecionados | PASS | Telas/serviço reais, backend sintético |
| D-06 | migração/Edge platform-users/web, contexto/CI/publicação/sync | checks locais dirigidos; operação remota ainda pendente | PARTIAL | Fechar somente após rollout/smoke/CI |

## Proibições verificadas

| ID | Prova negativa/preservação | Status |
| --- | --- | --- |
| P-01 | SQL nega outros perfis, cross-group, Owner/revisão obsoletos, candidato inativo/pending/blocked/Super/owner; browser não escolhe automaticamente | PASS |
| P-02 | snapshots Auth/usuários/memberships, empresas/suspensão manual/bloqueado preservados; auditoria transacional e sem mutação de dados reais para testar | PASS |
| F-01 | sem IA, planos, Auth provider, links públicos, exclusão, cross-controller ou redesign | PASS |

## Mapa de impacto e preservação

Mesmo mapa inicial do acordo; detalhada a dependência administrativa (preflight service-only + guard SQL), para impedir cadastro/reset por Recruiter em grupo sem Owner ativo. Sem nova regra externa ao bloqueio D-03.

| Área/capacidade | Relação | Baseline | Regressão/evidência | Status |
| --- | --- | --- | --- | --- |
| Grupo/primeira empresa/ciclo de Owner | direct |3.0.6/Edge9 |248SQL incluindo regressão V3M0/Owner/identidade;48browser +147regressão Owner/senha/login | PASS |
| Cadastro/primeiro acesso/administração | direct | owner-onboarding1.0.0/identity2.0.0/senha8 |4Deno handlers reais; SQLaudit/guards; Nodecontratos | PASS |
| RLS/RPC/Storage/sessão antiga | critical_transversal | gates status vivo já ativos | algoritmos/gates byte-idênticos; statusgroup/user/default/follow-up/matching/reserve negativos | PASS |
| Situações/memberships/histórico/Tokens | critical_transversal | fotografia SQL antes/depois | snapshot exato onde protegido, dupla conexão/audit failure; sem saldo novo/movido | PASS |
| Shell/revalidação | plausible_indirect | auth getClaims + repositório | Node foco/intervalo/hidden/dedup/cleanup e guards; tipos web e revisão de respostas obsoletas | PASS |
| Login/contato compartilhado/e-mail | plausible_indirect |identity2.0.0 | Deno multiusuário legado/sessão/contato e Ownercontext; nenhum envio externo | PASS |
| IA/matching/portais/jobs/outros serviços | no_impact_identified | algoritmos/contratos preservados | sem processamento novo; gates anteriores reutilizados, serviços remotos a conferir | PARTIAL |

Novidade comprovada: ativação e ciclo determinístico com autoridade/auditoria. Preservação: situações independentes, identidades/credenciais/escopos/dados e caminhos existentes. Sem prova de sessão Auth hospedada real ou recebimento humano de e-mail; não há Auth QA separado confirmado. QA usa PG descartável e transportes sintéticos. A migração de prontidão autorizada é operação real, separada de testes.

## Fidelidade visual

Sem referência normativa nova; screenshots anteriores são baseline de composição. Mesma página mantém cabeçalho, busca/ordenação, disclosure de um grupo, metadados e tabela/blocos mobile. Novas ações junto ao Owner; modais usam AntD/tokens atuais. Evidências deactivate/replace/suspended em1448/390/320. Inspeção detectou botão longo fora do modal320: corrigida quebra de texto e título reservado ao fechar; nova captura e assertion de limites PASS. Teste funcional não foi usado sozinho para afirmar fidelidade. Sem mudança de topologia fora do escopo.

## Validação final

248checks PostgreSQL17 PASS;4Deno PASS (handlers reais com transportes sintéticos), deno check PASS;35Node dirigidos PASS após build. Browser48checks do ciclo e147de regressão Owner/senha/login PASS. Build web/tipos/checks/contexto/CI finais serão consolidados ao publicar. Não foi executado validate integral local. Falhas do harness: opção virtual do AntD selecionada por teclado; busca já abre o grupo, removido clique que o recolhia; nenhuma dessas falhas exigiu alteração do produto.

## Git / QA / ambiente

Publicação seletiva autorizada, ainda pendente. Somente migration owner_lifecycle, Edge platform-users (JWTtrue) e prisma-web. Backend1.2/Owner deve permanecer no rollback: web anterior compatível para consultas, mutação de grupo suspenso requer cliente novo. Não retirar schema/gates nem apagar auditoria para reverter; corrigir adiante. Imagem anterior/serviços/baseline e regularização reais serão registrados no fechamento.

## Desvios e conclusão

Nenhum desvio funcional identificado; o requisito de preservar bloqueio de segurança prevalece também na conta anterior durante substituição. Acordo/P/F integralmente incorporados. Nenhuma decisão material adicional nem ampliação opcional. Entrega ainda PARTIAL até CI/publicação/smoke/sincronização.
