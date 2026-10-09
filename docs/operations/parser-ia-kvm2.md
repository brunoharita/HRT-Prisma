# Operação do Parser IA na KVM2

## Validação antecipada de formatos — complemento v2.0.3

Runtime `d88fbff5bdb3e61f10129bdd74924de3b7227715` publicado em 04/10/2026 com a web. `review-field-format-1.0.0` impede o normalizador de transformar data ISO impossível em intervalo; texto/fatos/evidências continuam revisáveis, sem mudar prompt/modelo, parser raiz, política de século ou cache bruto. Aplicada somente a migration local `20261004040000_review_period_format_preflight.sql`, alias remoto `20261004132949`, antes dos consumidores; ela não bloqueia staging nem reescreve histórico. Dispatcher 1.0.2 declara Parser para o normalizador compartilhado e mantém destinos não afetados fora do rollout.

Parser healthy/available/ready, web/Parser running/0 e gateway imagem d061cea preservada. Smoke sintético executado no container confirma data impossível preservada e formato válido aceito, sem provider, segredo, cache ou dados pessoais. Rollbacks anteriores de web/Parser estão em `rollback-before-d88fbff5bdb3`. HTTPS/assets 200 após 404 transitório durante recriação. Acordo/AoT `../qa/agreement-review-format-preflight.md` e `../qa/aot-review-format-preflight.md`; navegação real autenticada/publicação de Perfil real não foi testada nem simulada como decisão humana.

## Complemento Unicode — v2.0.2

Aplicar somente `20261003210000_import_text_unicode_contract.sql` antes de reconstruir Parser/web com o mesmo SHA validado. `import-evidence-1.1.0`/`evidence-adapter-1.0.1` aceitam diagnóstico antigo explicitamente, preservando auth/tenant e retomada somente após correção de versão. `unicode-text-1.0.0` ocorre na representação derivada antes da gravação; original, linhas/boxes e cache privados não são apagados. Conferir replay dos dois PDFs sem IA, readiness, versão/assets/rollback e containers gateway/Traefik inalterados. Operador atualiza a página e retoma a tentativa antiga na Central da Pessoa; nunca publicar Perfil durante smoke. Autorização permanente de envio necessário à VPS: AGENTS 1.3.2, sem liberação de dados em logs ou outros destinos. AoT `../qa/aot-import-unicode-v202.md` registra limites de validação autenticada.

## Correção das evidências — v2.0.2

O delta `import-evidence-1.0.0` exige somente a migration `20261003193000_import_evidence_persistence_contract.sql`, Parser e web; gateway/Traefik não recebem rebuild. Aplicar a migration específica antes dos consumidores, publicar `release-parser-ia.sh` e `release-web.sh` com o mesmo SHA aprovado e preservar os rollbacks e o volume privado. Não executar `db push` geral. O adaptador `evidence-adapter-1.0.0` mantém prompt/modelo/chave do cache; a migration é aditiva e permite rollback dos consumidores sem apagar títulos/evidências/histórico.

Para diagnóstico, consultar somente `person_ingestion_events.metadata.diagnostic` da organização/documento afetados: contrato, etapa, razão fixa, campo sem IDs, página/índice, código e versões. A RPC exige revisor da organização e valida o vínculo intake/Pessoa/documento; texto/erro bruto não é aceito. Não copiar caches privados para QA nem imprimir currículos. Validar SQL com `node scripts/verify-import-evidence.mjs 55479` em banco local descartável `import_evidence_v202`, já preparado pelas migrations; o script usa somente dados sintéticos e rollback.

Uma falha `import_evidence_contract_invalid` na versão corrente orienta aguardar correção. Depois de atualizar o adaptador, tentativas elegíveis podem ser retomadas por ação humana na Central, com hash/origem revalidados e cache existente. A falha legada `resume_intake_processing_failed` do incidente permanece no histórico. Não publicar Perfil para comprovar recuperação. Evidência e estado de rollout: [AoT v2.0.2](../qa/aot-import-evidence-v202.md).

Versão de implantação `parser-ia-kvm2-1.0.0`; acordo `../qa/agreement-parser-ia-kvm2.md` 1.1.0 e ADR-075. A importação automática usa PDF.js → Parser IA → revisão. Paddle/Tesseract não são reativados. A versão dos dados, prompt, modelo e transporte continuam iguais; versão pública v2.0.1 autorizada pelo PO.

Publicado em 2026-10-03 no SHA funcional `4ccfbf1e74534f529db7bea04978d1ee2f9c16c0`: Parser running/healthy, parse real sintético e replay após restart PASS, tela autenticada de importação disponível e menu v2.0.1. Web publicada separadamente para a versão; gateway/Traefik/experimentos preservados. Nenhuma importação humana completa foi executada como teste. Detalhes, imagens/rollback e limites no AoT.

## Caminho e proteção

`Browser → HTTPS/Traefik → Nginx → socket Unix do gateway → 127.0.0.1:18787 na KVM2 → OpenAI`.

O container `prisma-parser-ia` é singleton, Node 22, usuário `node` UID 1000, rede host Linux, escuta somente loopback. O gateway mantém auth/tenant/papel/origem/contrato e usa o Host lógico 8787 previamente validado pelo Parser. O worker não tem rota Traefik ou portas públicas. Cache novo fica em `deploy_parser-ia-cache`, com pasta 700 e arquivos 600; não é importado do PC. Lock em tmpfs privado é volátil, cache é persistente. Uma única inferência por vez, sem retry automático.

O secret é um arquivo contendo somente `OPENAI_API_KEY=...`, em `/etc/prisma/parser-ia.env`; diretório host root 700, arquivo UID 1000/mode 400. Compose monta esse arquivo somente em `/run/secrets/parser_ia_env`. Nunca copiar `.env.local` inteiro, chave para build/env do container, PDF ou cache do PC. Nunca exibir valor por `cat`, `docker inspect` completo, logs ou shell tracing. Compose faz bind mount; ownership/permissões reais da origem precisam permitir leitura pelo UID 1000. Nenhum service role é necessário.

## Publicar e verificar

Após promover o SHA validado e avançar `/opt/prisma` por fast-forward, executar na KVM2:

```bash
bash deploy/release-parser-ia.sh SHA_VALIDADO_COMPLETO
docker inspect --format '{{.State.Status}} {{.State.Health.Status}} {{.RestartCount}}' prisma-parser-ia
docker exec prisma-parser-ia node scripts/check-parser-ia-hosted.mjs
```

O script constrói/inicia somente `parser-ia`, preserva imagem anterior quando existente e não recria web/gateway/Traefik. Healthcheck permite `available/ready` ou `busy/worker_busy`; não chama a OpenAI, não cria cache nem reserva capacidade. Um resultado disponível não prova saldo/validade remota da chave, qualidade de resposta futura ou sucesso de um currículo.

Docker reinicia o container após falha e na inicialização do daemon (`unless-stopped`); depois de parada/recriação, tmpfs novo evita lock residual. Nenhum PDF interrompido é reexecutado. Fazer restart somente sem operação ativa. Cache inválido continua falhando fechado; não apagar cache para liberar uma tentativa. Conferir HTTPS e os mesmos IDs/imagens dos serviços preservados.

## Rollback e limites

Primeira implantação: parar somente `parser-ia` se houver risco; gateway informa indisponibilidade. Preservar volume e secret. Revisões posteriores mantêm tag `prisma-parser-ia:rollback-before-SHA12`. Não remover volumes/modelos alheios ou voltar silenciosamente ao PC. Ponte SSH é histórico do piloto e não atende ao objetivo online.

Limites iniciais: 768 MiB RAM, 1 CPU, 64 PIDs; concorrência unitária e todos os limites do Parser existentes. Sem GPU: a inferência do modelo ocorre na OpenAI. A persistência/revisão permanecem no Supabase autorizado. Smoke sintético pode validar o processamento sem banco; uma importação humana até revisão continua evidência distinta. Histórico de implantação e resultados ficam em `../qa/aot-parser-ia-kvm2.md`.

## Histórico de IA e convites —2.3.0

Runtime depende das migrations generic_ai_request_history/ai_history_worker_boundary e credencial AI_HISTORY_WORKER_SECRET protegida em modo400 UID1000, com SUPABASE_URL/chave pública. Token dedicado restrito às funções parser_ia/profile_synthesis e escopo empresa, sem chave de serviço. Provider só depois de ledger persistido; cache explícito registra custo externo zero/tokens nulos; falha/consumo desconhecido não desaparecem. Prompt/cache/fontes/autoridade existentes preservados.

Synthesis recebe ASSESSMENT_DISPATCHER_SECRET distinto para drenar somente convites humanos já persistidos na fila, no máximo10por rodada com lease/backoff; falha de e-mail isolada não altera geração de síntese. Não cria candidatos/convites/IA implicitamente. Parser não recebe capacidade de envio. Instalação protegida usa bootstrap descartável do banco para registrar ciphertext Resend e hash dispatcher, sem segredo em SQL/logs/argumentos. Rollback mantém schema/ciphertext/filas/resultados; worker antigo perde só nova instrumentação/envio e requer retomada do worker validado. Imagens rollback-before-SHA12 e backups protegidos antes-v230 preservados; não apagar cache privado ou histórico. Evidências/AoT position-assessment-v230.
