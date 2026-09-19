# ADR-068 — Dispatcher de release limitado pelo impacto

Status: accepted

Date: 2026-09-18

## Context

O Prisma possui CI completo, um único Supabase remoto de produção e frontend em VPS. O processo manual vinha repetindo leitura, validação, Git, Supabase e deploy mesmo quando apenas uma superfície mudava. O ledger remoto também preserva timestamps históricos diferentes dos arquivos locais, o que torna um `db push` geral inseguro.

## Decision

Adotar um dispatcher local e versionado que deriva um plano do diff, classifica somente superfícies diretamente afetadas e seleciona validação e publicação correspondentes. Os comandos são `plan`, `validate`, `publish` e `verify`. Escritas externas exigem SHA completo e execução explícita; caminhos desconhecidos e alterações de migrations existentes falham fechados.

O ledger terá um mapa factual por nome, versão local, versão remota e fingerprint canônica. Enquanto nem toda divergência histórica tiver equivalência demonstrada, `cliDbPushAllowed=false`: migrations novas serão aplicadas isoladamente pelo mecanismo autorizado, Edge Functions serão publicadas nominalmente e web será recriada somente quando afetada.

## Consequences

- Releases documentais não consultam Supabase nem VPS.
- Releases web não republicam banco ou funções.
- Banco e funções recebem somente os artefatos novos presentes no plano.
- O CI completo continua como gate remoto; o agente executa localmente apenas provas proporcionais e um gate transversal quando o risco justificar e houver autorização.
- O mapa não altera nem “corrige” o histórico remoto; divergências permanecem visíveis até uma auditoria de equivalência própria.

## Alternatives considered

- Automatizar `db push` geral: rejeitado enquanto o ledger não é equivalente.
- Renomear migrations locais para timestamps remotos: rejeitado por quebrar referências e ocultar diferenças de conteúdo.
- CI/CD integral com secrets na GitHub Actions: adiado; o dispatcher reutiliza autenticação local existente e evita ampliar a superfície de secrets antes de evidência de benefício.
