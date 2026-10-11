# Contrato de Acordos — Foco operacional v2.4.1

Versão 1.0.0, agreed em 2026-10-11. Autoridade: Bruno aprovou implementar os 16 pontos da análise de UX e utilidade, integrar em main e publicar 2.4.1. Baseline local/origin main a085c6eb9ca1ac276569a8b5cdce547038daa062, produto 2.4.0. Risco C: reorganização integrada de apresentação, sem alteração de domínio/backend.

## DEVE

- D-01: retirar aviso M8 do Início; manter informação útil em ajuda, com linguagem de produto.
- D-02: retirar contador de Conhecimento e monitoramento de fontes do Início; preservar consulta, checagem explícita e resolução em Conhecimento → Fontes, com a mesma autoridade. Não inventar impacto operacional para exibir alerta no Início.
- D-03: princípios de confiança acessíveis pelo botão Como o Prisma trabalha, sem bloco permanente.
- D-04: no Resumo da Pessoa, trocar prévias de documentos, atividade e ações rápidas por acessos compactos a Documentos/Histórico/ações existentes. Pendências acionáveis permanecem imediatas.
- D-05: lista Pessoas encontradas mantém trajetória, cobertura, pendência relevante e situação no acompanhamento. Método/revisão/detalhes secundários ficam em Entender a análise, preservando decisões e acesso às fontes.
- D-06: Recalcular score fica em Outras ações, com loading e indicação contextual das condições já conhecidas, sem recálculo automático.
- D-07: indicadores do acompanhamento em faixa compacta; contagens e filtros preservados.
- D-08: detalhe do acompanhamento prioriza próximos passos/entrevista/decisão; resumo de score/cobertura e alertas permanecem. Explicação/versões/fontes sob Consultar análise e evidências.
- D-09: histórico do acompanhamento acessível por botão; mostrar autor, data e campos alterados em linguagem humana. Dados técnicos anteriores/posteriores preservados em detalhe adicional.
- D-10: detalhe documental prioriza situação e recuperação/revisão; ID, tentativas e auditoria ficam sob Detalhes técnicos e histórico. Dados e ações existentes preservados.
- D-11: legenda de Processamento e revisões sob Entender os estados, próxima aos filtros; estados e pendências permanecem.
- D-12: avaliações individuais anteriores fechadas inicialmente em todos os viewports, com quantidade e consulta preservadas.
- D-13: versões/método/linha do tempo de Verificações sob Método e histórico; resultado/limitações e ações do convite permanecem imediatos.
- D-14: revisão no Banco de Itens mantém duplicidade/similaridade imediatas; fingerprint/provedor/schema sob Origem e detalhes técnicos.
- D-15: remover da navegação de Configurações abas vazias e controle Editar estrutura indisponível; não criar capacidades fictícias.
- D-16: estrutura consultiva de competências em Conhecimento → Estrutura de competências; ajuda contextual na classificação reutiliza definições existentes. Compatibilidade do endereço antigo preservada sem duplicar a área na navegação.
- D-17: preservar áreas já adequadas: evidências por informação, pendências/conflitos, atividade por questão e suas limitações, governança especializada e revisão humana de questões.
- D-18: responsivo/teclado/loading/rascunhos/retorno preservados; main + release 2.4.1, rollback e smoke de destinos derivados do diff.

## PROIBIDO

- P-01: apagar histórico/evidências, ampliar autoridade/tenant, mudar score/matching/IA/tarifa/envio/regras de prova ou criar escolhas humanas automáticas.
- P-02: abertura/expansão/navegação iniciar IA, recálculo, envio ou mutação; esconder pendência, conflito ou limitação material para simplificar a tela.
- P-03: novos destinos, bibliotecas, custos ou alteração de serviços por proximidade; tocar arquivos alheios.

## FORA DE ESCOPO

- F-01: redesenhar regras de taxonomia, cobrança, auth, backend ou dados. Auditoria UI não autoriza limpeza de registros.
- F-02: novas integrações, funcionalidades planejadas, sugestões inventadas, alteração do conteúdo de currículos e revisão de toda a navegação do sistema.

## AUTONOMIA

- A-01: reutilizar Ant Design/PrismaDisclosure, componentes e serviços existentes; escolher drawer/collapse/modal acessível, espaçamento e nomes claros dentro dos destinos aprovados.
- A-02: fixtures sintéticas, testes dirigidos e alias de URL legado; nenhuma operação com Pessoa real necessária para essa mudança.

Q: nenhuma pendência material. Screenshots anteriores são contraexemplos, não um novo alvo visual; comparar baseline/resultado com mesmas fixtures e viewports 1448 e 390, também 320 para quebra de layout.

## Critérios de aceite

- CA-01: cada D-01..D-16 tem prova de ausência no local antigo e acesso/conteúdo no novo, inclusive teclado e mobile.
- CA-02: D-17/P-01/P-02: regressão dos callbacks, seleção/rascunho, decisões não pré-marcadas, falha/loading, fontes e histórico; nenhum write passivo ou tráfego externo nas fixtures.
- CA-03: D-18: tipos/build/contextos, revisão integral do diff, CI branch/main, SHA servido/2.4.1/HTTPS/rollback/serviços preservados.

## Mapa de impacto prévio

| Área/capacidade | Relação | Baseline/regressão proporcional |
| --- | --- | --- |
| Início e Conhecimento/estrutura | direct | Componentes existentes, fontes/checar/resolver/escopo; fixtures de role e tabs, alias antigo |
| Pessoa: Resumo/Documentos/Histórico | direct | Perfil vigente separado de Documento/Tentativa; fixture person-unified, pendências e navegação |
| Descoberta e acompanhamento | direct | stable-score/follow-up, mesma composição/dados; expansão/fontes/score/formulários/filtros/drag/rascunhos |
| Documento/processamento | direct | person-unified/detalhe; recuperar/revisar/reprocessar/diagnóstico e histórico |
| Avaliação/processo/verificações/banco | direct | fixtures de provas e governança, seleção/revisão/envio/resultados/legacy/limitações |
| Componentes compartilhados e shell | plausible_indirect | CSS scoped + registro de navegação; mobile/overflow/retorno e versão |
| Acesso/tenant/loading | critical_transversal | Não muda escritores/services/gates; negativos de role e ausência de writes passivos; loading regressão |
| Banco/Edge/Parser/Synthesis/mail e dados produtivos | no_impact_identified | Reorganização JSX/CSS; conferir diff/plano e identidades de serviços antes/depois, sem novas escritas |
| Tokens Prisma | plausible_indirect | App shell compartilhado; tela/quote/mensagens preservadas por regressão dirigida |

## Execução congelada

Implementar integralmente este contrato v1.0.0 aprovado, sem nova aprovação administrativa. Registrar cada D/P no AoT com implementação, teste, evidência e limites. Não declarar PASS com prova necessária ausente. Publicar somente destinos exigidos pelo diff comprometido.
