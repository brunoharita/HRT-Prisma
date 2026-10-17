# Recuperar a aplicação anterior à UX 3.1.0

Estado protegido:3.0.7. Recibo/hashes em `../qa/evidence/ux-v310/baseline.json`. Tag remota `restore-v3.0.7-before-v3.1.0` aponta para be1b049. O ZIP local em `tmp/ux-v310/prisma-v3.0.7-source.zip` passou verificação integral CRC. Backup VPS `/opt/prisma-backups/pre-v3.1.0-20261017`, diretório700/arquivos600, contém código, configuração privada e imagem comprimida. Não adicionar configuração/inspect bruto ao Git nem publicar seu conteúdo.

O retorno de aplicação preserva PostgreSQL, documentos, auditoria, credenciais e atividades posteriores. Não é restauração de dados por snapshot e não desfaz decisões humanas. Este movimento prevê só web, mantendo compatibilidade com serviços3.0.7.

Na VPS, conferir hash da imagem arquivada, existência do tag Docker e ID d336b3925596261b220d81382faa3cf30a02c0b0b6971437be52d03424c3682a. Se necessário, `docker image load` do arquivo gzip restaura a imagem. Retaggear `prisma-web:restore-v3.0.7-before-v3.1.0` como `prisma-web:1.6.4` e executar o compose existente `up -d --no-deps prisma-web`, sem build. Preservar assets versionados do container atual para abas abertas. Conferir HTTPS/login/assets e versão3.0.7/SHA e saúde, sem recriar outros serviços. Não substituir `.env.production` atual automaticamente; backup serve para recuperar configuração somente se ela estiver perdida/corrompida.

Código: usar a tag para inspeção ou commit de reversão rastreável em main, preservando história; jamais reset/force-push do remoto. A publicação de reversão exige os mesmos checks afetados e smoke. Não executar este procedimento agora: é o ponto de retorno solicitado, não autorização para desfazer a versão futura sem nova decisão.
