# Página unificada da Pessoa

## Entrada e fronteira de produto

Prisma v2.1.0 abre diretamente o Resumo profissional ao selecionar uma Pessoa. As rotas `/profiles/:personId` e o bookmark legado `/profiles/:personId/profile` apresentam a mesma página, sem Central → Ver perfil. Acordo normativo: `docs/qa/agreement-person-unified-v210.md` versão1.0.0; execução/AoT no mesmo diretório.

Pessoa, Documento, Tentativa, Revisão e Perfil publicado continuam objetos distintos. Uma importação incompleta ou falha técnica nunca invalida a Pessoa ou seu Perfil vigente. Somente publicação transacional de nova versão substitui o Perfil atual.

## Hierarquia e abas

Cabeçalho único com identidade, título publicado, localização autorizada, vínculo/status reais, versão/data de publicação. Nova importação, Criar revisão, Versões e Mais ações reutilizam handlers existentes e respectivas permissões. Se não houver Perfil, a importação é a ação principal. Ciclo de vida, fusão, Meus dados e exclusão ficam protegidos no menu e nos fluxos especializados.

As seis abas locais são Resumo, Competências, Evidências, Perfil completo, Documentos e revisões e Histórico. A identidade permanece; documento e Perfil possuem versões independentes. Não há novo menu global, estado persistido, fonte de verdade, score ou decisão de contratação.

Resumo usa aproximadamente72% para leitura e28% para contexto operacional em desktop largo. Ordem: quatro destaques profissionais em linha; síntese integral; oito análises abertas em duas colunas; indicadores factuais e acessos a competências/evidências. Pendências reais, documentos/revisões recentes, até cinco eventos recentes e ações rápidas formam a lateral. Histórico consulta todas as versões/documentos disponíveis e dá acesso à auditoria operacional existente.

Na largura intermediária os destaques passam a2x2; se a lateral comprometer a leitura, entra no fluxo. No celular, pendências precedem a leitura, cards/análises usam uma coluna e documentos/atividade/ações vêm depois. Sem truncamento, Leia mais, respostas escondidas, scroll interno da narrativa ou overflow horizontal de página.

## Conteúdo profissional e fontes

Os destaques reutilizam `published-profile-highlights-1.0.1`: áreas explicitamente relacionadas à experiência mais recente e duração documentada, experiência recente e outra experiência com cronologia honesta, maior formação concluída com qualificações sustentadas e organizações distintas. Sobreposições contam uma vez; MBA/Especialização podem coexistir. Ausência/inconclusão não se transformam em fatos negativos ou conclusões.

Síntese e oito respostas/lacunas/perguntas permanecem integrais, provenientes da análise armazenada. Mostrar fontes fica no bloco da síntese e habilita referências sem ocultar o texto; o painel existente preserva origem, cache, snapshot, foco e posição. Resumo original abre em modal no mesmo contexto. Trocar abas/fontes ou visitar a Pessoa não gera IA. Gerar/repetir síntese permanece ação explícita de operador autorizado, sujeita à fronteira server-side existente.

Competências mantém naturezas, grupos/filtros, declarações, curadoria, classificação e vínculos múltiplos. Evidências mantém todas as associações/fontes/detalhes documentais. Vincular evidência não define classificação taxonômica. Perfil completo mantém todos os registros, formação detalhada/origem/situação/qualificação, experiências, credenciais, idiomas, seções extras e contato autorizado separado; não reescreve o snapshot.

## Operação, falhas e preservação

Pendências só aparecem quando derivadas dos estados atuais. Cada item informa objeto, problema conhecido e ação viável. Diagnóstico de período conhecido na formação usa o validador existente e abre a revisão no campo correspondente; ausência de dado, por si só, não cria obrigação artificial. Se o diagnóstico só conhece a revisão, o botão é Continuar revisão. Falha interna permanece técnica; Perfil vigente continua explicitamente disponível.

Documentos e revisões incorpora lista/detalhe, importação manual/PDF, tentativas, extração, recuperação, auditoria, arquivamento de revisão, correção do vínculo e exclusão do documento. Versões/restauração/reinício e revisão por origem mantêm os fluxos existentes. Criar/importar/mesclar/arquivar/excluir não recebe permissão nova.

Carregamentos profissional, síntese e operacional são independentes: falha opcional não oculta fatos bons. Sem Perfil publicado, identidade, documentos e próxima ação real continuam acessíveis, sem síntese inventada. Pessoa mesclada mantém o destino principal e exclusão em andamento mantém bloqueios.

Member não monta/consulta o workspace operacional nem recebe contato privado/controles de gestão. Curadoria continua restrita a Super Admin/Owner/Admin; Recruiter conserva seu escopo. Tenant, RLS e RPCs existentes permanecem a autoridade. Tabs e navegação respeitam a proteção de alterações não salvas. Retorno à lista preserva busca/filtros/posição na sessão; retorno da fonte/revisão mantém a Pessoa e o contexto consultado.

## Limites

Nenhuma alteração de matching/Posições, taxonomia, Parser IA, serviço de síntese, Paddle, banco, prompts/modelos ou publicação automática de Perfil humano. Fixtures de Marina são fictícias e exclusivas de QA local. A evidência visual e sintética não prova jornada autenticada real ou qualidade universal de currículo.
