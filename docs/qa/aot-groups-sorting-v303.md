# AoT — Ordenação de grupos e empresas3.0.3

Contrato `docs/qa/agreement-groups-sorting-v303.md`1.0.0, aprovado no chat17/10/2026. Baseline6603751/runtime3.0.2 fe55150. Evidências `docs/qa/evidence/groups-sorting-v303/`.

## Matriz de acordos e proibições

| ID | Implementação / prova | Status |
| --- | --- | --- |
| D-01 | Comparador pt-BR/números/empates/duas direções; mesma função para grupos e empresas;27Node/tooling, browser | PASS |
| D-02 | createdAt/updatedAt do banco; comparação real SQL por registro e triggers existentes; null/inválidos por último, data exposta no critério | PASS |
| D-UX-01 | Toolbar junto à busca, reflow mobile; mesmos details/ações; browser busca/refresh/teclado/seleção/overflow | PASS |
| P-01 | Função real igual fora de3substituições, ACL igual;151SQL com negativos e regressão Owner/administração | PASS |
| P-02 | Aceitação1.0.0/1.1.0 e desconhecido recusado; nova migration apenas, sem reescrever histórico | PASS |
| F-01 | Diff sem novos fluxos, dependências, datas agregadas ou outras páginas | PASS |

## Mapa de impacto e preservação

Mesmo mapa do acordo; nenhum destino adicional descoberto.

| Área | Relação | Baseline / evidência | Status |
| --- | --- | --- | --- |
| Ordenação/disclosure/busca | direct |3.0.2; comparador e browser com todos critérios/direções | PASS |
| Consulta/datas/contrato | direct |1.0.0, triggers existentes;151SQL local em PG17, legacy e novo contrato | PASS |
| Autorização/escopo | critical_transversal | Mesmos filtros/ator/ACL; quatro perfis e negativos SQL/browser | PASS |
| Mutação/Owner/vínculos/planos | plausible_indirect |151SQL incluem129 anteriores, rollout não altera corpos de mutação | PASS |
| Histórico/dados/updated_at | plausible_indirect | Projeção sem escrita; datas SQL equivalentes e avanço em update local; sem backfill | PASS |
| Knowledge/talentos/Tokens/Edge/serviços | no_impact_identified | Nenhum consumidor/lógica desses fluxos muda, planos/serviços conferidos | PASS |

## Fidelidade visual

Imagem do pedido é referência da composição3.0.2; conteúdo ilustrativo. Grupos recolhíveis, resumo/ações/metadados e empresas mantidos. Único acréscimo: controles ao lado da busca, quebrando para nova linha no mobile; data só no critério correspondente. Screenshots1448/390/320 da mesma fixture ilustrativa anterior comprovam composição e reflow, comparação com evidência3.0.2 de mesma largura/dados/estado inicial. A-01 permite controle nativo acessível com tokens Prisma: dropdown AntD apresentou posicionamento fora do viewport no fixture, sem resultado funcional utilizável; escolha HTML select elimina essa dependência de overlay e valida teclado. Nenhuma lib nova ou mudança em Select de outros fluxos. Inspeção final dos renders1448/390/320 PASS; toolbar legível e nenhuma rolagem horizontal.

## Desvios / mudanças de autoridade

Nenhum desvio de produto identificado. Datas pertencem ao próprio registro, sem herdar datas das empresas ao grupo, conforme acordo. Falhas de harness: opção virtual aria não clicável; posicionamento de overlay no fixture levou ao controle nativo. Teste antigo de Acessos selecionava a primeira linha, agora reordenada; corrigido para selecionar a empresa pelo nome e confirmar o mesmo ID. Erro de tipos da fixture (índice potencialmente ausente) corrigido com null, sem mudar regra de produto. Migração rejeita baseline inesperado em vez de substituir silenciosamente função divergente.

## Validação / ambientes

151SQL PASS em PG17 descartável local, incluindo compatibilidade/grants/corpo/escopo e regressão Owner.27Node/tooling PASS. 189browser PASS (75 novos,114 regressão), tipos/build/lint/foundation/contexto PASS. CI/publicação pendentes; resultados funcionais são locais. Serviço browser é determinístico e sintético; não prova jornada humana em produção. Produção será verificada sem alterar cadastros reais e sem publicar Edge/outros serviços. Sem QA remoto independente disponível; evidência integrada local cobre o boundary.

## Publicação / fechamento

Pendente. Publicar somente migration20261017143000 e web após CI. Rollback web anterior permanece compatível com1.0.0; SQL forward aditivo, sem alterações de dados. Conferir função/ACL/datas/contagens e advisors antes/depois, versão/SHA/assets públicos, demais contêineres e sincronização. Nenhum D funcional sem prova; fechamento depende da evidência operacional abaixo.
