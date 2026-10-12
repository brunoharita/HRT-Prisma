# Tokens Prisma — gestão de uso de IA

Produto 2.4.0; contrato `prisma-tokens-1.0.0`, ADR-083. Tokens Prisma são créditos comerciais próprios. Não correspondem a tokens de entrada/saída da OpenAI ou Anthropic.

Cada empresa começa com 1.000.000 tokens mensais, sem acumulação. Questão gerada custa 2.000; importação por Parser IA custa 10.000; síntese profissional custa 5.000. Cache, banco aprovado, consulta, revisão, gravação e envio não consomem novamente. O consumo aparece como texto secundário antes da ação. Reserva reduz o disponível; entrega válida confirma o débito, falha sem entrega libera. Saldo baixo gera aviso discreto; insuficiência preserva rascunho e ações manuais.

Em Administração → Tokens Prisma (`/tokens`), owner/admin acompanham saldo por origem, reservas, consumo, renovação, validade, tabela de consumo, histórico por mês/função/usuário e solicitações. Recruiter/member veem saldo compartilhado e próprio consumo, sem catálogo financeiro nem pedidos; member conserva autorização de síntese, sem ganhar acesso ao Parser ou gerador de questões.

Pacotes iniciais: Complemento 1.000.000 / R$49; Expansão 3.000.000 / R$129; Volume 10.000.000 / R$349. Validade 12 meses após liberação. São condições comerciais aprovadas e configuráveis, sem alegação de margem financeira validada. Solicitar não cobra nem libera saldo. Super usuário encaminha para pagamento, verifica recebimento e informa referência para liberar uma única vez. Cancelamento/recusa exigem motivo. Oferta de pedido solicitado vale sete dias; o preço permanece congelado ao encaminhar para pagamento.

Em Administração → Gestão de Tokens (`/platform-tokens`), super usuário administra Pacotes e preços, Empresas, Solicitações, Consumo e movimentações. Mudanças de preço/tarifa criam versões com vigência; cotação válida conserva tarifa anterior. Franquia e novo dia do ciclo são agendados para a próxima renovação; o ciclo de transição termina na primeira ocorrência posterior do dia escolhido, podendo ser mais curto, e meses curtos usam último dia sem perder a âncora. Suspensão bloqueia novas reservas, preservando entrega pendente, saldo e histórico. Bonificações/restituições são lançamentos motivados, sem edição direta de saldo. Reservas incertas são conciliadas com evidência e motivo, nunca disparando IA.

Não há compra automática, checkout, e-mail de cobrança ou cobrança retroativa. Matching, Knowledge e serviços internos não foram incluídos nas tarifas deste movimento.

No Banco de questões 2.5.0, a integração externa M5.1C também exige a cotação comercial existente para `position_assessment_items`, reserva antes de execução e settlement/liberação pelo mesmo ledger. Replays não iniciam outra chamada paga, jobs anteriores não recebem cobrança retroativa e publicação/revisão/simulação continuam gratuitas. Política produtiva do banco desativada não é ativada pela integração.
