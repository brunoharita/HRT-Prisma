# Acordo — Atividade legível e análise por IA, v2.5.2

Contrato v1.0.0,13/10/2026. Bruno aprovou as duas propostas desta conversa, com main/produção2.5.2. Baseline925d4b3ca619b5f302f8fe4d737cb83a473e123e; tracked limpo e untracked alheios preservados. Risco D: dados de atividade por tentativa, IA explícita e consumo; sem nova coleta.

## Comportamento aprovado

- D-01: resumo legível por questão: aba/janela sem foco em ocorrências e duração; mouse sem movimento antes da primeira resposta com total e maior intervalo separados; alterações de zoom e atalhos registrados separados. Ausência de registro não é ausência de atividade; indisponível/não aplicável distintos de zero.
- D-02: acontecimentos em português com horários Brasília, intervalos e duração aproximada, encerramento interpretado conforme fato registrado. Detalhe expandido ocupa toda a largura, não uma coluna estreita. Horário de recebimento, métodos, versões, IDs e payload original preservados em campos legíveis técnicos sob demanda; nenhuma serialização JSON primária.
- D-03: card Análise da atividade antes da lista, com Analisar atividade com IA explícito, previsão Tokens Prisma e saldo antes de confirmação. Não executar IA por leitura, abertura ou atualização. Consultar resultado salvo é gratuito.
- D-04: analisar tentativa completa disponível, não somente página da tabela. Declarar quantidade de questões e eventos considerados, limitações, versão/fingerprint/data e eventual desatualização. IA organiza padrões fundamentados; totais e durações calculados pelo sistema. Afirmações vinculadas a questões/eventos, com acesso às evidências.
- D-05: reutilizar OpenAI Responses/modelo e histórico genérico/cobrança existentes. Enviar somente fatos agregados sem nome, e-mail, enunciados, respostas, contatos ou texto de payload. Saída estruturada limitada a padrões/contextos sustentados; não inventar números, destinos, causas, intensidade ou intenção.
- D-06: sem fraude/suspeição/risco/contratação/Score/etapa automáticos; perda de foco não comprova consulta, atalhos não comprovam captura, mouse parado pode ser leitura/reflexão/acessibilidade; ausência não prova ausência. Sem cores acusatórias. Avaliação humana permanece.
- D-07: persistir por organização/tentativa/snapshot, com autoria/método/modelo/versão e histórico imutável. Backend verifica ator, papel, tenant, tentativa e dados oficiais, rejeitando escopo desconhecido e entrada manipulada. Idempotência/cache/concorrência não repetem provider ou débito; falha sem resultado não cobra, resultado incerto exige reconciliação em vez de repetir IA.
- D-08: frontend processual e histórico individual reutilizam apresentação equivalente; loading acessível até conclusão, erro com recuperação e dados anteriores preservados, teclado/mobile sem compressão. Resultado pode apoiar revisão, sem bloquear fluxo manual quando indisponível.
- D-09: publicar versão2.5.2 por diff/SHA validado, migrations/backend/web somente quando necessários, QA-first sensível, negativos e regressão proporcional, rollback/smoke/sincronização e AoT/contexto.
- P-01: nenhuma decisão humana pré-preenchida, conclusão de fraude ou discriminação; números/fatos ausentes não inventados nem zeros.
- P-02: sem coleta/telemetria nova, alteração de respostas/correção/Score/etapa/perfil, logs com PII/prompts integrais, raw secrets ou dados pessoais ao provider.
- P-03: sem retry pago automático, nova cobrança em cache/replay, tarifa presumida, mutação de dados reais apenas para teste ou novo provider/arquitetura independente.
- F-01: proctoring, calibração, algoritmo de fraude, nova coleta, ranking, decisões sensíveis e redesign total do sistema.
- A-01: componentes Prisma, domínio puro de fatos compartilhado frontend/Edge, validação estruturada, classes locais, migração aditiva e integração da função existente. Screenshot é contraexemplo técnico e exemplo de conteúdo; modelo textual aprovado é referência estrutural (análise antes da lista, detalhes na largura inteira), números são ilustrativos.
- Q-01: nova tarifa da função Análise da atividade da avaliação; proposta6.193 Tokens/resultado com histórico separado aguardando resposta assíncrona. Bloqueia fechamento do contrato completo e ativação/publicação da tarifa dependente; apresentação e integração parametrizada que falha fechado sem tarifa são independentes.

## Mapa de impacto inicial

| Área / capacidade | Relação | Baseline / preservação / evidência mínima |
| --- | --- | --- |
| Resultado comum e histórico individual, apresentação de sinais | direct | componentes existentes/screenshot; fixtures em mesmos dados/viewport, tabela/expansão/mobile e limites |
| Domínio factual e fronteira IA autenticada | direct | provider OpenAI/modelo já usado; testes puros e Edge mocks negativos, nenhum LLM pago em testes |
| Tenant/ator/tentativa/resultados, RLS/grants e persistência | critical_transversal | schema PostgreSQL/contratos existentes; local descartável confirmado127.0.0.1:55479/import_evidence_v202, people0/sem avaliações; SQL negativo, QA rollback e hashes/grants remotos |
| Tokens Prisma/cotação/reserva/débito e histórico genérico IA | direct | tarifas existentes2347/14785/6193 e versões preservadas; novo consumidor dependeQ-01, SQL concorre/replay/falha/isolamento e fixture frontend |
| Portal, preparação/revisão/convites/correção | plausible_indirect | Edge/CSS/tipos compartilhados; regressão dirigida e corpos RPC críticos/telemetria preservados |
| Matching/Parser/Síntese/Conhecimento/email | no_impact_identified | contratos/provedores dessas áreas não alterados; regressão do consumidor genérico Tokens aplicável e plano evita rebuild de serviços por proximidade |
| Release/rotas/assets/rollback/navegação | critical_transversal | SHA/versão/containers antes/depois, CI e smoke proporcional |

## Critérios de aceite

CA-01(D-01/02/08): texto factual versus técnico, null/zero/false/não aplicável/inválido, datas/intervalos e detalhes completos; screenshot desktop/mobile, teclado e retorno. CA-02(D-03/04/05/06): ausência de IA implícita, cotação/consentimento da ação, tentativa inteira, padrões/evidências sustentados, ausência de PII/destinos/acusações e saída inválida rejeitada. CA-03(D-07): positivos/negativos de autorização/tenant/snapshot concorrente/idempotência/cache/reconciliação e cobrança/falha; registros originais intactos. CA-04(D-09): tipos/build/checks dirigidos/contextos/ledger, QA sensível, ambiente real identificado, main/origin/VPS/backend/SHA e smoke; evidências sem alegar qualidade real/fairness com fixtures.

## Execução parcial autorizada

EnquantoQ-01 permanece, implementar domínio factual/apresentação e integração parametrizada independente do valor, sem fixar ou ativar tarifa/cobrança presumida. A execução completa será congelada após resolverQ-01, incorporando todo o acordo. Não há pedido de reaprovacão das etapas já autorizadas.
