# Contrato de Acordos — RAG ocupacional 3.2.0

Versão1.0.0. Estado: agreed. Autoridade: Bruno aprovou a proposta, o envio global automático após aprovação local, as três prévias visuais e, em24/10/2026, determinou validar modelos gratuitos, implementar e publicar3.2.0 sem tabelas novas, preservando histórico e decisões humanas. Baseline `6b434a6c12853a3a824f68bc9cd5783ff66e6bdf` / produto3.1.4. Fonte visual: `output/occupational-rag-preview-20261024/01-reconhecimento.png`, `02-empresa.png`, `03-global.png`; referências serão preservadas na evidência antes da validação visual.

## DEVE

- D-01: reutilizar Knowledge, conceitos, termos, relações, mappings, Inbox, pesquisas, propostas, aprovações, change sets e fluxos proprietários. Nenhuma tabela ou catálogo paralelo. Ampliações aditivas nas estruturas originais são permitidas; derivados não são outra verdade (GOV-02).
- D-02: recuperar cargos por termo e significado das atividades, com precedência empresa→global, autorização backend, conceitos aprovados e fontes/versões explicitadas. Similaridade recupera candidatos e não é equivalência, evidência pessoal nem probabilidade de contratação. Correspondência exata aprovada/inequívoca preserva resolução existente.
- D-03: disparar reconhecimento automaticamente após salvar Posição e publicar Perfil, sem bloquear o trabalho manual. Distinguir alias, novo conceito, ambiguidade e falha técnica. Somente descrição suficiente permite proposta de definição sustentada; título isolado mantém hipóteses/pendências sem inventar atividades da pessoa. Reutilizar a fila existente com deduplicação, limites, retomada e preservação de estados decididos.
- D-04: propostas automáticas ficam pendentes para responsável autorizado da empresa revisar/editar/associar/aprovar; só aprovação torna conceito/termo reutilizável. Preservar original da IA, edição, ator, fonte, método e versão. Não elevar declaração/inferência a competência demonstrada.
- D-05: aprovação local gera automaticamente contribuição global sanitizada pelo fluxo existente, vinculada à origem local. Somente Super Admin decide Aprovar na Base Global ou Manter somente local, com justificativa opcional; nenhuma decisão global altera/apaga a origem local. Política vigente de fontes permanece.
- D-06: somente ferramentas/modelos gratuitos e execução privada na infraestrutura existente. Validar qualidade, saída estruturada, limites de RAM/CPU e latência antes de ativar. Não usar fallback pago. Indisponibilidade fica explícita e preserva operação manual. Nenhum dado privado vai à base global ou destino novo.
- D-07: preservar títulos literais, histórico de Perfis/Score/avaliações, pesos, decisões humanas, contratos e permissões não alterados explicitamente. Sem recálculo, reimportação ou reinterpretação em massa. Processamentos >1.000 itens são retomáveis, idempotentes e limitados por tempo; estado anterior permanece até completar.
- D-08: publicar versão pública3.2.0, com registros/contratos aditivos, rollback de ativação e evidência local→produção→smoke→sincronização; sem declarar integração a partir de protótipos.
- D-UX-01: manter shell/sidebar e tabs da Knowledge; reconhecimento com contexto à esquerda e resultado/próximo passo à direita, correspondências relacionadas visíveis; revisão com definição/aliases/relações/evidência à esquerda e origem/andamento à direita; ação de aprovação local ao fim, com informação do envio automático. Global mantém definição/referências à esquerda e origem local à direita, justificativa opcional e as duas decisões vigentes ao fim. Mobile empilha as regiões e preserva ordem/ações; sem overflow. Tokens/componentes atuais prevalecem sobre detalhes ilustrativos das prévias.

## PROIBIDO

- P-01: novas tabelas/entidades concorrentes; publicação pela IA; uso de proposta pendente como Knowledge aprovada; criação de alias global a partir de interpretação contextual; sobreposição de decisões humanas.
- P-02: inventar referências/códigos oficiais/atividades pessoais, considerar ausência/falha como evidência negativa, consolidar funções por semelhança verbal, expor tenant/PII/secrets ou usar SQL gerado pelo modelo.
- P-03: modelo/API pago, mudança silenciosa de pesos, reescrita histórica, decisões automáticas de seleção, varredura de Pessoas reais para teste ou alteração de serviços adjacentes sem dependência demonstrada.
- P-UX-01: substituir a topologia aprovada por composição materialmente diferente, ocultar origem/incerteza ou introduzir nova decisão Rejeitar no fluxo global.

## FORA DE ESCOPO

- F-01: LinkedIn, scraping, treinamento/fine tuning, nova base vetorial, consolidação de legado, recálculo em massa, alteração comercial/Tokens ou de fórmulas de Score.

## AUTONOMIA / PENDÊNCIAS

- A-01: comparar modelos gratuitos, escolher o menor que passar nos gates, pin de versão/digest, limites e estratégias de recuperação/reranking; reutilizar/adaptar providers e fluxos existentes, com ADR para a decisão durável. Nenhum desempenho ou qualidade é presumido.
- A-02: SQL/RPCs/colunas aditivas nas tabelas originais, orquestração/fila, componentes/tokens, seletores e detalhes acessíveis delegados; relações distintas de dados permanecem explícitas.
- Q: nenhuma pergunta de comportamento pendente; qualidade/infra/modelos são gates a comprovar antes da ativação, não permissões para reduzir D-*.

## CRITÉRIOS DE ACEITE

- CA-D01: diff não cria tabelas; identidades originais e fluxos de curadoria reutilizados. Provar schema e ausência de escrita em cadastro paralelo.
- CA-D02/D03: fixtures positivas/negativas para Vendedor/Sales Representative, SDR comercial/sem contexto/rádio, Logística/Estoque com e sem atividades e Arquiteto de Revenue com e sem descrição; amostra de outras famílias. Candidatos relevantes recuperados nos casos positivos; zero equivalência automática indevida nos casos críticos. Falha, concorrência, repetição, versão/escopo e decisão humana preservados.
- CA-D04/D05: provar pending→aprovação local→contribuição global, edição/original, alias/conceito, rejeição de ator/tenant incorreto, Super Admin exclusivo, decisão global sem alterar origem, justificativa opcional e replay sem duplicação.
- CA-D06: execução real com dados sintéticos e modelos gratuitos; medição de latência/memória/CPU; JSON e citações pós-validados; falha sem chamada paga e sem publicação. Artefatos públicos não contêm PII.
- CA-D07: regressão dirigida de publicação de Perfil, salvamento de Posição, Knowledge e consumidores afetados; histórico/decisões/pesos preservados. Nenhuma criação de dados de teste em produção.
- CA-D08: CI obrigatória, SHA coerente, plano de superfícies, migração seletiva quando necessária, runtime/schema/web compatíveis, versão3.2.0 e smoke sem mutações de teste em produção.
- CA-UX: comparar render com os três alvos, mesmos dados/estado/viewport1600px e mobile430px; registrar desvios necessários de tokens/componentes atuais, sem aceitar divergência estrutural não aprovada.

## MAPA DE IMPACTO INICIAL

| Área | Relação | Baseline / preservação | Evidência mínima |
| --- | --- | --- | --- |
| Knowledge/curadoria/empresa→global | direct | Baseline acima, regras ADR-013/060/065/069/088 | SQL transacional, negativos/RLS, replay e UI |
| Posição e publicação de Perfil | direct | Escritores vigentes e versões/histórico | Fixtures de disparo e não bloqueio, contratos de escrita |
| IA/modelo privado e operação VPS | direct | VPS2CPU/8GB, ~7GB disponíveis em leitura anterior; serviços atuais sem inferência local | PoC sintética limitada; baseline e após; isolamento de rede e recursos |
| Score/matching/evidências | plausible_indirect | Fórmulas, pesos e decisões existentes | Associação de conceito não vira evidência/decisão; regressão afetada |
| Auth/tenant e histórico | critical_transversal | Autoridade backend/RLS/atores vivos | Negativos de anon/outro tenant/inativo; histórico preservado |
| Web/Knowledge | direct | Prévia aprovada + componentes/tokens atuais | Navegador desktop/mobile e comparação visual |
| Serviços adjacentes/Horus | plausible_indirect | Mesma VPS compartilhada | Recursos limitados e snapshots de imagem/início antes/depois |
| Fontes/importadores/comercial | no_impact_identified inicialmente | Fontes publicadas existentes, tarifas/ledger intactos | Reavaliar mapa se recuperação exigir ampliar ingestão; sem alteração silenciosa |

AoT da mesma entrega registra evidências e o mapa final. Nenhuma suíte integral local por padrão; CI existente preservada.
