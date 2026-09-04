# Evidência de QA: Padrão Prisma de Perfil Profissional 1.0

## Escopo

Validar a apresentação canônica do Perfil, a busca avançada explicável e a comparação de duas Pessoas sem alterar schema, RLS, publicação, Knowledge ou o histórico versionado.

## Cobertura determinística

`tests/profileProfessionalStandard.test.ts` cobre:

1. construção do Perfil canônico e ordem estável das seções;
2. agrupamento de competências, conhecimentos e tecnologias como decisão somente de apresentação;
3. rótulo canônico do Knowledge com preservação do termo observado e deduplicação;
4. compatibilidade com idiomas de versões históricas;
5. ausência de evidência sem conclusão negativa;
6. equivalência Knowledge explicada no resultado;
7. semântica explícita de todos ou qualquer competência;
8. demonstração end-to-end com três Pessoas sintéticas: Perfil completo, termos equivalentes via Knowledge e dados incompletos;
9. presença das seis superfícies, rotas responsivas e ausência de score ou vencedor.

## Matriz funcional

| Cenário | Resultado esperado |
| --- | --- |
| Perfil completo | seções ordenadas, vazios omitidos e evidências discretas |
| Perfil histórico | mesma apresentação canônica, sem objetos serializados como texto |
| Busca sem filtros | Perfis vigentes do tenant, sem Pessoas mescladas |
| Competências: todos | Pessoa aparece somente quando cada termo possui evidência direta ou equivalência Knowledge |
| Competências: qualquer | Pessoa aparece quando ao menos um termo possui evidência direta ou equivalência Knowledge |
| Critério sem evidência | Pessoa não aparece; nenhum texto negativo é fabricado |
| Resultado | critérios objetivos explicam a inclusão, sem percentual ou ranking |
| Comparação | exatamente dois Perfis, mesmas seções e nenhum vencedor |
| Member | leitura tenant-scoped; nenhuma autoridade de revisão é concedida |
| Localização | exibida somente quando o papel já pode ler dado privado |

## Smoke visual obrigatório

Validar Central, Perfil, busca, resultado, comparação e versão histórica em `1440x900`, `1280x720`, `768x1024`, `390x844` e `360x800`, observando:

- zero rolagem horizontal global;
- nenhum botão ou chip fora da área visível;
- colunas de comparação empilhadas no mobile;
- filtros e ações utilizáveis por teclado;
- conteúdo real, parcial e vazio sem placeholders enganosos;
- zero erro de console ou overlay do Vite.

## Estado

- Implementação local: concluída.
- Backend ou migration: não aplicável; foram reutilizados `professional_profiles`, RLS e a busca canônica do Knowledge.
- Teste focal: aprovado com 8 cenários, incluindo as três Pessoas sintéticas obrigatórias.
- Gate completo `pnpm run validate`: aprovado com lint de 310 arquivos, 240 testes de regressão, 19 casos golden, build web e demonstração vertical `VERTICAL_SLICE_OK`.
- Smoke visual autenticado: aprovado com dois Perfis vigentes reais do Prisma-QA, sem mutação.

## Evidência visual autenticada

- Central, Perfil completo, busca, resultados, comparação e histórico foram abertos com a organização `Prisma` e dados reais permitidos ao operador.
- `1440x900`: lista, Central, Perfil, busca, resultados e comparação sem overflow; o passe identificou e corrigiu a compressão do nome no cabeçalho da Central.
- `1280x720`: comparação em duas colunas sem controles fora da área visível.
- `768x1024`: comparação empilhada e histórico completo sem rolagem horizontal global.
- `390x844`: Central e Perfil completo com navegação, ações, cards e evidências dentro da largura.
- `360x800`: busca e resultados preservados em coluna única, com zero controle fora do viewport.
- As medições registraram `scrollWidth === clientWidth`, zero botão fora da largura e zero erro ou warning do navegador nas superfícies inspecionadas.
- A busca retornou dois Perfis vigentes; a seleção de ambos abriu a comparação correta e manteve critérios objetivos, sem score, ranking ou vencedor.
- Nenhuma revisão, publicação, exclusão, restauração ou outra mutação foi acionada.
