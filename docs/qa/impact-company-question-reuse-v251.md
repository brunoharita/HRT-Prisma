# Mapa prévio: reaproveitamento privado 2.5.1

Baseline main/origin/VPS checkout d4109b2; runtime web e16151e, Supabase Prisma ioldpnqqvobprjiontre, sem QA remoto separado. QA local schema clone descartável; manter baseline original com limitação física documentada no AoT2.5.0.

| Capacidade | Relação | Preservação e regressão |
| --- | --- | --- |
| Aprovação individual/conjunto e persistência privada | direct | Mesma aprovação humana, auditorias/conteúdo/autor/data; atomicidade, replay, concorrência e inválidos |
| Banco catálogo/detalhe/cobertura e publicação | direct | Globais existentes intactas; empresa isolada; destino privado servidor/interface; testes A/B/ID, global negado e consulta histórica |
| Composição de outra avaliação | direct | Só aprovadas compatíveis da própria empresa/globais institucionais; mesmas distribuições/cinco alternativas/sem duplicar |
| Convites/aplicações/portal/correção | critical_transversal | Snapshot emitido/convites/resultado intocados; regressão processo/portal e hashes produtivos |
| Tokens/orçamento/generação | plausible_indirect | Reuso gratuito e sem IA; guardas anteriores, cotação/settlement/replay; geração sem compartilhamento |
| Loading/navegação/shell | plausible_indirect | Apenas explicação/checkbox removido/versão; types/build, testes dirigidos e browser responsive |
| Pessoas/Perfis/Score/Posições | no_impact_identified | Sem escritor alterado; produto apenas lê contexto existente; hashes antes/depois |
| Parser/gateway/Synthesis/mail/Paddle/Traefik | no_impact_identified | Sem código/configuração; não reconstruir, comparar containers após rollout |

Rollback: imagem web anterior/Edge inalterada se plano não exigir; wrappers conservam implementações antigas inacessíveis para revisão/reversão de código controlada. Dados aprovados recuperados não são apagados por rollback; sem downgrade destrutivo. Nova projeção usa snapshots originais, sem mudar contratos de prova/portal. Descobertas revisam mapa/validação antes de fechar.
