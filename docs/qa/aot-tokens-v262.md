# AoT — Tokens Prisma por origem2.6.2

Acordo/execução/mapa `tokens-v262.md`1.0.0, escolha explícita de Bruno da proposta3 e autorização main/produção. Baseline330f7e667d7429c66fba838a41f20b774696eceb, runtime2.6.1. Branch `codex/tokens-v262`; risco D. Evidência em `evidence/tokens-v262/`. Finalização produtiva ainda pendente neste snapshot.

## Agreements → implementação → teste/evidência

| ID | Implementação | Teste/evidência | Status |
| --- | --- | --- | --- |
| D-01 | Ensure calendário Brasília, lote vigente reaproveitado e fonte única mês | SQL migração/identidade/remaining/grant único,29fev/UTC/ano/parcial/inatividade/configuração futura;5disputas compartilhadas | PASS local |
| D-02 | validity_days30/720horas; origem original de aquisição, sem grace reset | SQL legado31dias expira, solicitar não libera e pagamento/replay720h; UI remove meses | PASS local |
| D-03 | Reserva mensal primeiro, depois FEFO; settle/quote existentes | SQL divisão5000+resto, adicional mais cedo/later, reservas/cotações/alocações/debitos congelados, falha/terminal/vencido pendente; concorrência5 | PASS local |
| D-04 | TokenWallet origens+histórico à esquerda e planejamento/ações à direita; detalhe super equivalente | Referência3 e render1448/390/320,48checks principais e revisão visual, fonte/apresentação acessível | PASS local |
| D-05 | Guards atuais, helpers privados sem EXECUTE; overview operador restrito, super seleciona | SQL anon/inativo/tenant/papéis/claims, planejamento/preços ocultos; browser operador/troca de empresa | PASS local |
| D-06 | Série diária autorizada/relógio servidor, simulação pura por eventos | Node média/zeros/janelas/observabilidade/vencimento/prioridade/renovação/reservas/fuso; estadosUI insuficiente/zero | PASS local |
| D-07 | Filtros origem/função/usuário/mês, detalhes quantidade/alocação/ref/contexto | SQL snapshot, browser detalhes e filtro; links preservam processo histórico/Pessoa ou explicitam ausência, sem fallback atual inventado | PASS local |
| D-08 | Cadastro/preço/tarifa/retirada, pedidos/pagamento, configuração, concessões e conciliação conservados | SQL release sem pagamento negado/replay; browser pedido+retry, liberação e cadastro7900centavos; campos de meses/aniversário removidos | PASS local |
| D-09 | Loading por operação, conteúdo retido, escopo/retry/modal preservados | Browser refresh/erro/rascunho/retry/idempotency/troca obsoleta; tipo/build/loading guards | PASS local |
| D-10 | Registro2.6.2, contratos2.0.0 e docs/contextos | Validação local/CI/publicação/smoke/sincronização ainda em andamento | PARTIAL |

## Proibições

P-01 PASS local: sem duplicação de franquia/débito/liberação, compra solicitada sem crédito, prazo desde aquisição e mensal primeiro mesmo com adicional prestes a vencer. P-02 PASS local: autorização backend e grants negativos, dados de Pessoas/Perfis/provas/matching e tarifas/cotações preservados; sem IA paga, pedido/pagamento real fictício, preço para operador ou custo técnico para cliente. P-UX-01 PASS local: estrutura3 reconhecível, sem dashboard KPI/linha do tempo/moeda em destaque; método e indisponibilidade explícitos.

## Mapa de impacto final / preservação

O mapa mantém as relações do acordo. Contas/ciclo/lotes/pacotes, reserva/pagamento/ledger, telas empresa/super e projeção são direct. Auth/tenant/RLS critical_transversal com negativas. Quatro consumidores são plausible_indirect: contratos quote/worker1.0.0 e tarifas intactos; regressão SQL comercial existente executa avaliação/Parser/síntese e nova reserva/liquidação de análise de atividade, sem provedor. Shell/versão/loading plausible_indirect com build/guards e viewport. Pessoas/Perfis/Score/processos/Knowledge e nove serviços adjacentes no_impact_identified: nenhum writer ou destino desses domínios no diff;14conjuntos produtivos e19corpos de funções capturados, preservação pós-publicação pendente. Nenhuma biblioteca nova.

Novidade separada: política2.0.0 e UX3. Preservação: replay/quote congelada/entrega humana/price rate/configuração do super/conciliador/cache/rascunho continuam; não se usou sucesso visual como prova de semântica SQL. Dados reais não foram exportados: baseline produtiva contém somente agregados/hashes e metadados necessários.

## Fidelidade visual

Referência normativa `reference/tokens-v262/03-saldo-por-origem.png`, hash no acordo. Mesma fixture fictícia:14/10/2026 às00h,800.461=615.032+185.429, renovação01/11, adicional20/09→20/10, média41.425, referência34.168, previsão28/10. Capturas company/super-company1448/390/320 em evidence/browser. Desktop mantém área larga de origens e movimentos e coluna menor de planejamento/ações/pedidos; mobile expande origens e empilha planejamento/histórico. Shell real, acessibilidade e quantidades exatas substituem decoração e pessoas ilustrativas. Campos/método e avisos completos aumentam altura em relação à prancha ilustrativa, sem trocar topologia/ordem/agrupamento/ação. Ajuste de densidade após comparação e min-width/flex-basis corrigiram overflow320 e filtros mobile truncados. Sem desvio material de composição identificado.

## Validação proporcional / limites

LOCAL PostgreSQL17 descartável import_evidence_v202:202asserts transacionais com rollback (regressão comercial/consumidores e calendário),5disputas reais em clone de schema próprio removido ao fim. Node dirigido38 PASS (cotação, planejamento e links históricos, loading/avisos e release/context); extensão de link/fuso retestada no módulo afetado. Build TypeScript/tipos web/build web PASS no fonte final; testes de versão2.6.2/navegação preservados. Browser48checks principais1448/390/320,9estados adicionais, comparação visual e zero chamadas externas nas fixtures. JSONs separados desktop16/mobile32; repetição mobile ocorreu só após correção de flex/legibilidade. SQL repetido somente após correções/adições de fronteiras afetadas. Sem suíte integral local; CI obrigatório permanece.

Falhas QA resolvidas: alias SQL day precisava AS; negativos owner/B inicialmente testavam um usuário que a fixture vinculava legitimamente às duas empresas, vínculo removido só da fixture para caso realmente sem associação; sem mudança no helper global de autorização. Seletores Fechar duplicado/NBSP/opções virtualizadas foram ajustados; não eram defeitos do produto. O build completo também identificou tipagem estreita na fixture e expectativa antiga2.6.1 no teste de release; ambos atualizados sem alterar regra funcional. Defeito real de overflow320/filtros foi corrigido via min-width/flex-basis. Não foi necessário redefinir papel nem enfraquecer gate.

Nenhum QA remoto separado. Acesso salvo do navegador foi reutilizado com sucesso para preparar o smoke autenticado, sem exposição de credenciais. Consulta produtiva pós-release ainda pendente, sem chamar IA ou criar pedido fictício. Validade/calendar migration altera somente os dados explicitamente autorizados; histórico de debitos permanece.

## Git / QA / produção / rollback

Ainda não publicado neste snapshot. Supabase Prisma ioldpnqqvobprjiontre ACTIVE_HEALTHY verificado; contas2/lotes2/pedidos0/pending0. Tokens mensais atuais conservados, vencimentos serão antecipados para01/11. Nove containers adjacentes devem permanecer idênticos; somente web recriada e migration nova. Advisors baseline capturados para comparação, sem ampliar correção a achados históricos.

Rollback conserva schema/ledger/política2.0.0 e preços/quotes/workers1.0.0. Imagem anterior disponível para recuperação dos demais fluxos; tela de gestão anterior não interpreta envelope2.0.0, exige correção/roll-forward compatível. Não reverter writers/autoridade, semântica de saldo nem expurgar dados. Fechamento factual pós-release em commit documental não reconstrói runtime.

## Desvios / alterações autorizadas / conclusão

Nenhum desvio de regra ou ampliação de escopo identificado. Fonte humana mais recente supersede validade antiga e aniversário, conforme contrato. Implementação local validada; finalização CI/produtiva/sincronização pendente.

## Correção encontrada no smoke autenticado

Primeiro release1b763ad passou CIfeature38668393341/main38668568152 e ativou banco/novo frontend. Migração remota20261015020049/fingerprint fc0065bdeb92f6ac52ea5b9bb847ab4177874d4e898051b4db86b1e7da1ffa20 igual;14conjuntos, saldos/debitos/grants/RLS e16consumidores preservados. Web iniciou com404transitório no probe e estabilizou200sem redeploy. Autenticação salva permitiu consulta real: saldo/calendário corretos, mas previsão/referência indisponíveis. Defeito localizado no decoder camelize: window_start_7/window_start_30 mantinham underscore antes de dígitos, diferente da fixture camelCase. Corrigido só decoder para sufixos alfanuméricos e acrescentado teste de payload real snake_case, incluindo referência disponível mesmo com história insuficiente. Três testes de cotação/planejamento/wire e build web PASS. Sem alteração/reaplicação do banco, contrato, regra ou versão2.6.2; novo SHA de frontend será validado/publicado e smoke repetido somente nas áreas afetadas antes do fechamento. A primeira consulta com falha não é PASS deD-06produtivo.
