# Evidência QA dos Movimentos M2-A, M2-B e M2-C

## Escopo

- Data: 2026-08-24.
- Implementação base: commit `87b9733` na branch `codex/m2-users-people`.
- Backend remoto: Prisma-QA (`ioldpnqqvobprjiontre`), único projeto Supabase atual.
- Frontend: local em `http://127.0.0.1:5555`.
- Operador: `harita.super`, validado como Super Admin.
- Dados: exclusivamente fixtures sintéticas identificadas para QA.

## Evidência funcional

| Fluxo | Evidência observada | Resultado |
| --- | --- | --- |
| M2-A | login por username, lista de Usuários e autoridade Super Admin | aprovado |
| Pessoa | lista, cadastro/edição e workspace com timeline | aprovado |
| Texto manual | documentos v2/v3, draft, evidência e Perfil Prisma v2 | aprovado |
| PDF nativo | `prisma-m2b-native.pdf`, documento v4, 1 página, 161 caracteres úteis, `pdfjs-5.4.296/native-v1`, sem OCR | aprovado |
| OCR seletivo | `prisma-m2b-scanned.pdf`, documento v5, 1 página, 360 caracteres úteis, `tesseract.js-7.0.0/por+eng-v1` | aprovado |
| Perfil após OCR | geração explícita do Perfil Prisma v3 a partir do documento v5 | aprovado |
| Insuficiência | primeira fixture escaneada não atingiu o mínimo global e não foi promovida como extração válida | aprovado, fail-closed |
| Responsividade | viewport 390x844 sem overflow horizontal e desktop compatível com o layout de referência | aprovado |
| UI M2-C | central, detalhe, revisão e comparação em 1280 px e 390x844, sem overflow nem warnings/erros finais de console | aprovado |
| Registro idempotente | a mesma chave/fingerprint devolveu o documento `eb03c0d6-dbf2-46ae-8d5b-c288d34e2310` | aprovado |
| Concorrência | três intenções concorrentes alocaram versões documentais 1, 2 e 3 sem colisão | aprovado |
| Retry | segunda tentativa vinculada à primeira com `attempt_number = 2` | aprovado |
| Revisão humana | revisão `d0c80fbf-ddcb-4e25-ba60-e8e7c9da5828`, lock stale negado e alterações preservadas | aprovado |
| Aprovação | perfil `b00c35f6-5409-4621-b02f-4ee7611b5449` v1 promovido atomicamente | aprovado |
| Matriz de papéis | Super Admin, Owner, Admin e Recruiter autorizados; Member sem documentos/revisão | aprovado |
| Auditoria | 9 eventos sem texto-fonte do currículo nem payload integral do perfil | aprovado |

## Evidência técnica

- Foundation, migrations M2-A/M2-B/M2-C, índices de cobertura das foreign keys e RPCs transacionais ativas.
- Auditoria final: zero versões documentais vinculadas duplicadas, zero números de tentativa duplicados, zero perfis atuais duplicados e zero documentos sintéticos órfãos do M2-C.
- Advisor de performance: zero foreign keys M2-C sem índice de cobertura após `m2c_foreign_key_indexes`.
- Bucket `person-documents` privado.
- Edge Functions `operator-sign-in`, `operator-password-reset` e `platform-users` ativas.
- `pnpm run validate`: lint, foundation, Context Pack, typechecks, build, 38 testes técnicos, 19 golden tests e demo aprovados.
- Persistência mantém documento, tentativa, página, método/versão, draft, evidência, timeline e perfil separados.

## Limites

- Nenhum dado real de cliente foi usado.
- Papel `member` possui cobertura negativa local e com sessão Auth conectada.
- Malware scan, retenção e operações de titular não estão implementados.
- As seis RPCs públicas M2-C aparecem no advisor como `security definer`; o ADR-011 registra a exceção controlada, checks internos e DML direto revogado.
- A proteção contra senhas vazadas permanece desabilitada no projeto Supabase atual.
- Não há frontend hospedado nem ambiente de produção separado por decisão explícita enquanto o uso for somente interno e sem clientes.
