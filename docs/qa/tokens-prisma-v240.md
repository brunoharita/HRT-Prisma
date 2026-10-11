# V2M4 — Tokens Prisma v2.4.0
Contrato/Execution v1.0.0, congelado em 10/10/2026 pela aprovação explícita do PO nesta conversa. Supersede a escala 1.000/2/10/5 da proposta: multiplicação por 1.000, sem alterar preços ou capacidade relativa. Supersede destaque visual de consumo e Compra direta: informação discreta e Solicitar pacote. Versão final corrigida pelo PO: 2.4.0.

## Agreement
- D-01: unidade própria Tokens Prisma, valores inteiros grandes; franquia inicial 1.000.000 mensal por empresa. Não prometer equivalência com tokens técnicos.
- D-02: catálogo Complemento1.000.000/R$49, Expansão3.000.000/R$129, Volume10.000.000/R$349; validade adicional12meses. Super usuário cadastra novas versões de pacotes/preços e consumo; preço vigente e condições congeladas no pedido.
- D-03: reposição idempotente por ciclo mensal, não acumulável; próximos ciclos usam a franquia configurada. Alteração mensal aplica só no próximo ciclo; concessões imediatas separadas/motivadas. Primeiro ciclo começa na ativação; aniversário mensal com mês curto preserva âncora. Reposição calculada pelo servidor quando consultar/utilizar; nunca exige clique humano de recarga.
- D-04: consumo inicial questão2.000/unidade, Parser10.000/operação, síntese5.000/operação. Serviços internos, matching e Knowledge não entram automaticamente. Banco/cache/reuso sem chamada externa, salvar/revisar/enviar não debitam. Todas as entradas dessas três funções devem apresentar consumo antes de executar.
- D-05: saldo compartilhado/tenant, reserva transacional antes de IA, utilização por vencimento mais próximo, débito após entrega válida e não duplicado. Falha sem entrega libera; entrega parcial de lotes de avaliação debita somente lotes efetivamente entregues; resultado parcial legítimo do Parser segue seu contrato e vale uma operação. Retorno incerto mantém reserva para conciliação, nunca presume zero. Super usuário pode conciliar com motivo/evidência, sem disparar IA.
- D-06: administração da empresa consulta saldo/origens/consumo/período/renovação/vencimentos, histórico filtrado por função/usuário/período, tabela de consumo, catálogo e solicitações. Usuário operacional vê saldo/cotação e próprio histórico, sem preços de compra/consumo alheio.
- D-07: solicitações Solicitado -> Aguardando pagamento -> Liberado; alternativas Cancelado/Recusado com motivo. Apenas super usuário confirma pagamento/liberação; registro obrigatório, único, sem pagamento/decisão fictícios. Catálogo/condições explícitos antes de solicitar; sem compra automática.
- D-08: super usuário tem abas Pacotes e preços, Empresas, Solicitações, Consumo e movimentações; cadastra franquia/ciclo por empresa, versões de tarifas e pacotes; bonificação/restituição motivadas com histórico, sem editar saldo diretamente. Custos técnicos separados, estimados/desconhecidos explícitos.
- D-09: aviso discreto abaixo20% e orientação de insuficiência; preservar rascunho e fluxo manual. Loading até conclusão/erro/cancelamento; desconhecido não vira zero. Cotações versionadas/expiráveis não aumentam silenciosamente.
- D-UX-01: referência administrativa aprovada01-administracao, saldo dominante/origens, resumo mensal, funções, histórico e ações no cabeçalho; shell existente. Ajuste autorizado: escala grande, menor ênfase no consumo.
- D-UX-02: avaliação mantém modal/quantidade/revisão; consumo em texto secundário simples junto da ação, sem caixa gigante ou dinheiro; mobile empilha cards/histórico em lista e confirmação adaptável. Fundo ilustrativo não autoriza redesenhar avaliação.
- D-10: documentação owner, ADR comercial, Context Pack, testes dirigidos local descartável/negativos/concorrência/browser, main/produção/smoke/sincronização v2.4.0.
- P-01: não alterar Score/Perfil/Posição/decisões/revisão/exatamente5alternativas; não disparar IA pela navegação/consulta de consumo ou por loading.
- P-02: não confiar em empresa/crédito/custo/autor/estado do cliente; não cruzar tenants, expor segredos ou custos internos ao cliente; não apagar histórico, fazer backfill/cobrar uso passado, fabricar pagamento ou publicar Perfil.
- P-03: não vender Tokens Prisma como tokens OpenAI/Anthropic; não ocultar tabela/quantidade para dificultar compreensão. Escala muda representação, não transparência.
- F-01: gateway de pagamentos/checkout automático, e-mail externo de cobrança, nova mensalidade SaaS, migração de outros consumidores para cobrança, infraestrutura nova, alterações de matching/Knowledge.
- A-01: reutilizar Postgres/Supabase e UI/ledger atuais; detalhes de schema/RPC/índices/locks, política de expiração de cotação10min e validade da oferta solicitada7dias, implementação segura de conciliação e layout responsivo. Sem biblioteca nova.
- Q: nenhuma decisão material pendente para escopo aprovado. Preços iniciais são configuráveis e aprovação é autorização para oferta, não certificação de margem.
- CA-01/02/03: testes de escala, catálogo/versionamento/pedido congelado, ciclos/mês curto/franquia seguinte/expiração/idempotência, UI real.
- CA-04/05: provas por consumidor, cache/validação/falha/entrega, rejeição de saldo/quote/tenant/replay, disputas simultâneas e conciliação.
- CA-06/07/08/09: negativos de papel/empresa/anon e DML, cadastro/solicitar/pagar/liberar/motivos/filtros/loading/falha em browser; nenhuma escrita de pedido comercial na produção durante testes.
- CA-UX: comparação desktop1448/mobile390 e320 com estrutura de referência, escala explicitamente atualizada por PO; contraste/teclado/overflow e confirmação discreta.
- CA-10: planos seletivos, SHA/CI/migrations/serviços/versão/rollback/smoke, AoT separa runtime de fixtures.

## Mapa de impacto inicial GOV-01
Baseline: main f3fa07bed260f3bdac87f6faf10cf1ce6d90bea5, v2.3.5. Supabase ioldpnqqvobprjiontre verificado ACTIVE_HEALTHY; único remoto produção, sem QA remoto. Worktree isolado codex/tokens-prisma-v240 evita cópias/untracked alheios interferindo em typecheck.

| Área | Relação | Capacidade protegida / prova proporcional |
| --- | --- | --- |
| Novo saldo/catálogo/RPC/permissões | direct | localSQL+negativos+concorrência; sem cobrança retroativa |
| Assessment generation/modal/Edge | direct | banco/IA/déficit/revisão/5alternativas/versão/envio/portal; regressão existente |
| Parser/cache/gateway/client/todas entradas | direct | cache0, prévia/reserva/falha/PII/tenant; transporte+ingestão dirigida |
| Synthesis request/complete/queue/fontes | direct | persistência/lease/retry/resultados e leitura manual preservados; SQL/worker/browser dirigidos |
| Shell/navigation/loading | critical_transversal | rotas/perfis/empresa ativa/retorno/feedback; browser e authnegativos |
| Ledger técnico/global | plausible_indirect | writer novo preserva histórico e platform; regressão genérica/cache |
| Matching/Knowledge/curadoria | plausible_indirect | helpers/transversal; não cobrança por origem/global, sem chamadas para testar |
| E-mail/convites/portal/candidatos | plausible_indirect | preservar dispatcher/schema/5alternativas; regressão assessment, sem e-mail externo |
| Gateway de transporte Parser | direct | quoteId validado/preservado; regressão gateway e release seletivo próprio |
| Paddle/Traefik/mail | no_impact_identified | configuração/runtimes alheios preservados por IDs/imagens/restarts |
| Release/versão/contexto | direct | v2.4.0, plano pelo diff, migrations individualmente, SHA/CI/rollback/smoke |
| Dados antigos e trabalho alheio | critical_transversal | migration aditiva/sem backfill, untracked preservados; gitdiff review |

## Execution congelado
Implementar todos os D/P/F/A/CA deste arquivo v1.0.0 integralmente. Este arquivo é acordo e execução do movimento autorizado, sem novo ponto administrativo de aprovação. Reutilizar ledger e componentes, construir apenas camada comercial específica; solicitação assistida dispensa novo fornecedor. Decisão comercial nova registrada em ADR sem substituir ADR-080. Testes sem provider pago/dados produtivos; ativação da franquia padrão necessária faz parte da implementação autorizada, pagamentos nunca inventados. Atualizar mapa para novas superfícies reais antes de publicar.

## AoT
A preencher em aot-tokens-prisma-v240.md. Status inicial dos requisitos: NOT TESTED.


## Revisão do mapa antes da publicação
Descobertas: transporte exige repasse da cotação e publicação seletiva do gateway, reclassificado direct; síntese possuía enfileiramento automático em publicação/consulta, agora guardado por invocação explícita conforme D-04/P-01. Autorização anterior member/síntese preservada, sem ampliar Parser/avaliação. Restituições/bonificações e pedidos compartilham chave estável por modal para repetir retorno perdido. Locks ordenados organização antes de assessment/history/job evitam inversão entre solicitação e conclusão. Alteração do dia mensal entra na próxima renovação, com transição explícita na UI/documentação.
