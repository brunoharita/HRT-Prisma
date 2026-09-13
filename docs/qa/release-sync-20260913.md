# Evidência de sincronização da versão — 2026-09-13

## Escopo autorizado

Consolidar a última versão acumulada entre workspace local, Git remoto e o único backend Supabase existente, Prisma-QA. Produção e hosting de frontend não existem no estágio atual.

## Agreement → Implementation → Test → Evidence

| Contrato | Implementação | Evidência | Status |
| --- | --- | --- | --- |
| D-SYNC-001: preservar uma única linha acumulada de código | `main` avança por fast-forward até o fechamento desta sincronização | relação de ancestralidade e refs local/remota | PASS |
| D-SYNC-002: backend QA usa as Edge Functions locais atuais | implantação conjunta das dez funções do repositório, sem `prune` | listagem remota pós-deploy: dez funções `ACTIVE` | PASS |
| D-SYNC-003: não aplicar SQL quando o histórico não for seguro | `supabase db push --dry-run` antes de qualquer push | CLI retornou `LegacyDbPushMissingLocalError` e nenhum SQL foi executado | PASS |
| D-SYNC-004: aplicação local executa a mesma revisão | servidor Vite em `127.0.0.1:5555` a partir do workspace oficial | resposta HTTP 200 e processo Vite ligado ao workspace canônico | PASS |
| P-SYNC-001: não reescrever o histórico remoto para aparentar sincronização | nenhum `migration repair`, `db pull` ou replay de migration antiga | revisão dos comandos executados | PASS |
| P-SYNC-002: não acionar produção | somente local, Git e Prisma-QA | topologia documentada em `docs/operations/environments.md` | PASS |

O gate completo também identificou duas expectativas estáticas anteriores à base compartilhada de UX: o teste ainda procurava `Knowledge da empresa`, enquanto a linguagem aprovada usa `Conhecimento da empresa`, e procurava a mensagem de saída dentro da página de revisão, embora a proteção tenha sido centralizada em `PrismaNavigation`. Os testes foram alinhados às superfícies canônicas sem reduzir proteção ou mudar comportamento do produto.

## Banco de dados

A migration mais recente presente local e remotamente é `20260913132559`. A correção `vacancy-matching-explainable-2.3.0` é de domínio e frontend; seu payload usa o JSON já permitido em `match_evaluations` e não exige schema novo.

O ledger remoto antigo contém versões com timestamps diferentes dos arquivos locais equivalentes. A simulação oficial recusou o push antes de executar qualquer SQL. A sugestão automática de marcar dezenas de migrations remotas como revertidas não foi aplicada porque apagaria a verdade operacional do histórico. A aplicação permanece compatível com o schema remoto vigente; a reconciliação do ledger é um trabalho de governança separado, com comparação de conteúdo e plano de recuperação.

## Edge Functions

Foram implantadas e confirmadas `ACTIVE`: `assessment-access`, `assessment-item-generator`, `knowledge-agent`, `knowledge-source-monitor`, `knowledge-source-publish`, `operator-password-reset`, `operator-sign-in`, `person-data-deletion`, `person-document-lifecycle` e `platform-users`. As configurações de verificação JWT permaneceram as definidas no repositório.

## Limites

- Não existe frontend hospedado; a interface permanece local.
- Não existe projeto de produção separado.
- A sincronização funcional não declara o ledger histórico de migrations reconciliado.

## Validação local

`pnpm run validate` passou após o alinhamento das duas expectativas estáticas: lint, foundation, Context Pack, typechecks, build web, 415 testes, 19 casos golden e demonstração `VERTICAL_SLICE_OK`. O build mantém apenas o aviso conhecido de chunks grandes.
