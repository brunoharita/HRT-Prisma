# Worker da síntese do Perfil

Container `prisma-profile-synthesis`, Node22, sem porta pública/PC/túnel/broker/GPU. Compose dedicado `deploy/profile-synthesis.compose.yml`; release seletivo `bash deploy/release-profile-synthesis.sh <SHA validado>`. Web/migração independentes; Parser e gateway preservados. Health é conexão/fila, não prova conceitual de currículos reais.

Segredo32bytes gerado na VPS, `/etc/prisma/profile-synthesis.env`, modo400 UID1000, mount read-only; banco guarda apenas SHA256 em `private.profile_synthesis_worker_config`. Contém URL/chave pública Supabase e segredo de worker. OpenAI reaproveita `/etc/prisma/parser-ia.env` read-only. Não há service_role no worker. Nunca imprimir segredo ou corpo de erro do provedor. Rotação substitui hash/arquivo administrativo e reinicia somente o worker.

RPCs de processamento exigem token, job e lease reais; não oferecem SQL/acesso arbitrário. RPCs de usuário reutilizam leitor autorizado do Perfil por tenant; tabelas RLS com DML/SELECT direto revogados a anon/authenticated. Segredo em HTTPS POST, nunca URL/querystring. FS read-only, tmpfs8MB,192MB RAM/0.5CPU, capabilities removidas/no-new-privileges, logrotation. Logs só estado/duração/tokens/código fixo.

Monitorar idade/estado da fila, tentativas/modelo/tokens, duração/falhas e health/restarts sem exportar textos/fontes/prompts. Três tentativas por base; resposta inválida/configuração não faz retry automático. Reconciliação de até dez novas publicações por rodada desde instalação, sem lote histórico. Falha de enqueue opcional não bloqueia auditoria/publicação. Eventos de evidências relevantes invalidam apenas Perfis já analisados.

Rollback: parar somente o worker e preservar a web compatível com1.1.0, tabelas, credenciais e resultados; filas podem aguardar retomada. As imagens `rollback-before-<SHA12>` permanecem disponíveis, mas o worker antigo não deve consumir a fila1.1.0 e o leitor antigo pode recusar resultados parciais. Não restaurar componentes incompatíveis sem adaptação validada. A tela com dados publicados continua acessível enquanto a geração está pausada. QA somente em PostgreSQL local descartável: `supabase/qa/profile_synthesis_verification.sql`, rollback. Não executar fixture em produção nem replay do ledger. Bootstrap do hash administrativo não contém dado de Pessoa. Evidência em `docs/qa/aot-profile-synthesis-v205.md`.


## Diagnóstico e recuperação

Falhas novas incluem `diagnostic` em jobs e attempts: versão, etapa, motivo fixo e localização/contagens técnicas limitadas. Logs incluem jobId, duração/tokens disponíveis; corpo do provedor e mensagens livres nunca são registrados. Completar lease rejeitado preserva registro de tentativa e motivo; indisponibilidade do banco fica no log com etapa/preservação de métricas, e lease expirado permanece limitado às três tentativas. Detalhes de atendimento na tela permitem relacionar job/tentativa aos registros; render/read/source locais usam identificações fixas e não atribuem ao usuário correção interna.

A recuperação explícita de síntese failed ocorre pelo RPC autenticado `retry_profile_synthesis`, nunca por reset de attempts. Abrir/atualizar o Perfil não recupera automaticamente uma resposta inválida. Migração incremental mantém argumentos do worker anterior; rollback deve preservar tabelas/diagnósticos. Não executar migração original novamente. Recuperação administrativa do incidente limita-se ao job já existente, base aprovada e primeiro erro, com contador/histórico preservados; nenhuma publicação humana é feita.

Reuso: os erros de revisão/publicação em `reviewOperationErrors.ts` são mutacionais e incluem decisões humanas. A síntese não reutiliza seus fluxos de retorno à revisão; adota o mesmo padrão de códigos fechados/explicação segura com contrato derivado independente e boundary React local.

## Incidente autorizado na v2.0.6

Em 04/10/2026 Bruno autorizou uma única chamada adicional do job existente. Guardas de estado/attempt1/código/diagnóstico ausente, Perfil aprovado/vigente, tenant/pessoa e hash igual foram verificadas. Tentativa2 failed por contract/REFERENCES_INVALID na seção competencies/item0,24890ms,5211/2990tokens. Tentativa1 sem diagnóstico permanece histórica; nenhuma terceira chamada nem alteração canônica. A resposta inválida não é persistida como síntese válida. Evidência segura no AoT v2.0.6. A release de identificação requer somente web; worker/Parser/gateway e schema permanecem.

## Preservação por seção v2.0.6

Resultado/prompt1.1.0 e migração incremental das funções/defaults, sem tabelas públicas/permissões novas. Resultados parciais guardam somente trechos válidos e issues fixos por seção; não logar corpo rejeitado. Compatibilidade1.0.0 na leitura; legacyfailed3 fica intacto, somente novas solicitações/publicações usam1.1.0. Pausar somente worker durante ativação da migração e promover worker/web do mesmo SHA validado. Rollback preserva migração e históricos; leitor antigo pode recusar novo resultado, por isso rollback compatível mantém a tela com informações publicadas. Sem reset/backfill.

Migração complementar `profile_synthesis_retry_upgrade` habilita ação explícita para respostas inválidas antigas: chave nova do contrato corrigido, base/tenant/Perfil vigente conferidos, lock/cooldown/idempotência, job e tentativas legadas intactos. Não chamar o RPC real como smoke: ele solicita geração e pode causar custo. Verificar elegibilidade/histórico por metadados administrativos, sem textos pessoais; exercitar mutação/replay apenas em QA sintética com rollback. Esta ativação exige apenas banco e documentação; web/worker já compatíveis permanecem nas imagens validadas.

## Histórico de IA e convites —2.3.0

Implantado em09/10/2026 no SHA funcional3e271e32d6e9c7b7bd3b77571507ccd71d037956, após migrations/configuração protegida. Parser/Synthesis healthy0restarts, cache privado e mounts preservados; imagem anterior em rollback-before-3e271e32d6e9. Dispatcher validado com fila vazia/processed0; sem convite fictício ou IA implícita no smoke. Recibos e limites no AoT position-assessment-v230.

Runtime depende das migrations generic_ai_request_history/ai_history_worker_boundary e credencial AI_HISTORY_WORKER_SECRET protegida em modo400 UID1000, com SUPABASE_URL/chave pública. Token dedicado restrito às funções parser_ia/profile_synthesis e escopo empresa, sem chave de serviço. Provider só depois de ledger persistido; cache explícito registra custo externo zero/tokens nulos; falha/consumo desconhecido não desaparecem. Prompt/cache/fontes/autoridade existentes preservados.

Synthesis recebe ASSESSMENT_DISPATCHER_SECRET distinto para drenar somente convites humanos já persistidos na fila, no máximo10por rodada com lease/backoff; falha de e-mail isolada não altera geração de síntese. Não cria candidatos/convites/IA implicitamente. Parser não recebe capacidade de envio. Instalação protegida usa bootstrap descartável do banco para registrar ciphertext Resend e hash dispatcher, sem segredo em SQL/logs/argumentos. Rollback mantém schema/ciphertext/filas/resultados; worker antigo perde só nova instrumentação/envio e requer retomada do worker validado. Imagens rollback-before-SHA12 e backups protegidos antes-v230 preservados; não apagar cache privado ou histórico. Evidências/AoT position-assessment-v230.
