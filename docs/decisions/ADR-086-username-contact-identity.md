# ADR-086: Username único e contato compartilhável

- Status: accepted por autorização de Bruno no chat17/10/2026; rollout no AoT username-identity-v306.
- Contrato: operator-identity2.0.0 / acordo username-identity-v3061.0.1.

Username já era único; o vínculo entre contato e credencial Auth impedia contas distintas com o mesmo contato. Manter Supabase Auth e separar contato de endereço técnico exclusivo por identidade permite preservar hashing, sessões, tokens, IDs e RLS. Login resolve Auth por ID no servidor e verifica o usuário da sessão. E-mail nunca agrega autoridade ou memberships.

Reutilizar generateLink/recovery oficial e envio HTTPS pelo Resend existente, com configuração criptografada já instalada, evita depender de alterar o Auth hospedado ou introduzir armazenamento próprio de senhas. Getter de configuração de envio é dependência operacional explícita; filas/dispatcher de avaliação não são usados nem alterados. O backend registra solicitação/limite/recibo sem token e não declara aceitação pelo provedor como entrega na caixa.

Remover somente o índice de e-mail seria insuficiente, pois login, convite e reset ainda usariam a mesma identidade. Autenticação própria ou troca de fornecedor ampliariam risco/custo sem necessidade. Endereços com '+tag' dependeriam do comportamento de cada provedor de destino e não são usados.

Compatibilidade: contas antigas continuam com Auth UUID/senha e endereço Auth atual. Novas usam UUID aleatório em domínio técnico .invalid, sem envio a esse endereço. Ao editar contato legado, converter Auth via API preservando ID/senha e compensar erro de persistência; não executar backfill ou reset em massa. Não reutilizar username como ID técnico, pois pode mudar. Recuperação pública somente por username; quem controla uma caixa compartilhada controla a recuperação de suas contas, consequência aceita pelo PO.

Fontes oficiais verificadas: [Auth password](https://supabase.com/docs/guides/auth/passwords), [generateLink](https://supabase.com/docs/reference/javascript/auth-admin-generatelink). Reaproveitamento não prova operação/entrega; SQL, handlers/browser sintéticos e publicação têm evidências separadas.
