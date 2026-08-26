# Segurança da Knowledge

- Toda tabela organizacional carrega `organization_id`, FK, índice e RLS.
- Global Knowledge é publicada somente por Super Admin; Organization Knowledge, por Owner/Admin do escopo. Recruiter consulta e observa; Member não administra.
- DML composto usa RPCs com `search_path` vazio e autorização persistida. Tabelas críticas concedem somente leitura direta.
- `OPENAI_API_KEY`, `ONET_API_KEY` e service role ficam em secrets de Edge Function, nunca em Vite.
- Allowlist é persistida em `knowledge_sources`; HTTPS, hostname, publisher, classe e data de recuperação são validados antes da persistência.
- Currículo e páginas web são dados não confiáveis. Prompt injection não pode mudar ferramentas, policy, schema, domínio ou autoridade.
- Conteúdo integral de página não é armazenado. Persistem URL, título, publisher, classe, resumo próprio curto e hash opcional.
- Budget, cooldown e deduplicação reduzem abuso de custo. Configuração ausente ou desconhecida desativa chamada externa.
