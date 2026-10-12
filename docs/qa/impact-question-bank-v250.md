# Mapa de impacto — Banco de questões 2.5.0

Acordo congelado: `agreement-question-bank-v250.md` v1.0.0. Execução: `execution-question-bank-v250.md`. Risco D: conteúdo protegido, decisões humanas, contratos RPC e consumo de IA. Baseline local `a23d82edd317ca109b9ea20ef4d53f86767d92ec`, main, tracked limpo; untracked alheios preservados. Branch `codex/v2m5-question-bank`.

## Mapa anterior à implementação

| Área/capacidade protegida | Relação | Baseline, impacto e regressão proporcional |
| --- | --- | --- |
| Catálogo global/empresa, detalhe e versões | direct | Workspace M5.1C autorizado por servidor; falta conteúdo completo/família e snapshot ausente vira zero. Reutilizar RPC, ampliar leitura protegida; testes SQL de autorização/tenant/null/família e browser de filtros/retorno. |
| Revisão humana, comparação e disponibilização | direct | Revisão e publicação são fatos separados; ambas exigem governança existente, global exige super_admin. Composição transacional, idempotência e justificativa vazia somente aprovação comum; negativos, auditoria/lote/rollback e estados bloqueados. |
| Cobertura por Blueprint e reserva | direct | Ativos, dimensão, nível, idioma, dificuldade; required inclui duas de reserva. Separar composição/reserva sem alterar elegibilidade; suficientes, insuficientes e sem modelo. |
| Solicitação/geração/administração | direct | Simulação determinística cotidiana; boundary externa existe e políticas de produção desativadas (2 políticas, 0 ativas, modelo/provedor nulos, verificado 12/10). Manter indisponibilidade verdadeira, reaproveitar boundary/prompt existente e consumo comercial; nenhum provedor/ativação novos. Testar configuração ausente, cotação, cancelamento, erro, idempotência, limites. |
| Tokens Prisma, orçamento e história de IA | critical_transversal | Ledger/tarifa/reserva existentes; banco ainda sem integração comercial. Envolver boundary existente com reserva/settlement, separar unidade comercial e custo fornecedor; negativos saldo/cotação/tenant, nenhuma IA paga nos testes. |
| Avaliação por processo: composição/banco/revisão/envio | plausible_indirect | Usa assessment_items aprovado e cinco alternativas; banco contém formatos históricos. Não modificar escritor de processo; executar regressão dirigida de montagem, cópia contextual, preservação e envio. |
| Portal/correção/prova fixada | critical_transversal | Conteúdo publicado pode ser consumido pelo processo. Regressão determinística de portal/correção, sem dados reais ou e-mails produtivos. |
| Shell/navegação/loading/foco | plausible_indirect | Rota /item-bank, governança owner/admin/super_admin; alterar rótulo e usar componentes existentes. Testar seta/fechar/filtros/rascunho, teclado, loading/error em1448/390/320. |
| Pessoa/Perfil/Score/matching/Parser/mail/Paddle | no_impact_identified | Governança lê conteúdo técnico do banco, sem mutar pessoas/perfis/score ou serviços. Revisar plano/diff e identidades operacionais; não reconstruir serviços adjacentes. |
| Outras Configurações/Knowledge | no_impact_identified | Somente rótulo de rota do banco no shell; sem redesign, mudança de taxonomia ou novos modelos. Verificação do diff. |

## Ambiente e rollback

Produção: projeto `ioldpnqqvobprjiontre`, nome Prisma, ACTIVE_HEALTHY, PostgreSQL17.6, confirmado pelo conector. Não existe QA remoto separado (owner `docs/operations/environments.md`); evidência QA-first será PostgreSQL local descartável e fixtures sintéticas. Reconfirmar baseline local antes de SQL e VPS antes de rollout. Migrations novas forward/compatíveis; não reescrever histórico. Frontend mantém imagem anterior e assets antigos. Funções preservam boundary/autoridade existentes; rollback de código não desfaz revisão/histórico. Rollback de dados destrutivo não autorizado.

## Evidência e fechamento

AoT `aot-question-bank-v250.md`: cada D/P aplicável e capacidade protegida com implementação/teste/evidência e status honesto. Prova visual com mesmos dados em desktop/390/320 e estados sem dados/longos/erro/permissão reduzida. Screenshot anterior é contraexemplo; nenhuma referência normativa de pixel. Build/tipos e testes dirigidos, contexto em snapshot controlado se untracked interferirem. Release plan por diff comprometido define somente destinos necessários. Nenhuma chamada LLM viva, envio real ou mutação de Pessoas em produção para teste.
