# Execution Prompt — M7.7 Governança Empresa → Global da Knowledge

Contrato congelado: `docs/qa/agreement-m77-knowledge-company-global-governance.md` 1.0.0.

## Entendimento obrigatório

Implementar D-01 a D-08. Impedir P-01 a P-04. Preservar F-01 a F-03. Aplicar A-01 a A-03.

M7.7 não cria uma segunda Knowledge nem transforma semelhança em equivalência. O registro da empresa é uma sobreposição autorizada, com precedência sobre a Global apenas dentro daquela empresa. A contribuição global é uma cópia sanitizada para governança central; a decisão sobre ela nunca reescreve a origem local.

## Ordem econômica de execução

1. Reusar as tabelas, change sets, propostas, auditoria e `knowledge-agent` existentes; identificar a menor extensão necessária para vincular uma contribuição global ao conceito e à organização de origem.
2. Implementar a transação server-side de criação/associação local e contribuição global, com idempotência, autoridade `owner`/`admin` e validações negativas de escopo.
3. Atualizar a resolução Empresa → Global apenas se a prova mostrar lacuna; não reimplementar a precedência já existente.
4. Ajustar a curadoria de Perfil e a tela Knowledge: empresa grava diretamente; somente Super Admin vê/revisa a fila global; candidatos são informativos; pesquisa externa por IA é ação explícita do Super Admin.
5. Reutilizar `knowledge-agent` para pesquisa externa com seu contrato de sanitização, fontes permitidas, orçamento, auditoria e falha não bloqueante. Não criar provider, segredo, modelo ou pesquisa automática.
6. Cobrir os critérios CA-D01 a CA-D08 com testes de transação, RLS/autorização negativa, precedência e interface. Não usar dados reais para testar decisões humanas.
7. Criar ADR da governança, atualizar owner docs/estado, regenerar Context Pack, revisar o diff e encerrar AoT.
8. Publicar conforme o dispatcher de release: migration/Function/web apenas se o diff exigir; confirmar local, GitHub, Supabase e VPS com evidência própria.

## Limites de entrega

- Não assumir que o Super Admin pode apagar histórico: correções administrativas permanecem auditáveis.
- Não expor origem organizacional a administradores de outras empresas.
- Não executar pesquisa externa por padrão, em lote ou para termos sem ação explícita do Super Admin.
- Não declarar a IA como evidência suficiente ou aprovação.

## Evidência de encerramento

AoT com matriz D/P, migration aplicada e validada no ambiente autorizado, evidência de autorização negativa, testes focados, Context Pack e estado de release. Registrar separadamente CI, Supabase, Function, VPS e smoke visual autenticado; nenhum documento substitui essas provas.
