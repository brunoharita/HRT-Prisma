# Conhecimento: coesão entre abas2.7.8

Acordo aprovado por Bruno em16/10/2026. Baseline0900da5 (2.7.7). Classe C: composição visual de todas as abas, sem backend.

- D-01 reutilizar UX Foundation1.4.0: família central, leitura/valores16px/24px, rótulos/metadados14px/20px, seções20px/28px; pesos400/600. Mesmos papéis em Visão Geral, Áreas, Estrutura, bases global/local, Fontes, Termos, Propostas, Impactos e Configurações.
- D-02 tabelas com corpo16px, cabeçalhos14px/600, topo alinhado, espaçamento uniforme; descrições e complementos secundários14px; toolbars/controles coerentes. Preservar rolagem local de tabelas, conteúdo longo, filtros e ações.
- D-03 aplicar a mesma escala a drawers/modais dessas abas, preservando proveniência, formulários, autoridade, revisão/publicação e estados. Código/hash pode manter família monoespaçada por significado.
- D-04 validação visual percorre todas as abas global/local em1448/390 com dados, vazios e erro; compara estilos computados por papel, captura cada aba e testa consulta/edição sem gravação real.
- P-01 não alterar dados, IA, curadoria/decisões, permissões, keys/ordem de abas ou outras telas. Não ocultar fatos para obter alinhamento.
- F-01 redesign de navegação, novas bibliotecas, backend, migrações e mudança da escala de Pessoas.
- A-01 estender a base CSS existente com escopo reutilizável, aplicado primeiro a Conhecimento; usar AntD e tokens existentes, sem biblioteca nova. Versão2.7.8 e rollout web seletivo.
- Q nenhuma. Referências anteriores são contraprovas; preservar topologia/ordem/densidade e painel claro. O alvo normativo é a escala compartilhada acima.
- CA-01 evidência por aba e papel tipográfico em desktop/celular, cabeçalhos/controles e estados; tipos/build/lint/contexto, testes dirigidos e CI obrigatório, smoke/rollback/sincronização.

Execução implementa D-01..04 e impede P-01, respeitando F-01 e A-01. Conclusão exige critérios acima; não confundir teste funcional com coerência visual.

## GOV-01

| Capacidade | Relação | Baseline/preservação/prova |
| --- | --- | --- |
| Conhecimento/todas abas/portais | direct | 2.7.7; estilos, screenshots, consultas/formulários/ausências/erro1448/390 |
| Componentes compartilhados/Settings/Pessoas | plausible_indirect | novo escopo opt-in; revisar seletor, prova de estilo fora do escopo |
| Auth/curadoria/dados/IA | critical_transversal | leitores/mutações intactos; fixtures de leitura, zero escrita implícita, testes contrato existentes |
| Score/Perfil/Processos | no_impact_identified | não consomem escopo novo; sem domínio/serviços alterados |
| Hospedagem | direct | web apenas, preservar assets antigos/rollback e outros containers |

AoT inicial NOT TESTED. Validação local dirigida, sem suíte integral local. QA visual é sintético, não prova jornada autenticada real.

## AoT local

D-01..04/P-01 PASS:299assertivas,64estados de abas (8globais+8locais x dados/vazio x1448/390),66screenshots incluindo erro no caminho compartilhado em ambas larguras. Mede família única, papéis equivalentes de cabeçalho/corpo/seção/metadado/ação, reflow e consulta/edição cancelada; drawers e modais herdam o escopo. Zero escrita implícita na fixture e página Pessoas sem o escopo. As capturas de Estrutura/Fontes/Configurações foram inspecionadas além das medidas. Sem desvio material de topologia/ordem.

Tipos/root build/teste de versão5/lint/build web PASS. Adaptações do teste: AntD6 usa role=tabpanel e anuncia a posição da aba durante foco, alterando seu nome acessível; a navegação por teclado captura ID antes do foco e confirma aria-selected. Clique durante rolagem móvel era falha de automação, sem ajuste de produto motivado pelo teste. Objetos canônicos clicáveis são texto principal16px; ações comuns são14px. IDs, fontes, aliases, valores e controles preservados; sem domínio/serviço alterado.

Execução reproduzível: iniciar pnpm exec vite --config tests/ui/visual-foundation.vite.config.mts e executar node tests/tooling/knowledgeCohesion.browser.mjs com PRISMA_PLAYWRIGHT_PATH apontando ao runtime Playwright já disponível. Sem instalação/dependência nova. O teste visual é gate de aceite para mudanças nas abas; CI geral permanece obrigatório e não é apresentado como substituto dessa prova visual. CI/rollout ainda pendentes.

Checker de contexto recusou o nome inicial knowledge-ux-v278 por usar prefixo reservado a fontes consolidadas; renomeado para aot-knowledge-ux-v278, referências e exports regenerados, checker PASS antes da integração/produção. Nenhum gate foi contornado.
