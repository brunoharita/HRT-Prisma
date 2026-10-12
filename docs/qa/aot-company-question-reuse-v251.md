# AoT — Questões privadas reutilizáveis 2.5.1

Acordo integral1.0.0 `agreement-company-question-reuse-v251.md`, execução e mapa prévios correspondentes. Decisão explícita de Bruno em12/10/2026; baseline main/origin/VPS d4109b2524e2e3cb68a616650ab7328aa5a2837d, runtime web e16151ec657264ab403aa2eda9fe439ee2ad0ab3. Branch `codex/company-question-reuse`, risco D. Evidências em `docs/qa/evidence/company-question-reuse-v251/`.

## Acordos, implementação, teste e evidência

| ID | Implementação | Evidência | Status |
| --- | --- | --- | --- |
| D-01 | Wrappers de aprovação individual e conjunto; rotina privada lê decisão persistida e grava na mesma transação | SQL158: pendência ausente, aprovação mesmo com saveToBank=false, conjunto10, revisão original; processo64 | PASS |
| D-02 | Tenant obtido do registro autorizado; destino privado guardado antes de reserva/publicação; workspace sem destino global | SQL empresas A/B, IDs cruzados/anon, super_admin privado, global negado e rollback; states34 | PASS |
| D-03 | Fingerprint/família/versionamento existentes; lock de empresa; replay sem recriar ou duplicar | SQL replay, contagens/auditoria e duas conexões simultâneas com item ausente | PASS |
| D-04 | Backfill de aprovação persistida; conteúdo/5 alternativas/key/explicação/competência/dificuldade/idioma/origem/version/autor/data conservados | SQL recuperação10 e campos originais; produção20/20 originais preservados,13 tópicos | PASS |
| D-05 | Sem escritor de provas/aplicações/convites/Pessoas/Perfis/Score; estado comprometido permanece bloqueado | SQL snapshots e global intactos, processo/portal; portal38; quinze fingerprints produtivos intactos,17 itens antigos também | PASS |
| D-06 | Textos de uso exclusivo/reutilização, checkbox legado retirado; seleção de destino somente empresa | Browser banco191+states34, processo64, portal38; inspeção visual390; tipos/build; error/release tests | PASS |
| D-07 | Tabelas/auth/validação/custos atuais; auditoria backend explicitamente sem decisão humana criada | SQL audit payload e grants privados; diff sem provedor/modelo/prompt/serviço/tarifa/papel/dependência novos | PASS |
| D-08 | Versão2.5.1, owner docs/contexto, publicação seletiva e fechamento | Local/CI feature e main PASS; backend/web no SHA47c9b09, rollback, smoke34 e Git funcional sincronizado | PASS |

## Proibições e capacidades protegidas

P-01 PASS: empresaB/ID conhecido negados, publicação global bloqueada até para privilegiado; sete corpos novos e grants produtivos conferidos. P-02 PASS: rascunho pendente não publicado; autoria/data da aprovação persistida;20 auditorias técnicas `humanDecisionCreated=false`, `executionKind=backend-projection`, autor causal original. P-03/P-04 PASS: snapshots/convite/portal/correção e quinze fingerprints produtivos iguais, incluindo aplicações, geração e Tokens; nenhuma IA/e-mail adicional ou teste com Pessoa produtiva. P-05 PASS: replay/concorrência idempotentes, comprometido não reativado. P-06 PASS: diff/plano apenas migration nova/web/docs; untracked alheios preservados e nove containers adjacentes idênticos.

## Validação proporcional e limites

LOCAL PostgreSQL17:158 asserts da regressão conjunta existente banco/processo/portal mais privados, e corrida real de duas conexões. Harness clona somente schema e seed técnico da baseline descartável vazia, recria fixtures sintéticas e remove exclusivamente sua própria clone ao terminar. A baseline original não foi alterada; limitações físicas antigas permanecem, conforme AoT2.5.0. Nenhum QA remoto separado existe.

Browser com componentes reais/serviços sintéticos: banco191, estados34 incluindo destino privado para super_admin, processo64, avaliação/portal38, em desktop/celular e com negativas de falha/loading/rascunho/retry. Node dirigido49 testes e31 checks de regressão de mensagens/loading/navegação/shell (mensagens compartilhadas repetidas somente após correção). Cinco guards de loading/avisos e22 testes de release/contexto PASS. Lint do snapshot de arquivos rastreados, Context Pack e ledger PASS. Tipos web, build TypeScript e build web PASS; revisão visual de geração390 sem overflow. Mensagem de erro dedicada precede fallback interno e preserva a prioridade de autorização. Testes não certificam calibração empírica nem jornada produtiva autenticada, ambos NOT TESTED.

Baseline produtiva verificada: Supabase Prisma ioldpnqqvobprjiontre ACTIVE_HEALTHY/PG17.6.1.155, uma avaliação emitida com20 questões aprovadas/13 tópicos e20 aprovações originais válidas. Validator atual confirmou20/20. Banco antes17 (16 institucionais globais,1 da empresa). Quinze fingerprints agregados antes cobrem dados/convites/generação/Tokens/globais, sem exportar conteúdo pessoal. VPS checkout d4109b2, dez containers e222 assets registrados; nove serviços adjacentes a preservar. Edge/configuração/políticas de IA não precisam mudar.

## Publicação e encerramento

Publicado em12/10/2026: SHA funcional `47c9b09ebdf768c50f78a955ec4842441c802a5e`, main/origin/VPS. CI feature38245685435/main38246084483 success. Plano seletivo sem Edge/Parser/gateway/mail/Synthesis. Migration remota20261012115641 `company_question_reuse`, SHA256 idêntico ao arquivo; sete novos corpos conferidos, seis originais preservados, sete funções privadas sem grants para anon/authenticated/service_role. Edge8 ACTIVE/JWT e conteúdo inalterados.

Recuperação produtiva:20 questões,13 tópicos,20 conteúdos/alternativas/key/explicações/competências/dificuldades/idiomas/versões/autores/datas originais preservados;20 auditorias backend vinculadas. Catálogo autorizado agora37 (21 da empresa,16 institucionais globais). Quinze fingerprints de dados idênticos antes/depois e17 itens pré-existentes com fingerprint igual à baseline produtiva2.5.0. Sem exportar questões, nomes, e-mails ou IDs pessoais nos artefatos.

Web34/34 smoke PASS: SHA/versão2.5.1/JS/CSS/rotas/login1448/390/320; rollback preserva imagem anterior;222 assets antigos íntegros (224 após), nove containers adjacentes mantêm identidade/imagem/estado/start/health. Publisher encontrou404 imediatamente após recriação e saiu22; estabilização verificada independentemente sem repetir deploy/build. Fechamento documental sincroniza fontes/evidências sem reconstruir o SHA funcional.

Migration nova `20261012060000_company_question_reuse.sql` conserva implementações anteriores em funções privadas sem grants de cliente. Rollback da aplicação usa imagem anterior; eventual reversão controlada de funções não apaga itens históricos nem inventa decisão humana. Desvios do acordo: nenhum; CA-01..CA-04 PASS com os limites expressos.


Roteamento do dispatcher: validação completa `pnpm run test` substituída pelas suítes dirigidas acima conforme AGENTS10; CI existente mantém seu gate normal. Snapshot do index exclui cópias untracked alheias, sem mudar os guards. Warnings de bundles/dynamic import e garbage collection de worktrees são anteriores; não foram incorporados ao escopo.
