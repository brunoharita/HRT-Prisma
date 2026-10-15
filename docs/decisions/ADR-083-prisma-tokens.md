# ADR-083 — Créditos comerciais Tokens Prisma

Status: aceito por Bruno em 10/10/2026; Agreement/Execution `docs/qa/tokens-prisma-v240.md` v1.0.0, produto 2.4.0. Classes D/E.

## Decisão e alternativas

Reutilizar PostgreSQL/Supabase, autorização por empresa, ledger técnico ADR-080, workers e componentes Prisma. Acrescentar uma camada comercial privada de créditos por empresa, sem equivalência com tokens técnicos do fornecedor. Escala comercial em milhões com tarifas inteiras por operação. A proposta aprovada dispensa checkout: o administrador solicita e o super usuário confirma pagamento verificado antes de liberar.

Uma carteira externa de pagamentos introduziria integração, custo e autoridade não aprovados. Reutilizar o ledger técnico diretamente confundiria gasto do fornecedor com preço comercial e não ofereceria reserva transacional por entrega. A camada própria se justifica por essas regras específicas; nenhuma biblioteca, fornecedor ou serviço novo.

## Contrato e consequências

Contrato `prisma-tokens-1.0.0`, cotação `prisma-token-quote-1.0.0`. Tabelas no schema private com RLS, sem DML/EXECUTE direto para clientes. RPC pública autentica usuário ativo, papel e empresa. Reserva e liquidação serializam pela organização, com chave única de operação e alocação por lote/validade. Franquia mensal sem acumulação, aniversário ancorado, sem compensação de meses não utilizados; créditos adicionais vencem individualmente. Saldo disponível subtrai reservas. Cotação congela tarifa por 10 minutos; oferta solicitada congela condições por sete dias.

Os escritores existentes permanecem autoridades da entrega. Avaliação debita questões válidas persistidas em lotes; Parser debita resultado válido (inclusive parcial legítimo); síntese debita análise aceita. Falha confirmada libera, retorno incerto conserva reserva e exige conciliação motivada após 15 minutos. Estados terminais divergentes falham. Custos técnicos continuam separados e desconhecidos continuam desconhecidos.

Publicação/consulta/invalidação do Perfil deixam de criar novas sínteses automaticamente: a entrada de geração exige ação explícita cotada. Análises e trabalhos anteriores permanecem válidos e legíveis; trabalhos anteriores sem vínculo comercial terminam sem cobrança retroativa. Alteração de fonte preserva análise anterior e aguarda solicitação. Claims/retries transitórios de um trabalho explicitamente solicitado preservam a mesma reserva. Pane que termine trabalho fora da completion RPC pode manter reserva para conciliação; nunca libera silenciosamente uma entrega não verificada.

Rollback de aplicação deve conservar schema, ledger, pedidos e reservas. Clientes antigos sem cotação continuam consultando/reutilizando, mas nova execução paga é recusada. Não reverter para escritores sem reserva nem apagar a migration para recuperar disponibilidade. Publicar banco antes de Edge/gateway/Parser/web; imagens anteriores preservadas para recuperação com a proteção comercial ainda ativa.

## Revisão aprovada em14/10/2026 — 2.6.2

O Product Owner escolheu a proposta3 e substituiu aniversário por mês calendário de Brasília, prazo de compra por30dias exatos e prioridade somente FEFO por franquia primeiro seguida de FEFO dos demais créditos. Sem exceção de prazo anterior, pois ainda sem clientes em uso. Acordo integral `docs/qa/tokens-v262.md`1.0.0. Política `prisma-token-policy-2.0.0` e gestão `prisma-tokens-2.0.0` tornam a mudança explícita; quote/consumidores1.0.0 conservados. Fonte do saldo/ledger e confirmação de pagamento continuam os mesmos; nenhum fornecedor ou biblioteca nova.

Previsão determinística sobre ledger existente em vez de IA ou serviço financeiro externo: decisão específica sobre lotes, prioridade, zeros, histórico observado, expiração e renovação, sem nova autoridade. Reutiliza Intl/componentes/SQL e não gera custo técnico de provedor. Quantidade de franquia mantém configuração do super para próximo mês, padrão1M. Bonificações/restituições e reservas já emitidas conservam suas regras/alocações; pacotes comprados passam30dias desde aquisição original. Não retrocobra nem remove histórico. Rollback conserva dados e requer frontend de gestão compatível com envelope2.0.0.
