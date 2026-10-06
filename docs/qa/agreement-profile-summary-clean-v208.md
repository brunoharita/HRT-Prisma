# Acordo e execução — Leitura limpa do Resumo v2.0.8

Versão 1.0.0, agreed/frozen, 2026-10-05. Autoridade: Bruno aprovou a proposta com todas as respostas abertas, fontes sob demanda e conteúdo integral preservado, e autorizou implementar/integrar/publicar v2.0.8. Baseline main/local/origin/VPS `a0037fceb9d35838c19767cab46d2b1590044c99`, produto2.0.6, webcfa50e0, worker8526717, Parser8682af7/gatewayd061cea. Classes C/B: UI integrada de leitura/fontes e registro de versão; nenhuma migração/worker/prompt/modelo novo. Reuso de Drawer Ant Design e adapter/cache existentes suficiente, sem biblioteca nova.

- D-UX01: ao abrir Resumo, síntese e oito seções completas já disponíveis, sem expandir/clicar/ver mais, sem cortar texto ou reduzir respostas. Remover somente duplicação criada pela UI nos destaques, preservando overview, cada afirmação/lacuna e perguntas complementares.
- D-UX02: consulta simples inicial, botão Mostrar fontes/Ocultar fontes controla apenas origens. Ativar não consulta fontes nem gera IA; acionadores de origem surgem por trecho. Ao escolher, painel lateral mantém resumo/contexto e informa fonte/snapshot/natureza/documento/página quando disponíveis. Fechar volta ao mesmo ponto; teclado e celular acessíveis. Sem referências/códigos/links de fonte espalhados no modo simples.
- D-UX03: preservar indicação discreta de interpretações da IA, distinção dos dados publicados, análise anterior identificada e motivos locais em português. Nenhuma falha de uma seção/fonte oculta respostas válidas das outras. Fonte selecionada pertence ao analysisId/snapshot; atualização invalida seleção antiga, fonte nova só após clique.
- D-UX04: fidelidade ao modelo visual aprovado: cabeçalho/abas atuais preservados; toolbar com título/meta e ação de fontes; narrativa principal larga; oito seções abertas em duas colunas com altura livre, uma no celular. Painel de investigação à direita, completo no celular. Sem sidebar explicativa permanente, destaques duplicados, toggle de respostas ou truncamento. Conteúdo e navegação global da imagem são ilustrativos.
- D-REL01: publicar v2.0.8 seletivamente, validar áreas afetadas, AoT/contextos/CI/smoke/rollback/sincronização. Número8 é decisão explícita do PO: salto de7 documentado, nenhum histórico/entrega fictícia.
- P-01: não ocultar respostas por controle de fontes, inventar/resumir conteúdo, disparar IA/consultar trechos ao ligar fontes, misturar snapshot anterior/novo, expor códigos/PII integral, alterar Perfis humanos/autoridade/tenant/modelos/perguntas/schema.
- F-01: conteúdo novo de IA, backend/migrações, matching/Parser/Knowledge, backfill, curadoria humana e navegação global.
- A-01: implementação em componentes/tokens atuais; estado de fontes por abertura da tela, cache temporário; testes sintéticos sem LLM/produção mutacional. Numeração opcional explícita no registro mantém contagem derivada como padrão, sem inventar entrega7.
- Q-01: nenhuma decisão material pendente.

Supersede somente a topologia antiga70/30 e60/40 de D-S03/A-S01 do acordo anterior: nova apresentação não muda a preservação por seção D-S01/02. Supersede o número público2.0.6 para este movimento. Perguntas/resultado1.1.0/prompt/modelo/histórico continuam os mesmos.

## Mapa de impacto e aceite

| Área/capacidade | Relação | Baseline / prova proporcional |
| --- | --- | --- |
| Resumo UI/CSS | direct |36 renders anteriores1416/390; texto completo/oito eixos/sem overflow, falhas parciais/ausência/fallback, visual do mockup com mesma fixture/viewport |
| Consulta de fontes/cache/snapshot | direct |lazy source por clique, refresh fecha origem anterior; ativação/fechamento/troca/erro/retry, texto não some, zero geração extra, teclado/foco/scroll |
| Registry/login/sidebar | plausible_indirect |v2.0.6 no registry derivado; v2.0.8 com salto declarado, históricos/futuros sem override derivados normalmente, negativos de numeração |
| Perfil/abas/publicação | critical_transversal |componentes de leitura compartilhados; person-flow dirigido, UI/header/abas e tipos/build; nenhuma mutation/auth nova |
| SQL/worker/IA/Parser/matching | no_impact_identified |contratos/adapter inalterados; diff/release plan e imagens operacionais preservadas, testes domínio dirigidos sem LLM |
| Produção web | direct |webcfa50e0; CI/SHA/HTTP assets novos/anteriores/rollback, versão e sincronização; sem rebuild de worker |

CA-UX01..04: fixture longa compara todos os textos antes/depois da ação de fontes, oito seções sem clique e sem line-clamp; citações ausentes inicialmente; sourceReads/request contados; origem fecha após mudança de analysisId; motivos/interpretation/previous atuais visíveis. Desktop1416/mobile390, screenshots de consulta/investigação da mesma base e scroll mantido ao fechar. CA-REL01: registry8 sem entry7 inventada, tipos/build/context/lint/testes dirigidos/CI/plan/smoke PASS e AoT.

## Prompt congelado

Executar todos D-UX01..04/D-REL01 sob P-01/F-01/A-01 e os critérios acima. Imagem aprovada é alvo normativo de composição do Resumo, não prova de implementação nem limite de conteúdo: narrativa/toolbar/oito blocos abertos, fonte opcional ao lado. Dados da imagem e header global são demonstrativos; não redesenhar shell ou reduzir as perguntas. Validar mesmo estado/dados/viewport para composição e não declarar QA real autenticada sem executá-la.

Identificação da referência discutida e aprovada: `docs/qa/evidence/profile-summary-clean-v208/approved-reference.png`, SHA256 `b14e8dac25dfe4a6e7411877717fc40fe188cb388b74b78ef0317b3558b4ff55`. Registro administrativo da mesma referência, sem alteração dos requisitos congelados.
