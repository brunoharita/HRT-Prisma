# Acordo — estabilidade do Score v2.1.4 (1.0.0)

Estado: agreed. Autoridade: Bruno aprovou o contrato discutido e sua implementação/publicação em main, v2.1.4, em 07/10/2026. A correção de Bruno substitui a exigência de botão para toda atualização: alterações concretas nas dependências da avaliação também autorizam novo cálculo.

- D-01: resultado persistido por organização, Pessoa e Posição; recarregar, navegar, comparar ou passar o dia preserva número, grupo, detalhamento, data e evidências. A primeira avaliação pode ser materializada quando ainda não existe resultado.
- D-02: mudança relevante no Perfil publicado, definição da Posição, Knowledge consumida, evidência demonstrada ou decisão/revisão contextual permite nova avaliação. Revisar Bruno não altera Diego. Contador genérico da Knowledge, data do acesso e mudança de software não invalidam o resultado.
- D-03: atualização mantém o resultado anterior identificado até conclusão atômica. Falha preserva anterior; não apresenta score intermediário como novo. Fontes alteradas durante cálculo e concorrência não podem substituir resultado válido.
- D-04: histórico append-only registra autor, motivo/dependências alteradas, avaliação anterior/nova e versões/data. Ação explícita de recálculo é permitida aos papéis de revisão existentes, sem escolha humana fabricada ou alteração da fórmula.
- D-05: busca, comparação, detalhe e revisão usam o mesmo resultado persistido; revisão atualiza apenas o card afetado. Publicar v2.1.4 com validação proporcional, main/origin/VPS e destinos necessários sincronizados.
- P-01: proibido recalcular por acesso/relógio, reaplicar decisão entre Pessoas/tenants, confiar em score do navegador, apagar histórico, promover decisões contextuais à Knowledge ou alterar pesos/prompt/modelo.
- F-01: redesenho visual global, treinamento de IA, contratação automática, novas fontes externas, backfill pago e curadoria real de pessoas.
- A-01: reutilizar motor/snapshots/autorização existentes; lease e armazenamento são escolhas técnicas. Verificação de dependências na consulta pode detectar mudança já realizada, mas consulta isolada não é motivo de recálculo.
- CA-01: repetição e mudança de dia retornam o mesmo ID/score/fingerprint, sem provedor nem commit adicional; duas Pessoas permanecem isoladas.
- CA-02: Perfil/Posição/Knowledge pertinente/revisão/evidência geram histórico causal; Knowledge alheia não gera; concorrência/falha/fonte obsoleta preservam anterior.
- CA-03: negativos tenant/papel/identidade/lease e score forjado; busca/comparação sem flash pré-IA, atualização parcial e publicação comprovadas. Limites autenticados reais explícitos.

## Mapa de impacto e baseline

Baseline main `330e0d559e430c8ccd4d79e1ae2afb2d390d124a`, runtime v2.1.3 `30d4f79`. Leitura atual recalcula e usa data de acesso; snapshots só são criados ao abrir detalhe. A reprodução causal e inspeção de produção anteriores não provam valores visuais antes/depois.

| Área | Relação | Preservação / regressão |
| --- | --- | --- |
| Persistência/Edge/motor compartilhado | direct | Rubrica, fallback e revisão; SQL/Edge, fontes/concorrência/histórico |
| Busca/comparação/detalhe/cards | direct | Navegação, seleção, evidências, ausência de flash; browser e tipos |
| Tenant/Auth/papéis/PII | critical_transversal | RPCs server-only, revalidação, negativos; sem currículo em logs |
| Knowledge/requisitos/Perfil | plausible_indirect | Somente leitura das dependências; nenhuma curadoria/publicação inventada |
| Parser/Synthesis/gateway | no_impact_identified | Sem código ou destino; IDs/imagens/saúde preservados no deploy web |

Reuso escolhido: `match_evaluations` append-only e motor gerado, acrescentando ponte de resultado corrente/lease. Cache só de navegador não satisfaz persistência entre dispositivos; contador global invalidaria pessoas sem dependência concreta. Nenhuma biblioteca nova.
