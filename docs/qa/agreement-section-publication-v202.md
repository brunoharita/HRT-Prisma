# Complemento v2.0.2 — publicação e títulos personalizados

Versão 1.0.0, agreed, 2026-10-03. Continuidade da correção/publicação autorizada por Bruno; baseline `39e72b9`, risco D. Restaura ADR-019 e o contrato de revisão, sem nova dependência ou formato persistido. Produto permanece v2.0.2.

- D-S01: título que coincide exatamente após normalização dentro da organização reutiliza a definição estrutural existente, mesmo com ID de seção diferente. Preservar ID/chave da definição e IDs, itens, ordem, valores e evidências do Perfil. CA: publicação SQL completa de duas Pessoas com mesmo título/IDs diferentes; uma definição e duas confirmações com suas chaves de origem.
- D-S02: aprendizado continua apenas na transição humana draft → approved, com metadados e ledger append-only, sem conteúdo pessoal. Repetição da publicação não duplica Perfil, confirmação, contagem ou eventos. Resolver por nome antes de chave; quando somente a chave existe, manter o comportamento de atualização de título/formato. Serializar o catálogo por organização com o padrão de advisory transaction lock já existente no Prisma. CA: SQL de nova definição, nome repetido, mesma chave, renomeação, repetição, concorrência e tenant distinto.
- D-S03: manter gates de contrato/evidências, permissão/tenant, locking, idempotência, auditoria e rollback atômico. CA: negativos SQL e regressão person-flow. Não publicar ou alterar a revisão real para testar.
- D-S04: migration forward-only, main/origin/VPS sincronizados e verificação da função instalada. CA: QA local, testes dirigidos/CI, Context Pack e rollout seletivo. Smoke autenticado real permanece explicitamente NOT TESTED quando indisponível.
- P-S01: nenhuma equivalência aproximada, troca de IDs de fonte, remoção de histórico, cópia de itens para catálogo, relaxamento de autorização ou confirmação humana fictícia.
- F-S01: parser/OCR/Unicode, matching, Knowledge, mudança visual, publicação automática ou saneamento histórico em lote.
- A-S01: mecanismo SQL, fixtures sintéticas locais, documentação e entrega seletiva delegados à engenharia.
- Q-S01: nenhuma decisão material pendente; reutilizar a identidade por nome normalizado já definida no ADR-019/unique existente.

## Mapa de impacto e preservação

| Capacidade | Relação | Baseline / prova proporcional |
| --- | --- | --- |
| Aprovação/publicação e aprendizado estrutural | direct | revisão real draft/lock 1, zero Perfis/operações de aprovação; logs 23505 no trigger; SQL completo sintético e replay |
| IDs/evidências/listas, contratos e histórico de revisão | critical_transversal | fonte intocada e auditoria transacional; SQL de persistência/publicação e person-flow |
| Auth/tenant/privacidade | critical_transversal | SECURITY DEFINER privado, grants/RLS e gates existentes; negativos e inspeção |
| Extração futura de títulos aprendidos | plausible_indirect | ADR-019, chave canônica preservada; testes customProfileSections |
| Web/Parser/VPS runtime | no_impact_identified | nenhuma alteração consumida pelo runtime; plano não exige rebuild, smoke HTTPS/readiness preservado |
| Matching/Knowledge/OCR/Unicode | no_impact_identified | nenhum motor/consumidor ou contrato alterado; diff, plano e regressão de importação |

## Execução congelada

Implementar D-S01 a D-S04 sob P-S01, excluindo F-S01, com autonomia A-S01. Este acordo incorpora o prompt do complemento; AoT registra implementação, testes, produção e limites, sem afirmar que a revisão real já foi publicada.
