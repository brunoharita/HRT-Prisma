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

151SQL PASS em PG17 descartável local, incluindo compatibilidade/grants/corpo/escopo e regressão Owner.27Node/tooling PASS. 189browser PASS (75 novos,114 regressão), tipos/build/lint/foundation/contexto PASS. CI branch39042015547 SUCCESS; resultados funcionais browser são locais. Serviço browser é determinístico e sintético; não prova jornada humana em produção. Produção será verificada sem alterar cadastros reais e sem publicar Edge/outros serviços. Sem QA remoto independente disponível; evidência integrada local cobre o boundary.

## Publicação / fechamento

Runtime3.0.3 a67c32b2824585e5006102ad33c0dbc155aaafe1 integrado em main, publicado somente web e migration nova20261017143000, alias remoto20261017144545. Função produtiva conferida igual fora de3substituições exatas; ACL/search_path preservados. Super/Owner/Recruiter com mesma projeção/escopo1.0.0 e datas iguais às linhas armazenadas; usuário comum recusado42501. Contagens7usuários/3grupos/4empresas/9vínculos e fingerprints integrais de grupos/empresas iguais antes/depois; sem alterar dados reais para testar. Advisories security antes/depois iguais, excluído observed_at;37informações RLS sem policy,4avisos função anon,135função autenticada e1senha vazada já existentes, nenhum novo. Critérios/remediação: [Supabase Database Linter](https://supabase.com/docs/guides/database/database-linter). Não declara segurança integral do projeto.

22smokes públicos PASS: quatro rotas200, sete assets atuais/sete anteriores, versão/SHA, navegador anônimo protegido e ausência de exceções. HEAD imediatamente após recriação retornou404 transitório; verificações independentes confirmaram recuperação sem rebuild. Web4455244e9ae3/imagemfa91a97ff961/restarts0; demais5contêineres/imagens/restarts iguais ao baseline, comparados automaticamente. Rollback `prisma-web:rollback-before-a67c32b28245`/imagemb55f976a66d6; SQL forward compatível1.0.0 permite rollback do frontend sem reverter dados. Edge/parser/gateway/e-mail/synthesis/Traefik preservados. Evidências production.json/public-smoke.json/containers e screenshots.

Fechamento de evidência/ledger/contexto em commit posterior, sem nova mudança funcional ou rebuild. CI main e fechamento conferidas no encerramento; status final no chat e nos checks dos commits. Resíduos antigos de manutenção Git de worktrees com permissão negada preservados, sem impedir commit/FF; trabalho alheio/untracked canônico preservado.

## Conclusão

D/P/CA PASS nos limites declarados, sem desvio material. Jornada humana autenticada de produção NOT TESTED; SQL readonly e fixture não a substituem. Entrega exige CI final e sincronização Git/VPS, sem repetir testes funcionais válidos.
