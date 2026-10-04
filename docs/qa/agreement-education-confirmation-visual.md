# Estado visual e aceitação da classificação acadêmica

Versão 1.1.0, agreed, 2026-10-04. Bruno autorizou corrigir o status e esclareceu que informação suficiente não exige clique redundante. Baseline `0f23bafbea0fedc6d594f366b5d0ef6cc0e7dc5d`; risco C, UI/normalização/preflight de revisão, complemento v2.0.4. Este aditivo substitui D-01/D-02/P-01/F-01 e o mapa da versão 1.0.0; incorpora o prompt autorizado.

- D-01: aceitação automática existente aparece como Classificação válida e dispensa clique; decisão humana efetivamente registrada aparece como Confirmada por você; pendência aparece como Requer revisão/Confirmar classificação. Botão desabilitado nos estados aceitos, ativo nas pendências e bloqueado quando busy. CA: estados automático/humano/pendente e legenda legível em desktop/mobile.
- D-02: reaproveitar aceitação de extração explícita preservada quando curso, nível, qualificação, situação, origem/fontes explícitas e método vigente conhecido continuam iguais ao snapshot válido, sem desconhecidos. Ajustar período não exige confirmar de novo essa classificação intacta. Salvar/comparar transportam reviewed=true sem transformar origem em human ou inventar motivo de confirmação humana. Inferência, incompatibilidade, mudança de curso/classificação, método legado/desconhecido ou falta de snapshot não recebem nova aceitação automática. Edição de classificação humana/inferida volta à pendência. CA: negativos de origem/fontes/snapshot/curso/nível/situação, imutabilidade, origem/fonte/evidência preservadas e save/reopen sintético sem clique automático.
- D-03: owner docs/contextos/AoT e main/origin/VPS somente web; CI/smoke/rollback. CA: tipos/build, testes dirigidos/person-flow, render e plano seletivo, HTTPS/assets e imagens preservadas.
- P-01: não inventar decisão humana/datas/confiança numérica, afirmar aceitação sem os critérios, enfraquecer auth/tenant/compatibilidade/gate obrigatório do servidor ou editar/publicar Pessoa real para testar.
- F-01: banco/migrations/Parser/IA/Knowledge/matching, novos campos/bibliotecas, reclassificação histórica, redesenho ou nova versão pública. Normalização da revisão e antecipação do gate reviewed vigente estão expressamente no escopo D-02.
- A-01: reutilizar snapshot/validadores/classificador aceitos; textos/cores acessíveis, testes e implementação delegados à engenharia.
- Q-01: nenhuma decisão material pendente. Segurança adequada nesta correção é o conjunto determinístico de critérios acima, não índice ou limiar de confiança novo.

## Mapa de impacto e execução congelada

| Capacidade | Relação | Baseline / prova proporcional |
| --- | --- | --- |
| Botão/tag/cartão e navegação | direct | baseline confunde ausência de gate com confirmação; render automático/humano/pendente, IDs e cores em 1416/390 |
| Normalização/save/compare e preflight de publicação | direct | servidor exige reviewed=true; restaurar somente aceitação explícita comprovada e antecipar false antes de comparar; negativos, testes lifecycle/classificação/person-flow e save/reopen sintético |
| Evidência/classificador/precisão/período | plausible_indirect | fatos/snapshot/helper de decisão humana preservados; imutabilidade, fonte/método e período no render |
| Web/Context Pack/release | direct | web 233af6d, main 0f23baf; tipos/build/contextos/CI/HTTPS/rollback |
| RPC/auth/tenant/Parser/matching | no_impact_identified | nenhum serviço/gate de servidor muda; payload de aceitação usa flag existente, sem origem humana fabricada; diff, testes e imagens remotas iguais |

Implementar D-01 a D-03 sob P-01/F-01, com A-01. Screenshot é contraexemplo do status incorreto, sem novo layout: preservar posição do botão, cartões, ordem, abas/evidências. Risco revisado de B para C após descoberta de flag desatualizada/preflight incompatível com o gate obrigatório já existente. Não há novo contrato persistido. Testes sintéticos não comprovam jornada autenticada real.