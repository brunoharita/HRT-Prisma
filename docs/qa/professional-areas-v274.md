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


## Publicação e AoT operacional

PASS:2.7.4 integrada em main/origin/VPS no SHA runtime cbb3f9c03d0fa415b110dd40820c873757160812. CI branch38804832934 e main38805046744 SUCCESS. Segundo CI38804657586 exigiu regenerar Context Pack após o snapshot; corrigido antes de produção. Não houve bypass de CI. Fonte final estável publicada uma vez por destino.

49assertivas SQL descartáveis,27Node dirigidos,3matchingRuntime,5Deno,22tooling,6cenários browser de cadastro/curadoria/seletor/Delta,4de Pessoas e9de preservação editor/PDF PASS. Tipos/build/lint/contexto PASS. CI completo obrigatório também passou. QA remoto separado indisponível; não houve gravação sintética ou decisão humana fictícia em produção.

Migrations remotas20261015204943 professional_area_type e20261015204950 professional_areas comparadas integralmente à fonte Git, incluindo aliases no ledger; somente essas novas migrations aplicadas, sem replay histórico.16áreas globais ativas. knowledge-agent22/JWTtrue; matching-trajectory19/JWTtrue conserva todos os arquivos anteriores exceto o decodificador gerado, conferido contra baseline remoto. Outros módulos do knowledge-agent integralmente iguais. Não houve mudança de prompt/modelo/regra do matching.

Web243cf9db470b running/restart0/HTTP200, imagem a96ee1a0198c928e15559be7764dd07c5d630355ad1aa839dd0d47fb2b67ab0f.404imediato da recriação estabilizou sem rebuild. Rollback prisma-web:rollback-before-cbb3f9c03d0f retém2.7.3 e todos os assets anteriores conferidos por SHA256. Seis containers adjacentes mantêm os IDs; teste previamente unhealthy continua assim. Resíduo administrativo local: mensagens de manutenção Git sobre metadados antigos de worktrees, sem impedir fast-forward/push; não foi removido trabalho alheio para silenciá-las.

Smoke autenticado confirma versão2.7.4, catálogo/curadoria global, buscaHRBP → Recursos Humanos e opção equivalente no MESMO rascunho existente da Pessoa indicada, em aba separada. Nenhum save/publicação/criação de rascunho/seleção real executado. Busca do dropdown não criou alterações não salvas. A primeira espera por RH ignorou paginação10; busca por alias confirmou o registro, sem alteração de produto. Aba original preservada. Hashes completos de Pessoas048b6ca3fcbff5e98df8c12e39a83bbf e dos16Perfis768f9c33e755cd05c0c517cc6d4cb872 permaneceram iguais antes/depois. Autoridade/anon/worker grants conferidos no banco produtivo.

Limite operacional explícito:14contextos iniciais de macroárea. Na observação,3BUDGET_LIMITED e11queued; cap compartilhado diário existente já consumido. Sem aumento de custo ou bypass; retry/cadência existentes continuam. Classificação real paga deste lançamento não foi demonstrada por essa fila, mas fluxo fechado foi validado com provider mock, incluindo falhas, autoridade e IDs. Cadastro/seleção manual estão disponíveis imediatamente. Não há alegação de cobertura de todos os Perfis ou acurácia empírica.

Advisor Supabase sinaliza cache com RLS sem políticas e RPCs SECURITY DEFINER autenticadas. Revisão: cache é intencionalmente service-only e revoga clientes; RPCs exigem identidade/papel/empresa internamente, search_path fixo e negativos SQL aprovados. Não ampliar grants para eliminar avisos. Referências do advisor: [RLS sem políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) e [RPCs privilegiadas autenticadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). Demais avisos gerais do projeto fora do movimento não foram alterados.

D-01..05 e P-01..03 PASS dentro dos critérios e limites registrados. Sem desvio funcional do acordo; nova dependência do decodificador registrada no GOV-01. Fechamento documental/ledger/contexto sincroniza fontes sem nova publicação de runtime. Receipt: evidence/professional-areas-v274/publication.json.
