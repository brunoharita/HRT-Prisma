# ADR-049 - M5.7 Parser IA antes do preenchimento

Estado: aceito para implementação e avaliação locais, sem cutover online. Data: 2026-09-12. Acordo: `../qa/agreement-m57-parser-ia.md` 1.0.0.

## Problema

Bruno observou e-mail dividido entre linhas truncado e ausência de experiências na extração atual de um PDF LinkedIn. A leitura assistida que preparou as referências humanas não era a saída automática daquele extrator.

## Alternativas e decisão

1. Ampliar regras locais: reutiliza o protótipo já criado, mas continua dependendo de reconhecimento estrutural por heurísticas.
2. Enviar apenas texto: mais simples e potencialmente mais barato; perde a leitura visual usada na revisão que o PO aprovou.
3. PDF e referências textuais com IA: escolhido pelo PO para reproduzir o método de interpretação, mantendo validação e revisão humana.

Reutilizar PDF.js, fetch/Responses, StructuredDraft, IDs, classificação acadêmica, evidências e as telas existentes. Não adicionar dependência, parser comercial, treino ou pipeline operacional paralelo. Código interno necessário: pacote mínimo de extração, transporte local protegido, validação de referências, adaptação de campos, proveniência, cache/budget e benchmark.

O modelo recebe spans originais com IDs e PDF inline. Retorna fatos com IDs de fonte. O código valida caminhos e suporte textual; coordenadas vêm de PDF.js, nunca do modelo. Texto igual na fonte é condição necessária, não comprovação semântica de associação. País usado como cidade/estado é rejeitado; contatos partidos precisam de continuação citada. Classificação acadêmica permanece no classificador existente.

## Limites e operação

`parser-ia-1.0.0` é um contrato adicional, não mudança silenciosa de ExtractionDraft 8.1.0. A persistência já aceita versão de estruturação; no código local essa versão inclui modelo e hash do prompt. Nenhuma migração ou gravação remota foi executada. O endpoint experimental só escuta 127.0.0.1, valida host/origem e não oferece autenticação multiusuário: é ferramenta do operador local, não servidor de produção nem autorização de tenant remoto. O desenvolvimento web só usa a rota com flag local e DEV; a aplicação continua exigindo seus controles/RLS existentes para eventual persistência.

O benchmark usa apenas arquivos fornecidos e referências aprovadas, sem Supabase. Autorizar a configuração local da chave não equivale a afirmar privacidade offline; processamento da IA ocorre na OpenAI. O pacote limita custo e tentativas, mantém reserva de chamadas incertas e não faz retries automáticos. Alias de modelo pode mudar, mesmo com prompt congelado.

Rollback: desligar `VITE_PARSER_IA_LOCAL`, reiniciar Vite e parar o backend. A leitura anterior continua disponível. Para publicar na Hostinger será necessário backend autenticado, autorização server-side de organização, orçamento compartilhado, segredo substituído, condições de dados/conta e validação da persistência no único Supabase existente. Não publicar o servidor local como está.
