# Acordo: persistência da curadoria de competências

Versão 1.0.0, congelada pela instrução de Bruno em 06/10/2026: “garanta que uma competência que tenha sido devidamente revisada não volte para a lista de pendências”. Execução autorizada, incluindo publicação conforme AGENTS.md §7. Baseline `07b79f69eaeb594b68bf2e738bcd394b949f1c5c`, Prisma v2.1.1.

- D-01: uma associação humana concluída deve permanecer vinculada à Pessoa, declaração original e trecho revisado, independentemente do nome normalizado, atualização, nova normalização ou nova versão do Perfil que preserve a mesma declaração/trecho.
- D-02: salvar associação ou criação local deve conferir atomicamente a resolução do item selecionado antes de informar sucesso. Uma proposta global ainda não aprovada permanece proposta; não representa associação concluída.
- D-03: preservar separadamente itens de declarações compostas, como BPM/BPMN; revisar BPM não revisa BPMN. Decisões não podem atravessar Pessoas ou organizações, substituir outra decisão humana nem produzir evidência demonstrada.
- D-04: recuperar associações anteriores somente de aprovações humanas inequívocas, com termo aprovado, conceito acessível e proveniência existente, para itens fundamentados no último resultado completo do Perfil vigente. Não criar nova escolha humana, alias ou conceito para reparar o estado.
- D-05: publicar a correção como v2.1.2, com migração seletiva, CI, smoke, rollback e sincronização; preservar v2.1.1 visual e serviços não afetados.
- P-01: proibido esconder pendências apenas no frontend, alterar snapshots/experiências, resolver outros termos por semelhança, reclassificar conceitos ou executar IA paga para esta correção.
- P-02: proibido apagar histórico, aceitar conceito de outro tenant/inválido ou substituir decisões. Mudança real de declaração ou indisponibilidade do conceito deve continuar explícita e falhar de modo seguro.
- F-01: fora de escopo redesenho visual, taxonomia, consolidação dos conceitos BPM/gestão de processos, matching/Score, Parser/Synthesis e publicação de Perfil humano.
- A-01: engenharia pode definir a persistência mínima, índices e helpers internos, reutilizando governança, RPCs e projeções existentes. Sem nova biblioteca ou nova autoridade pública.
- CA-01: SQL local comprova associação e criação, refresh/reprocessamento com nome diferente, Perfil posterior com mesma declaração, isolamento de fragmentos/Pessoas/tenants, conflito, propostas e rollback. Provar falha do caso de regressão no baseline.
- CA-02: produção comprova migração/grants/contratos, recuperação fundamentada do BPM e preservação de Excelência operacional e PMO, sem curadoria humana fabricada. Smoke HTTP/infra e CI aprovados.

## Mapa de impacto antes da implementação

| Área | Relação | Baseline e preservação | Regressão |
| --- | --- | --- | --- |
| Curadoria V5 e wrappers legados | direct | Criação local pode retornar pendente; alias tem guarda; papéis/alcance e auditoria existentes | SQL positivo/negativo e rollback |
| Normalização/projeções V2–V6 | direct | Resultado completo preservado, quatro estados e proveniência declarada | Reprocessamento/renomeação, separação dos átomos e cobertura |
| Persistência tenant e leitura autorizada | critical_transversal | Novos registros não são editáveis diretamente; autorização existente na entrada | RLS/grants/tenant/Pessoa/inativo/anon |
| Pessoa/contagens/lista | plausible_indirect | Consome a mesma forma de projeção; visual v2.1.1 | Testes dirigidos e projeção real somente leitura |
| Registry/web/release | direct | v2.1.1, SHA baseline acima; imagem web e rollback registrados no AoT | Tipos/build/CI/HTTP/assets |
| SQL alheio, matching/IA/Parser/Synthesis | no_impact_identified | Helpers só de curadoria/normalização; sem alteração de prompts, cálculo ou workers | Diff/plano e IDs/imagens/reinícios preservados |

Sem Q material: comportamento definido pelo pedido e pelos contratos existentes. Proposta global não aprovada mantém a regra vigente; indisponibilidade real não é ocultada.
