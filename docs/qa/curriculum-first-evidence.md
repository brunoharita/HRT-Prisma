# Evidência QA do fluxo currículo-first

## Escopo

- Data: 2026-08-26.
- Branch local: `codex/curriculum-first-intake`.
- Backend remoto: Prisma-QA (`ioldpnqqvobprjiontre`), único projeto Supabase atual.
- Migrations: `curriculum_first_resume_intake` e `curriculum_first_idempotent_completion` aplicadas.
- Dados: exclusivamente sintéticos; a validação transacional foi revertida ao final.

## Evidência conectada

| Controle | Resultado |
| --- | --- |
| início repetido com mesma chave/fingerprint | mesmo intake, `reused = true` |
| identidade mínima válida sem candidato | `ready_to_resolve` |
| resolução repetida | mesma Pessoa e documento, sem duplicação |
| conclusão repetida | mesmo estado e somente um evento de conclusão |
| pipeline M2-B/M2-C existente | extração estruturada e documento `ready_for_review` |
| segunda identidade com mesmo e-mail/telefone | `needs_duplicate_resolution` com candidato tenant-scoped |
| nome normalizado igual sem contato coincidente | sinal possível, sem merge automático |
| nome sem contato e fonte sem nome | `needs_human_identity`, sem criação de Pessoa |
| complemento humano de contato | identidade revalidada antes da resolução |
| duas decisões diferentes para o mesmo intake | primeira preservada; segunda recebe conflito |
| escrita direta em `resume_intakes` | negada para `authenticated` |
| Super Admin, Owner, Admin e Recruiter | permitidos no escopo aplicável |
| `Member`, sem membership e Recruiter cross-tenant | negados por autorização persistida |
| auditoria | nenhum texto-fonte integral em metadata |
| RLS e grants | RLS ativo; leitura autorizada e DML composto somente por RPC |

## Advisors

As cinco RPCs públicas do intake aparecem no advisor como `security definer`, comportamento esperado e documentado no ADR-012: `search_path` vazio, autorização interna via `private.require_document_reviewer`, DML direto revogado e grants somente para `authenticated`. Os novos índices aparecem inicialmente como não utilizados porque acabaram de ser criados. Avisos históricos sobre políticas permissivas sobrepostas e proteção contra senhas vazadas permanecem fora deste movimento.

## Limites

- O frontend permanece local e depende de validação visual autenticada em `localhost:5555`.
- Upload Storage real requer smoke pelo cliente autenticado; as transações SQL validaram contrato, papéis, tenant, concorrência e vínculo documental, não o transporte do objeto.
- Não existe ambiente de produção separado nem hosting de frontend configurado.
