# Avaliação do processo — seções guiadas 4A, v2.3.5

Contrato e execução v1.0.0, 10/10/2026. Autoridade: Bruno aprovou 4A e solicitou implementação/publicação em 2.3.5. Baseline local main 45366681238b6927b579ab1a6c1a8ae23b1ffd8e; runtime anterior documentado 9212c5c, já v2.3.5, será verificado operacionalmente. Classe B, apresentação e navegação da página existente; reutilizar Ant Design, PrismaPage, tokens e serviços existentes, sem nova dependência.

## Acordo congelado

- D-UX-01: seguir a referência normativa `docs/product/proposta-avaliacao-processo-2026-10-10/variacoes-secoes-guiadas/4a-azul-equilibrado.png`: duas seções simultâneas, Configuração e Requisitos da Posição; desktop com faixa esquerda numerada/título/descrição de aproximadamente 20%, controles à direita; quatro campos em linha e composição abaixo; requisitos em chips; ação Montar avaliação abaixo à direita; histórico separado abaixo. Sem etapas adicionais.
- D-UX-02: usar superfícies brancas, faixas azul claro, seleção azul suave, bordas perceptíveis e ação azul Prisma. Mobile empilha título e conteúdo das seções, campos 2×2, requisitos legíveis em lista, ação com largura disponível; sem corte ou overflow horizontal. Sidebar/menus/marca seguem shell real, não os menus ilustrativos da prancha.
- D-03: preservar defaults, validação de múltiplos de 10, distribuição, personalização de requisitos, montagem explícita, déficit/IA confirmada, revisão, convites, reutilização, resultados/atividade e histórico. Mostrar os requisitos selecionados também fora da edição; Personalizar requisitos mantém controle explícito da seleção. Preservar retorno à tela anterior, destino acompanhamento, atualização, feedback e bloqueios existentes.
- D-04: integrar em main e publicar somente web, mantendo versão 2.3.5 solicitada, novo SHA, CI, rollback, smoke e sincronização. Não reescrever tags ou apagar a correção anterior do Kanban.
- P-01: nenhuma alteração de regras de prova, IA, envio, matching, dados, autorização, backend ou contratos persistidos; nenhuma operação automática por abrir a página ou reorganizar seções.
- F-01: redesign de revisão/convites/resultados ou outras telas; novos menus, campos, etapas, bibliotecas ou regras.
- A-01: semântica acessível, CSS scoped, componentes existentes, espaçamento e ornamentação menores; fixtures sintéticas e evidência proporcional.
- Q: nenhuma decisão material pendente.
- CA-UX-01/02: comparação com referência em mesmo estado/dados (20/Fácil/Banco/60, 13 requisitos e histórico), desktop 1448 e mobile 390; também 768/320, geometria de seções/campos/chips/CTA e ausência de overflow.
- CA-03: regressão funcional existente e provas de personalização, validação, atualização pendente/falha, histórico e ausência de escrita passiva; tipos/build/contextos.
- CA-04: plano web-only, CI, SHA/versão/bundle/HTTPS/rollback e serviços preservados; documentar limites de QA sintético e smoke autenticado.

## Mapa de impacto antes da implementação

| Área | Relação | Baseline/capacidade protegida e regressão |
| --- | --- | --- |
| Preparação/layout/requisitos | direct | Página e handlers existentes; comparação 4A e campos/seleção/defaults/validação/CTA |
| Cabeçalho/retorno/atualização/histórico/reutilização | direct | Destinos e callbacks existentes; navegação, loading/falha, consulta e reutilização explícitas |
| Revisão/convites/resultados/modais | plausible_indirect | CSS da página compartilhado; regressão browser de montagem, edição, confirmação IA, envio em lote sintético, atividade e histórico fechado |
| Shell/Kanban/serviços | no_impact_identified | Sem mudança de componentes compartilhados ou CSS de Kanban; diff scoped e preservação operacional de serviços |
| Tenant/dados/IA/segredos/backend | no_impact_identified | Somente apresentação; sem mudança de service/RPC/migration; nenhum uso produtivo para testes |
| Versão/contexto/release | direct | Manter v2.3.5; registry, Context Pack, plano/CI/smoke |

## Execução congelada

Aplicar integralmente D/P/F/A e critérios deste contrato v1.0.0. A aprovação explícita da referência pelo Product Owner é a autoridade; nenhum novo ponto de aprovação administrativo. A numeração apenas organiza a leitura. Preservar exatamente os handlers/transações da página. Textos e registros da prancha são exemplos; a composição e hierarquia são normativas. Menus e marca reutilizam shell atual. Comparação visual real não pode ser substituída por testes funcionais.

## AoT

Registro inicial antes da implementação: QA e publicação pendentes naquele momento, encerrados nas seções abaixo. Evidências em `docs/qa/evidence/process-assessment-guided-v235/`.

### Implementação e QA local

JSX e CSS scoped na página reutilizam controles/handlers existentes. Configuração e requisitos ficam simultâneos; selecionados têm chips de consulta, personalização explícita mantém checkboxes editáveis. Histórico usa Collapse acessível, aberto inicialmente no desktop e recolhido no celular; consulta permanece disponível. Ícones decorativos dos botões ficam ocultos do nome acessível. Backend, domínio, envio e contratos persistidos não mudaram.

| ID | Implementação / teste / evidência | Status |
| --- | --- | --- |
| D-UX-01/02 | 4A e renders guided-1448/768/390/320; geometria JSON, seções simultâneas, faixas20%, campos4/2 colunas, requisitos, CTA e overflow; inspeção desktop/celular | PASS local |
| D-03 | 60 checks browser de preparação/teclado/personalização/validação/loading/falha/histórico/destino, 76 checks de banco/revisão/IA explícita/convites/resultados/reuso/read-only; 9 testes Node de composição/versão | PASS local |
| P-01 / F-01 | Nenhuma chamada externa nos browsers, nenhum write passivo, nenhuma alteração de service/backend/domínio/Kanban; diff scoped | PASS local |
| D-04 | Versão permanece2.3.5; plano web-only, CI branch/main, novo SHA,39checks operacionais, rollback, HTTPS e serviços preservados | PASS operacional |

Tipos web, build web e build raiz PASS. Avisos preexistentes de chunks grandes e import dinâmico permanecem. Node/browser usam dados e transportes sintéticos, sem IA/e-mail/Pessoas produtivos. Browser instalado Chromium1228 utilizado com Playwright fornecido, sem download ou nova dependência. Primeiras tentativas de launcher usaram browser ausente/Chrome sem permissão; substituídos pelo runtime existente. Locators de ícones e fechamento foram corrigidos, sem enfraquecer asserções.

Comparação visual usa os mesmos parâmetros e13 requisitos da prancha, registro Pessoa exemplo e desktop1448/mobile390, com provas adicionais768/320. A prancha gerada é um modelo de composição, não screenshot de aplicativo executável. Faixas, ordem e proporções preservadas; shell/marca e tipografia real seguem Prisma. Labels maiores e quebras naturais no celular seguem componentes reais, sem esconder conteúdo. Histórico abre por controle no celular. Sem desvio material da composição aprovada; avaliação funcional e fidelidade visual possuem evidências distintas.

Regressão existente não sobrescreve evidência histórica: usa novo diretório `regression`. Screenshots da regressão continuam locais; checks.json é versionado. Limitação: jornada autenticada com Pessoas reais e recebimento de convite continuam NOT TESTED e não são requisitos deste ajuste visual.

### Fechamento operacional

Publicado em10/10/2026: SHA funcional `3ed9cb4f7e52306c3eaa697175b17c59a1d78ff6` integrado em main/origin/VPS. CI branch38083511838 e main38083611816 PASS. Dispatcher publish GIT_PUBLISHED/web PUBLISHED, sem destinos pendentes e sem banco/Edge/Parser/Synthesis/mail. Apenas prisma-web recriado, imagem `sha256:7b3355a70be2dfd1561b8acecc479e154c8e89aa990ea56ffdc96f9ff57da623`, running/zero reinícios.

39checks operacionais PASS: checkout/SHA no JS servido, CSS/componentes4A, versão2.3.5 renderizada no login público sem erro,18HTTP200 (rotas/arquivos novos e anteriores), rollback `prisma-web:rollback-before-3ed9cb4f7e52` com imagem anterior2efad71a, e IDs/imagens/status/restarts/health dos seis serviços alheios preservados. Experimento paddle já unhealthy antes e permaneceu assim. Sem remoção de containers ou alteração de segredo/dado. O smoke imediato do dispatcher passou nesta publicação.

O primeiro locator público exigia texto isolado v2.3.5 e falhou porque a versão faz parte do rodapé completo. Inspeção pública comprovou texto correto/zero erros; locator corrigido para o fragmento de versão com limites de palavra, mantendo a asserção. Nenhuma mudança no runtime ou rebuild foi necessária. Evidência final production-checks/production-login/production-before/after e recibos release-plan/dry-run/publish/verify. Funcionalidade real autenticada continua NOT TESTED; a prova de comportamento usa fixtures sintéticas, e a prova de rollout verifica os arquivos efetivamente servidos.

Todos os D/P aplicáveis PASS nos limites registrados. Sem desvio material da referência4A. Fechamento documental/contextual segue o mesmo movimento/branch, somente Git/docs, sem reconstruir o runtime funcional. Arquivos alheios não rastreados preservados; Context Pack gerado/conferido a partir do snapshot do index selecionado, evitando incorporar documentos alheios à entrega.
