# Contrato de Acordos — Base transversal de UX

Versão: 1.0.0. Estado: **agreed**. Product Owner: Bruno. Aprovação: mensagem desta tarefa de 2026-09-13 que aceita todas as recomendações 3, 16, 17 e 18, substitui a recomendação 3.3 por **Posições**, autoriza a base do grupo 15 e delega decisões necessárias dentro desse escopo sem interromper a execução. Formalização fiel dessa aprovação; não há novo checkpoint de aprovação documental.

Referência de produto: `docs/product/ux-foundation.md`, `prisma-ux-foundation-1.0.0`. Auditoria de origem: tarefa `01a098b4-1960-7cc3-8ba5-af3b6d0289d9`, grupos 3, 15, 16, 17 e 18. Baseline: `1d907344c19c2f72c8d54871b0d5b621eea698b2`. Risco integrado C, com testes negativos nas fronteiras de navegação e contexto; sem mudança de autoridade de domínio.

## DEVE — Inegociável e critérios de aceite

| ID | Decisão aprovada e implementação exigida nesta base | Critério de aceite |
| --- | --- | --- |
| D-3.1 | Menu por Operação, Curadoria e Administração, respeitando papéis. | CA-3.1: navegação agrupada; papel sem acesso não recebe entrada; guardas mantidas. |
| D-3.2 | Matching fora do menu isolado; necessidades acessíveis em Verificações e por contexto, capacidades preservadas. | CA-3.2: rotas anteriores continuam disponíveis com nome humano e retorno ao contexto. |
| D-3.3 | Interface usa Posições, substituindo Vagas. | CA-3.3: textos operacionais consistentes; URLs/schema/payloads e dados históricos inalterados. |
| D-3.4 | Formalizar jornadas de referência e eliminar interrupções sem função na base. | CA-3.4: contrato de jornadas publicado; navegação comum não cria confirmações sem alterações materiais. |
| D-3.5 | Central como referência de perfil, pendências e manutenção. | CA-3.5: padrão documentado e composição compartilhada legível no detalhe, sem sobreposição. |
| D-3.6 | Preservar contexto de navegação, filtros, seleção, página, aba e retorno; identificar empresa. | CA-3.6: estados integrados sobrevivem ida/volta; estado não cruza sessão/papel/empresa; entity fallback proibido. |
| D-3.7 | Não anunciar módulos vazios no menu. | CA-3.7: Organizações/Configurações placeholders não aparecem como capacidade entregue; link antigo tem saída útil. |
| D-15.1 | Distinguir carregando, vazio inicial, sem resultados e erro. | CA-15.1: componentes reutilizáveis e aplicações representativas exibem mensagens/ações distintas sem zero provisório. |
| D-15.2 | Proteger alterações não salvas e feedback de conclusão/recuperação. | CA-15.2: confirmação apenas quando necessário; cancelar mantém edição; sair confirmado e sucesso têm efeitos claros. |
| D-15.3 | Tratar URL, registro e contexto indisponíveis sem fallback para entidade alheia. | CA-15.3: 404 e necessidade inválida têm recuperação; nenhum item arbitrário é selecionado. |
| D-16.1 | Preservar marca/azul e reduzir efeitos. | CA-16.1: tokens/componentes compartilhados e amostra visual mantêm identidade, com efeitos discretos. |
| D-16.2 | Título/contexto/ação principal e hierarquia de ações. | CA-16.2: cabeçalho reutilizável, legível com ações longas; destruição não é primária por estilo genérico. |
| D-16.3 | Divulgação progressiva de detalhes. | CA-16.3: componente reutilizável e exemplo integrado mantêm detalhes acessíveis sem dominar a tarefa. |
| D-16.4 | Cores semânticas acompanhadas de texto/ícone. | CA-16.4: estados compartilham cores/nomes e desconhecido usa tom neutro. |
| D-16.5 | Uniformizar componentes existentes, sem segunda biblioteca. | CA-16.5: página/cartão/estado/formulário/painel usam a base Ant Design e tokens comuns. |
| D-16.6 | Adaptação funcional a celular/tablet/desktop. | CA-16.6: amostra de lista/detalhe/formulário testada com conteúdo longo, filtros progressivos e ações alcançáveis. |
| D-16.7 | Mesma identidade em áreas públicas. | CA-16.7: componente público comum preserva conteúdo/contratos de participante e privacidade. |
| D-17.1 | Português profissional, direto e acolhedor. | CA-17.1: locale pt-BR e textos compartilhados revisados. |
| D-17.2 | Glossário único na interface. | CA-17.2: termos aprovados aplicados à navegação e mensagens comuns sem alterar termos oficiais persistidos. |
| D-17.3 | Verbos distinguem efeitos das ações. | CA-17.3: salvar/publicar/arquivar/excluir/gerar/enviar não são confundidos nos textos alterados. |
| D-17.4 | Orientação curta e detalhes sob demanda. | CA-17.4: estados comuns têm título, orientação e ação concisos. |
| D-17.5 | Resultado desconhecido não vira conclusão. | CA-17.5: ausência preservada no componente de métricas/estados e nos casos integrados. |
| D-17.6 | Traduzir UI e preservar fontes/dados. | CA-17.6: estados técnicos têm nomes humanos; nenhum backfill ou reescrita documental. |
| D-18.1 | Acessibilidade integra aceite de cada alteração. | CA-18.1: checklist/evidência proporcional no AoT. |
| D-18.2 | Teclado, foco, rótulos e anúncios de estado. | CA-18.2: navegação/diálogos/estados compartilhados acessíveis; verificação dirigida. |
| D-18.3 | Contraste, ampliação e alvos legíveis. | CA-18.3: tokens verificados e controles essenciais alcançáveis; estado não depende só de cor. |
| D-18.4 | Cobertura responsiva nas superfícies afetadas. | CA-18.4: 390 px, 768 px, desktop e reflow reduzido, com limitações documentadas. |
| D-18.5 | Conclusão sustentada por evidência. | CA-18.5: testes dirigidos, build/typecheck, inspeção visual e AoT; não alegar certificação integral. |

## PROIBIDO

- P-01: alterar Auth, RLS, grants, papéis, tenant, contatos privados ou autorização de backend para facilitar navegação.
- P-02: alterar parser, matching semântico, prompts, fontes/IA, snapshots, publicação ou decisões humanas profissionais neste movimento de base.
- P-03: persistir currículos, contatos, respostas de avaliação, credenciais ou tokens no cache de navegação; compartilhar estado entre empresas/sessões/papéis.
- P-04: transformar desconhecido em zero/conclusão, URL inválida em outro registro ou dados não salvos em salvamento anunciado.
- P-05: remover detalhes, evidências e ferramentas existentes sem caminho equivalente; alterar coordenadas/destaques contextuais do M5.
- P-06: limpar trabalho alheio, enviar mensagens externas, executar operações destrutivas ou alterar produção.

## FORA DE ESCOPO

- F-01: execução integral dos agrupadores específicos 4–14. São aplicadas aqui a fundação e integrações necessárias para demonstrar seu funcionamento, não todos os redesenhos e reparos de domínio da auditoria.
- F-02: migration/schema, backfill, novos provedores, bibliotecas, custo externo e implantação em produção.
- F-03: certificação WCAG integral e estudo de usabilidade com pessoas reais; a validação cobre superfícies alteradas e explicita limites.

## AUTONOMIA

- A-01: medidas, espaçamento, tipografia, componentes, mensagens, distribuição visual e ajustes necessários dentro dos agrupadores aprovados.
- A-02: amostra visual representativa incorporada à implementação e verificada sem aguardar uma aprovação intermediária, conforme delegação explícita do PO.
- A-03: execução sequencial, documentação, testes proporcionais, Context Pack, revisão do diff, commit e push ao origin existente. Sem merge/produção implícitos.
- A-04: reutilizar Prisma/Ant Design; adaptar estados e navegação temporária mantendo contratos de domínio. Não há necessidade demonstrada de nova dependência.

## PENDÊNCIAS

Nenhuma decisão de produto pendente no escopo autorizado. O item 3.3 anterior que recomendava manter Vagas está expressamente supersedido por D-3.3: **Posições**.
