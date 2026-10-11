# Acordo, execução e AoT — Registros legíveis, correção 2.4.1

Acordo v1.0.0, 11/10/2026. Bruno autorizou melhorar qualquer apresentação de JSON ao usuário. Baseline main/origin e606ca5ca787fcc4d899206d8da6affb99580c25. Correção da entrega 2.4.1, sem nova entrada no registro de versões. Risco C, apresentação web.

## Acordo congelado e execução

- D-01: substituir todos os registros serializados exibidos nas telas por campos/listas legíveis: referência e histórico ocupacional, origens dos requisitos, critérios/evidências da verificação, histórico do acompanhamento e valores anteriores/posteriores da revisão de Perfil. Buscar também outros usos de serialização no frontend.
- D-02: nomes conhecidos e relações conhecidas em português; listas, valores nulos, falsos, zero, campos novos e identificadores completos preservados. Valores e categorias desconhecidos não ganham significado inventado. Registros aninhados consultáveis com teclado/mobile.
- D-03: preservar informações, evidências, proveniência, histórico, permissões, callbacks, rascunhos, decisões humanas e loading. Abrir registros não causa consultas adicionais, IA ou escrita. Texto extraído de documentos continua literal, mesmo quando contenha código.
- D-04: main/produção, apenas destinos derivados do diff; CI, visual desktop1448/mobile390/320, rollback, smoke e sincronização. Registrar limitações.
- P-01: não apagar registros, truncar conteúdo histórico para simplificar, reinterpretar JSON interno de persistência, escolher decisões ou mudar backend/tenant/score/regras.
- P-02: nenhum bloco JSON renderizado pela aplicação nos registros inventariados; texto original fornecido por pessoa não é um registro serializado pela aplicação.
- F-01: novas regras de taxonomia, verificação, IA, schema ou integrações; ocultar erros/pendências; reformular toda a navegação.
- A-01: reutilizar React, componentes Prisma/Ant Design e listas de definição acessíveis; componente compartilhado para campos aninhados e traduções determinísticas. Nenhuma dependência nova.
- Q: nenhuma pendência. Screenshot é contraexemplo.
- CA-01: inventário e verificação de todos os renderizadores JSON e respectivos acessos, inclusive teclado, valores desconhecidos e falsos/zero/nulos/listas.
- CA-02: regressão dos componentes afetados; nenhum write na consulta; conteúdo completo e ausência de overflow, validação de tipos/build/testes dirigidos/contexto.
- CA-03: CI e main/VPS confirmados, release2.4.1 servida, rollback e demais serviços preservados.

Implementar D-01..04, vedar P-01/02, respeitar F-01; A-01 governa apenas apresentação. Autorização de Bruno nesta conversa, sem nova decisão de produto.

## Mapa de impacto prévio

| Capacidade | Relação | Baseline e prova proporcional |
| --- | --- | --- |
| Referência ocupacional/origens/histórico | direct | snapshot/seleção originais; registros legíveis, fonte/versão/ID e desconhecidos preservados, fixture real do painel |
| Verificação: critérios e evidências | direct | limiares/dimensões/evidência originais; render legível e teste da página |
| Acompanhamento: histórico | direct | antes/depois, ator/data, rascunho e score; fixture de follow-up e consulta sem escrita |
| Revisão de Perfil: histórico | direct | valor anterior/posterior íntegro, eventos/formulários preservados; fixture person-unified |
| Comparação para publicação de Perfil | direct | descoberta na busca de serializers: preview podia retornar JSON ou coerção de objetos; resumo legível e campos completos, escolhas de publicação/escritores preservados |
| Componente/CSS compartilhado | plausible_indirect | estilos novos scoped, demais registros/widgets não alterados;1448/390/320 |
| Auth/tenant/loading/dados | critical_transversal | sem alteração de serviços/escritores; nenhum write/query passivo e tráfego externo bloqueado nas fixtures |
| Banco/Edge/Parser/Synthesis/mail/cobrança | no_impact_identified | nenhum arquivo/contrato dessas camadas alterado; release webonly e identidades remotas antes/depois |

## AoT

### Inventário e implementação

| Apresentação anterior | Implementação |
| --- | --- |
| PositionTaxonomyPanel: método, referências, histórico de interpretações, origens dos conhecimentos (4) | ReadableRecord; relações conhecidas traduzidas, campos/versões/fontes completos |
| CompetencyVerificationPage: regras da rubrica e snapshot de evidências (2) | ReadableRecord, mantendo as regras de correção e evidências originais |
| FollowUpHistory: snapshots anterior/registrado (1) | Campos aninhados legíveis; resumo operacional e ator/data/fuso preservados |
| StructuredReviewPanel: valores da alteração (1) | Valores anteriores/revisados íntegros; removida a truncagem anterior de180caracteres |
| ProfileDeltaPage: preview serializado e fallback (1) | Resumo legível e expansão de campos completos de experiência/formação/outros; ações de publicação intactas |

Busca de JSON.stringify/JSON.parse/pre/code no frontend: os demais serializers são persistência, fingerprints, igualdade e controle de rascunho. Texto extraído no PersonWorkspacePage é conteúdo literal do documento e permanece literal. Nenhuma dependência ou camada de dados alterada.

ReadableRecord utiliza listas de definição, listas ordenadas e details nativos; preserva campos desconhecidos e todos os valores. Agrupa IDs em Identificadores e rastreabilidade. CSS scoped organiza objetos aninhados em largura completa e empilha os campos no celular. A validação descobriu que a grade implícita da comparação de Perfil podia crescer com o alerta de pendência em320px; track minmax(0,1fr) e min-width do alerta corrigem a leitura sem mudar seu conteúdo/ação.

### Prova e preservação

- Tipos web, build TypeScript e build web PASS;23testes Node dirigidos (registros/taxonomia/verificação/delta),2auditorias de fonte PASS. Logs locais em tmp/readable-records-*.log; relatório consolidado nesta pasta de evidências.
- Regressão do acompanhamento30checks PASS em1448/390/320: ações, rascunho, score, histórico, fuso e ausência de writes preservados.
- Cenários de apresentação e teclado72checks PASS em1448/390/320. Comparação antes/depois usa o mesmo registro sintético e viewport, com baseline e606ca5 imutável. Sem referência normativa nova; screenshot do usuário é contraexemplo. IDs completos ficam disponíveis sob demanda.
- Dados sintéticos nos componentes reais, tráfego externo bloqueado. Sem banco, sessão autenticada de produção ou execução de IA. Backend/auth/tenant preservados por ausência de modificação nos escritores/serviços e consulta sem writes; smoke público e preservação de containers confirmados abaixo.

| Regra | Implementação / evidência | Status |
| --- | --- | --- |
| D-01 | Inventário9contextos; componentes, auditoria e72checks de apresentação; bundle publicado | PASS |
| D-02 | Labels, valores completos e teclado/mobile comprovados em72checks | PASS |
| D-03/P-01/P-02 | Escritores e escolhas intactos; sem writes; histórico completo; documento literal preservado | PASS |
| D-04 | CI branch/main, SHA/bundle,23HTTP, login1448/390/320, rollback,209assets e9serviços preservados; Git/VPS alinhados | PASS |

### Publicação e fechamento

Main/origin/VPS no SHA funcional b485676f6af225971ba6807f55c52eff8bc3eb7b. CI branch38184842811 e main38184944260 success,890testes. Site https://prisma.hrtsolutions.com.br serve2.4.1 e o SHA funcional no bundle; classes/textos novos confirmados em assets públicos.23HTTP200, login nos três viewports sem erro/overflow.16checks operacionais de preservação PASS: runtime novo running/zero restarts, rollback igual à imagem80ab8f1b anterior,209assets byte a byte preservados;212assets após a entrega. Os nove outros containers mantêm identidade/imagem/estado/health/restarts/início, incluindo Paddle unhealthy/exited preexistentes.

O smoke imediato do publisher retornou404 na recriação do container (exit22); validações posteriores comprovaram estabilização. Nenhum segundo rebuild. Recibo, baseline/after, CI, hashes públicos, screenshots e testes do bundle em `docs/qa/evidence/readable-records-v241/production/`. Fechamento documental sincroniza fontes em main/origin/VPS sem reconstruir runtime. Arquivos alheios preservados e servidores de fixture encerrados.

Limite: jornadas autenticadas com candidatos reais NOT TESTED. A prova funcional/visual utiliza dados sintéticos nos componentes reais; o smoke de produção é público e de infraestrutura. Sem IA paga, escrita de negócio ou alteração de banco/Edge/serviços. Nenhum desvio de contrato.
