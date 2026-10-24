# Consumo e custo por ação de IA

Em3.2.0 `occupational_rag` acrescenta finalidade no escritor do worker existente. Provider `ollama-local`, modelos/digests ADR-089; `usageKind=external` é o enum técnico para tentativa sem cache, sem envio a provedor público. Tokens ausentes desconhecidos; API estimada zero só com contagem conhecida, observado nulo; infraestrutura não declarada gratuita. Sem tarifa/reserva/débito novo de Tokens Prisma ou backfill.

Contrato `ai-action-cost-metering-1.0.0`, medição `ai-cost-measurement-1.0.0`, leitura `ai-action-cost-report-1.0.0`; entrega 3.1.2. Acordo/execução/AoT `ai-cost-metering-v312`. Extensão aditiva do ADR-080 e correlação com ADR-083, sem novo gateway, biblioteca ou serviço.

## Autoridade e unidades

Tokens Prisma são unidades comerciais. `private.prisma_token_reservations`, quotes e allocations continuam a autoridade do débito, da tarifa congelada e de sua origem. `ai_requests` identifica requisições lógicas e `ai_usage_events` conserva tentativas do provedor. `action_operation_id` agrupa leases de um mesmo job de síntese, normalização, diretório ou matching; demais ações usam a operação existente. `commercial_operation_id` captura a operação comercial autorizada no início: uma troca posterior do binding de síntese não altera a ligação de tentativas anteriores.

O relatório soma reservas distintas, não o produto de reservas por tentativas. Reservado, debitado e liberado são separados. O detalhamento conserva franquia mensal, pacote adicional, bonificação e restituição. Funções internas/plataforma sem tarifa têm zero débito comercial, mas custo técnico; função tarifada sem vínculo mostra `unlinked`, nunca zero presumido. É uma consulta: não renova, reserva, debita, estorna, gera conteúdo ou publica Perfil.

## Consumo observado e cálculo

`src/infrastructure/aiHistory.ts` extrai somente versão, modelo solicitado/retornado, IDs técnicos, tier, cache lido/gravado, raciocínio e contagem de chamadas de ferramentas. Entrada e saída permanecem nas colunas originais. Não guarda prompt, argumentos de ferramenta, texto de saída, documento, contato ou segredo. A validação SQL limita chaves, tipos, tamanho e coerência das contagens.

Tabela de preços `openai-standard-2026-10-18`, USD por milhão: Luna entrada0,20/cache0,02/saída1,20; Terra2,00/0,20/12,00. Entrada acima de272.000 usa2× na entrada e1,5× na saída para toda a requisição; cache-write1,25× da entrada normal. Raciocínio já integra output_tokens e não é contado novamente. Ferramentas web/web_search_preview dos modelos suportados usam US$0,01 por chamada; outras ferramentas e tiers sem tarifa validada mantêm custo total desconhecido, preservando componente conhecido quando disponível. Não altera modelos, prompts ou tetos financeiros existentes. Na geração contextual, o campo legado de orçamento e sua fórmula permanecem; o ledger novo é a fonte da medição detalhada.

Fontes verificadas18/10/2026: [Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna), [Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra), [preços/ferramentas](https://developers.openai.com/api/docs/pricing), [API de custos](https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/costs). Uma alteração de preço requer nova versão de cálculo; não reprecificar histórico silenciosamente.

Estados: `calculated` significa cálculo com uso/modelo/tier/cache/ferramentas suportados informados, não fatura; `bounded` conserva intervalo quando faltam contagens de cache; `partial` identifica hipótese de modelo/tier não retornado ou componente sem preço; `unknown` preserva ausência/invalidade de dados. Intervalos/custos parciais nunca são apresentados como valor conciliado. Cache local é zero custo externo e tokens nulos, distinto de cache do provedor, que pode ser cobrado.

Falha com usage preserva o consumo. Timeout, corpo ilegível/truncado ou ausência de usage são desconhecidos. O custo real de cobrança depende de conciliação com a conta do provedor; a API financeira retorna agregados, não comprovação individual por request. Campos observados com evidência já existentes são preservados. Esta entrega não acessa a conta financeira nem cria credencial, coletor de fatura ou rateio fictício.

## Cobertura e limites

Runtime: Parser, Synthesis, matching (duas leituras), Knowledge/research/descrição/resolução, normalização, diretório, geração contextual, análise de atividade e gerador legado quando habilitado. Os dois consumidores manuais de Avaliação usam a mesma calculadora; a finalização de atividade anexa metadata na transação de entrega/liquidação. Backend escreve; navegador não pode fornecer custos ou permissões.

Históricos anteriores ficam intactos e explicitamente sem detalhes/vínculos quando ausentes; não importar automaticamente caches ou artefatos da auditoria. Classificadores administrativos/offline e benchmarks de desenvolvimento não são runtime e não serão disparados para completar métricas. Não se garante recuperação de consumo que o provedor não informou.

Gestão de Tokens Prisma > Consumo e custo de IA: exclusivamente Super Admin ativo, filtros por empresa/função, 25 ações por página (RPC máximo50), detalhe por requisição com até50 tentativas por página/cursor. Totais da ação incluem todas as tentativas, mesmo quando o detalhe é paginado. A consulta não calcula lucro líquido nem atribui receita realizada à franquia gratuita.
