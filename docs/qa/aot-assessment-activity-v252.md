# AoT — Atividade legível e análise por IA

Contrato: docs/qa/agreement-assessment-activity-v252.md v1.1.0. Baseline925d4b3ca619b5f302f8fe4d737cb83a473e123e. Estado local validado; Q-01 resolvido por Bruno em13/10/2026,6.193 Tokens por análise entregue. Publicado em main/produção2.5.2; runtime6ec031db505af61af77971bd12c1f53358d49fba.

## Matriz de acordos

| Regra | Implementação | Evidência local | Estado |
| --- | --- | --- | --- |
| D-01/02 | AssessmentActivity: textos, campos técnicos completos e expansão na largura inteira; mobile em cartões | 68browser em1448/768/390/320, timezoneTokyo/horárioBrasília, teclado, null/não aplicável/zero e dados originais | PASS |
| D-03 | Cotação/confirmar/cancelar, cache gratuito e acesso explícito | fixture com tarifa arbitrária1234, nenhuma IA por leitura; tarifa6193 testada em SQL com negativa de reaplicação; ativação remota6193 verificada | PASS |
| D-04/05/06 | domínio puro, AI enum estrito, limites/evidências e dados minimizados | 4Node/5Deno novos+5Deno existentes, projeção sem PII/rawpayload, rejeição de acusações/IDs não sustentados | PASS |
| D-07 | snapshot privado, RPCs/ledger/histórico, cache/replay, falha/liberação e resultado anterior | 189SQL rollback local incluindo consumidores anteriores,2disputas paralelas em banco descartável local removido | PASS |
| D-08 | componente compartilhado de resultados históricos/atuais, feedback e contextos | 68browser dirigido,82portal e38preparação/resultado, tipos/build PASS | PASS |
| D-10 | Migration20261013130000, tarifa6193 independente de custo técnico | 4asserts adicionais: valor aprovado, demais tarifas preservadas, replay negado e única versão | PASS |
| D-09 | branch isolada, contrato/mapa/ADR; release2.5.2 autorizado | CI38452521988 PASS; migrations/Edge/web/HTTP/assets/versão e rollback verificados | PASS |
| P-01/02/03 | sem novas observações ou decisões/Score; chamada paga explícita; código rejeita saída fora dos fatos | testes de projeção/validação, simulações sem modelo vivo, replay/saldo/falha; nenhuma alteração de tarifa presumida | PASS |

## Impacto e preservação

Mapa inicial no acordo. Novidade: análise estruturada por tentativa com IA organizando fatos; apresentação de acontecimentos e consulta de análises salvas. Preservação: eventos originais, respostas, correção, Score, perfil, autoridade humana e consumidores existentes; snapshot/metadados e Tokens com escopos existentes. Coleta e funções de público/save/submit/eventos não alteradas; Edge compartilhada recebeu somente ação autenticada analyze_activity. Limite de baseline: único projeto remoto existente atende o app; não foi criado outro projeto/ambiente ou gasto de infraestrutura. QA sensível executada em PostgreSQL local descartável confirmado e fixtures isoladas. Dados reais e LLM vivo NOT TESTED.

## Fidelidade visual

Imagem do PO é contraexemplo técnico/conteúdo; referência normativa é o modelo textual aprovado: análise antes da lista, resumo em português e evidências expansíveis usando largura disponível. Capturas em docs/qa/evidence/assessment-activity-v252/browser. Revisão visual de analysis-1448/events-390 PASS, topologia/densidade/ações e campos técnicos sob demanda conferidos; render usa dados sintéticos; valores exemplificativos são fixtures e não decisões/inferências sobre Diego.

## Fechamento da decisão comercial

Bruno respondeu aprovo à proposta de6.193 Tokens por análise concluída. D-10/CA-05 incorporados ao acordo v1.1.0 e execução congelada. Ativação aditiva, sem alterar tarifas/reservas existentes; consultar salva grátis/falha sem resultado libera.

A navegação por evidências usa o snapshot imutável da análise, inclusive eventos recebidos depois da consulta inicial da tela; limpeza da seleção volta aos dados atuais recebidos. O DTO inclui organização/tentativa e rejeita troca de escopo. A UI diferencia análise feita antes da conclusão da tentativa. Custos de testes são arbitrários1234/17, não tarifa aprovada. Coleta existente é parcial e eventos são interpretados como registros associados à questão, sem certificar atividade real/intenção; nova coleta ou correção de trackers não entrou no diff.

Lint/check-contexto no snapshot limpo e22tooling PASS. SQL/log normalizado somente quanto ao padding terminal, sem alterar fatos/asserts. Conector remoto confirmou identidade e aplicou somente migrations20261013191057/20261013191104 e Edge position-assessment v4, fontes iguais ao commit validado. Tarifa6193 ativa; nenhum teste real pago/débito executado. Produção2.5.2 publicada/verificada. CI inicial apontou aviso de erro sem ação na modal; corrigido com consulta de andamento explícita, sem retry pago. Teste actionableNotices PASS no checkout limpo (arquivos duplicados não rastreados do PO preservados).

## Publicação e preservação verificada

Runtime validado/publicado:6ec031db505af61af77971bd12c1f53358d49fba, origin/main/VPS no host srv1038882, raiz /opt/prisma e projeto Supabase ioldpnqqvobprjiontre. CI38452521988 PASS (foundation, ledger, deploy shell e audit). Banco/Edge publicados antes do web; negação anônima analysis/generation401 e token público inválido404. Table privada RLS ativa, sem DML para authenticated/service_role; load autenticado, finish somente worker. 11conjuntos protegidos e19funções/grants/config iguais antes/depois; somente tarifa nova6193 adicionada. Hashes normalizados de statements e fontes Edge iguais aos arquivos locais. Metadata financeira preservada, zero relatórios/débitos novos criados nos testes.

Web image b47545ade6b6ee8a79097282cfa1574589c30e5b093c55a1f32fe86cb6c9cc73 running/restart0; rollback tag prisma-web:rollback-before-6ec031db505a aponta para1fb4174052c388c9d9a17b7b0b20a62009cab54d5e398406fe819c832e46443d. O smoke imediato do release recebeu404 transitório após recriação; confirmou-se estabilização HTTP200, sem reconstrução/reexecução. Recibo manual de recuperação acompanha a publicação.3viewports1448/390/320 com versão2.5.2, sem erro/overflow;4rotas e7assets HTTP200, SHA6ec031d/categoria/método presentes no bundle e224assets anteriores com hash preservado. Somente prisma-web recriado; serviços adjacentes mantêm instâncias/imagens anteriores, baseline bounded em metadados.

Rollback compatível: retornar web à imagem anterior e Edge ao código925d4b3; não excluir tabela/relatórios/tarifas/cotações/reservas/histórico. Estrutura aditiva permanece compatível com consumidores anteriores. Uma desativação comercial futura deve preservar versões vigentes segundo gestão de Tokens.

Desvios de contrato: nenhum. Limitações: tests/browser sintéticos e provider simulado; qualidade de modelo vivo e jornada autenticada com candidatos reais NOT TESTED, não inferidas do smoke público. Há implementação real minimizada do provider, mas nenhum prompt com dados reais foi enviado apenas para testar. Evidência em production/after.json, edge-smoke.json, web-smoke.json, public-browser.json, vps.json e recibo release-recovery.json. A revisão final documental/ledger/contexto não reconstrói runtimes; o SHA de runtime permanece explícito e a sincronização dos checkouts acompanha o fechamento.
