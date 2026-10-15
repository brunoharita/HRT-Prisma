# AoT — Prisma 2.7.0

Acordo `agreement-manual-profile-v270.md`1.0.0; execução `execution-manual-profile-v270.md`1.0.0. Autorização expressa de Bruno para main/produção2.7.0. Baseline local/origin/VPS `519423b648416f5765995b59282a7d1b1d1e733b`,2.6.2. Branch isolada `codex/prisma-v270-manual-profile`; drafts alheios preservados.

**Estado: validação local concluída, publicação operacional pendente.** PASS abaixo refere-se ao ambiente indicado, sem presumir rollout.

## Matriz de acordos

| ID | Implementação e evidência | Status / ambiente |
| --- | --- | --- |
| D-T01 | TokenRates, atuais aberta; browser rates1448/390/320 | PASS local |
| D-T02 | classifyTokenRates, effective<=now/criação/ID; teste temporal/imutabilidade | PASS local |
| D-T03 | histórico descendente/futuras Programada; Node + renders | PASS local |
| D-M01 | entradas manual/PDF simultâneas, rota protegida; browser people | PASS local |
| D-M02 | revisão/editor existentes sem fonte PDF fictícia; vazio/full/fluxo completo | PASS local |
| D-M03 | StructuredDraft completo; SQL todas seções/listas, Node normalização, UI Outros/custom | PASS local |
| D-M04 | abas/grupos vazios recolhidos e registros navegáveis/add/edit/remove;1448/390/320 | PASS local |
| D-M05 | source_kind manual, parcial/lock/retomada; SQL save sem contato/sem publicação; UI save/retomada/falha | PASS local |
| D-M06 | Delta explícito e inner approval privado; SQL negativa/replay/versão, browser comparação antes de publicar | PASS local |
| D-M07 | field_provenance por fato/autor/data; manual1.0.0 e privados herdados person_registry; SQL origem/restauro/sem fontes fictícias, UI referência | PASS local |
| D-M08 | sem parser/LLM/quote/débito; SQL zero jobs e browser zero rede externa/IA/Tokens; gate explícito produtivo inspecionado | PASS local + leitura remota |
| D-M09 | regras existentes/tenant/confirmação humana/replay/lock; SQL nome/email/telefone/negativas,6 disputas, UI duplicidade e troca de tenant | PASS local |
| D-M10 | vigente + privados em prefill, Delta/merge/remoção/versões; SQL fidelidade/vigente intacto/omissão/remoção auditada/conflito/restauro; UI falha preserva texto | PASS local |
| D-V01 | boolean NOT NULL, exatamente2 rádios; null negado | PASS local |
| D-V02 | DEFAULT false novos/anteriores; SQL legado/default, filtro Não inclui ausência antiga, orientação administrativa | PASS local |
| D-V03 | Pessoa/tenant separado, trigger autorização+autor/data/old/new; SQL Sim→Não/negativas e histórico UI | PASS local |
| D-V04 | identificação/cadastro/tag Sim/filtro; browser person/workspace/people-filter | PASS local |
| D-V05 | somente boolean/auditoria, SQL vigente intacto; cadeia people sem gatilhos de seleção; diff sem escritores adjacentes | PASS local; hashes finais pendentes |
| D-UX-01 |6 abas/mesma organização/campos/listas, manual sem fonte artificial; comparação visual abaixo | PASS local |

## Proibições e fora de escopo

| ID | Prova | Status |
| --- | --- | --- |
| P-T01 | nenhum writer/preço/cotação/saldo alterado, helper imutável; foto financeira baseline | PASS local; foto final pendente |
| P-M01 | SQL/browser sem PDF/IA obrigatórios, fatos humanos explícitos, zero fonte fabricada | PASS local |
| P-M02 | rascunho não publica, Delta/versões/omissão/replay/falha/remoção e zero IA | PASS local |
| P-V01 | NOT NULL/default false/UI binária, sem inferência/classificação histórica | PASS local |
| P-G01 | negativos auth/tenant/role, PDF antes/depois, privados/versões e fronteira humana | PASS local; operacional final pendente |
| P-UX-01 | editor completo/abas/grupos opcionais, sem texto livre substituto | PASS local |
| F-01/F-02 | sem sucessão/organograma/matrícula/IA/preços/extração/Score/matching/contratação no diff | PASS revisão |

## Mapa final GOV-01

| Capacidade | Relação | Baseline, regressão e evidência |
| --- | --- | --- |
| Tarifas | direct | regra backend e tabela antiga baseline; Node temporal + UI atual/antiga/futura PASS |
| Manual/Pessoa/vínculo | direct | novo writer/boolean, exige auth/tenant/lock/replay/auditoria;59SQL +6 disputas PASS |
| Editor/Delta/versões/privados | direct | fluxos existentes no SHA baseline;59Node e SQL novo/versão/remoção/privados, UI PASS |
| PDF/documentos/tentativas | plausible_indirect | guards documentais mantidos e proveniência aditiva; corpus52checks antes/depois, ambos rollback PASS |
| Auth/RLS/ACL/proveniência | critical_transversal | require_document_reviewer backend e DML negado; SQL negativo/contato herdado honesto; final remoto pendente |
| Score/matching/avaliações/processos | plausible_indirect | nenhum writer alterado; people só tinha guard de exclusão e BEFORE DELETE; hashes produtivos antes/depois |
| Franquia/pacotes/quote/reserve/settle | no_impact_identified | apenas apresentação temporal; nenhum novo writer financeiro/consumidor IA; helper imutável e fotos remotas |
| Síntese | plausible_indirect | reclassificada após traçar evento de publicação; gate Tokens explicit_only já produtivo preservado e reproduzido no SQL; zero enfileiramento PASS |
| Shell/navegação/release | plausible_indirect | rota/entradas/registry; tipos/build/rotas e renders PASS |
| Parser/gateway/Paddle/mail/Traefik | no_impact_identified | nenhum runtime/código alterado; plano seletivo e IDs dos containers antes/depois |

`evidence/manual-profile-v270/production-baseline.json`:9 conjuntos com contagens/hashes, sem PII exportada. VPS checkout igual ao baseline. Só existe projeto Prisma no conector; não há QA remoto separado. Não se usou banco compartilhado como laboratório.

## Provas e limites da validação

- `scripts/test-manual-profile-sql.mjs`:59 checks, positivos/negativos, publicação/restauro/conflito/remoção/replay/autoria/default/tenant e zero jobs IA. Usa banco novo `manual_profile_qa_v270`, schema lógico e rollback; remove banco no finally. Base antiga vazia tinha arquivo físico de tabela ausente: não foi reparada ou modificada. Bootstrap local reproduz normalização de períodos e gate de síntese explícita já vigentes.
- `scripts/test-manual-profile-concurrency.mjs`:6 checks em sessões simultâneas, banco exclusivo removido. Uma Pessoa/draft por replay, conflito entre saves, uma versão por publicação e duplicidade humana mesmo com chaves diferentes.
- `scripts/test-manual-profile-pdf-regression.mjs`:52 checks no corpus determinístico existente antes/depois da migration, ambos rollback. Bootstrap inclui identidade canônica de seção personalizada já aprovada, ausente na base antiga. Sem provedor pago.
-59Node dirigidos em manual/tarifas/review/Delta/lifecycle/educação/custom sections/rotas/release PASS. Build raiz, tipos web e build web PASS; warnings conhecidos de chunks/import estático+dinâmico, sem erro.
- `browser/checks.json`:89 assertivas; `browser/people-checks.json`:24, sem erro de runtime ou rede externa. Componentes reais, transporte sintético,1448/390/320. Não equivale a comportamento de pessoas reais autenticadas.
- Browser integrado adicional: consulta de duplicidade com2,5s, troca de empresa durante a consulta; nome limpo, resposta obsoleta descartada e nenhuma navegação/criação residual após conclusão. Form de vínculo limpa histórico ao trocar contexto e informa carregamento/indisponibilidade sem bloquear o cadastro.
- Lint/contexto/ledger PASS;22 checks de Tokens/planejamento/dispatcher PASS. Plano confirmado: somente banco e web; nenhum runtime adjacente. Dispatcher sugere teste geral como roteador, substituído localmente pela cobertura dirigida59SQL,59Node,52PDF,6disputas,113browser+escopo e22tooling, sem gate integral local. CI/publicação pendentes. Nenhuma suíte integral local executada; CI obrigatório permanece.

## Fidelidade visual

Referência é o editor existente, sem nova imagem normativa aprovada. Harness `tests/browser/manual-profile-v270.tsx`, runner `scripts/test-manual-profile-browser.mjs`.

| Referência/render | Estado/dados e viewport | Comparação e adaptações | Status |
| --- | --- | --- | --- |
| reference-editor/editor-full | mesma fixture/aba Resumo,1448/390/320 |6 abas/ordem/campos/grupos/ações preservados; manual remove fonte inexistente/amplia editor | PASS |
| editor-empty/manual-lists | vazio/parcial/2experiências,1448/390/320 | grupos vazios recolhidos; novo manual só coluna editável; update mantém referência e Delta | PASS |
| comparison | rascunho salvo,1448/390/320 | comparação antes de publicação humana | PASS |
| rates | atual/antiga/futura,1448/390/320 | atual aberta, histórico e Programada, tabela com rolagem interna | PASS |
| duplicates/person/workspace/people-filter/loading/save-error | desktop/mobile aplicáveis | escolha humana/binário/tag/retomada/filtro, loading sem falsos zeros e falha preserva texto | PASS |

Adaptações são previstas em D-M02/04/A-01. Alerta de erro espremido no celular foi corrigido exclusivamente no manual e revalidado. Falhas iniciais de seletores de ícones/menus virtuais foram corrigidas nos testes sem mudanças indevidas de produto. Screenshots identificam evidência renderizada; testes funcionais sozinhos não foram usados como prova visual.

## Segurança, desvios e execução

Novos RPCs exigem reviewer/tenant, limitam12 candidatos, verificam ator/fingerprint e serializam criação antes de existir Pessoa. Revisão/Perfil usam lock/base vigente. Dados privados novos são transacionais e separados; logs operacionais sem PII. Preflight manual roda antes da inserção de revisão: conteúdo inválido recebe código sanitizado antes de uma constraint produzir detalhe com valores da linha. Negativa de e-mail inválido cobre esta fronteira. Histórico obrigatório do vínculo não gera decisão de contratação/sucessão. Ausência de dado opcional não é fato negativo. Não há nova tecnologia/fornecedor ou desvio funcional identificado no escopo validado.

Baseline produtivo revelou inner `approve_profile_review` executável por authenticated, divergente da fronteira documental aprovada. A migration restaura a fronteira revogando essa entrada interna; o único consumidor frontend permanece `publish_profile_review`/Delta. Não amplia autoridade.

## Publicação, rollback e sincronização

Pendentes. Sessão produtiva salva reutilizada com sucesso no browser integrado, sem extrair/expor credenciais; homepage2.6.2 confirmada antes da publicação. Não criar Pessoas/Perfis/débitos/pedidos/pagamentos fictícios em produção. Publicar somente destinos derivados do diff e SHA explícito; banco compatível antes de web. Verificar dados/ACL/RLS/migration, CI/main/runtime/rotas/assets/rollback/containers. Consolidar fatos finais sem reconstrução desnecessária.
