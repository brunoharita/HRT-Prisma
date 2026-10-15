# Agreement, execução e mapa — Tokens Prisma2.6.2

Versão1.0.0. Aprovado pela escolha explícita de Bruno da proposta3 e autorização de implementar/validar/publicar2.6.2 em main e produção. Supersede regras de aniversário, validade12meses de pacotes e prioridade somente FEFO do acordo2.4.0/ADR-083; conserva tarifas, cotação, reserva, entrega, pagamento verificado e autoridade. Fonte integral `reference/tokens-v262/regras-aprovadas.md`; referência normativa `reference/tokens-v262/03-saldo-por-origem.png`, SHA25636ea2a29e4657357f05b0ff61723dbc0a6d885aaa6af274c27b4684c8d174817. Exemplo de dados não é dado humano real.

Baseline14/10/2026: main/origin/VPS330f7e667d7429c66fba838a41f20b774696eceb, app2.6.1. Supabase Prisma ioldpnqqvobprjiontre ACTIVE_HEALTHY, PG17; único remoto produtivo, sem QA separado. Duas contas com franquia1M, dois lotes mensais com vencimento11/11; nenhum pedido/adicional ou reserva pendente. Banco LOCAL descartável import_evidence_v202/127.0.0.1:55479 sem Pessoas/tabelas comerciais. Risco D integrado; sem nova biblioteca/provedor/arquitetura de cobrança.

## Agreement congelado

- D-01: franquia inicial1.000.000 por mês calendário de Brasília; dia1 às00h renova e restante expira, sem acumular/compensar meses inativos. Ativação no meio do mês recebe integral até próxima virada. Migrar o lote vigente para o mês corrente sem duplicar concessão, conservar total/remaining/reservas e movimentos anteriores; próximas concessões idempotentes. Quantidade configurável pelo super continua para próximo mês; aniversário deixa de ser configurável.
- D-02: todos os pacotes/adicionais duram30dias exatos após pagamento confirmado e liberação. Solicitação não inicia prazo/cobra/libera. Recalcular existentes desde aquisição/liberação original, sem exceção legada12meses nem reiniciar prazo na migração. Manter histórico/pedidos/preços/tarifas e reservas existentes. Bonificações/restituições permanecem distintas de pacotes, motivadas e com validade já registrada.
- D-03: toda nova reserva consome franquia válida primeiro, depois outros lotes por validade mais próxima. Dividir entre origens quando necessário. Disponível exclui reserva e vencidos. Preservar congelamento da tarifa, replay, serialização, débito por entrega válida, falha sem débito, terminal conflitante negado e conciliação motivada; uma reserva já emitida conserva alocações/valor.
- D-04: proposta3: título e saldo total discreto; área principal larga à esquerda com origens ordenadas e numeradas, prioridade/saldo/validade junto de cada origem; movimentações e uso por função abaixo. Coluna menor à direita com planejamento e solicitação. Mobile empilha total, origens em blocos expansíveis e planejamento, com histórico e solicitação acessíveis. Mesmo desenho dentro do detalhe de empresa selecionada no super, com voltar para lista e ações administrativas separadas.
- D-05: owner/admin consultam somente própria empresa, saldo/composição/consumo/detalhe/histórico/pacotes/pedidos; super seleciona empresa e vê dados equivalentes mais cadastro/gestão. Operadores conservam apenas saldo e próprio consumo sem compra/catálogo financeiro/consumo alheio. Backend autentica usuário ativo e tenant; super continua acesso autorizado global e custos técnicos privados, sem expor esses custos aos clientes.
- D-06: previsão determinística e sem IA por últimos7dias completos de Brasília, incluindo zeros; alternativa30dias. Requer observabilidade de toda a janela, senão histórico insuficiente; consumo zero explicitamente informado. Considera cada vencimento, prioridade e próxima renovação, não saldo/média simples. Mostrar possível esgotamento antes da renovação ou saldo suficiente até renovar, sem garantia. Referência diária da franquia disponível/tempo restante é orientação, nunca limite diário. Método/período e atualização acessíveis. Suspensão/ausência de configuração não inventam previsão.
- D-07: histórico com período/função/usuário/origem, data/quantidade/tokens e vínculo contextual autorizado quando existente. Dados antigos sem vínculo continuam disponíveis com indicação explícita. Avisos discretos de pacote próximo do vencimento (mesmo com franquia), risco de acabar antes de renovar e insuficiência; insuficiência bloqueia somente nova IA paga, preservando consulta/ações manuais/rascunhos. Valores antes da ação continuam discretos.
- D-08: empresa solicita com quantidade/preço total/validade30dias claros e acompanha; super encaminha, verifica pagamento/referência e libera uma única vez; cancelar/recusar com motivo. Cadastro de pacotes/preços e versões de tarifas separado e sem campos de aniversário/meses. Preservar bonificação/restituição/retirada de oferta/reconciliação e custos técnicos internos.
- D-09: feedback visível até conclusão/erro, sem zeros/estados vazios provisórios, preservar conteúdo/filtros/modal/rascunho e retry; troca de empresa cancela resultados e mutações obsoletos. Navegação, autorização e responsividade do shell preservadas.
- D-10: versão2.6.2, owner docs/decisão/contratos/Context Pack/AoT, testes proporcionais e publicação seletiva banco+web, smoke/rollback/sincronização local/origin/VPS. Nenhuma IA paga ou pedido/pagamento humano fictício em produção.
- P-01: não conceder franquia duplicada, saldo negativo, débito duplo, renovar validade na compra solicitada, reiniciar30dias no deploy, consumir adicional antes da franquia ou liberar mediante simples aprovação sem pagamento.
- P-02: não expor outra empresa/usuário, preços aos operadores, custo técnico aos clientes, secrets/PII ou autoridade somente no frontend. Não alterar IA/modelo/prompt/Score/Perfil/provas/respostas/decisões humanas; reuso/cache continuam gratuitos.
- P-UX-01: não substituir a composição por dashboard de KPIs/linha do tempo, não dar destaque financeiro, ocultar origem/vencimento, remover gestão existente ou gerar previsões sem dados/método.
- F-01: checkout/compra/e-mail automático, novos fornecedores/dependências, automação de contratação, IA para previsão, novos serviços, preços/tarifas/pacotes de quantidade novos, linha do tempo da proposta2 e manutenção de outros módulos.
- A-01: reusar PostgreSQL/RPC/ledger/componentes existentes; detalhes de composição acessível e metadados/método versionados; contabilização exata e arredondamento apenas na apresentação; validade especial de concessões existente; divisão em componentes e validação dirigida. Contrato novo de gestão pode ser versionado preservando quote/consumidores1.0.0.
- Q: nenhum material pendente.

## Critérios de aceite e validação mínima suficiente

CA-01/02/03: SQL transacional LOCAL com fronteiras UTC/Brasília, janeiro/fevereiro/ano, ativação parcial, meses saltados, migração sem duplicação e sem perda de reserva,30dias exatos/pagamento/replay, franquia antes de adicional mais próximo do vencimento, divisão de origens, expiração e falha/retry/terminal negativo. Disputas reais de reserva, renovação e liberação. Fotos agregadas remotas comprovam somente deltas autorizados.

CA-04/05/07/08/09: componentes reais com transporte sintético estabilizado, mesma fixture normativa:14/10/2026 às00h, saldo800.461=615.032+185.429, renovação01/11, adicional20/09→20/10, média41.425/dia, referência34.168 e possível esgotamento28/10. Comparação visual1448/390, limite320, empresa/super/operador, origem/filtros/detalhes/pagamento sem evidência/falha/loading/retry/troca de escopo. Negativas SQL anon/inativo/tenant/papel/claims/grants/RLS. Shell/navegação/release e cotação/executores afetados dirigidos; nenhum gate integral local por padrão.

CA-06: Node determinístico testa média com zeros/observabilidade insuficiente/sem consumo, arredondamento, reservas, expiração antes da franquia acabar, múltiplos pacotes, renovação antes do esgotamento, fusos e fronteiras. Sem chamada de IA. Método backend/cliente mantém autoridade e isolamento.

CA-10: tipos/build, lint e contexto/ledger; plano dispatcher a partir do diff, CI obrigatório, fingerprint/corpos/grants/RLS e dados protegidos produtivos, SHA/assets/versão/rotas/rollback/serviços preservados. Reutilizar sessão/acesso seguro para smoke autenticado de consulta; se indisponível, registrar tentativas/limite explicitamente sem fabricar PASS. Fechar após critérios suficientes, sem testes repetidos sem alteração/falha relevante.

## Mapa GOV-01

| Área/capacidade | Relação | Baseline/prova mínima |
| --- | --- | --- |
| Contas/franquia/ciclo/lotes/pacotes | direct | Baseline produtiva agregada; SQL calendário/migração/30dias/idempotência e delta remoto autorizado |
| Reservas/alocações/saldo/débito/pedidos/pagamento | direct | SQL antes/depois e disputas, replay/negativas, histórico/cotações preservados |
| Tela empresa e detalhe super | direct | Imagem3 normativa, mesma fixture/viewports, filtros/histórico/fluxo comercial/estados |
| Projeção e referência diária | direct | Node determinístico e backend DTO autorizado, método/calendário/expirações |
| Auth/RLS/tenant/auditoria obrigatória | critical_transversal | Papel/anon/tenant/claims e grants/RLS negativos; comparação remota sem mudança de autoridade |
| Geração avaliação/banco/Parser/síntese/análise de atividade | plausible_indirect | Todas usam reserve/settle comuns; cobertura dos quatro tipos/falha/replay, corpos executores preservados, regressão comercial existente |
| Shell/navegação/loading/versão | plausible_indirect | Tipos/build e testes dirigidos,1448/390/320 sem overflow |
| Provas/Perfis/Pessoas/Score/processos/Knowledge/decisões | no_impact_identified | Sem escritor ou dados desses domínios no movimento; hashes remotos/corpos consumidores e regressão comercial |
| Edge/Parser/gateway/Síntese/mail/Paddle/Traefik | no_impact_identified | Nenhum código desses serviços muda; plano seletivo, nove containers adjacentes/IDs/imagens/estado antes/depois |

## Execução congelada

Implementar todos D/P/F/A/CA acima; não reinterpretar regra nem composição. Publicação já autorizada por Bruno e AGENTS§7. Acordo e referência completos lidos; imagem é normativa para topologia/hierarquia/ordem/proporções/agrupamento/ações e ilustrativa nos registros/marcações periféricas. Responsivo conformeD-04. Encerrar em `aot-tokens-v262.md` com novidade e preservação separadas, desvios e limites. Mudança pós-publicação de evidências não reabre runtime nem repete testes funcionais válidos.
