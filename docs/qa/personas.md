# Personas de QA

## Usuários autorizados

### Admin da organização

Configura organização, usuários, vagas e, futuramente, IA. Deve acessar auditoria e PII somente conforme finalidade. Testar operações privilegiadas, exportação e tentativa cross-tenant.

### Recruiter/Talent

Importa currículos, consulta PII necessária, busca, cria vagas e avalia matches. Testar acesso permitido e negação de administração, configuração de IA e outros tenants.

### Hiring Manager/Search

Busca e vê perfil/matching explicado, sem documento bruto ou contato privado. Testar minimização e enumeração.

### Usuário autenticado sem membership

Deve receber negação em todas as tabelas de tenant, sem fallback para primeiro tenant.

### Usuário anônimo

Não possui grants nem políticas de dados.

## Personas adversariais

### Candidato malicioso no documento

Inclui instruções, payloads, links ou texto pedindo secrets e mudança de schema. Conteúdo permanece dado.

### Usuário de tenant A buscando tenant B

Tenta IDs conhecidos, filtros omitidos, update de `organization_id`, inferência, matching e exportação cruzados.

### Insider com papel excessivo

Usa busca ou exportação além da finalidade. Exige auditoria, limite e revisão de papel.

### Atacante de supply chain

Introduz dependência, script de instalação ou pacote comprometido. Exige lockfile, revisão e audit.

## Dados de teste

Personas usam contas e currículos fictícios. Nomes `Exemplo` indicam fixtures representativas, não pessoas reais.
