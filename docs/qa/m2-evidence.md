# Evidência QA dos Movimentos M2-A e M2-B

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

## Evidência técnica

- Foundation, migrations M2-A/M2-B, índices e RPC transacional ativos.
- Bucket `person-documents` privado.
- Edge Functions `operator-sign-in`, `operator-password-reset` e `platform-users` ativas.
- `pnpm run validate`: lint, foundation check, Context Pack, typechecks, build, 33 testes técnicos, 19 golden tests e demo aprovados.
- Persistência mantém documento, tentativa, página, método/versão, draft, evidência, timeline e perfil separados.

## Limites

- Nenhum dado real de cliente foi usado.
- Papel `member` possui cobertura negativa automatizada, mas ainda não foi repetido com uma segunda sessão Auth conectada.
- Malware scan, revisão humana persistida, retenção e operações de titular não estão implementados.
- A proteção contra senhas vazadas permanece desabilitada no projeto Supabase atual.
- Não há frontend hospedado nem ambiente de produção separado por decisão explícita enquanto o uso for somente interno e sem clientes.
