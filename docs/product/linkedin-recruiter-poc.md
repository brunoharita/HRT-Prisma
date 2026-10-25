# Prisma Recruiter — resultado da prova de conceito

Avaliação experimental1.0.0,25/10/2026. Acordo: `../qa/agreement-linkedin-recruiter-poc.md`1.0.0. Não é integração nem mudança do produto em produção.

## Recomendação

**Atende parcialmente como ferramenta de acesso; não atende sozinho ao Prisma Recruiter e não recomendo integrá-lo à produção neste momento.** A PoC comprovou contratos e comportamento local com mocks, inclusive uma chamada MCP cliente/servidor em memória. Não comprovou busca no LinkedIn real, qualidade dos encontrados, aplicação efetiva de localização ou segurança contra bloqueio de conta.

O componente reaproveitável é o acesso às páginas e suas referências. A interpretação de cargos, pertinência da trajetória, qualidade dos dados e autoridade humana continuam sendo responsabilidades do Prisma. A autorização de acesso ao LinkedIn permanece uma condição externa; melhorar o conector não a resolve.

## Objeto e ambiente

- Upstream: [stickerdaniel/linkedin-mcp-server](https://github.com/stickerdaniel/linkedin-mcp-server/tree/0c5f14ba3efcd9ad1bbd3163b4f2b9e47cda7b17), SHA `0c5f14ba3efcd9ad1bbd3163b4f2b9e47cda7b17`, versão4.28.0.
- Licença do código: Apache2.0; LICENSE/NOTICE presentes. Eventual distribuição deve preservar as obrigações correspondentes. Isso não concede acesso aos dados/serviço LinkedIn.
- Python3.14.5, venv próprio e clone ignorado em `tmp/linkedin-recruiter-poc`; dependências instaladas somente nesse venv. Resolução pip registrada em `../qa/evidence/linkedin-recruiter-poc/dependencies.txt`; não declarar que foi executado o lock uv do upstream.
- Nenhum navegador autenticado, Chromium do projeto, conta real, API de IA, Supabase ou VPS usado. Downloads de código/pacotes e consulta pública ao GitHub ocorreram; durante os testes, sockets externos/DNS foram bloqueados. Exceção exclusiva: par de sockets local da implementação de asyncio no Windows.
- Ferramentas gratuitas: Git/GitHub público, Python/venv/pip, unittest/pytest, FastMCP e dependências do projeto. Sem assinatura, serviço pago, proxy comercial ou consumo de LLM. Isso não é estimativa de custo operacional futuro.

## Adequação funcional

| Necessidade do Recruiter | Observação comprovada | Avaliação |
| --- | --- | --- |
| Buscar pessoas | `search_people` gera URL e retorna texto da página em `sections.search_results`, mais referências quando disponíveis | Parcial: não retorna objetos de candidatos nem aderência |
| Palavras-chave em português/outra língua | Preserva Unicode; testes com Gerente de Estoque, Vendedor, Sales Representative, SDR e Arquiteto de Revenue. Expressão bilíngue permanece como enviada | Não traduz, expande ou reconhece equivalências; a interpretação da expressão pelo LinkedIn não foi testada |
| Localidade | Escreve `location` textual na URL, sem resolução geográfica ou recibo de filtro aplicado | Não validado na fonte; não prometer exclusividade por cidade |
| Empresa atual/conexão | Valida ID numérico de empresa e tokens F/S/O. Nome textual e token inválido falham antes de pedir navegador | Contrato local aprovado; aplicação real pela fonte não testada |
| Empregado/desempregado/Open to Work | Parâmetros ausentes da busca de pessoas | Não atende como filtro; ausência de vínculo não pode ser inferida |
| Experiência prévia/cargo anterior/anos | Sem parâmetros estruturados de pessoas para esses critérios | Exige análise posterior das experiências disponíveis, com evidências |
| Sexo/gênero | Nenhum parâmetro estruturado | Não implementado nem inferido; não integra o escopo desta PoC |
| Paginação/volume | Uma captura de resultados e nenhum cursor/parâmetro de página em `search_people` | Não atende busca abrangente; issue526 aberta relata cerca de10 resultados na primeira página, quantidade não medida aqui |
| Ler trajetória | `get_person_profile` seleciona experiência/formação/skills etc.; perfil principal sempre vem. Retorna texto e links por seção | Precisa da extração/revisão existente do Prisma; não equivale a Perfil completo |
| Falha/parcialidade | Erro de seção preservado, erro de busca distinto de resultado, marcador de rate limit interrompe próximas seções | Útil; vazio sem erro ainda não prova ausência/completude |
| Taxonomia/aderência | Nenhum contrato ocupacional CBO/ESCO/O*NET ou score no retorno examinado | Reutilizar Knowledge/RAG/matching Prisma; não criar ontologia paralela |
| Contato e contratação | Servidor registra20 ferramentas, incluindo mensagens, conexões e caixa de entrada | Superfície mais ampla que a busca; não habilitar diretamente no produto |
| Empresas/histórico/auditoria | Contratos examinados não carregam organização, finalidade ou trilha Prisma | Não atende multiempresa por si; gateway autorizado e fluxos canônicos seriam indispensáveis |

Os filtros `experience_level` e semelhantes em `search_jobs` dizem respeito a **vagas publicadas**, não à experiência das pessoas. Não podem ser apresentados como filtros de candidatos.

## Ensaios e resultado

`scripts/evaluate-linkedin-recruiter.py` verifica SHA e ausência de alterações rastreadas no clone, desativa dotenv/importação automática/update check e executa:

-12witnesses Prisma: codificação multilíngue sem tradução, empresa/rede inválidas, ausência de filtros avançados, validação antes do navegador, retorno textual/não pontuado, erro versus vazio, perfil parcial, interrupção por rate limit, inventário de ações e chamada MCP real em memória com extrator simulado. Dados adversariais permanecem texto; isso evidencia a necessidade de um consumidor que os trate como dados, não prova segurança de um agente LLM.
-106testes selecionados upstream: construtor da busca de pessoas, workflow de busca, leitor de top card, handlers de pessoa e transporte HTTP ASGI. Incluem recusas de host/origin, erros/autenticação e coerção de rede. **106PASS, zero falhas/erros/skips**; **12witnessesPASS**. Os cenários de conexão usam mocks e não enviam convites.
- `pip check`: dependências compatíveis. Não é auditoria de vulnerabilidades nem de toda a cadeia de fornecimento.

Evidências: `../qa/evidence/linkedin-recruiter-poc/summary.json`, `prisma-witness.txt`, `upstream.xml`, `tool-inventory.json` e `dependencies.txt`.

Reprodução em Windows/Python3.14, a partir da raiz Prisma, em diretórios ainda inexistentes:

```powershell
git clone https://github.com/stickerdaniel/linkedin-mcp-server.git tmp/linkedin-recruiter-poc/upstream
git -C tmp/linkedin-recruiter-poc/upstream checkout 0c5f14ba3efcd9ad1bbd3163b4f2b9e47cda7b17
python -m venv tmp/linkedin-recruiter-poc/venv
& tmp/linkedin-recruiter-poc/venv/Scripts/python.exe -m pip install -r docs/qa/evidence/linkedin-recruiter-poc/dependencies.txt
& tmp/linkedin-recruiter-poc/venv/Scripts/python.exe -m pip install --no-deps -e ./tmp/linkedin-recruiter-poc/upstream
& tmp/linkedin-recruiter-poc/venv/Scripts/python.exe scripts/evaluate-linkedin-recruiter.py --upstream tmp/linkedin-recruiter-poc/upstream --output tmp/linkedin-recruiter-poc/replay
```

O manifesto inclui dependências Windows; outro SO requer nova resolução/revisão. Não iniciar a CLI do servidor ou executar login/importação para reproduzir estes testes. O harness não instala navegador nem usa cookies do operador.

Houve dois defeitos no harness, corrigidos sem modificar upstream: bloqueio do socketpair interno do Windows e expectativa de argumentos nomeados onde o handler usa posicionais. A primeira execução foi interrompida; seus erros não foram classificados como defeito do projeto. A rodada final roda sobre o harness estabilizado. A seleção não é a suíte completa upstream, nem teste de DOM/LinkedIn ao vivo.

## Segurança e manutenção

1. **Sessão pessoal:** a configuração permite importar cookies do navegador local automaticamente na primeira chamada que precisa de login. A PoC desabilitou isso e não abriu lifespan do servidor. Não usar configuração padrão para conectar uma conta real sem revisão explícita.
2. **Transporte:** stdio é padrão; HTTP direto não possui autenticação de usuário/tenant. A validação de host/origin ajuda contra DNS rebinding e passou nos testes, mas não substitui acesso autorizado. O daemon OWNER possui token local próprio; isso não transforma o endpoint direto em serviço SaaS seguro. Nunca expor o endpoint direto na internet.
3. **Autoridade:** readOnlyHint e descrições de confirmação são metadados de ferramenta, não autorização Prisma. Uma futura superfície deve permitir somente ferramentas necessárias e separar busca, salvamento, contato, publicação e inclusão em processo.
4. **Proveniência e conteúdo:** URLs/URN/links ajudam a atribuir origem. Faltam no retorno os metadados Prisma de organização, responsável, instante/finalidade e estados de revisão. Texto de perfil pode conter instruções adversariais e dados além da finalidade; minimizar antes de qualquer IA/persistência. Não usar o ranking do LinkedIn como Nota Prisma.
5. **Diagnóstico:** `debug_trace.py` usa modo on_error por padrão e pode conservar screenshot, URL e trecho inicial de corpo; não salva valores de cookie nesse registro, mas conserva nomes. Arquivos privados/ACLs existem, porém isso não resolve minimização/retenção. Eventual piloto deve desativar traces e definir retenção de sessão/diagnósticos.
6. **Limite/erro:** o marcador rate_limit é explicitamente uma heurística do upstream para página vazia, não prova de bloqueio. O cliente deve distinguir indisponibilidade, informação ausente e perfil sem experiência. Não repetir automaticamente uma ação de efeito incerto.
7. **Estabilidade:** pacote se declara Beta; automação depende de DOM/sessão e há correções frequentes. Fixar SHA/dependências e manter fixtures seria obrigatório. Não usar `@latest` em produção. Não foi feita auditoria completa de dependências, exploit testing ou garantia de ausência de vulnerabilidades.

O próprio [README/FAQ congelado](https://github.com/stickerdaniel/linkedin-mcp-server/blob/0c5f14ba3efcd9ad1bbd3163b4f2b9e47cda7b17/README.md) adverte sobre restrição/banimento. A [política oficial do LinkedIn](https://www.linkedin.com/help/linkedin/answer/a1341387/prohibited-software-and-extensions), consultada em25/10/2026, restringe automação/coleta não autorizada. A PoC não tenta contornar os controles nem mede uma suposta proteção antibloqueio. Uma integração [RSC oficial](https://learn.microsoft.com/en-us/linkedin/talent/recruiter-system-connect) requer aprovação/acordo e não satisfaz automaticamente a restrição de solução gratuita.

## Comparação e trabalho restante

| Caminho | Benefício | Limitação/custo interno | Recomendação |
| --- | --- | --- | --- |
| Integrar o MCP diretamente | Ferramentas prontas de página/perfil | Acesso autorizado não resolvido; sessão pessoal, ausência de paginação/tenant/objetos estruturados e ações amplas | Não adotar em produção |
| Adaptar como conector isolado | Reutiliza implementação existente e separa fornecedor | Ainda exige autorização da fonte, isolamento de sessões, whitelist, estruturação, erros/retentativa, proveniência/dedupe e manutenção DOM | Somente candidato para avaliação futura; não aprovado nesta PoC |
| Busca assistida com capacidades Prisma | Knowledge prepara termos; recrutador pesquisa e fornece material autorizado para revisão existente | Menos automação de captação; demanda UX e validação do fluxo de origem/registro | Melhor próxima entrega sob as condições atuais |

Eventual integração deve ampliar Pessoas/documentos/dados privados/Posições/Knowledge e decisões existentes, após verificar os contratos exatos; não manter outro cadastro de pessoa/Perfil/Score por fornecedor. A PoC não desenha nem cria novas tabelas.

Para avançar com acesso real: resolver autorização da fonte e finalidade/dados/retenção; depois aprovar piloto com escopo de leitura, sessões isoladas, parada em bloqueio, critérios profissionais verificáveis e medição de pertinência/duplicidade contra busca manual. Não prometer recall, atendimento universal a idiomas, filtros efetivos ou ausência de banimento sem essa evidência. A próxima decisão de produto é entre entrega assistida e perseguir uma fonte integrada autorizada; não é escolher uma técnica para ocultar automação.

## Referências técnicas congeladas

- `linkedin_mcp_server/tools/person.py`: assinatura de busca e saída textual; `linkedin/search_urls.py`: gramática/validação dos filtros.
- `linkedin/person.py`: uma captura de busca, leitura por seção e preservação de erros; `linkedin/contracts.py`: caveat do rate limit.
- `config/schema.py`: defaults de importação/HTTP; `server.py`: papéis direct/owner e registro das ferramentas.
- `debug_trace.py` e `private_state.py`: captura e proteção de arquivos; `pyproject.toml`, `LICENSE`, `NOTICE`: versão/dependências/licença.
- [Issue526](https://github.com/stickerdaniel/linkedin-mcp-server/issues/526), aberta na consulta de25/10/2026; relato comunitário sobre paginação corroborado pela assinatura e fluxo do SHA examinado. Relato não substitui medição ao vivo.
