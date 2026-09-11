# Validação reproduzível: fluxo da Pessoa

Contrato de ferramenta: `person-flow-validation-1.0.0`. Não altera contratos persistidos do Prisma.

## Uso

Na raiz oficial, com dependências já instaladas:

```powershell
pnpm run validate:person-flow
```

Executa, nesta ordem: compilação TypeScript da base/testes; typecheck web; build web; testes da suíte `person-flow`. Compila a base uma vez, sem encadear novamente `pnpm test`. Nenhuma etapa consulta o banco ou chama LLM. O build compila a aplicação existente, mas não inicia servidor nem executa os conectores.

- `pnpm run test:person-flow`: recompila e roda somente os testes do fluxo, útil durante a implementação. Não comprova build web.
- `pnpm run test:tooling`: testa seleção, falhas e medição do executor; inclui falhas sintéticas intencionais nos subprocessos, cujo retorno é verificado pelo teste pai.
- `node scripts/run-tests.mjs --suite person-flow --list`: mostra a seleção sem executar ou compilar.
- `node scripts/run-tests.mjs --list`: mostra todos os testes. `pnpm test` mantém execução de todos os testes, incluindo tooling; não passa a ser um gate autorizado automaticamente.

Evitar executar os dois primeiros comandos em sequência sem mudança entre eles: o segundo já está coberto pelo primeiro. Chamadas diretas do runner exigem compilação atual; use os comandos pnpm para evitar artefatos antigos. Arquivos órfãos em dist não entram na seleção, pois ela parte das fontes.

## Cobertura e nível de prova

Seleção versionada em `scripts/test-suites.mjs`; não é análise automática de dependências.

| Grupo | Cobertura | Natureza da prova |
| --- | --- | --- |
| ingestion | identidade, extração determinística/adaptativa, adapter Document Intelligence e recuperação parcial | comportamento local, mocks e contratos; sem Paddle/OCR real |
| review | revisão e evidência, campos, educação, seções e contratos de concorrência/idempotência | funções locais e inspeção de código/migrations |
| publication | Delta, omissão, contato privado, remoção explícita e ciclo de versões | funções locais e contratos SQL; sem publicar no banco |
| presentation | estados, CTA, Perfil, interrupção e erros | view models/funções e inspeção de UI; não é navegador |
| security | isolamento JSON, guards, schema e migrations sensíveis | negativos locais/contratos; não comprova RLS ativa |
| scenarios | PF-01..PF-06 com dados sintéticos comuns | importação textual e projeções; não é E2E conectado |

Fixtures: `tests/fixtures/personFlow.ts`, fábricas independentes a cada chamada. Sem seed remoto e sem cleanup de dados compartilhados. São independentes de clientes reais e credenciais; fixtures golden e testes existentes continuam preservados.

PF-01 cobre fonte/identidade/extração; PF-02 revisão parcial, destino e omissão; PF-03 preparação de publicação e contato; PF-04 apresentação de snapshot aprovado, sem simular commit SQL; PF-05 descarte/falha; PF-06 reinicialização. Tests `processResume` e `isolation` reutilizam o adapter JSON local, que não substitui o contrato PostgreSQL.

## Quando ampliar a validação

Antes de escolher o pacote, confrontar o diff com seus consumidores. Mudança em autenticação compartilhada, Knowledge, matching, Vagas, exclusão de Pessoa ou contrato reutilizado exige também testes desses consumidores. Atualizar o manifesto quando surgir um novo teste pertinente; nunca removê-lo para esconder falha. Se a mudança atravessar fronteiras não cobertas, justificar os checks adicionais. Gate integral permanece sujeito à aprovação específica do Product Owner.

Alteração de layout precisa smoke responsivo. Mudança de RLS, SQL, RPC, Storage ou publicação transacional precisa prova de integração em ambiente confirmado e autorizado; contrato textual não basta. Para QA, reutilizar a matriz vigente de ingestão/publicação e as provas existentes com dados autorizados. Se faltarem sessão ou dados apropriados, registrar BLOCKED para essa prova e não declarar entrega funcional completa.

## Relatórios e medição

Cada execução gera um JSON novo em `tmp/validation/person-flow/`, ignorado pelo Git: UTC, Node/plataforma, commit, dirty, seleção, versão, fases, exit codes, sinais/erros categorizados e duração. O hash `validationInputsSha256` identifica scripts/manifesto, package, tsconfig, testes selecionados e fixture sintética; não é hash de todo o runtime, dependências instaladas ou banco. Commit e dirty complementam a identificação; uma árvore suja não é uma versão imutável integral.

O relatório não armazena env, credenciais, currículo ou stdout. Logs de build/testes aparecem somente no terminal. Dados de performance são uma medição local, influenciada por cache, máquina e concorrência, não SLA nem prova de economia de tokens.

Falha interrompe o plano e deixa fases posteriores NOT TESTED. Cada processo tem limite de cinco minutos. Falha de preflight cria relatório FAIL; argumento inválido falha antes de iniciar. Falha de gravação do relatório retorna erro, sem marcador PASS. Corrigir a causa e executar novamente produz outro arquivo, sem sobrescrever evidência anterior.

Para medir ganho em entregas futuras, registrar no AoT existente, sem nova tarefa recorrente: tempo de entendimento/implementação/validação, quantidade de tentativas, correções após revisão e intervenções do Product Owner. Informar tokens somente quando houver dado real. Comparar mudanças de risco/escopo semelhantes, usando mediana de várias entregas; não comparar este pacote com um gate integral de cobertura diferente como se o ganho fosse equivalente.

## Recuperação

Interromper a ferramenta não altera produto ou dados remotos. A compilação atualiza somente os artefatos ignorados existentes. A seleção sem filtro permanece disponível; reverter este commit recupera o executor anterior. Não remover `tmp` inteiro: relatórios podem ser descartados individualmente após uso, preservando outros arquivos do usuário.
