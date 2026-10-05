# AoT — Síntese profissional v2.0.5

Acordo integral: `agreement-profile-synthesis-v205.md` v1.0.0, incluindo prompt e referências1/3. Baseline main/origin/VPS `6c5bf38051e29afe4e3fec209a0077d4274e81d8`, web66503ec, Parser8682af7, gatewayd061cea. Risco E/D. Autorização explícita de Bruno para implementar/publicar v2.0.5 e autorização permanente AGENTS seção7.

## Acordos -> implementação -> testes -> evidência

| ID | Implementação | Teste/evidência | Status |
| --- | --- | --- | --- |
| D-01 | Oito perguntas profundas fixas, schema, limites/naturezas | Contrato/fixtures/benchmark rich/sparse; `evidence/profile-synthesis/benchmark-*.json` | PASS |
| D-02 | Leitores TS e validatorSQL; fonte por afirmação; vazio=zeroIA | 20 testes worker/contrato; SQL rejeita missing/null/refs inventadas/replay; benchmark injeção | PASS |
| D-03 | Base/hash/snapshot/versão; resumo original; fonte sob demanda | SQL stale base + snapshot anterior + fonte autorizada; UI não faz eager fetch; identidade/contato omitidos | PASS |
| D-04 | Três tabelas/RLS/tenant/RPC, audit optional, lease/retry | Migração inteira aplicada novamente em transação QA, fixture rollback: auth/outsider/inativo/anon, duplicidade, fila vazia, falha optional/audit, lease, retry, exclusão | PASS |
| D-05 | Worker independente sem service_role; hash privado/segredoVPS; Responses | HTTP fake claim/provider/complete, bounded attempts, benchmark três chamadas, registry; runtime aguarda publicação | PARTIAL |
| D-UX-01 | Narrativa70/30, cartões contextuais, fonte60/40, disclosure/mobile | Seis estados x1416/390, fontes após clique/8 eixos/no overflow; renders no caminho abaixo | PASS |
| D-06 | v2.0.5, docs/ADR/contexto/release seletivo | Tipos/build/localQA dirigidos; CI/main/VPS/health/smoke pendentes | PARTIAL |

## Proibições

| ID | Evidência | Status |
| --- | --- | --- |
| P-01 | Rich/sparse/injection conferidos: sem score, contratação, personalidade, senioridade ou fato típico inventado; schema rejeita campo extra e verificação sem fonte | PASS |
| P-02 | Resultado separado do Perfil; nenhum write de fatos/Knowledge pelo worker; SQL tenant/role/exclusão; não houve publicação de Pessoa real de teste; segredo só na VPS, sem logging de corpo de erro | PASS |
| P-03 | Queue idempotente +3 tentativas; leitura/aba/rascunho fora do provider; Parser/matching sem mudança; falha opcional não bloqueia audit | PASS |
| F-01 | Parser/matching/Knowledge/Assessment como domínios preservados; só leitura elegível de evidências existentes | PASS |

## Mapa de impacto e preservação

| Capacidade | Relação | Baseline / regressão | Status |
| --- | --- | --- | --- |
| Síntese/IA/tela/dados | direct | Baseline sem sínteseIA; schema/worker/SQL/benchmark/renders | PASS local |
| Auth/tenant/persistência | critical_transversal | Leitor M72 reutilizado; roles negativas, fonte de outro tenant, grants, token/lease/replay, cascade no banco real local | PASS local |
| Publicação humana/resumo canônico | plausible_indirect | Eventos audit existentes; enqueue malformado não interrompe audit; person-flow proporcional | PASS local |
| Parser/matching | plausible_indirect | Nenhum arquivo funcional alterado; checker matching e imagens runtime na publicação | em validação |
| Release/docs | direct | Tipos/build/docs/Context Pack; publicação seletiva/migração/worker/web | em validação |

## Evidência visual

Renders: `evidence/profile-synthesis/summary-1416.png`, `source-1416.png`, `summary-390.png`, `source-390.png`; demais estados/relatórios na mesma pasta. Referências: `references/profile-synthesis-01.png` e `profile-synthesis-03.png`.

Comparação manual: hierarquia narrativa antes das perguntas, principal70%/lateral30%, três contextos agrupados dentro da síntese, sustentação abaixo, perguntas na lateral; fonte aberta principal60%/fonte40%, afirmação selecionada azul, trecho com destaque e ação de origem quando documento existe. Mobile empilha, cabeçalho adapta e abas continuam roláveis sem overflow global. Textos/pessoas/contagens são ilustrativos. Preservar shell/componentes/tokens reais, conforme exceção explícita D-UX-01; não copiar navegação/logos inventados pelo gerador. Fonte é o snapshot do campo publicado, sem inventar coordenadas do PDF. Nenhum desvio material de composição identificado.

## Limites e evidência nova/preservação

Benchmark: 13.817/7.127/8.189ms; 1041/920/972 tokens de entrada; 1376/740/840 de saída. Schema/refs e revisão qualitativa local não estabelecem qualidade universal nem fairness. Nenhuma Pessoa real publicada/alterada para testar; jornada autenticada de Pessoa real NOT TESTED. Auth/RLS foram executados em PostgreSQL local, não apenas mocks. Health e smoke público não equivalem a leitura autenticada real. Relação opcional de vínculos exige tabela instalada; produção foi verificada somente por schema, sem exportar dados humanos.

Desvios do contrato: nenhum desvio material identificado no escopo local validado. Produção permanece pendente, sem declarar entrega concluída antes de CI/runtime/smoke/sincronização.
