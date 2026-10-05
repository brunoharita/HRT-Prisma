# ADR-076 — Síntese derivada, persistida e assíncrona do Perfil

Estado: aceito pela autorização de Bruno em 04/10/2026; acordo `../qa/agreement-profile-synthesis-v205.md` 1.0.0.

Reutilizar PostgreSQL/Supabase para fila/resultados/tentativas e o padrão de lease/skip locked da normalização. Worker Node privado independente na VPS existente: não disputa o lock do Parser, não depende do PC e não tem porta pública. Reaproveitar Responses/Structured Outputs/provider aprovado; sem nova dependência. Dados publicados minimizados e fontes por ID, resultado separado dos fatos e por tenant/versão/base. Falha da análise nunca impede publicação ou leitura dos fatos.

Worker acessa exclusivamente RPCs limitadas por token aleatório server-only, validado por hash privado no banco; sem service role na VPS e sem credencial no navegador. Arquivo secreto protegido no host, volume read-only, hash de registro configurado administrativamente. A chave publishable não autoriza sozinha essas RPCs. Rotação substitui registro e arquivo, testes negativos obrigatórios. Leitura humana reutiliza autorização de Perfil e RPC tenant-scoped. Não armazenar tokens/prompts integrais nos resultados.

Alternativas: síncrono por visita desperdiça custo/latência; alterar o Parser mistura extração e análise e cria disputa de capacidade; broker externo introduz operação desnecessária antes de medir gargalo. PostgreSQL já fornece o padrão necessário. Escalar consumidores após medir fila/provider/DB; não declarar capacidade ilimitada. Uma resposta aceita por chave, não promessa de exatamente uma cobrança externa após falhas.

Rollback: desativar worker e recurso de síntese; manter Perfil/resumo original e tabelas/histórico protegidos. Migrations aditivas, exclusão segue a Pessoa; jobs obsoletos não sobrescrevem base nova. Sem backfill automático do acervo.
