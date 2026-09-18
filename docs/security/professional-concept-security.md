# Segurança da Knowledge

## M7.1 — fronteira de Posições

Metadados `taxonomyOrigin` enviados pelo cliente são removidos antes de chamar o salvamento legado, inclusive quando este cria/atualiza um modelo de função (`saveAsRole`). Assim, a cópia JSON do modelo não constitui caminho lateral de proveniência forjada. A origem da versão da Posição é recomposta pelo servidor; a verificação SQL inclui origem falsa de outro tenant enviada pelo próprio editor.

As quatro RPCs M7.1 validam organização existente, usuário ativo e papel persistido antes da leitura/mutação; `anon` não executa. Preview/save/search exigem Owner/Admin/Recruiter ou Super Admin. Criar complemento também exige `require_knowledge_admin`; não existe parâmetro para promoção Global. Helpers são privados/revogados, com search path vazio. Novas colunas herdam RLS de versões/requisitos; o servidor recompõe proveniência e rejeita IDs de outro tenant, versão desconhecida e edição concorrente. A transação inclui definição, estrutura, origem, ledger e Inbox. Falha obrigatória não vira sucesso parcial. Os testes SQL locais exercitam credenciais sintéticas com `SET ROLE authenticated/anon`, não somente superusuário (AoT M7.1).

- Toda tabela organizacional carrega `organization_id`, FK, índice e RLS.
- Global Knowledge é publicada somente por Super Admin; Organization Knowledge, por Owner/Admin do escopo. Recruiter consulta e observa; Member não administra.
- DML composto usa RPCs com `search_path` vazio e autorização persistida. Tabelas críticas concedem somente leitura direta.
- `OPENAI_API_KEY`, `ONET_API_KEY` e service role ficam em secrets de Edge Function, nunca em Vite.
- Allowlist é persistida em `knowledge_sources`; HTTPS, hostname, publisher, classe e data de recuperação são validados antes da persistência.
- Currículo e páginas web são dados não confiáveis. Prompt injection não pode mudar ferramentas, policy, schema, domínio ou autoridade.
- Conteúdo integral de página não é armazenado. Persistem URL, título, publisher, classe, resumo próprio curto e hash opcional.
- Budget, cooldown e deduplicação reduzem abuso de custo. Configuração ausente ou desconhecida desativa chamada externa.
