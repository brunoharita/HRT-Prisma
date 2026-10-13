# AoT — Atividade legível e análise por IA

Contrato: docs/qa/agreement-assessment-activity-v252.md v1.0.0. Baseline925d4b3ca619b5f302f8fe4d737cb83a473e123e. Estado local; Q-01 tarifa ainda pendente. Não publicado em main/produção.

## Matriz de acordos

| Regra | Implementação | Evidência local | Estado |
| --- | --- | --- | --- |
| D-01/02 | AssessmentActivity: textos, campos técnicos completos e expansão na largura inteira; mobile em cartões | 68browser em1448/768/390/320, timezoneTokyo/horárioBrasília, teclado, null/não aplicável/zero e dados originais | PASS |
| D-03 | Cotação/confirmar/cancelar, cache gratuito e acesso explícito | fixture com tarifa arbitrária1234, nenhuma IA por leitura; tarifa real nova ainda não escolhida/ativada | PARTIAL |
| D-04/05/06 | domínio puro, AI enum estrito, limites/evidências e dados minimizados | 4Node/5Deno novos+5Deno existentes, projeção sem PII/rawpayload, rejeição de acusações/IDs não sustentados | PASS |
| D-07 | snapshot privado, RPCs/ledger/histórico, cache/replay, falha/liberação e resultado anterior | 185SQL rollback local incluindo consumidores anteriores,2disputas paralelas em banco descartável local removido | PASS |
| D-08 | componente compartilhado de resultados históricos/atuais, feedback e contextos | 68browser dirigido,82portal e38preparação/resultado, tipos/build PASS | PASS |
| D-09 | branch isolada, contrato/mapa/ADR; release2.5.2 autorizado | publicação depende Q-01 e gates finais | NOT TESTED |
| P-01/02/03 | sem novas observações ou decisões/Score; chamada paga explícita; código rejeita saída fora dos fatos | testes de projeção/validação, simulações sem modelo vivo, replay/saldo/falha; nenhuma alteração de tarifa presumida | PASS |

## Impacto e preservação

Mapa inicial no acordo. Novidade: análise estruturada por tentativa com IA organizando fatos; apresentação de acontecimentos e consulta de análises salvas. Preservação: eventos originais, respostas, correção, Score, perfil, autoridade humana e consumidores existentes; snapshot/metadados e Tokens com escopos existentes. Coleta e funções de público/save/submit/eventos não alteradas; Edge compartilhada recebeu somente ação autenticada analyze_activity. Limite de baseline: único projeto remoto existente atende o app; não foi criado outro projeto/ambiente ou gasto de infraestrutura. QA sensível executada em PostgreSQL local descartável confirmado e fixtures isoladas. Dados reais e LLM vivo NOT TESTED.

## Fidelidade visual

Imagem do PO é contraexemplo técnico/conteúdo; referência normativa é o modelo textual aprovado: análise antes da lista, resumo em português e evidências expansíveis usando largura disponível. Capturas em docs/qa/evidence/assessment-activity-v252/browser. Revisão visual de analysis-1448/events-390 PASS, topologia/densidade/ações e campos técnicos sob demanda conferidos; render usa dados sintéticos; valores exemplificativos são fixtures e não decisões/inferências sobre Diego.

## Pendência para fechamento

Q-01: novo consumidor de IA não possui tarifa comercial aprovada. Proposta6.193 Tokens por análise concluída enviada por pergunta assíncrona; não presumir resposta nem ativar em produção. Versão2.5.2 e publicação serão fechadas depois da decisão e das validações necessárias. Sem autorização nova necessária para checkpoints administrativos já aprovados.

A navegação por evidências usa o snapshot imutável da análise, inclusive eventos recebidos depois da consulta inicial da tela; limpeza da seleção volta aos dados atuais recebidos. O DTO inclui organização/tentativa e rejeita troca de escopo. A UI diferencia análise feita antes da conclusão da tentativa. Custos de testes são arbitrários1234/17, não tarifa aprovada. Coleta existente é parcial e eventos são interpretados como registros associados à questão, sem certificar atividade real/intenção; nova coleta ou correção de trackers não entrou no diff.

Lint/check-contexto no snapshot limpo e22tooling PASS. SQL/log normalizado somente quanto ao padding terminal, sem alterar fatos/asserts. Conector remoto foi usado apenas para leitura de identidade/metadata/tarifas existentes; nenhuma migration, função ou cobrança nova foi aplicada. Produção permanece2.5.1; Q-01 impede fechamento/publish2.5.2.
