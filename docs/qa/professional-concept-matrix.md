# Matriz QA da Fundação de Conhecimento

| Área | Evidência mínima |
| --- | --- |
| Modelo | CRUD/versionamento, alias, ambiguidade, relação, mapping e depreciação |
| Overlay | tenant A usa especialização, tenant B usa Global e Global permanece intacta |
| Unknown | evidência intacta, observação e Inbox, intake continua sem invenção |
| Normalização | canonical, alias, ambíguo, precedência e versões persistidas |
| Inferência | normalizado não vira inferido nem fato pessoal |
| Agente | fonte oficial, domínio bloqueado, secundárias, schema inválido e injection |
| PII | payload serializado sem nome, contato, currículo, IDs ou path |
| Aprovação | proposta não publica; approve/edit/reject registram ator e histórico |
| Fonte | versão A/B, checksum, diff, publicação e preservação de A |
| Reinterpretação | `off` não automatiza; manual gera draft M2-C; evidência e perfil aprovado permanecem |
| RLS | Super/Owner/Admin/Recruiter/Member/no membership/cross-tenant |
| Concorrência | research, approval, import, change set e reinterpretação idempotentes |

O gate usa mocks/fixtures. Smoke vivo depende de credencial e orçamento autorizados. Snapshots oficiais devem usar pacotes públicos e nunca currículo real.
