# Acordo — Prova comum por processo v2.3.2

Versão 1.0.0, agreed/frozen. Bruno aprovou nesta conversa a proposta de prova comum por processo e preparação automática, e determinou implementar em main e publicar 2.3.2 em 10/10/2026. Supersede, para novas provas, D-01/02/03/06/07 e D-UX-01/02/03/P-UX-01 do acordo position-assessment-v230 v0.5.0 na unidade individual, seleção manual e quatro etapas. Os demais limites e contratos preservados continuam aplicáveis; provas/aplicações históricas não são convertidas ou apagadas.

## DEVE

- D-01: Uma prova compartilhada por organização/Posição/processo; cada candidato possui convite, token, tentativa, respostas, correção e observações separados. Mesmas questões, versões, ordem, duração e critérios. Não gerar prova individual ao entrar em uma Pessoa.
- D-02: Congelar prova no primeiro envio. Novos participantes do mesmo processo recebem a mesma versão; nenhuma edição/substituição após emissão. Novo processo pode ter nova prova ou reutilizar explicitamente prova compatível anterior. Reabrir um processo existente mantém sua prova; ciclos e histórico permanecem consultáveis.
- D-03: Selecionar candidatos no acompanhamento e Preparar avaliação. Configuração curta: quantidade20, nível Fácil2, origem banco, duração60 minutos como padrões editáveis; foco nos requisitos da Posição, personalização opcional. Distribuição existente Fácil=40/40/20 visível, múltiplos de10 sem arredondar.
- D-04: Montar avaliação seleciona automaticamente versões aprovadas compatíveis do banco, com cobertura e distribuição exatas, sem escolha manual ou salvar rascunho adicional. Modos IA/misto existentes permanecem escolhas explícitas; jamais chamar IA ao consultar/configurar ou silenciosamente por insuficiência.
- D-05: Insuficiência abre modal com disponíveis/faltantes, Gerar por IA e Cancelar. Cancelar mantém candidatos/configuração/rascunho. Confirmar gera somente déficit, até20 por pedido, limites existentes US$0,25/pedido e US$10/mês/empresa, histórico genérico existente. Exibir limite total autorizado quando precisar de vários pedidos. Falha/retry conserva estado confirmado e não repete cobrança automaticamente.
- D-06: Revisar e enviar em uma segunda superfície. Cinco opções distintas/uma correta, justificativa, requisito, origem e versão; banco aprovado conserva aprovação da mesma versão, conteúdo novo/editado exige aprovação humana do conjunto no envio. Editar/substituir antes de congelar, sem obrigação de aprovar cada questão. Validações e autoridade no backend.
- D-07: Destinatários cadastrados preenchidos, alteração só no convite; prazo de acesso explícito separado de duração; assunto/mensagem padrão editáveis sob personalização. Aprovar e enviar aos X candidatos é ação humana explícita. Lote valida integralmente, cria fila transacional/idempotente e preserva estados individuais/falhas/retomada sem duplicar convites. Nada é enviado ao montar/revisar/cancelar.
- D-08: Resultados e atividade individuais continuam consultáveis; correção determinística/portal/privacidade/limites observáveis/retomada preservados. Sem alteração de Score, Perfil, ocupação, etapas, decisão de seleção ou autonomia da IA.
- D-09: Preservar avaliações históricas sem migração inventada de aprovação/equivalência. Reutilizar tabelas/RPCs/gerador/transporte/ledger, adicionar somente os vínculos/limites necessários, RLS e grants RPC-only/tenant/roles; public portal v1 compatível. Release2.3.2 main/origin/VPS, migration nova seletiva e Edge afetada, rollback e smoke.

## PROIBIDO

- P-01: Provas novas individuais ou versões diferentes para candidatos do mesmo processo; mudar prova emitida ou interpretar prova idêntica como certificação de justiça.
- P-02: IA/envio/aprovação por consulta, navegação, geração, cancelamento ou insuficiência sem a ação humana explícita correspondente; alterações no cadastro por override de convite.
- P-03: Acesso cruzado de empresa/papel/processo, expor token/gabarito ao candidato ou segredos no cliente/log, apagar/converter histórico, promover banco privado a global, alterar Score/Perfil/seleção.
- P-04: Replay concorrente cria segunda tentativa/cobrança/entrega; lote inválido envia parcialmente; geração tardia sobrescreve revisão, contexto fechado ou emitido.

## FORA DE ESCOPO / AUTONOMIA / PENDÊNCIAS

F-01: Aviso final/expurgo por prazo continuam adiados; nenhum fornecedor/modelo/cobrança/plano novo, proctoring ou decisão automática. Sem dados/candidatos/mensagens fictícios em produção.

A-01: Ampliar contratos existentes com evolução aditiva e ADR; algoritmo determinístico de montagem, nomes/acabamento de controles no design system, limites técnicos de payload e mensagens de falha, testes sintéticos e operação seletiva delegados. Reuso de prova anterior somente com contexto de requisitos compatível; incompatibilidade explícita requer nova montagem.

Q: Nenhuma decisão material pendente.

## ACEITE

- CA-01 D-01/02: SQL tenant/role, igualdade de snapshot em candidatos distintos, congelamento/concorrência, novo/reaberto/histórico/reuso/late candidate; interface acessível no acompanhamento.
- CA-02 D-03/04/05: Banco completo e parcial, cobertura/dificuldade/sem duplicar, modal cancelar/sim, falha/replay/limites e zero IA/envio implícitos em QA controlado.
- CA-03 D-06/07/08: Edição invalida aprovação somente na cópia, revisão em conjunto e lote/recipient inválido sem efeitos; tokens distintos, autosave/submit/atividade por candidato e retry/outbox/ledger preservados. Browser desktop/mobile com componentes reais/fixtures, sem custo externo.
- CA-04 D-09/P: Tipos/build/contratos dirigidos/SQL negativo/concorrência/QA browser/CI; remote identity/schema/grants/Edge/versão/SHA/smoke/preservação/rollback registrados no AoT, com limites de jornada autenticada real explícitos.
