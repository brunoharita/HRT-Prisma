# Complemento autorizado — Prisma v2.0.2: Unicode na importação

Versão 1.0.0, agreed, 2026-10-03. Bruno aprovou representar caracteres não identificados explicitamente e implementar/publicar o complemento. Baseline `ec41808` documental/`6a63605` funcional. Este acordo complementa o acordo de evidências 1.0.0 e supera D-01 somente quanto à representação derivada dos caracteres incompatíveis, D-02 quanto ao texto, D-03 quanto ao motivo Unicode e D-05 quanto à versão de recuperação. Risco D; produto continua v2.0.2, contrato de importação evolui aditivamente para 1.1.0 e adaptador para 1.0.1. Sem nova dependência.

## Contrato e aceite

- D-U01: NUL e substitutos UTF-16 isolados ganham U+FFFD (símbolo não identificado) no conteúdo derivado; ocorrência explícita para revisão, método/versionamento e contagens, sem inventar o símbolo original. PDF/hash/cache brutos, coordenadas, ordem, limites de lista e IDs de linha permanecem intactos. Unicode válido, acentos, emojis, TAB e quebras não mudam. CA: testes de NUL/pares/substitutos/combinações e replay do PDF 3 mantendo 29 fatos/33 evidências e nove símbolos representados; PDF anterior mantém 31/39 sem alteração.
- D-U02: validar todo o texto/JSON derivado antes da RPC, incluindo páginas, layout, evidências e draft; impedir chave inválida/colisão em vez de modificá-la. CA: preflight e transporte reais com Unicode inválido, persistência/reabertura SQL com JSON compatível; NUL bruto reproduz 22P05 em QA local e payload normalizado não reproduz.
- D-U03: Unicode inválido recebe diagnóstico específico e seguro, incluindo fallback 22P05; versões anteriores continuam legíveis e RPC aceita os clientes antigos de forma explícita. CA: diagnósticos sem texto/PII, auth/papel/tenant/idempotência/rollback intactos.
- D-U04: tentativa antiga pode ser retomada pelo operador depois da atualização do adaptador, reutilizando original/cache sem IA automática, duplicação ou publicação de Perfil. CA: recuperação do erro com adaptador 1.0.0 para 1.0.1, bloqueio da mesma versão/fonte inválida, replay exato sem rede/cache alterado. Smoke autenticado real permanece limite explícito quando indisponível.
- D-U05: publicar o complemento em main/origin/VPS, somente migration/Parser/web exigidos, preservando rollback e outros containers. CA: testes dirigidos, SQL QA local, types/build/lint/Context Pack/CI e smoke SHA/imagens/readiness/HTTPS.
- P-U01: sem descarte silencioso, alteração de Unicode válido, renumeração de linhas, IA paga, Perfil aprovado automaticamente, afrouxamento de auth/tenant ou fixtures em produção.
- F-U01: formatos novos, OCR engine, matching, Knowledge, redesenho de telas e reprocessamento em lote.
- A-U01: reutilizar extração/adapter/preflight existentes; implementar normalização na representação derivada antes do transporte, com testes proporcionais e migration forward-only. Autorização permanente de transferência necessária à VPS fica registrada em AGENTS 1.3.2 e nota de memória solicitada; não autoriza exportação de cache para outros destinos.
- Q-U01: nenhuma decisão material pendente no escopo autorizado.

## Mapa de impacto e preservação

| Área | Relação | Baseline e preservação | Prova |
| --- | --- | --- | --- |
| Texto/páginas/layout/draft/transporte | direct | fontes originais, listas/boxes/cache/prompt/modelo | matriz Unicode, ambos PDFs e serviço dirigido |
| Persistência/abertura/diagnóstico | direct | import-evidence-1.0.0/RPC e grants existentes | SQL local real, 22P05 sintético, versões antigas/novas |
| Recuperação | direct | tentativa failed/not_ready/adapter 1.0.0 | avanço de versão sem publicar/duplicar/IA |
| Auth/tenant/publicação | critical_transversal | gates e Perfil vigente | negativos SQL/serviço e rollback |
| Parser/web/VPS | direct | imagens funcionais 6a63605 | deploy seletivo, readiness/assets/rollback |
| Gateway/Traefik | plausible_indirect | IDs/imagens do AoT v2.0.2 | mesmos containers/health |
| Matching/Knowledge/OCR | no_impact_identified | nenhum consumidor/motor alterado | diff e plano excluem essas regras/superfícies |

## Execução congelada

Implementar D-U01 a D-U05; P-U01 não pode ocorrer; F-U01 fica excluído e A-U01 delega o mecanismo. Este documento é o acordo e incorpora integralmente o prompt de execução desse complemento. O AoT separa implementação, preservação, replay e limites reais de produção.
