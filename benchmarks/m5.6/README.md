# Benchmark A/B M5.6

O harness compara a saída baseline e M5.6 do mesmo documento contra referência humana. Ele não usa saída de parser como ground truth e não considera fixtures sintéticas prova de qualidade real.

Os currículos reais, referências humanas e saídas detalhadas ficam em `benchmarks/m5.6/private/`, ignorado pelo Git. O relatório gerado fica em `benchmarks/m5.6/output/`, também ignorado. Um relatório sanitizado, sem PII integral, pode ser promovido manualmente para `docs/qa/evidence/` após revisão.

O manifesto precisa conter de 8 a 12 casos autorizados e cobrir, na medida do possível: PDF nativo simples, duas colunas, sidebar/boxes, scan, image-only, experiências repetidas, competências em lista/grade, formação estruturada e layout complexo.

```json
{
  "cases": [
    {
      "id": "cv-hash-curto-sem-pii",
      "kind": "native-simple",
      "clearAndSupported": true,
      "requiresDocumentIntelligence": false,
      "groundTruth": "ground-truth/caso-01.json",
      "baseline": "baseline/caso-01.json",
      "m56": "m56/caso-01.json"
    }
  ]
}
```

Cada arquivo de referência humana contém `fields` e contagens esperadas de blocos/ordem. Cada saída contém os mesmos `fields`, contagens observadas de Document Intelligence, evidência espacial, intervenção humana e tempos total/por estágio. O relatório preserva resultados por documento, campo, camada e consolidados.

Execução:

```powershell
pnpm run benchmark:m56 -- --manifest benchmarks/m5.6/private/manifest.json
```

Marque `requiresDocumentIntelligence=true` nos casos em que estrutura, visão ou recuperação sejam necessárias. O processo encerra com código 2 e `BLOCKED` quando a amostra real está ausente, fora de 8 a 12 casos, abaixo da meta de 90%, sem ganho sobre o baseline, sem redução mensurável de intervenção humana, com fallback em caso que exige Document Intelligence ou com regressão crítica de invenção/evidência.
