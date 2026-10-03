# AoT — complemento Unicode da v2.0.2

Acordo/prompt `agreement-import-unicode-v202.md` 1.0.0, autorização de Bruno em 2026-10-03. Baseline documental `ec41808`, funcional `6a63605`, risco D, branch `codex/fix-import-unicode-v202`. Produto permanece 2.0.2; import-evidence 1.1.0, evidence-adapter 1.0.1 e unicode-text 1.0.0 são versões explícitas do complemento.

## Acordos, implementação, testes e evidência

| ID | Implementação | Evidência | Status |
| --- | --- | --- | --- |
| D-U01 | representação U+FFFD somente para NUL/substitutos isolados, versão/contagens/avisos para revisão | matriz Unicode, imutabilidade/geometria/idempotência; replay exato após deploy pendente | PARTIAL |
| D-U02 | normalização após datas e antes do transporte, preflight de todas as chaves/valores, sem reescrever chaves | 43 testes dirigidos/serviço de retomada; SQL real reproduz 22P05 bruto e grava/abre/reabre derivado compatível | PASS |
| D-U03 | motivo unicode_invalid, fallback seguro 22P05, pares antigos/novos de diagnóstico explícitos | SQL auth/tenant/idempotência/rollback/pair mismatch/cliente legado e testes sem PII | PASS |
| D-U04 | versão 1.0.1 libera falhas 1.0.0 sem publicar/duplicar/IA | retry dirigido com cache, guard de mesma versão/hash; recuperação humana real em produção NOT TESTED | PASS |
| D-U05 | migration forward-only e rebuild somente Parser/web | QA local PASS; CI/deploy/smoke pendentes | PARTIAL |
| P-U01 | originais/cache/listas/Unicode válido/grants/Perfil aprovados preservados | testes dirigidos, SQL real com rollback; produção sem fixtures | PASS |

## Mapa de impacto e preservação

Mapa do acordo mantido: texto/páginas/layout/draft/transporte, diagnóstico/persistência, recuperação e Parser/web direct; auth/tenant/publicação critical_transversal; gateway/Traefik plausible_indirect; matching/Knowledge/OCR no_impact_identified. O mecanismo ocorre na representação derivada depois da estruturação: não renumera fonte, não altera prompt/modelo/chave do cache nem implementa outra extração. Chaves inválidas falham em vez de criar colisões. Avisos tornam a ocorrência explícita para a revisão humana. SQLB rejeita NUL/substitutos inválidos durante a conversão JSONB, antes da função; a migration versiona diagnóstico/compatibilidade, preservando autorização.

## Validação local

42/43 testes de Unicode/contrato/Parser/erros/serviço com transporte real mockado PASS. 243/243 regressão person-flow PASS, incluindo segurança/revisão/publicação; probe de falha intencional do runner é esperado. Types/build TypeScript/web PASS; verificação SQL em PostgreSQL 17 localhost:55479/import_evidence_v202_final PASS, cada escrita de fixture revertida. SQL reproduz 22P05 com NUL sintético, aceita U+FFFD/emoji/acentos, grava/reabre todas as regiões/categorias, preserva Perfil aprovado, nega anon/member/outsider/no session e par contrato/adaptador incorreto. Diagnóstico legado comprovado em subtransação com rollback. Lint/Context Pack e fechamento operacional em curso.

## Autorização permanente e limites

AGENTS 1.3.2 registra a autorização permanente solicitada para enviar dados pessoais necessários à VPS existente do Prisma com transporte seguro, propósito e isolamento. Nota de memória criada mediante pedido explícito; isso não autoriza cache privado para outros destinos, logs públicos, publicação de Perfil ou decisões humanas inventadas. A rejeição anterior do envio do PDF ocorreu antes desta autorização: nenhum envio aconteceu naquela tentativa. Replay autorizado deste complemento ocorrerá em memória no servidor, sem guardar arquivo extra, imprimir conteúdo do currículo, fazer IA ou alterar cache. O uso de browser autenticado continua indisponível; não inferir sucesso do clique humano a partir do replay/QA.

## Publicação / conclusão

Pendente até CI, migration ativa, Parser/web, replay de ambos PDFs, rollback/readiness/HTTPS/versão e sincronização. Não declarar entrega de produção antes dessas provas. A tentativa real permanece aguardando retomada humana; nenhum Perfil será publicado automaticamente.
