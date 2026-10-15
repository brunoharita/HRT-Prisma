# Acordo, execução e AoT — Áreas profissionais 2.7.4

Contrato 1.0.0, aprovado por Bruno em15/10/2026 na conversa: cadastro de macroáreas global/local, curadoria global, seleção no Perfil e classificação pela IA. Baseline2a55428375f9b33eeca1149caf75e606ca3ff32f (2.7.3). Reutiliza ADR-069; substitui o agrupamento de áreas H1 e a conjunção área/função por experiência do contrato people-directory-1.0.0. Funções continuam por experiência; macroárea pertence ao Perfil e não comprova atuação em cada emprego.

## Acordo congelado e execução

- D-01 cadastro em Conhecimento > Áreas profissionais: globais disponíveis às empresas; owner/admin cadastram/editam locais; Super Admin mantém globais. Nome, descrição, termos associados, ativação e versões auditáveis; carga inicial de macroáreas gerais, sem atribuir pessoas.
- D-02 cadastro local imediatamente utilizável; contribuição global separada, sanitizada e rastreável. Somente Super Admin aprova (editando ou associando a área global existente), rejeita ou mantém local; nenhuma decisão global modifica a origem local.
- D-03 seleção opcional de áreas globais/locais no editor estruturado, persistida com rascunho/comparação/publicação; escolha humana, inclusive seleção vazia, prevalece sobre inferência. Texto extraído permanece separado e preservado. Campos aceitam múltiplas áreas, preservando a cardinalidade já existente.
- D-04 IA usa somente referências de macroárea disponíveis na empresa, título, áreas importadas e contexto profissional limitado. Sem nova biblioteca/provedor/modelo/orçamento; sugestão identificada, sem equivalência forçada nem criação de registros. Indisponibilidade preserva seleção manual. Importação pode enfileirar; digitar/salvar Perfil manual não invoca IA.
- D-05 coluna/filtro de área em Pessoas usa a seleção publicada ou agrupamento derivado, independentemente de datas de experiências; função/período mantêm significado anterior. Cadastro global/local e escolha humana observam isolamento/autoridade backend.
- P-01 IA não publica Perfil/Knowledge, não substitui escolha humana e não promove contribuição.
- P-02 não vazar dados/áreas locais entre empresas, nem permitir escrita global por admin local ou alteração local pela curadoria global. Não enviar identidade/contatos/empregador/currículo integral ao provedor.
- P-03 preservar originais, histórico, publicação explícita, PDF, comparação, competências/Score/matching/seleção e tarifas. Não transformar macroárea inferida em evidência de competência.
- F-01 hierarquia/subáreas formal, fusão automática, reclassificação humana em massa, mudança de funções/senioridade ou redesenho amplo do editor.
- A-01 ampliar os conceitos/propostas/termos/changesets existentes com tipo professional_area; componentes Ant Design/Prisma existentes, IDs estáveis e desativação sem exclusão. Usar worker/fila/budget existentes com método versionado e classificação de Perfil separada da experiência.
- Q: nenhuma. Seleção múltipla reutiliza o campo prévio; referências visuais anteriores são contraprovas, não mockup normativo novo.
- CA-01 CRUD global/local e contribuição/decisões com testes SQL positivos, negativos e histórico.
- CA-02 rascunho e publicação mantêm seleção/limpeza humana, original e prioridade sobre IA; browser desktop/celular e Delta.
- CA-03 IA fechada valida IDs/escopo/versão e ausência de fonte; mock de provedor e orçamento compartilhado; falha não bloqueia usuário.
- CA-04 Pessoas mostra/filtra macroárea sem depender de experiência, preservando função/datas; tipos/build/testes dirigidos, CI, rollout seletivo, smoke e sincronização.

Execução: implementar integralmente D-01..05, provar P-01..03, respeitar F-01 e A-01. Classe D. Nova versão2.7.4. Autorização inclui main/produção conforme AGENTS§7.

## GOV-01 inicial

| Capacidade | Relação | Baseline / preservação / validação mínima |
| --- | --- | --- |
| Knowledge/contribuições/permissões | direct | ADR-069, escopo e auditoria existentes; SQL CRUD, curadoria e negativas tenant/role/anon |
| Rascunho/Perfil/Delta/área | direct | 2.7.3, texto original e publicação humana; SQL validação e browser seleção/salvar/retomar/comparar |
| Worker/cache/opt-in/budget | direct | 2.7.2; provider mock, IDs fechados, contexto minimizado, reserva compartilhada e fonte vigente |
| Pessoas/área/função/período | direct | 2.7.2; filtro macroárea do Perfil e função temporal independente, fallback |
| PDF/rolagem manual/educação | plausible_indirect | editor compartilhado2.7.3; regressão dirigida de editor e contrato de dados |
| Auth/RLS/histórico | critical_transversal | backend existente; negar cross-tenant, member/anon, versão obsoleta; smoke autenticado sem escrita humana real |
| Score/matching/seleção/tarifas | no_impact_identified | campo aditivo de classificação separado de fatos, writers/contratos dessas capacidades inalterados; revisão do diff e checks dirigidos |

Fechamento mínimo: critérios acima, documentação/contexto, CI obrigatório, ledger/migrations conferidos, rollout somente destinos derivados, rollback, main/origin/VPS sincronizados. Estado inicial de todos os critérios: NOT TESTED. Não há QA remoto separado conhecido; usar PostgreSQL descartável e browser sintético, sem afirmar equivalência a produção.

## AoT

| Acordo | Implementação | Teste/evidência local | Status |
| --- | --- | --- | --- |
| D-01 | Conceitos/termos existentes, RPC save_professional_area, cadastro global/local | SQL CRUD/versionamento/desativação e browser1448/390 | PASS |
| D-02 | Propostas/approvals existentes, nova revisão por edição; RPC de curadoria | SQL aprovar/associar/adiar, negativas global/local, snapshots/IDs preservados; browser curadoria | PASS |
| D-03 | IDs opcionais + labels canônicas backend; selector separado, decode, Delta e publicação | SQL rascunho/publicação/prefill/limpeza explícita/inativas/original; browser salvar e comparar, zero publicação automática | PASS |
| D-04 | kind profile_area na fila existente, aliases tipados, IA fechada, opt-in/budget/lease/fonte | SQL candidatos/sem fonte/zero cap, Deno mock e rejeição de IDs/contato; sem provedor pago em QA | PASS |
| D-05 | RPC própria, join Pessoa/Perfil, área do Perfil e função temporal independente | Browser1448/390 combina RH do Perfil com função TI, fallback/navegação; SQL Perfil sem experiência | PASS |
| P-01 | Sem writers de Perfil/Knowledge no worker; seleção vazia e presença humana prevalecem | SQL concorrência/completion e publicação humana, Deno IDs fechados | PASS |
| P-02 | require_knowledge_admin/has_org_role, grants mínimos, RLS herdada, candidato minimizado | Negativas SQL empresa alheia/admin local/member/anon/PII; mock sem currículo/contatos | PASS |
| P-03 | Original separado; resolvers/normalizer excluem macroárea, guard de competência | SQL macroárea não vira evidência; 27Node relacionados,9browser de editor/PDF,5Deno | PASS |

Evidência local em `evidence/professional-areas-v274`: SQL descartável, browser cadastro/curadoria/editor/comparação, regressão de Pessoas e editor. Tipos root/web, build web, lint e Context Pack aprovados. Selectors de teste foram corrigidos para o nome acessível com ícone e múltiplas ocorrências legítimas; a primeira execução de browser faltava configuração sintética do Vite. Erros de compilação SQL foram corrigidos antes da publicação. Nenhuma fixture foi aplicada em produção.

GOV-01 final: resolvers genéricos/normalização de competências reclassificados como `direct` para excluir o novo tipo e impedir que aliases de macroáreas contaminem competências. Prova SQL de RH unresolved na normalização genérica e rejeição do vínculo/classificação como competência; funções/Score/matching/seleção/tarifas preservados, sem novos consumidores dessas informações. Relacionamentos restantes iguais ao mapa inicial. F-01 preservado no diff: sem hierarquia formal ou merge de identidades. Referência visual é contraprova anterior; mantém editor/tabela/componentes existentes, não há mockup normativo novo.

Limites: QA sintético local não prova acurácia empírica da classificação nem comportamento autenticado de todos os tenants. Catálogo IA limitado a60candidatos; todos os registros continuam selecionáveis manualmente. IA gradual dentro dos caps existentes, sem orçamento novo. Publicação/CI/smoke/sincronização ainda em andamento; status operacional PARTIAL até receipt.

Dependência descoberta no CI38804302185: decodificador gerado do matching exige sincronização exata com personIngestionService. Gerado novamente (somente retenção dos dois campos opcionais), matching-trajectory passa a destino direto de compatibilidade. Regressão mínima:3testes matchingRuntime (paridade de datas/score/decoder), sem alteração de regras/prompt/modelo. Primeiro CI falhou por snapshot desatualizado, nenhum destino produtivo foi alterado antes de corrigir.
