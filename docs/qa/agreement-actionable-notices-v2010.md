# Acordo e execução: avisos com ação v2.0.10

v1.0.0, aprovado pelos pedidos explícitos de Bruno em 06/10/2026. Baseline main `bfbf2456921b38f7a55b9e029c8ea9cf5597a000`, produto 2.0.9. A imagem é contraexemplo de uma pendência sem explicação/ação, não autorização para classificar automaticamente. Preservar cabeçalho, abas, filtros, grupos Hard/Soft e pendências na mesma ordem; acrescentar explicação e ação na área pendente. Dados da imagem são ilustrativos.

- D-01: distinguir vínculo factual de grupo/subgrupo. Mostrar quantidade de evidências mesmo na área recolhida; explicar que o grupo ainda não foi definido e oferecer botão que abra a classificação da competência correta na mesma tela.
- D-02: reutilizar `classify_knowledge_competency`, subgrupos, papéis e histórico existentes. Escolha humana sem preseleção, empresa/global explícitos; nenhuma classificação automática nem justificativa inventada. Metadado do RPC descreve apenas seleção/confirmação. Atualizar projeção após sucesso; falha preserva escolha e informa recuperação correta.
- D-03: procurar outros pontos do Prisma. Avisos encontrados que exigem intervenção devem dizer o problema e oferecer botão para o campo, registro, painel ou recuperação permitida. Não substituir destino contextual por recarregamento da página quando isso perderia edição. Registrar inventário das superfícies corrigidas e distinção de avisos informativos sem ação exigida.
- D-04: publicar 2.0.10 em main/produção; documentação/contexto/rollback/smoke. Somente typecheck/build, validação focada de mensagens/destinos/classificação/autoridade e preservação do vínculo múltiplo; sem suíte completa local.
- P-01: não transformar evidência em classificação/Assessment, escolher grupo automaticamente, ampliar autoridade, gravar decisões em Pessoas reais para QA, perder rascunho ou inventar causa da falha. Não criar botão sem destino real ou simular solicitação de suporte não implementada.
- F-01: IA/Parser/matching e políticas de domínio; novas tabelas/RPCs, backfill, envio de mensagens e reformas visuais. Informações explicativas que não exigem ação não recebem botões artificiais.
- A-01: reusar Alert/Button/Modal/Select e operação existente. Engenharia define redação, foco/acessibilidade, ações inline e agrupamento proporcional dos avisos; preserva contratos/rascunhos.
- Q-01: nenhuma decisão material pendente.

## Mapa de impacto e aceite

Risco C, com fronteira D existente reutilizada para classificação. Direct: competências/curadoria, mensagens de recuperação das páginas/componentes identificados no inventário, registry. Plausible_indirect: navegação/foco, formulários/rascunhos, adapter Supabase e projeção; testar destinos/foco sem mutação real e atualização da classificação. Critical_transversal: autorização por papel/empresa/global e histórico existentes; negativos locais do RPC e UI sem preseleção, não substituir comportamento do backend. No_impact_identified: Parser, worker, gateway, IA e cálculo de matching (não alterar regras), schema/RLS/migrations. Baseline web `08ce658e`, worker `8526717f`, Parser `8682af7d`, gateway `d061cea3`; confirmar antes/depois da publicação.

CA-01/02: tela sintética mesma topologia e viewport desktop/celular; pendência com 2 evidências leva ao editor correto; salvar move para grupo sem apagar vínculos; negativos de alcance/role; erro conserva seleção. CA-03: inventário de avisos, prova dirigida de foco/destino/retry e revisão do diff; controles já presentes no próprio aviso contam como ação, informações puramente explicativas não implicam ação. CA-04: registry10/contextos/CI/rotas/assets/SHA e rollback sincronizados.

Prompt congelado: implementar D/P/F/A e critérios acima sem reinterpretar a exigência de problema claro e botão contextual. Usar UI existente, sem nova dependência e sem testes mutacionais de produção.
