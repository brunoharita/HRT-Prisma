# M5.5: referências ocupacionais oficiais

Data: 2026-09-06

## Escopo

Extensão da Knowledge existente para relações Cargo/Ocupação → habilidade, conhecimento e tecnologia, mantendo versionamento, staging, diff, publicação humana e proveniência por fonte.

## Evidência local

- O importador ESCO preserva ocupações e skills PT/EN por URI estável e registra `essential`/`optional` sem convertê-los em nível.
- O pacote oficial O*NET 31.0 foi baixado do O*NET Resource Center e validado fora do Git. ZIP SHA-256: `6883548adf5fde64cf6f801b35d15519c9225f2732c3cab0e281c652d16b23a9`.
- O preparo real O*NET usou `Occupation Data`, `Content Model Reference`, `Essential Skills`, `Knowledge` e `Software Skills`: 9.968 conceitos, 40.921 relações e 26 lotes de staging de 2.000 registros no máximo.
- Cada relação O*NET conserva `IM`/`LV`, valor bruto, erro padrão quando fornecido, arquivo e linha. As medidas não são convertidas, agregadas ou atribuídas a Pessoas.
- A migration cria atributos JSON somente para relações versionadas, RLS continua ativo e somente `service_role` pode executar staging/publicação.

## Pendente de QA remoto

- A migration M5.5 e seu fix forward-only foram aplicados em Prisma-QA; schema e funções foram verificados.
- O staging/diff O*NET 31.0 está pronto em Prisma-QA: 9.968 conceitos novos, 40.921 relações, 9.100 relações com `IM`/`LV` e zero remoções. Falta apenas a publicação por Super Admin autenticado.
- Realizar smoke autenticado de Conhecimento e sugestão contextual em Vaga.
- Obter o snapshot oficial ESCO por meio do portal e repetir o mesmo fluxo.
