# Setup de fontes e APIs de Knowledge

## CBO

Fonte oficial: `https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo/servicos/downloads/downloads`. Baixar CSV/ZIP oficial, registrar data, formato e SHA-256, validar o pacote, gerar staging e diff antes de publicar. Não exige API key. Preservar raw separado e atribuição CC BY-ND 3.0; mappings Prisma não devem ser apresentados como conteúdo CBO.

## ESCO

Download: `https://esco.ec.europa.eu/en/use-esco/download`. Versão verificada: v1.2.1, atualização indicada em 10/12/2025. Registrar versão, pacote, SHA-256 e atribuição: `This service uses the ESCO classification of the European Commission.` A API é opcional para lookup/refresh; o runtime normaliza contra snapshot local.

## O*NET

Database: `https://www.onetcenter.org/database.html`. Web Services: `https://services.onetcenter.org/`. Versão verificada: 31.0. O database usa CC BY 4.0 com exceções documentadas. Snapshot é a carga principal. Se Web Services for ativado, `ONET_API_KEY` permanece server-side e a atribuição do serviço é obrigatória.

## Knowledge Agent

Configurar como secrets server-side: `OPENAI_API_KEY`, `KNOWLEDGE_RESEARCH_MODEL`, `KNOWLEDGE_AGENT_ENABLED`, caps diário/mensal e cooldown. A flag começa `false`; caps começam `0`. Fonte allowlisted vem do banco, não de constante dispersa. Smoke QA só usa conceito público sintético, registra no-PII e não publica automaticamente.

O fluxo operacional é `fetch/upload -> validate -> stage -> diff -> map -> publish snapshot`. Falha preserva versão anterior ativa. Check de fonte global sugerido: mensal, independente da política de reinterpretação.
