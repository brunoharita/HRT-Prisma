---
prisma_context_id: product-wiki
owner: product
status: current
version: 2.0.0
last_verified: 2026-09-14
---

# Prisma Wiki

## Vagas: revisão canônica M5.4.6

A Vaga pronta separa narrativa de matching: Sobre a posição, Responsabilidades, Requisitos obrigatórios/desejáveis por dimensão e Resultados esperados. O operador decide a importância de cada requisito; rascunho pode ter item não classificado, mas matching não. Correções e itens manuais são preservados quando uma descrição é reestruturada.

## Posições, Prisma Score e verificação

A descoberta de Pessoas considera primeiro experiência na área da Posição e mantém sinais relacionados em grupo separado. Relação de área, proximidade do cargo e aderência por requisito são explicadas separadamente. O Prisma Score usa somente evidências profissionais e ordena Pessoas dentro de cada grupo, inclusive quando provisório e identificado; não elimina resultados nem decide contratação.

Uma verificação de competência nasce da ação humana sobre Pessoa, Posição, versão e requisito exatos. A central acompanha necessidades já criadas; leitura não cria fixture ou necessidade silenciosa. Preparação, convite manual, acompanhamento e resultado preservam contexto, evidências, versões e limites. Resultado inconclusivo não prova ausência de competência.

## Produto

Prisma é uma camada de Talent Intelligence para transformar currículos e informações profissionais em conhecimento estruturado, pesquisável, comparável, explicável, auditável e versionável.

Não é ATS completo, banco de currículos, chatbot de PDF ou IA decisória. Pode coexistir com ATS, HCM, HRIS e ERP.

## Hipótese inicial

Transformar bases de currículos em conhecimento profissional estruturado e permitir busca e matching explicável. A viabilidade técnica local foi demonstrada; valor comercial e qualidade com dados reais permanecem hipóteses.

## Regras funcionais

- Pessoa unifica candidata, colaboradora e demais lifecycles profissionais.
- Usuário opera o Prisma; Pessoa é representada pelo Prisma.
- Papel, posição e vaga são entidades diferentes.
- Fato possui evidência e proveniência.
- Inferência é derivada, versionada e separada.
- Recomendação não altera fatos.
- Decisão humana e resultado observado são registros distintos.
- Ausência de evidência não é atributo negativo.
- Matching existe no contexto de vaga ou papel.
- Gap é requisito obrigatório sem evidência identificada.
- Insuficiência precisa ser uma saída válida.
- IA não decide contratação ou rejeição.
- Currículo é uma entrada operacional principal: o arquivo pode existir em intake antes da Pessoa, mas a Pessoa só é criada após identidade mínima válida e verificação tenant-scoped de correspondência.
- Correspondência é sinal explicável, não decisão; vínculo a cadastro existente ou criação apesar do sinal exige ação humana explícita.
- A jornada do currículo possui seis etapas compreensíveis e um estado de produto derivado; tentativas permanecem em detalhes técnicos.
- Nova importação é proposta. O perfil vigente continua disponível até a publicação de outra versão.
- Omissão no currículo novo preserva o conhecimento aprovado. Remoção exige confirmação humana explícita, motivo e trilha de auditoria.
- A revisão salva conduz à comparação Delta; publicação confirmada encerra na Central da Pessoa.
- Uma experiência corrigida pode revelar experiências irmãs somente no mesmo currículo; propostas exigem revisão, mantêm evidência própria e não alteram o perfil vigente.
- Knowledge separa termo observado, conceito normalizado e inferência. Termo desconhecido é preservado e entra na Inbox.
- Knowledge da empresa é overlay tenant-owned e precede a Global apenas no próprio escopo, sem alterar a base Prisma.
- Internet enriquece Knowledge, nunca Pessoa; IA propõe e humano autorizado publica.
- CBO, ESCO e O*NET são verificadas mensalmente; versão detectada não substitui snapshot publicado sem validação e decisão humana.

## Usuários do piloto

Super Admin possui autoridade global da plataforma. Owner administra todas as empresas do próprio grupo. Admin administra um subconjunto explícito de empresas do grupo. Recruiter opera Talent Intelligence no próprio escopo sem administrar usuários. Member atua operacionalmente em uma única empresa sem gerenciar papéis ou permissões.

## Escopo atual e futuro

O slice local cobre texto, PDF, OCR seletivo, perfil, evidência, inferência limitada, retrieval, matching, score, verificação e um shell web conectado ao Supabase com rotas protegidas. A revisão espacial usa um mapa canônico por caractere ou símbolo em coordenadas normalizadas. M2-A/M2-B/M2-C, currículo-first, recuperação parcial, publicação Delta, M5.2, M6.1 e M6.2 estão ativos no Prisma-QA dentro de seus limites. CBO, ESCO e O*NET estão publicadas e correntes; as fontes são monitoradas mensalmente e a Home apresenta versão, data, estado e última checagem. Knowledge research está ativa sob a fronteira server-side do QA, enquanto geração externa de itens permanece desativada e o Parser IA segue experimental em loopback.

O M5.1 - Verificação de Competências possui preparação M5.1A, execução M5.1B e governança M5.1C ativas no Prisma-QA. O M5.1C calcula gaps elegíveis, gera proposals sintéticas sem LLM, valida e deduplica, exige revisão humana, separa Banco Global e Organization, controla orçamento por ledger e produz analytics sintéticos sem declarar calibração real. A boundary externa está implantada, mas flag, provider, modelo, secret e budget permanecem desativados.

Mobilidade interna, sucessão, concentração de competências, senioridade e workforce planning pertencem à visão futura, não ao runtime atual.
