# ADR-080 — Histórico genérico de solicitações de IA

Status: **Aceito pelo PO em09/10/2026; implementado localmente; rollout no AoT**. Data: 09/10/2026. Movimento: Avaliação para Posição v2.3.0, Agreement v0.5.0 D-14. Resposta explícita “OK” do PO à recomendação: decisão aceita; consumidores runtime instrumentados e testados.

## Problema e autoridade

O PO solicitou uma estrutura para registrar solicitações das funcionalidades atuais e futuras, pensando em consumo/pacotes de IA por empresa. Há `public.ai_usage_events`, porém a tabela observada em produção está vazia e não tem consumidores encontrados. Ela registra um resultado terminal, duração, organização, provider/model/version, tokens opcionais e `estimated_cost_usd` obrigatório com default zero. Falta distinguir solicitação lógica, tentativas, cache, andamento, falha com gasto, custo desconhecido e funções globais sem empresa.

Zero registros no ledger não prova zero consumo da plataforma. Chamadas atuais têm logs e estados específicos, que não devem ser confundidos com um histórico genérico completo. Não fazer backfill com custos ou estados inventados.

## Alternativas proporcionais

| Alternativa | Adequação | Custo / limite |
| --- | --- | --- |
| Ampliar `ai_usage_events` e adicionar `ai_requests` | Reutiliza tabela/indexação/RLS existentes; pedido pai reúne tentativas e resultado; consumo fica na tabela existente | Migration aditiva/versionada, registro de plataforma e custo desconhecido exigem ajuste explícito de contrato e permissões; instrumentar consumidores atuais |
| Novo ledger isolado, manter a tabela antiga como legado | Permite novo schema sem alterar tipos anteriores | Dois registros de consumo potencialmente concorrentes, fonte de verdade e migração de leitores exigem mais manutenção; pouco benefício sem consumidores legados identificados |
| Somente logs específicos atuais | Menor mudança imediata | Não satisfaz D-14: cobertura por empresa, consulta e idempotência continuam fragmentadas |

Recomendação apresentada: primeira alternativa. Não requer fornecedor, biblioteca, gateway de IA ou serviço externo novo. A infraestrutura Postgres/Supabase já atende persistência transacional, RLS e RPC do Prisma. Descoberta externa adicional não resolve a lacuna de contrato interno identificada.

## Desenho aprovado pelo PO

- `ai_requests`: identificador lógico, função/etapa, escopo organization ou platform, empresa obrigatória no primeiro, referência opaca à operação, autor/método/versionamento, chave de idempotência e estado. Chamadas globais do Knowledge são custo da plataforma, nunca de empresa escolhida arbitrariamente.
- `ai_usage_events`: tentativas do pedido com relação tenant-consistente, provider e modelo resolvido, tempos, tokens observados, custo estimado distinto de custo observado/reconciliado, versão de preço/moeda e resultado. Campos de custo/tokens ausentes são desconhecidos; não converter null em zero. Tentativas externas que falham podem consumir tokens e não desaparecem do total.
- Retry mantém o pedido e cria tentativa distinta; replay do mesmo evento não duplica consumo. Cache hit é resultado servido sem nova chamada externa, não tentativa paga fictícia. Um pedido pode ter duas leituras/etapas/modelos, como matching, sem colapsar em uma chamada.
- Registro não armazena prompt, documento, resposta de candidato, texto do perfil ou contato. Referências a dados individuais são mínimas e devem respeitar exclusão; identificador opaco não elimina necessidade de controles de privacidade.
- Backend registra e valida contexto; frontend não pode escrever custos, autorizações, empresa, estado final ou créditos. Escopo platform é reservado à autoridade de backend; consultas de empresa não revelam registros globais nem de outras empresas.
- Custos do provider e futura cobrança do cliente são conceitos distintos. Nenhum preço, desconto, pacote, fatura, débito ou cobrança será definido nesta entrega. Não substituir limites de IA das funcionalidades existentes pelo teto específico das questões.

Esse desenho foi aprovado em Q-05 pelo PO; a aprovação autoriza implementação e validação dentro desses limites. Nomes físicos de colunas, índices, RPCs e adaptadores compatíveis são detalhes de engenharia; alterar escopo, fronteira de confiança, dados guardados ou semântica comercial exige nova decisão.

## Inventário e evidência necessária

| Consumidor atual encontrado | Fonte | Particularidade a preservar |
| --- | --- | --- |
| Parser IA | `scripts/parser-ia-service.mjs` | Cache/processamento de documento privado, identidade de organização validada no gateway, sem duplicar evento no cache/retry |
| Synthesis | `scripts/profile-synthesis-worker.mjs` | Claim/lease/job e resultado/auditoria existentes; falha após chamada pode conter consumo |
| Trajetória semântica | `supabase/functions/matching-trajectory/handler.ts` | Leituras múltiplas e desacordo/revisão humana, contratos e Score preservados |
| Knowledge | `supabase/functions/knowledge-agent/index.ts`, `competencyNormalization.ts` | Etapas e chamadas globais; nenhuma empresa arbitrária, sem incorporar dados de curação no ledger |
| Banco de questões legado / contextual | `supabase/functions/assessment-item-generator/index.ts` e extensão futura | Reserva e política específicas preservadas; cinco opções só no contrato contextual novo; revisão humana |

Inventário inicial de código, não prova de cobertura runtime. Scripts administrativos/offline de fontes taxonômicas exigem classificação de execução antes de declarar cobertura total; não ativar ou gastar para preencher histórico. Novos consumidores devem usar a interface genérica e ter teste que prove o registro; não basta adicionar nome ao inventário.

## Aceite, implantação e compatibilidade

Negativos de tenant/role/anon/platform, idempotência e concorrência, lifecycle/cache/falhas/consumo desconhecido e granularidade de duas leituras. Testar cada consumidor integrado com provider sintético e preservar contratos, revisão, cache, limites e disponibilidade conforme o acordo aprovado. Histórico de custo não certifica cobrança conciliada com fatura do provider.

Migration e RPC revisadas em PostgreSQL local descartável, seguidas de release:plan do diff validado para os destinos realmente afetados. Novos campos/versionamento devem ser compatíveis com registros antigos; não reescrever migrations. Serviços Parser/Synthesis e Edge não permanecem automaticamente fora do release ao ampliar D-14: o plano deve refletir instrumentação efetiva. Definir rollback das integrações sem apagar histórico e sem remover dados transacionais existentes.

## Persistência local implementada, ainda não implantada

`20261009140000_generic_ai_request_history.sql` adiciona `ai_requests` com contrato `ai-request-1.0.0` e estende `ai_usage_events` para `ai-usage-events-2.0.0`. Registros v1 mantêm valores e defaults originais, marcados `legacy_unverified`; não recebem pedido fictício. Novas tentativas em andamento têm resultado, duração, tokens e custo nulos. Custos externos podem ser desconhecidos, estimados com versão de preço e tokens observados, ou observados com hash da evidência. Valores monetários são USD, com precisão de oito casas; custo externo do cache é zero conhecido, sem tokens inventados. Consumo conhecido deve ser acompanhado da contagem de eventos com custo desconhecido, nunca interpretado como total completo.

FK composta vincula pedido e tentativa ao mesmo escopo/empresa. RLS permite leitura organizacional para owner/admin/recruiter ativos; escopo platform não aparece nessas consultas. DML direto e execução pública/anon/authenticated da RPC são revogados. `public.record_ai_history_v1` é uma fronteira SECURITY DEFINER de propósito restrito, executável somente pelo backend autorizado, com search_path vazio e campos permitidos por ação; o núcleo privado não recebe grants adicionais. Não confiar em claims editáveis do cliente. Cada consumidor deve preservar sua autorização original antes de registrar, sem expor segredo privilegiado. Autor ausente permanece explícito para trabalhos de backend; quando informado, deve ser ativo e pertencer ao escopo autorizado.

Pedidos/tentativas são persistidos antes de chamar o provider. A RPC serializa mudanças do pedido com bloqueio de linha, oferece replay sem nova aquisição e rejeita mudança do payload ou do resultado final. Isso não é lease de worker nem garantia de execução externa exatamente uma vez; conciliação de tentativas interrompidas continua na integração do consumidor.

QA: `node scripts/test-generic-ai-history-sql.mjs`, PostgreSQL17 em localhost55479, banco descartável vazio, 56 asserções/negativos PASS, ROLLBACK. Evidência: `docs/qa/evidence/position-assessment-v230/generic-ai-history/sql.txt`. O teste cobre grants, claims forjados, isolamento empresa/plataforma, estados, retry/replay, cache, falha com consumo, arredondamento monetário e preservação dos campos legados. Concorrência real entre conexões, consumidores, exclusão de referências individuais na integração e rollout remoto permanecem NOT TESTED. Nenhuma chamada paga, expurgo automático, cobrança ou migração remota foi executada.

## Instrumentação e fronteiras operacionais implementadas

Wrapper backend abre pedido e tentativa antes do provider, registra validação/falha e consumo observado quando disponível; resultado lógico não certifica publicação humana. Dois passes de matching são tentativas separadas. Parser/Synthesis usam RPC tokenizada de propósito restrito (somente suas funções/empresa), credencial protegida já conforme padrão hosted, sem chave de serviço. Knowledge global vai para platform; cache registra custo externo zero/tokens nulos. Gerador legado mantém sua política desabilitada quando desabilitada. Scripts offline de benchmark/curadoria não são runtime da plataforma; benchmark de aceite é registrado como custo de plataforma explícito. Nenhum backfill de operações anteriores.

Testes:56asserções SQL, três disputas com conexões independentes, consumidores reais com transporte injetado, negativos de roles/tenant/custo/modelo/falha/replay. Migrations20261009140000 e20261009160000; evidências e recibos em docs/qa/aot-position-assessment-v230.md.
