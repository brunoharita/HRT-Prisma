# Acordo M8.3 — triagem antes da IA

Versão 1.0.0, agreed em 2026-09-27 por Bruno: «faça essa implementação», após recomendação explícita A/B automáticos, C recolhido sem IA, fora da descoberta ausente. Supersede o acionamento indiscriminado de D-03/D-04/D-05 do acordo M8.3 original, sem alterar sua rubrica.

- D-01: reutilizar a classificação determinística existente antes da IA. Somente grupos A/B descobertos recebem interpretação automática, na busca, comparação e endpoint servidor.
- D-02: C descoberto permanece recolhido, sem chamada/opção de IA ou pendência semântica. Fora da descoberta não aparece nem como pendência. Resultados históricos não são apagados.
- D-03: A/B podem mudar de grupo após interpretação; falhas continuam neutras e nunca viram zero. Requisitos, pesos, autoridade humana, isolamento e versões de fonte são preservados.
- D-04: validar baseline dos sete Perfis, regressão negativa e smoke autenticado; integrar main e publicar apenas superfícies necessárias.
- P-01: não filtrar por nota, nome, cargo atual isolado ou atributos sensíveis; não inventar relação nem decisão humana.
- P-02: não confiar no grupo enviado pelo cliente nem ler cache/acionar provedor para C/fora por chamada direta.
- F-01: expansão além do piloto backend, alteração da triagem determinística, pesos, prompt/modelo, aprendizado e redesenho/remoção dos avisos discutidos anteriormente.
- A-01: reutilizar motor e RPC de fontes já existentes, sem tabela, biblioteca ou migration nova; escolhas mecânicas delegadas.
- Q: nenhuma pendência material após baseline: A Bruno; B Diego; C João; Beatriz/Júlia/Ivan/Vagner fora da descoberta.
- CA-01: testes A/B elegíveis, C/fora sem provedor/cache e sem pendência, comparação/reabertura, grupo final mutável, backend sem autoridade cliente.
- CA-02: testes dirigidos, tipos/build, runtime gerado, CI, deploy, smoke com mesmos sete Perfis; nenhum dado real alterado para teste.

## Mapa de impacto e preservação

Baseline `cf8e2045d9e68d3812414e8a2a0ab6d6db46c465`, runtime `60c642f`, Edge v2. Diagnóstico read-only executou motor gerado existente com projeção dos campos usados, sem provedor/arquivos pessoais persistidos: Bruno A/43, Diego B/8, João contextual, quatro sem relação. IDs/proveniência de apresentação omitidos do relatório, não critérios de cálculo.

| Área | Relação | Preservação / prova |
| --- | --- | --- |
| Descoberta e acionamento da IA | direct | Grupo inicial antes de interpretação; teste de não chamada e baseline sete Perfis |
| Comparação/detalhe/cache | direct | A/B reutilizam cache; C mantém consulta manual; fontes/snapshots antigos preservados |
| Edge/auth/tenant | critical_transversal | Triagem a partir de RPC autenticada, fontes consistentes, rejeição antes do service/provedor |
| Score/requisitos/M6.2 | plausible_indirect | Mesmo motor e rubrica; testes de snapshot e score, confirmação backend |
| Parser, edição/publicação de Perfil, Knowledge | no_impact_identified | Somente leituras das fontes; nenhum novo caminho de escrita, schema ou parser |
| Release | direct | Web + matching-trajectory; documentação e runtime gerado; rollback para runtime/Edge anteriores |

Screenshots do relato são contraexemplos do comportamento de descoberta, não pedido de redesign.
