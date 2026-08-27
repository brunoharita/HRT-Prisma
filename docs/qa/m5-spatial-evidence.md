# Evidência QA do M5: currículo e evidência espacial

## Escopo

- Data: 2026-08-27.
- Branch: `codex/m5-cv-evidence`.
- Backend remoto: Prisma-QA (`ioldpnqqvobprjiontre`), único projeto Supabase atual.
- Frontend: local, sem hosting.
- Dados: somente registros sintéticos de QA.

## Evidência funcional e técnica

| Fluxo | Evidência observada | Resultado |
| --- | --- | --- |
| Split permanente | PDF à esquerda e revisão estruturada à direita, com rolagens independentes | build/contrato aprovados; inspeção autenticada pendente |
| Navegação | campo, evidência, página e histórico navegam sem ocultar a fonte | build/contrato aprovados; inspeção autenticada pendente |
| Seleção espacial | retângulos normalizados suportam arrasto em ambas as direções, clamp e zoom | aprovado por teste |
| Texto e OCR | camada PDF.js é prioritária; Tesseract processa somente a região sem texto | aprovado por contrato e build |
| Compatibilidade | 18 evidências originais foram vinculadas sem fabricar coordenadas | aprovado em QA |
| Transação positiva | Admin registrou evidência complementar, criou revisão/região/vínculo e a transação foi revertida | aprovado em QA |
| Replay idempotente | a mesma correção concluída devolveu região/vínculo anteriores com `reused = true`, mesmo após o valor se tornar atual | aprovado em QA |
| Coordenadas inválidas | largura fora de 0 a 1 retornou `normalized evidence coordinates are invalid` | aprovado, fail-closed |
| Papel insuficiente | sessão `member` recebeu `organization scope is not authorized` | aprovado, fail-closed |
| Tenant e versão | FKs compostas e validação interna exigem organização, documento e versão coincidentes | aprovado por migration/teste |
| Imutabilidade | eventos não aceitam update/delete e substituição preserva o vínculo anterior | aprovado por migration/teste |

As três migrations M5 estão ativas no Prisma-QA. As três tabelas possuem RLS, `authenticated` tem somente `SELECT` direto e a mutação ocorre exclusivamente pela RPC controlada. A auditoria pós-migração encontrou zero coordenadas inválidas, zero vínculos com duas fontes e 18 vínculos originais compatíveis.

O advisor de performance não aponta foreign key M5 sem índice após a migração complementar. Índices recém-criados aparecem como não utilizados porque ainda não existem eventos espaciais persistidos. O advisor de segurança aponta `record_profile_review_evidence` como RPC `security definer`; a exceção é intencional e documentada no ADR-016.

## Limites

- A prova conectada de mutação foi executada dentro de transação revertida e não deixou evidência sintética persistida.
- A sessão do navegador interno não estava autenticada e não havia Chrome conectado nem credencial de QA no ambiente. A inspeção visual autenticada desktop/mobile permanece pendente e não é apresentada como aprovada.
- Não houve uso de currículo real, LLM externo ou embeddings.
- O frontend continua local. Não existe ambiente de produção separado e nenhuma ação de produção foi realizada.
