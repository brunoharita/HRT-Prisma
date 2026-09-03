# Setup de fontes e APIs de Knowledge

## CBO

Fonte oficial: `https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo/servicos/downloads/downloads`. Baixar CSV/ZIP oficial, registrar data, formato e SHA-256, validar o pacote, gerar staging e diff antes de publicar. Não exige API key. Preservar raw separado e atribuição CC BY-ND 3.0; mappings Prisma não devem ser apresentados como conteúdo CBO.

## ESCO

Download: `https://esco.ec.europa.eu/en/use-esco/download`. Versão verificada: v1.2.1, atualização indicada em 10/12/2025. Registrar versão, pacote, SHA-256 e atribuição: `This service uses the ESCO classification of the European Commission.` A API é opcional para lookup/refresh; o runtime normaliza contra snapshot local.

## O*NET

Database: `https://www.onetcenter.org/database.html`. Web Services: `https://services.onetcenter.org/`. Versão verificada: 31.0. O database usa CC BY 4.0 com exceções documentadas. Snapshot é a carga principal. Se Web Services for ativado, `ONET_API_KEY` permanece server-side e a atribuição do serviço é obrigatória.

## Monitoramento mensal

`knowledge-source-monitor` está implantada no Prisma-QA. Depois de aplicar as migrations e publicar a função em um novo ambiente, executar uma vez, como conexão administrativa e sem registrar secrets no terminal ou no Git:

```sql
select public.configure_knowledge_source_monitor('https://PROJECT_REF.supabase.co');
```

A RPC cria o segredo aleatório no Vault e registra `prisma-knowledge-source-monitor-due` no Supabase Cron. O job roda a cada hora, mas a função só consulta fontes com `next_check_at` vencido. A execução mensal real é calculada para o primeiro dia às 01:00 em `America/Sao_Paulo`; falhas temporárias ou de validação repetem em 6h, 24h e 72h. Depois disso, a versão publicada permanece ativa e a próxima tentativa volta ao ciclo mensal.

Estados operacionais: `current`, `update_available`, `action_required`, `temporary_failure` e `validation_failed`. Ausência de mudança não exige ação. Versão nova cria ou atualiza somente o registro `catalogued`; baixar o pacote completo quando aplicável, conferir licença e formato, preparar staging/diff e publicar continuam sendo etapas humanas do fluxo M5.2. O portal ESCO exige aceite e entrega por e-mail. O O*NET exige importer aprovado antes da carga.

## Knowledge Agent

Configurar como secrets server-side: `OPENAI_API_KEY`, `KNOWLEDGE_RESEARCH_MODEL`, `KNOWLEDGE_AGENT_ENABLED`, caps diário/mensal e cooldown. A flag começa `false`; caps começam `0`. Fonte allowlisted vem do banco, não de constante dispersa. Smoke QA só usa conceito público sintético, registra no-PII e não publica automaticamente.

O fluxo operacional é `monitor -> fetch/upload -> validate -> stage -> diff -> map -> publish snapshot`. Falha preserva a versão anterior ativa. O monitor mensal é independente da política de reinterpretação.
