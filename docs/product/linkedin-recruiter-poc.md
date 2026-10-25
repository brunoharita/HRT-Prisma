# Prisma Recruiter — resultado da prova de conceito

Avaliação experimental1.0.0,25/10/2026. Acordo: `../qa/agreement-linkedin-recruiter-poc.md`1.0.0. Não é integração nem mudança do produto em produção.

## Adendo1.4.0 — busca web comparada, sem conta LinkedIn

Pedido explícito do PO em25/10/2026: testar busca web para Gerente de Estoque/Bauru e cidades próximas, ferramentas gratuitas, comparar com a amostra anterior sem conta restrita/produção. Foi usada apenas a ferramenta de busca web desta sessão, sem contratar API/plano, cadastrar Tavily/SearXNG ou instalar dependência. Não é teste de integração ou custo/cota de uma API produtiva. Nenhum navegador/MCP/cookie da conta LinkedIn foi acessado e nenhum link LinkedIn foi aberto diretamente. Conteúdo analisado é somente o devolvido pelo indexador.

Foram20consultas:4exploratórias amplas e16direcionadas, com títulos/responsabilidades relacionados a estoque, inventário, almoxarifado, logística e supply chain. Recorte nominal: Bauru, Agudos, Pederneiras, Piratininga e Lençóis Paulista; não é raio em quilômetros. As4exploratórias orientaram a escolha das consultas e não entram no corpus medido. As16consultas direcionadas retornaram60URLs únicas:25URLs canônicas de perfis e35páginas de outro tipo. Todas as25referências pessoais eram de conteúdo LinkedIn indexado; nenhuma página pessoal de outro domínio foi encontrada neste corpus. O retorno do buscador não é catálogo completo da web nem50referências pertinentes.

| Evidência disponível nas25referências de perfil | Quantidade |
| --- | --- |
| Descrição própria operacional de estoque/conferência, no recorte regional | 1 |
| Resumo próprio genérico de logística, no recorte regional, sem atribuições de estoque detalhadas | 4 |
| Resumo próprio de logística com localidade da pessoa não confirmada | 1 |
| Cabeçalho da pessoa indica Santos, Campinas ou São Paulo, fora do recorte nominal | 3 |
| Atividade própria disponível em outro contexto: inventário de TI ou vendas de peças | 2 |
| Evidência acadêmica, sem atuação gerencial de estoque demonstrada | 2 |
| Informação insuficiente: vagas compartilhadas, reações, cargo genérico ou atribuições ausentes | 12 |

Há5indícios profissionais regionais para eventual esclarecimento, não5gerentes aderentes. **Zero descrições de responsabilidade gerencial de estoque demonstradas no material indexado recebido.** Não é evidência de que as pessoas não tenham essa experiência. Uma sexta referência de logística depende também de confirmar cidade. Graduação/artigo/curso, empresa logística, publicação curtida e oportunidade compartilhada não viram experiência do titular.

Casos que explicam o ruído sem publicar identidades: Piratininga apareceu como nome de uma distribuidora CPFL e como bairro em Osasco; anúncio em Bauru apareceu num perfil cujo cabeçalho dizia Campinas; uma descrição de compras/almoxarifado era funcionalmente promissora, mas a pessoa indicava São Paulo. O termo inventário também recuperou projeto de hardware/software. Essas ocorrências foram separadas e não usadas como recomendações pertinentes à posição.

### Comparação descritiva

| Critério | Rodada MCP anterior | Busca web desta sessão |
| --- | --- | --- |
| Referências únicas | 100 | 25URLs de perfil |
| Seções de experiência lidas | 50 | 0leituras integrais;25referências indexadas revisadas |
| Descrições gerenciais de estoque sustentadas pelo texto disponível | 7das50revisadas | 0nas25referências indexadas |
| Sobreposição por URL canônica | Base comparativa100/50 | 0com as100;0com as50revisadas |
| Acesso a conta LinkedIn | Sim, interrompido na tentativa51; restrição posteriormente observada | Nenhum |

Normalização para comparação apenas local: host público br.linkedin.com e variante /en são reduzidos ao identificador de perfil, reusando profile_root. Não se procuraram nomes da base privada na web. Zero sobreposição de URL não comprova25novas pessoas: aliases/mudanças de URL não foram resolvidos. Região ampliada, consultas diferentes e profundidades distintas impedem inferir precisão/recall/superioridade ou taxas comparáveis de aderência. O artefato anterior foi lido sem alteração, hash preservado.

Evidência individual mínima, trechos e URLs somente no artefato privado temporário ignorado, com ACL reaproveitada; nada virou Perfil/prospecto/Score/Knowledge/decisão.25vínculos entre trecho literal e referência conferidos, contagens/dedupe reconciliados. Agregado reproduzível: `../qa/evidence/linkedin-recruiter-poc/web-140-comparison.json`. Não houve código produtivo, novas tabelas, nova taxonomia, contato ou implantação.

**Resultado:** a descoberta pela web funcionou sem usar a conta, mas não entregou50referências pertinentes ou evidência gerencial suficiente para recomendar pessoas à posição. Neste corpus, ela continuou dependendo de conteúdo LinkedIn indexado e trouxe muito ruído. Recomenda-se como canal complementar de descoberta, seguido de obtenção autorizada de dados profissionais e revisão; não substituir currículo/experiência por snippets nem considerar Tavily validada por este ensaio. Produto3.3.0/main/produção e histórico/decisões/pesos preservados.

## Adendo1.3.1 — restrição confirmada e limite local50

Em25/10/2026, Bruno autorizou verificar a conta de testes no navegador, uma pesquisa diagnóstica e depois reduzir o piloto para50. A navegação inicial para feed no navegador interno redirecionou para login, mostrou o seletor com a identidade anteriormente verificada e e-mail mascarado correspondente e, sem clicar em nada, chegou a Verificação de segurança. A fonte informa atividade fora do normal e grande volume de acesso a dados de perfis, associado no aviso a ferramenta externa/extensão. **Há barreira explícita de acesso nesta sessão; não é apenas um AuthenticationError sem contexto.** A tela não informa banimento permanente nem prazo. Ela não prova a causa exata de cada erro histórico ou uma restrição em todas as sessões.

A pesquisa única ficou **BLOCKED antes de ser enviada**, pois D-15 exige parar em desafio/restrição. Zero pesquisas novas, zero leituras de terceiros e zero reabertura da sessão MCP. Não houve clique em Entendi, resolução de checkpoint, troca/importação de sessão/conta, mensagens/conexões ou produção. A aba foi mantida para o titular. Evidência: `../qa/evidence/linkedin-recruiter-poc/account-131-check.json` e imagem `account-131-restriction.png`, sem URL tokenizada ou identidade na evidência publicada.

O runner experimental passa a usar alvo50, até50tentativas de experiência, até10páginas/100referências brutas para dedupe, e encerra ao obter50únicas. Novos artefatos têm versão1.3.1 em tmp privado/ignorado; legados1.3.0/100permanecem legíveis com seus metadados originais e não são retomados como nova rodada50. O formato do controlador Trial continua1.2.0; defaults dos outros ensaios não foram ampliados. O limite de leitura efetivo nunca ultrapassa50, inclusive ao carregar um legado. Nenhum catálogo/tabela/dependência foi criado.

**Nova rodada real50: NOT TESTED por restrição da fonte.** As50experiências revisadas na rodada anterior continuam preservadas e não são declaradas50leituras novas. Reduzir o número não comprova segurança, não libera a conta nem autoriza nova coleta diante do aviso. Permanecem os bloqueios de integração produtiva; produto3.3.0/main/produção, nota/pesos/Knowledge/decisões/histórico intactos. Raio geográfico foi apenas discutido, fora desta alteração.

## Adendo1.3.0 — amostra de100perfis

Escopo aprovado por Bruno: Gerente de Estoque/Bauru, até100referências únicas, sem ampliar filtros para completar volume. Reutiliza o pacote gratuito congelado e a mesma conta exclusiva. O controlador verifica paginação nativa (URL final e aria-current do botão PáginaN), localidade selecionada, dedupe e encerramento no alvo. O teto técnico de20páginas/200referências brutas acomoda duplicatas; não é recomendação de volume seguro do LinkedIn. Checkpoint1.2.0 permanece compatível nas execuções anteriores; o artefato privado deste piloto é1.3.0.

A amostra acompanha as primeiras referências únicas na ordem da busca do LinkedIn; não são os100melhores da rede nem um ranking produzido pelo Prisma. Bauru aplicado na busca não comprova residência, disponibilidade ou local atual de cada emprego. O ensaio usa título/localidade, sem importar requisitos adicionais da vaga produtiva.

`scripts/linkedin_recruiter_pilot.py` expõe uma ferramenta MCP local de leitura, usa o extrator upstream para a seção de experiência, serializa a conta e limita cada tentativa a70segundos/uma rolagem. Não repete leituras concluídas ou incertas. Erro, parcialidade, desafio, restrição ou limite interrompem a rodada. Dados necessários à revisão ficam em artefato temporário local, ignorado pelo Git e protegido pelas ACLs do usuário; nenhuma identidade ou experiência é publicada no repositório. Não há serviço/API adicional pago, LLM contratado, integração com a Knowledge ou novo cadastro de negócio.

A revisão consultiva distingue atribuições gerenciais de estoque documentadas, título gerencial específico sem atribuições detalhadas, atuação operacional relacionada, cargo operacional relacionado sem atribuições, relação não demonstrada no material disponível e informação insuficiente. Esses estados descrevem a evidência lida; não são Score, aprovação/rejeição ou ranking de contratação. Título exato não comprova responsabilidades; estoque no nome da empresa, competências genéricas e desenvolvimento de software de estoque não comprovam gestão física de estoque. Contexto varejista com controle de materiais pode ser relacionado sem equivaler automaticamente ao escopo especializado da vaga. Não há requisito de recência/duração inventado.

A captura upstream pode incluir sugestões de outras pessoas e rodapé depois da experiência. Fronteiras observadas PT/EN são removidas antes da revisão; texto desconhecido permanece para avaliação, sem parser universal presumido. A minimização também remove URLs/contatos e explicita corte em18000caracteres. O tratamento dos registros desta rodada é local, sem reler pessoas para corrigir ruído da captura.

**Resultado real PARTIAL em25/10/2026:**100referências únicas em10páginas pelo MCP/Edge real, identidade confirmada e localidade/paginação verificadas.50experiências lidas e revisadas; a51ªtentativa retornou AuthenticationError. O controlador pausou,49referências não foram tentadas, sem retry, e o navegador foi fechado/zero processos dedicados. A classe do erro não confirma banimento nem distingue login expirado, authwall ou desafio; não foi reaberta a sessão para investigar/contornar. Não declarar100perfis analisados ou operação estável nessa escala.

| Evidência nas50experiências revisadas | Quantidade |
| --- | --- |
| Responsabilidades explícitas de gestão de estoque/depósito/inventário/equipe | 7 |
| Cargo gerencial específico de estoque declarado, sem atribuições detalhadas | 8 |
| Atribuições relacionadas, com alcance parcial/operacional ou contexto diferente | 24 |
| Cargo operacional relacionado declarado, sem atribuições detalhadas | 3 |
| Relação ocupacional não demonstrada no material disponível | 3 |
| Informação insuficiente para estabelecer a relação | 5 |

As24relações parciais não são24gerentes aderentes: incluem controle de estoque de loja/oficina, apoio administrativo, estratégia comercial e atuação operacional sem gerência demonstrada. Entre as7descrições gerenciais aparecem logística com armazenagem/ERP/WMS, supervisão de estoque e expedição, depósito com PEPS/layout/equipe e controladoria de estoques de lojas/CD. Isso demonstra a necessidade de analisar funções mesmo com títulos diferentes, sem transformar menções isoladas em aderência. Os8títulos específicos continuam exigindo detalhamento. Os3casos sem relação demonstrada não são rejeições, e os5insuficientes não são fatos negativos.

Método: revisão contextual pelo assistente, sem API adicional de modelo e sem motor produtivo Prisma. Cada uma das50anotações privadas contém categoria, justificativa, trecho literal verificado no texto minimizado e hash desse texto. Os50registros passaram pela remoção de rodapé/sugestões laterais; zero cortes no limite de caracteres. A captura real ocorreu com o sanitizador inicial de contatos; a correção de fronteira foi aplicada/revisada offline nos mesmos textos, sem50novas leituras.38testes offline PASS e22de release-tooling PASS; evidências agregadas `../qa/evidence/linkedin-recruiter-poc/pilot-130-live.json` e `pilot-130-tests.*`.

**Conclusão:** a paginação de100referências funcionou neste ensaio; a leitura contínua de100perfis não foi concluída. O MCP permanece experimental: antes de integração, é necessário esclarecer a interrupção de autenticação com o operador e validar retomada autorizada, cobertura da experiência e qualidade contextual. Não há garantia antibanimento ou aprovação para coletar em produção. Produto3.3.0, main, pesos, histórico, decisões humanas, Knowledge e tabelas originais permanecem intactos; nenhum contato, escrita ou deploy produtivo.

## Adendo1.2.1 — falha de normalização corrigida e validada pelo MCP

Bruno solicitou resolver a falha após o resultado parcial1.2.0. A causa estava no adaptador local: o classificador do upstream fixado retorna referências de pessoa no formato relativo `/in/identificador/`, enquanto `profile_root` só aceitava URLs absolutas HTTPS. Assim, as dez referências legítimas eram rejeitadas em reference_normalization; o filtro geográfico já estava aplicado. Não era evidência de bloqueio, falta de pessoas ou defeito da conta. A regressão usa o `classify_link` real do upstream: falhou antes da correção e passou depois. Os mocks antigos usavam só URL absoluta e não cobriam esse formato.

Correção: resolver exclusivamente referências raiz `/in/...` da fonte já verificada para a origem LinkedIn permitida, conservando normalização/dedupe de URL absoluta. Permanecem rejeitados hosts externos, URLs de rede `//host`, esquemas indevidos, barras invertidas, alias próprio e outros caminhos relativos. Diagnóstico sanitizado distingue etapa/código de validação sem publicar conteúdo de pessoas. O formato do checkpoint continua1.2.0, com campos diagnósticos opcionais; não houve migração, perda ou reescrita de histórico.

A revisão de preservação encontrou retry interno de SectionCapture.capture para resposta vazia suspeita. O wrapper local usa a tentativa única já existente no mesmo upstream para a busca, mantendo o controlador como dono da pausa. Não adiciona navegação alternativa nem disfarce de automação; o clone/SHA/dependências não foram alterados. Um teste com a captura real e execução simulada comprova uma chamada e nenhuma espera/repetição nessa condição.

Foram três chamadas explícitas nesta nova rodada: diagnóstico inicial isolou ValueError fora do driver; diagnóstico por etapa confirmou reference_normalization/invalid_profile_reference com10referências inválidas; após a correção, a terceira concluiu. Não houve repetição automática, tentativa de provocar restrição, leitura de trajetória de terceiro ou contato. Evidências históricas1.2.0 permanecem intactas; os novos resultados são `../qa/evidence/linkedin-recruiter-poc/fix-121-diagnose-initial.json`, `fix-121-diagnose-reference.json` e `fix-121-live-mcp.json`.

**Teste real PASS:** Gerente de Estoque/Bauru trouxe10referências, conta de testes confirmada, estado completed, filtro location=source_applied por URL final **do navegador MCP** e controle nativo selecionado; keywords/host/rota corretos e zero referências inválidas. Não é replay nem prova emprestada do navegador interno. FastMCP cliente/servidor inprocess com Edge real; não alegar stdio nesta rodada. Browser fechado e zero processos do perfil dedicado.30testes offline PASS/zero falhas/erros/skips, incluindo formato real upstream, dedupe relativo/absoluto, rejeição de link externo, diagnóstico sem PII e preservação de tentativa única. Evidências `fix-121-tests.json`/`fix-121-tests.txt`.

A falha específica do adaptador está resolvida. Isso não libera integração produtiva nem comprova todos os filtros avançados pelo MCP, qualidade dos profissionais, recall, estabilidade em escala ou ausência de banimento. O produto3.3.0, pesos/notas, Perfis, histórico, decisões humanas, Knowledge e tabelas originais permanecem intactos. Somente branch experimental, sem LLM/serviço pago ou acesso ao Prisma produtivo.

## Adendo1.2.0 — filtros e controle local

Bruno aprovou a próxima etapa experimental em25/10/2026. Reutiliza o SHA4.28.0 já avaliado, sem fork, instalação/dependência paga ou alteração produtiva. `scripts/linkedin_recruiter_trial.py` reutiliza o construtor upstream e estende sua URL somente com entidades selecionadas na fonte. Não contém catálogo de cidades/cargos/empresas nem consulta a Knowledge produtiva. IDs abaixo são evidência datada deste ensaio, não um dicionário permanente.

**Resultado histórico1.2.0: preparação e controles locais validados; adaptação MCP ao vivo PARTIAL.** A falha específica foi resolvida no adendo1.2.1 acima; a integração produtiva continua fora de escopo. A prova na UI não substitui a prova do conector. Não houve promessa/medição de proteção contra banimento.

### Fonte real e limites da prova

Conta exclusiva reconferida pelo e-mail principal nas configurações do navegador interno. Foram cinco buscas na UI e uma tentativa final pelo MCP, sem abrir trajetórias de terceiros, mensagens, conexões ou gravação no Prisma. Evidência agregada `../qa/evidence/linkedin-recruiter-poc/filters-ui.json`:

| Busca / filtro efetivamente selecionado na UI | Referências na primeira página |
| --- | --- |
| Gerente de Estoque / Bauru, São Paulo, Brasil | 10 |
| Vendedor / Bauru, São Paulo, Brasil | 10 |
| Vendedor / São Paulo, São Paulo, Brasil | 10 |
| Gerente de Estoque / São Paulo, São Paulo, Brasil | 10 |
| Estoque/Bauru + empresa atual SERVIMED + anterior Ambev + Anhanguera + Comércio varejista + perfil Português + conexão3º+ | 0, com estado nativo Nenhum resultado encontrado |

Bauru resolveu para geoUrn101039681 e São Paulo **cidade** para104746682. Estado de São Paulo e São Paulo e Região eram escolhas distintas; não houve seleção por semelhança textual. A UI manteve os chips de filtro e a URL final. No ensaio combinado, as sete seleções foram confirmadas: currentCompany966373, pastCompany162402, schoolFilter264214, industry27, profileLanguagept, networkO e Bauru. A empresa repetida em seções diferentes foi desambiguada pela seção atual/anterior. Isso prova aplicação observada dos filtros e estado vazio, não correção de cada dado de perfil, recall, relevância ou comportamento isolado de cada faceta.

As referências foram substituídas por tokens efêmeros somente para conservar igualdade no replay, sem nomes/URLs de pessoas publicados. Quarenta referências distintas entre as quatro páginas observadas não são quarenta candidatos aderentes. Não se avaliou ninguém nem se alterou o ranking do LinkedIn. `filters-replay.json` é explicitamente um replay local de recibos reais, com zero nova busca, não uma execução autônoma do MCP.

`scripts/linkedin_recruiter_mcp_trial.py` expõe **somente run_readonly_trial**, por FastMCP cliente/servidor em memória com navegador real; nenhum endpoint HTTP ou ferramenta de escrita é registrado. Reutiliza o leitor/captura upstream, substituindo temporariamente só o construtor de URL na leitura serializada. O perfil de navegador exclusivo anterior foi reutilizado com auto-import off/traces off; não se copiou a sessão do navegador interno. A identidade própria coincidiu com a conta verificada, mas a chamada parou com invalid_observation_or_driver_error antes de obter recibo válido. O diagnóstico daquela revisão não registrou classe/etapa, portanto **a causa exata permanece desconhecida**; não atribuir ao LinkedIn, à conta, ao filtro ou a bloqueio. O navegador foi fechado e zero processos do perfil dedicado permaneceram. Não houve retry real: a sexta tentativa encerrou o orçamento desta rodada. Evidência histórica preservada em `filters-mcp.json`.

A revisão seguinte acrescentou diagnóstico sanitizado por classe/etapa e passou nos testes com navegador simulado. Essa melhoria **não foi revalidada na fonte real**. Não declarar a integração corrigida nem sucesso do filtro pelo MCP. O teste de transporte inprocess não é teste de stdio; o stdio original permanece coberto pelo adendo1.1.0.

### Comportamento implementado e preservação

- Cada entidade precisa de seleção inequívoca na fonte; texto de cidade/empresa não vira ID por aproximação. O adaptador recebe essa seleção, ainda assistida nesta PoC. URL ecoada, sem controle selecionado, fica unverified e interrompe a execução.
- Início explícito; exclusão mútua por conta em arquivo criado atomicamente. Outra execução recebe busy; não existe fila distribuída/produtiva. Até6páginas/60referências por rodada local, com timeout e contagem de tentativas também em falhas. O witness MCP final ficou em1página/10referências. Esses números delimitam o experimento e não são limites seguros do LinkedIn.
- Nenhum retry automático. Desafio, restrição, login, rate limit, erro ou parcialidade interrompem. Não há disfarce de automação, mudança de IP/conta, CAPTCHA automático ou código novo de stealth. Os mecanismos internos do pacote avaliado não constituem garantia antibanimento.
- Checkpoint contém versão/hash do plano, contadores, índices de trabalho, hashes salgados de referências e eventos agregados. Não contém currículo, texto de perfil, URL de pessoa ou senha. Retomada explícita pula páginas concluídas; página incerta exige decisão explícita de repetição e consome novo orçamento. Lock após crash não é removido automaticamente. O checkpoint é progresso técnico local, sem cadastro ou autoridade de negócio.
- Sem criação de tabelas/entidades de domínio, LLM, sinonímia nova ou acesso produtivo. Posição/Knowledge/Pessoas, fatos originais, pesos/notas, histórico e decisões humanas permanecem nos fluxos proprietários. Texto externo não controla ferramentas nem vira instrução.

### Capacidades gratuitas e classificação

| Critério | Estado nesta PoC |
| --- | --- |
| Localidade, empresas atuais/anteriores, instituição, setor, idioma do perfil, conexão | NativeSelection/URL/recibo suportados; aplicação real conferida na UI, MCP automatizado ainda PARTIAL |
| Cargo atual/anterior, responsabilidades, liderança, tempo relevante | profile_evidence_required; nenhuma palavra isolada ou resultado de busca confirma trajetória |
| Curso, grau, conclusão, competências, certificações | profile_evidence_required; instituição selecionada não comprova formação/conclusão |
| Proficiência linguística, disponibilidade, emprego atual/desemprego | profile_evidence_required; língua do perfil e ausência de vínculo não permitem inferência |
| Sexo/gênero | excluded; não implementado em filtro, inferência ou ranking |
| Nomes e demais campos textuais avançados | Disponíveis na UI observada, sem implementação estrutural neste adaptador; indisponibilidade explícita fora das facetas declaradas |

Não há parser de trajetória, aprovação de Knowledge ou avaliação de pessoas neste protótipo. A expansão futura de termos deve consumir conceitos/termos aprovados da Knowledge original, preservando escopo organizacional e decisões humanas. Não se criou um mapa próprio de sinônimos. Dados ausentes, erro, resultado vazio e aderência são estados distintos.

### Validação e reprodução

26testes determinísticos PASS, incluindo testes de FastMCP real em memória/navegador simulado: pin, facetas, Unicode, múltiplas localidades, entidade ambígua, filtro ignorado/ecoado, destino externo, dedupe de URL, versão/checkpoint inválido, concorrência por conta, orçamento, timeout/cancelamento, pausa/retomada, identidade divergente, exceção privada e única ferramenta de leitura. Sockets externos bloqueados no harness; exceção só para wakeup pipe do asyncio Windows. Evidências `filters-tests.json`/`filters-tests.txt`. Nenhuma nova suíte integral local Prisma. Uma edição intermediária do harness colocou métodos na classe errada; corrigida e rodada final passou, sem usar esse erro para diagnosticar o LinkedIn.

```powershell
& tmp/linkedin-recruiter-poc/venv/Scripts/python.exe scripts/test_linkedin_recruiter_trial.py
```

Ambiente gratuito existente conforme reprodução1.0.0 abaixo. O adaptador e seus testes não abrem navegador. O runner MCP é **opt-in**, usa plano e identidade verificada em arquivos locais ignorados e não deve ser iniciado para reproduzir os testes sintéticos. O replay recebe recibos mínimos locais via --replay-observations, --checkpoint-root, --run-id e --output; não publica tokens de igualdade. O runner MCP não está pronto para produção, não acessa perfis por conta própria além da amostra explicitamente autorizada e não oferece um serviço multiempresa.

Próximo gate técnico: diagnosticar a falha com o novo registro sanitizado em outra rodada delimitada antes de afirmar que o conector adaptado funciona. O caminho assistido e as capacidades verificadas da UI continuam aproveitáveis. Autorização da fonte, limites comerciais, governança de dados e integração permanecem decisões futuras. Esta etapa não os resolve.

## Adendo1.1.0 — fonte real, conta exclusiva

Bruno autorizou leitura real após concluir login na conta de testes. O e-mail principal foi conferido em Configurações > Acesso e segurança > Endereços de e-mail e coincide com a conta solicitada; não se usou sua conta oficial. Evidência agregada: `../qa/evidence/linkedin-recruiter-poc/live-source.json`. Não se conservaram nomes/URLs/fotos/contatos dos profissionais.

- **Localidade textual falhou no caso observado:** a URL com `keywords=Gerente+de+Estoque&location=Bauru`, no formato gerado pelo upstream, terminou com apenas keywords após a hidratação. Localidades não estava selecionada; os10cartões da página mostravam outras cidades. Pelo filtro nativo foi selecionada a entidade Bauru/geoUrn101039681;10cartões passaram a exibir Bauru. Assim, enviar location como texto não comprova nem aplicou o filtro nesta sessão. Isso atualiza a limitação anteriormente não validada; nenhuma correção do conector foi implementada.
- **Nomenclaturas alteram o recorte:** com Bauru selecionada, Vendedor e Sales Representative exibiram10cartões cada; zero perfis em comum entre essas primeiras páginas, após normalizar links secundários à raiz de perfil. Isso sustenta combinar termos e deduplicar em eventual solução, mas não mede recall nem prova disjunção do universo total. Na busca em inglês,9cartões mostraram Bauru e1somente uma região mais ampla; isso não prova que esse último esteja fora da cidade.
- **Presença não é aderência:** os resultados de estoque misturam cargos de logística, operações, loja e outras funções. Não se avaliou nem rejeitou pessoa individualmente; título/competência/resumo de busca não substituem evidência profissional contextual.
- **Execução do MCP separada, concluída:** após janelas expirarem em300s/900s, login manual sem limite foi registrado no perfil exclusivo, sem auto-import e com traces off. O operador confirmou a conta; o perfil próprio lido pelo MCP contém o mesmo nome público da conta cujo e-mail foi conferido no navegador integrado. O MCP conservou o alias `/in/me`; a tentativa de ler contact_info retornou OverlayRootNotFoundError e não revelou e-mail. Ausência nessa leitura não significa e-mail divergente. Evidência sanitizada: `../qa/evidence/linkedin-recruiter-poc/live-mcp.json`.

| Busca real via MCP stdio | Referências de pessoa retornadas | Tempo da chamada | Erro de seção |
| --- | --- | --- | --- |
| Gerente de Estoque, location=Bauru | 10 | 4,15s | nenhum |
| Vendedor, location=Bauru | 10 | 4,60s | nenhum |
| Sales Representative, location=Bauru | 10 | 5,10s | nenhum |

São dez referências por resposta, não trinta pessoas distintas comprovadas. O extrator retornou texto e links, sem score ou publicação de Perfil. As três respostas mantiveram location na URL de retorno, não tiveram geoUrn e não contiveram Bauru no texto extraído. A URL é construída a partir do pedido em `PersonReader.search_people`, não um recibo da URL final renderizada ou de filtros aplicados. A combinação com a observação do navegador corrobora a falha geográfica; não usar só a URL retornada para afirmar que uma cidade foi aplicada.

O teste direto atualiza a conclusão: **busca e leitura básicas funcionaram nesta pequena amostra real**; a indisponibilidade de execução real deixa de ser uma lacuna para esses três cenários. Continua sem atender ao produto completo. O próximo ensaio técnico recomendado é uma adaptação local delimitada de localidade: resolver a entidade nativa, aplicar geoUrn e verificar o filtro na fonte, antes de pensar em integração. Isso é recomendação, não correção implementada/autorização de rollout. As demais lacunas de taxonomia, paginação, dados estruturados, tenant, fonte autorizada e confiabilidade continuam.

Nenhuma mensagem/conexão/reação, coleta em massa, cadastro de prospecto, escrita no Prisma, acesso à VPS/Supabase ou deploy. Nenhum desafio surgiu nas buscas do navegador integrado; essa amostra não garante segurança da conta em uso futuro ou escala. As evidências sintéticas abaixo permanecem válidas em seu escopo original.

O navegador próprio foi encerrado por close_session após as buscas. A autenticação fica somente no perfil local exclusivo ignorado por Git; cookies, estado de navegador, logs privados e textos integrais dos perfis não foram publicados. O cliente experimental inicial exigia URL canônica para a identidade e interrompeu a execução diante do alias; esse critério de harness foi ajustado à prova composta de identidade acima, sem modificar o upstream nem tratar ausência de e-mail como divergência. Não foi feita nova inferência ou decisão sobre os profissionais encontrados.

## Recomendação

**Atende parcialmente como ferramenta de acesso; não atende sozinho ao Prisma Recruiter e não recomendo integrá-lo à produção neste momento.** A etapa1.0.0 comprovou contratos e comportamento local com mocks, inclusive uma chamada MCP cliente/servidor em memória. O adendo1.1.0 acima comprova três buscas reais de leitura pelo conector e uma falha geográfica, sem benchmark de qualidade/recall ou garantia contra bloqueio. O funcionamento dessas buscas não elimina as adaptações e os gates de integração.

Atualização1.2.0: filtros/controles experimentais implementados e conferidos conforme adendo mais recente; witness do adaptador MCP não concluído. Preservada recomendação de não integrar à produção. As referências a adaptação ainda não autorizada nas seções históricas1.0/1.1 não descrevem o escopo local1.2 posteriormente aprovado.

Atualização1.2.1: witness corrigido e concluído para a busca geográfica; causa/regressão/prova real no adendo acima. As limitações de integração, autorização da fonte e escala permanecem.

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
