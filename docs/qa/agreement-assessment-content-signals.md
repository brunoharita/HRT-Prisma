# Acordo e execução — Sinais de conteúdo da avaliação2.5.3

Contrato1.0.0, aprovado pelo pedido de Bruno nesta conversa. Baseline8ddfef923a41cf2e3f51f1ffa180fbcaca92dd61. Risco D, implementação em branch codex/assessment-content-signals. Pedido autoriza adicionar os métodos observáveis propostos aos sinais existentes. Supersede somente a exclusão de nova coleta do movimento assessment-activity-v252 para os metadados definidos abaixo; não muda dados históricos nem autoriza acesso ao clipboard/imagens.

- D-01: registrar seleção estável de texto da questão, comando de cópia com seleção no enunciado/alternativas e abertura de menu de contexto nessas regiões. Somente durante tentativa ativa e questão efetivamente visível; ignorar inputs, instruções, revisão geral, recibo, outras páginas e eventos sintéticos. Seleção não significa cópia; menu aberto não significa copiar. Identificar região e quantidade de caracteres, sem armazenar texto/posição/clipboard. Correlação com Ctrl/Cmd+C ou menu é somente indicativa, não método certificado.
- D-02: manter atalhos existentes, adicionar soltura de PrintScreen quando recebida e evitar duplicidade por pressionar/soltar. Sem registrar teclado geral. Não assegurar captura ou detectar foto/programa externo.
- D-03: persistir no pipeline público já autorizado por token/tenant/questão/versão, com validação estrita de métodos/enum/contagens, replay idempotente e rejeição de payload livre, texto/imagem/chaves manipuladas. Preservar respostas/correção/Score/etapas/grants e sinais anteriores.
- D-04: apresentar os três sinais separados com rótulos/limites em português, detalhes completos sob demanda, desktop/mobile e histórico individual/processual. Nenhum registro não prova ausência; contagem ausente em relatório histórico permanece indisponível.
- D-05: integrar padrões factuais à análise explícita de IA, mesma tarifa6193/cache/ledger/provider minimizado, sem envio de texto selecionado. Método1.1.0 com envelope1.0.0 aditivo; relatórios1.0.0 continuam legíveis e imutáveis, nova análise exige cotação/confirmação, nunca cobrança ou atualização automática. Limitações de cópia/contexto obrigatórias, sem acusação, destino, intenção ou decisão humana.
- D-06: atualizar instruções visíveis ao candidato e owner docs/contexto/AoT; publicar2.5.3 em main/produção com regressão afetada, migração/Edge/web somente, rollback/smoke/sincronização.
- P-01: ler/modificar clipboard, salvar texto selecionado/imagens, bloquear cópia/menu, capturar teclado geral, vigiar outros programas/aparelhos ou declarar fraude/captura confirmada.
- P-02: inferir cópia apenas de seleção/menu/atalho, retroagir observação em provas antigas, alterar histórico/decisões/tarifas ou iniciar IA automaticamente.
- F-01: gravação de tela, extensão/agente do SO, proctoring, controle de aplicativos, ranking/penalidade e redesign geral.
- A-01: eventos nativos copy/selectionchange/contextmenu/keyboard, componentes e pipeline existentes; debounce/dedupe, arquivos/reuso, detalhes de teste/deploy. Sem nova biblioteca/provider/categoria comercial. Versão2.5.3 registra esta entrega material.
- Q: nenhum material pendente. CA-01(D01/02): browser real com teclado/copiar, menu, seleção, escopo/navegação e negativos; metadados sem texto e sem bloquear ação. CA-02(D03): SQL local rollback com novos eventos, negativos/manipulação/idempotência/preservação. CA-03(D04/05): fatos/limites/detalhes/evidências, legado e seleção IA válida/invalidada, fixtures nos viewports atuais; provider mock/minimizado. CA-04(D06): instruções, tipos/build/CI/contexto, ambiente remoto identificado, fontes/grants/dados preservados, publicação/smoke/rollback/sync.

## Mapa de impacto prévio

| Área | Relação | Baseline e preservação mínima |
| --- | --- | --- |
| Portal/coleta/privacidade | direct | 2.5.2, coletores existentes, 82checks portal; navegador com cópia/contexto/seleção, escopo ativo e navegação/respostas mantidos |
| Eventos/RPC/token/tenant | critical_transversal | PG17 local127.0.0.1:55479/import_evidence_v202 vazio; SQL novos/legados, negativos e hashes/grants remotos, nenhuma fixture em produção |
| Exibição/IA/histórico | direct | v25268checks/fatos/Edge/SQL; novos padrões, legado1.0.0, não exposição do texto e tarifa6193/idempotência mantidas |
| Preparação/convites/correção | plausible_indirect | Edge/portal compartilhados; regressão dirigida sem envio real ou IA paga |
| Parser/Matching/Knowledge/mail/Síntese | no_impact_identified | nenhuma lógica alterada; compartilhar domínio factual não os torna consumidores; plano não publica serviços adjacentes |
| Release/rotas/assets | critical_transversal | SHA/image/rollback existentes; CI e smoke versões/assets com publicação seletiva |

Execução congelada: implementar integralmente D-01 a D-06, P-01/02, F-01, A-01 e CA01-04 acima; fechar AoT com prova e limites, sem reaprovacão administrativa. Reuso nativo e capacidades Prisma atendem à necessidade; não há solução externa nova a selecionar.
