# AoT — complemento Unicode da v2.0.2

Acordo/prompt `agreement-import-unicode-v202.md` 1.0.0, autorização de Bruno em 2026-10-03. Baseline documental `ec41808`, funcional `6a63605`, risco D, branch `codex/fix-import-unicode-v202`. Produto permanece 2.0.2; import-evidence 1.1.0, evidence-adapter 1.0.1 e unicode-text 1.0.0 são versões explícitas do complemento.

## Acordos, implementação, testes e evidência

| ID | Implementação | Evidência | Status |
| --- | --- | --- | --- |
| D-U01 | representação U+FFFD somente para NUL/substitutos isolados, versão/contagens/avisos para revisão | matriz Unicode, imutabilidade/geometria/idempotência; replay dos dois PDFs no Parser publicado preservou fatos/evidências/cache | PASS |
| D-U02 | normalização antes da identificação e do transporte, preflight de todas as chaves/valores, sem reescrever chaves | 43 testes dirigidos/serviço de retomada; SQL real reproduz 22P05 bruto e grava/abre/reabre derivado compatível | PASS |
| D-U03 | motivo unicode_invalid, fallback seguro 22P05, pares antigos/novos de diagnóstico explícitos | SQL auth/tenant/idempotência/rollback/pair mismatch/cliente legado e testes sem PII | PASS |
| D-U04 | versão 1.0.1 libera falhas 1.0.0 sem publicar/duplicar/IA | retry dirigido com cache, guard de mesma versão/hash; recuperação humana real em produção NOT TESTED | PASS |
| D-U05 | migration forward-only e rebuild somente Parser/web | CI, migration ativa, deploy, replay, rollback/readiness/HTTPS/versão PASS | PASS |
| P-U01 | originais/cache/listas/Unicode válido/grants/Perfil aprovados preservados | testes dirigidos, SQL real com rollback; produção sem fixtures | PASS |

## Mapa de impacto e preservação

Mapa do acordo mantido: texto/páginas/layout/draft/transporte, diagnóstico/persistência, recuperação e Parser/web direct; auth/tenant/publicação critical_transversal; gateway/Traefik plausible_indirect; matching/Knowledge/OCR no_impact_identified. A normalização do draft também antecede a identificação para evitar falha prematura no nome; fatos aceitos e citações originais permanecem intactos. O mecanismo não renumera fonte, altera prompt/modelo/chave do cache ou implementa outra extração. Chaves inválidas falham em vez de criar colisões. Avisos tornam a ocorrência explícita para a revisão humana. JSONB rejeita NUL/substitutos inválidos durante a conversão, antes da função; a migration versiona diagnóstico/compatibilidade preservando autorização.

## Validação local

43/43 testes de Unicode/contrato/Parser/erros/serviço com transporte real mockado PASS; 48/48 worker/cache/gateway/hosted/benchmark PASS. 243/243 regressão person-flow PASS, incluindo segurança/revisão/publicação; probe de falha intencional do runner é esperado. Types/build TypeScript/web PASS; lint 801 arquivos, foundation 18 tabelas públicas/seis versões, ledger e 15 testes de tooling/release (incluindo três Context Pack) PASS. Avisos conhecidos de tamanho de bundle/importação dinâmica não impedem build.

Verificação SQL em PostgreSQL 17 localhost:55479/import_evidence_v202_final PASS, cada escrita de fixture revertida. SQL reproduz 22P05 com NUL sintético, aceita U+FFFD/emoji/acentos, grava/reabre todas as regiões/categorias, preserva Perfil aprovado, nega anon/member/outsider/no session e par contrato/adaptador incorreto. Diagnóstico legado comprovado em subtransação com rollback.

CI inicial `37154489417` FAIL por expectativa de teste de transporte ainda na versão anterior do adaptador; expectativa corrigida sem relaxar contrato. CI da branch `37154659948` e da main funcional `37154741428` PASS.

Replay autorizado dos arquivos fornecidos executado em memória no Parser publicado, com cache privado lido no próprio servidor e rede bloqueada: PDF 3, duas páginas, 29 fatos/33 evidências/nove NUL representados; PDF anterior, uma página, 31 fatos/39 evidências/zero NUL. Ambos passaram no preflight final. Ordem, geometria, originais e bytes dos caches preservados; nenhuma chamada à IA ou gravação de Perfil. Contagens do método por representação derivada podem incluir repetições do mesmo símbolo em texto/layout/evidências; não são contagem de glifos físicos distintos.

## Autorização permanente e limites

AGENTS 1.3.2 registra a autorização permanente solicitada para enviar dados pessoais necessários à VPS existente do Prisma com transporte seguro, propósito e isolamento. Nota de memória `2026-10-03T17-53-54-prisma-vps-personal-data-authorization.md` criada mediante pedido explícito; isso não autoriza cache privado para outros destinos, logs públicos, publicação de Perfil ou decisões humanas inventadas. A rejeição anterior do envio do PDF ocorreu antes desta autorização: nenhum envio aconteceu naquela tentativa. O replay autorizado não guardou arquivo extra nem imprimiu conteúdo do currículo.

Browser autenticado indisponível neste ambiente: retomada humana real em produção NOT TESTED. Consulta após deploy confirmou que a tentativa original permanece failed/not_ready, sem páginas persistidas ou Perfil publicado. Não inferir recuperação desse registro a partir do replay/QA; o operador deve atualizar a página e usar “Retomar importação com IA” na Central da Pessoa. A proteção de mesma versão/hash continua vigente.

## Publicação / conclusão

Main/origin/VPS no SHA funcional `96e3ecba4696994993e9b661ec37ae0ff49a3c5f`; este fechamento documental será sincronizado sem reconstruir runtime. Migration local `20261003210000_import_text_unicode_contract` ativa no projeto existente `ioldpnqqvobprjiontre` sob versão remota `20261003212042`, registrada como alias no ledger, fingerprint unverified (sem alterar divergências históricas). Verificação operacional: UTF8, execute authenticated permitido/anon negado, motivo Unicode e marcador do contrato 1.1.0 presentes.

Parser container `62002e8523d8`, imagem `dc3fd8022d20`; web `1f3622e635c8`, imagem `4d0e0f81faa5`; ambos running, zero reinícios, Parser healthy/ready. Gateway `2eed2dd379ea` e Traefik `5e25fdc6d2e6` preservados. Serviço Paddle de teste já unhealthy no baseline não foi alterado. Rollback disponível nas tags `prisma-parser-ia:rollback-before-96e3ecba4696` e `prisma-web:rollback-before-96e3ecba4696`.

HTTPS público: `/`, `/sign-in`, `/index.html`, sete assets do HTML, chunk PDF e entry anterior preservado retornaram 200. Entry atual `/assets/index-B-jkzCiv.js` contém SHA funcional, versão 2.0.2 e contratos publicados. Readiness privado e hosted disponíveis; acesso hosted sem autenticação retorna 401. Resultado `UNICODE_HTTPS_SMOKE_PASS`. Escopo cumprido sem desvio do acordo; retomada autenticada segue como limite explícito, sem inventar decisão humana ou recuperação operacional.
