# AoT — Grupos recolhíveis 3.0.2

Contrato: `docs/qa/agreement-groups-accordion-v302.md`, versão1.0.0, aprovado no chat17/10/2026. Baseline43e70d3/runtime3.0.1 aa580ac. Evidências em `docs/qa/evidence/groups-accordion-v302/`.

## Matriz de acordos

| ID | Implementação | Teste / evidência | Status |
| --- | --- | --- | --- |
| D-UX-01 | details/summary controlados, um grupo aberto; borda/gap/header e resumo | Browser teclado/exclusividade/estados; screenshots1448/1024/390/320 | PASS |
| D-UX-02 | Ações/metadata/limite, faixa de preparação e tabela; mesmos handlers | Browser criação, capacidade, vínculos, rascunho/erro e CTA Owner | PASS |
| D-UX-03 | Busca abre primeiro resultado; seleção por ID; CSS local empilha empresas | Browser busca/empty/refresh/overflow e mobile grid | PASS |

## Proibições e fora de escopo

| ID | Prova | Status |
| --- | --- | --- |
| P-01 | Serviços/guards/handlers inalterados; quatro perfis e zero chamadas por disclosure; diff sem backend | PASS |
| F-01 | Apenas página, CSS próprio, registro de versão, fixture/testes e docs | PASS |

## Mapa de impacto e preservação

Sem novas dependências ou reclassificações em relação ao acordo.

| Capacidade | Relação | Baseline / regressão / evidência | Status |
| --- | --- | --- | --- |
| Disclosure/busca/responsividade | direct | Cards3.0.1; browser/screenshot em quatro larguras | PASS |
| Editor/vínculos/Owner/refresh | plausible_indirect | Mesmos callbacks; serviço sintético com criação/vínculos explícitos, erro e confirmação de saída | PASS |
| Escopo e autoridade | critical_transversal | Super/Owner/Recruiter/comum no fixture; mesmas consultas e condições, sem backend | PASS |
| Versão/release/contexto | direct | Teste3.0.2, tipos/build/contexto, CI e publicação seletiva | NOT TESTED |
| Knowledge/talentos/Tokens/Auth/banco/Edge | no_impact_identified | Sem mudanças nessas lógicas; CSS isolado por classe; conferir plano sem destinos adicionais | PASS |

## Fidelidade visual

Referência preservada em `reference.html` com hash no acordo. Comparação com nomes/contagens iguais, primeiro grupo aberto, mesma largura1448/390 e recorte dos grupos com a mesma largura útil: `reference-groups-*.png` versus `delivered-groups-*.png`. Tela completa `accordion-*.png` e preparação `draft-*.png`. Preservados topologia, hierarquia, espaçamento entre grupos, resumo em duas linhas, status lateral, ações no topo direito, metadados e tabela/blocos mobile. AntD/tokens/tipografia e navegação Prisma mantidos conforme A-UX-01. Explicação integral do limite e sequência de ativação mantidas por D-UX-02, com pequeno acréscimo de altura. Referência sem host de visualização não carrega os ícones do host; entrega usa ícones existentes. Inspeção visual final dos pares desktop/mobile e preparação aprovada pela engenharia conforme A-UX-01.

## Desvios e decisões

Nenhum desvio material identificado; nenhuma mudança adicional de produto. Erros iniciais do harness: referência oculta dependia do host de tabs e contagem de botões passou a considerar apenas o grupo expandido; corrigidos no teste, sem contornar comportamento do produto.

## Validação / publicação

164 checks browser PASS (50 do novo disclosure/responsividade e114 de regressão),23 Node/tooling PASS. Tipos e build web PASS; diff revisado sem mudança nos handlers ou serviços. Lint/foundation/contexto/CI/publicação ainda em execução. Não se aplica QA remoto separado para este movimento web. Browser local usa serviço determinístico, sem LLM/banco e sem dados reais; não prova jornada autenticada humana em produção. Smoke produtivo público e CI pendentes; PASS das linhas funcionais refere-se ao browser local. Linha release só encerra com publicação registrada abaixo. Avisos AntD legados e tamanho de bundle não alterados por este escopo.
