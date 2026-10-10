# Acordo — Pessoas para a Posição v2.3.4

Versão 1.0.0, congelada em 10/10/2026 pela solicitação explícita de Bruno: aplicar a primeira proposta, indicar acompanhamento existente, integrar main e publicar 2.3.4. Referência normativa de arquitetura visual: `evidence/people-compact-v234/approved-reference.png`, cópia da primeira proposta. Pessoas, textos de menu e registros adicionais da imagem são ilustrativos. A imagem original enviada é contraexemplo de baixa densidade.

D-UX-01/02 deste acordo supersedem D-01/D-UX-01 e D-02/D-UX-02 do acordo `agreement-evaluation-inside-score.md` v1.0.0 quanto à localização/agrupamento: ação sai do Score e passa à toolbar. D-03/04 deste acordo supersedem a apresentação do sucesso desabilitado em D-03 daquele acordo, preservando inclusão humana e alterando somente a confirmação persistida/ação Abrir acompanhamento. D-05 preserva o significado/gates de `agreement-position-relation-clarity.md`; explicações continuam acessíveis na expansão.

## DEVE

- D-UX-01: cards compactos em uma coluna; identidade/avatar/seleção à esquerda, estado do acompanhamento junto ao nome, score e cobertura à direita. Faixa compacta de ações abaixo, consulta à esquerda e acompanhamento à direita. Requisitos resumidos visíveis, explicação da descoberta e revisão humana em divulgações progressivas separadas. Sem duas grandes colunas Consultar/Decisão. Preservar agrupamentos A/B/C existentes.
- D-UX-02: celular reorganiza os mesmos dados em uma coluna, sem overflow; estado/score e acompanhamento continuam visíveis, ações têm texto legível e evidências completas podem ser expandidas. Desktop preserva hierarquia, agrupamento e densidade reconhecíveis da primeira proposta.
- D-03: consultar uma vez por Posição o acompanhamento persistido do processo atual. Pessoa incluída permanece na descoberta com “Já está no acompanhamento”, “Processo atual” e “Abrir acompanhamento”. Histórico arquivado não equivale a inclusão atual. Reentrada/reload/retorno à janela reconsultam o estado sem IA.
- D-04: preservar inclusão explícita, loading, falha/retry, permissão, IDs de organização/Pessoa/Perfil/Posição e processo. Consulta pendente ou indisponível não inventa ausência; inclusão fica indisponível até confirmar estado. Falha da consulta preserva descoberta e ações manuais de consulta. Inclusão bem-sucedida atualiza indicação e ação; processo encerrado não permite inclusão.
- D-05: preservar comparação, Perfil, cálculo/detalhes/recalcular score, divergências, confirmação/desconsideração/curadoria e seus gates. Relação da trajetória é independente do acompanhamento. Nenhuma ação humana acontece por abrir/expandir a tela.
- D-06: publicar web v2.3.4 em main/origin/VPS pelo dispatcher após validação proporcional, rollback e smoke. Número 2.3.3 é pulado por pedido explícito do PO, sem criar entrega fictícia.

## PROIBIDO

- P-01: não alterar score/matching, requisitos, fatos, ranking, estados de processo, decisões humanas ou histórico. Não esconder a Pessoa porque já está acompanhada nem afirmar reprovação por falta de evidência.
- P-02: não mostrar vínculo de outro tenant/Posição/processo como atual, não gravar por consulta, não invocar IA nem recalcular score automaticamente, não usar produção como fixture.
- P-UX-03: não substituir cards por grade/painel lateral nem cortar ações/evidências no celular; não duplicar os grandes espaços vazios do contraexemplo.

## FORA DE ESCOPO / AUTONOMIA / PENDENTES

- F-01: banco/migrations/Edge, provas/convites, billing, Parser/Synthesis/Knowledge, novas regras de recrutamento e redesign de outras telas.
- A-UX-01: adaptar tokens, ícones, textos concisos e detalhes expansíveis aos componentes existentes. Todos os dados completos permanecem acessíveis; pequenos detalhes de decoração e ilustrações da proposta não são contratos funcionais.
- A-02: mecanismo de consulta agregada, concorrência e reuso dos RPCs já autorizados; nenhum novo serviço/biblioteca necessário.
- Q: nenhuma decisão material pendente.

## CRITÉRIOS DE ACEITE

- CA-01 (D-UX-01/02): renders da UI real com fixture equivalente à proposta (Diego62/100, cobertura62%,2atendidos/11sem evidência, vínculo atual) em desktop/celular; comparação estrutural e ausência de overflow em1448/768/390/320; referência completa1536x1024.
- CA-02 (D-03/04): negativos atual versus histórico, tenant/Posição trocados, consulta pendente/falha/retry, processo encerrado, inclusão e navegação com processo explícito; uma consulta agregada e zero mutações passivas.
- CA-03 (D-05/P): componentes reais, expansão/seleção/ações/handlers/loading/falha e permissões; regressão dirigida de matching e navegação existente sem IA/banco produtivo.
- CA-04 (D-06): tipos/build/checks direcionados, Context Pack/CI, SHA explícito em main/produção, versão/assets/saúde/rollback e preservação de serviços.
