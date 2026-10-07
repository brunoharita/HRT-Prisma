# AoT — estabilidade do Score v2.1.4

Contrato integral `agreement-stable-score-v214.md` 1.0.0, execução correspondente e ADR-078. Baseline main `330e0d559e430c8ccd4d79e1ae2afb2d390d124a`, produção web v2.1.3 `30d4f79`. Autoridade: implementar/publicar main v2.1.4, com a correção explícita de Bruno sobre dependências concretas.

| ID | Implementação | Teste/evidência | Estado |
| --- | --- | --- | --- |
| D-01 | Ponte persistida e projeção completa, data fixa do cálculo | SQL: mesmo ID/score/referência/timestamp; Edge: datas diferentes sem motor/provedor/commit; browser: reabrir/comparar | PASS |
| D-02 | Hashes de Perfil, Posição, Knowledge consumida, evidência, decisão/revisão do par | SQL: A não altera B, conceito alheio não invalida, conceito vinculado/Posição/revisão/evidência invalidam somente suas dependências | PASS |
| D-03 | Lease, revalidação e publicação atômica; anterior preservado | SQL: lease ativo/expirado, fonte alterada, contrato/identidade inválidos; Edge: falha/commit obsoleto; browser: anterior durante atualização/falha | PASS |
| D-04 | Histórico existente imutável, predecessor/autor/motivo/dependências/valores; botão com papéis existentes | SQL: histórico, imutabilidade, papel/tenant/grants/RLS; browser: membro sem botão e recálculo isolado | PASS |
| D-05 | Busca progressiva só de resultados salvos, comparação/detalhe, refresh de uma Pessoa | Browser/componente e transporte reais com adaptador sintético; publicação pendente | PARTIAL |
| P-01 | Nenhuma pontuação do navegador; acesso/relógio não recalculam; sem decisões inventadas/Knowledge escrita ou fórmula alterada | Edge/SQL negativos; diff e runtime compartilhado; browser sem tráfego externo | PASS |

## Mapa de impacto e preservação

| Capacidade | Relação | Baseline / regressão | Estado |
| --- | --- | --- | --- |
| Motor/semântica/revisão | direct | Runtime gerado, fórmula/pesos/prompts/modelos preservados; testes de score/runtime/triagem/revisão e Edge existente | PASS |
| Persistência/concorrência | direct | Antes snapshots por ação; agora ponte+histórico causal. PostgreSQL 17 local, transação rollback, leases/fonte obsoleta/negativos | PASS |
| Busca/comparação/detalhe | direct | Componentes reais, tema/CSS real; transporte real com adaptador sintético, entrega progressiva sem pontuação intermediária e falha individual | PASS |
| Auth/tenant/PII | critical_transversal | Autorização antes de RPC privilegiada e no commit, tabela sem acesso direto; isolamento/forjado/papel, projeção sem currículo integral | PASS |
| Knowledge/Perfil/Posição/evidência | plausible_indirect | Somente leitura das fontes; testes de invalidação concreta, nenhuma curadoria real | PASS |
| Parser/Synthesis/gateway | no_impact_identified | Sem diff/destino; identidade/imagem/saúde serão comparadas no smoke de publicação web | NOT TESTED |

Novidade: persistência do ciclo de vida, não fórmula nova. Preservação: descoberta, decisões humanas fechadas, proveniência, seleção, consulta manual e histórico. Dependência descoberta: preparar verificação precisa reconfirmar a identidade salva; implementado/testado para rejeitar resultado antigo após mudança. Nenhuma ampliação de curadoria/IA/ingestão. F-01 preservado no diff.

## Evidências e limites

`docs/qa/evidence/stable-score-v214/`: resultados SQL/Edge/testes dirigidos/browser, imagens desktop1280/mobile390 e recibos de publicação. Browser usa componentes reais, `vacancyService`/restauração reais e transporte/candidatos sintéticos; sem usuário real, banco externo ou IA paga. Testes do motor e Edge complementam o adaptador, que não pretende provar pontuação profissional real. Referências anteriores são contexto do problema, não alvo de redesenho neste movimento. Layout/tema preservados, acrescentando estado salvo/ação no card e aviso individual. Sem referência normativa nova; imagens documentam os estados renderizados.

QA PostgreSQL usa base local descartável vazia `import_evidence_v202`, porta55479, com migrations diretamente necessárias e definições atuais verificadas de `m83_sources`/`m83_snapshot_sources` para complementar o baseline histórico local. Fixtures inteiramente sintéticas e rollback. Os testes de lease representam uma segunda chamada encontrando lease ativo/expirado; não se alega stress de múltiplas conexões em produção. Nenhum teste cria avaliação/decisão humana real. Jornada autenticada de Bruno/Diego em produção NOT TESTED.

Validação local: 108 testes Node dirigidos, 40 testes Edge e 39 assertivas SQL PASS; tipos web/build web, lint/foundation/ledger e Context Pack PASS. O plano preliminar classifica apenas migration nova, Edge matching-trajectory e web. A recomendação genérica de pnpm test foi substituída por módulos diretamente afetados; CI obrigatório segue seu fluxo existente. Chrome retornou EACCES; o mesmo teste passou no Edge instalado, sem alterar permissões.

## Publicação e conclusão

Em andamento. D-05 permanece PARTIAL até CI, migration/Edge/frontend, smoke, rollback e sincronização. Nenhum desvio material do contrato identificado na revisão local. Não confundir testes locais com rollout ativo.
