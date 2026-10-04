/** Golden diagnostics: required errors, accepted precision, advisory evidence gaps. No invented source dates. */
export const reviewPeriodFormats = [
  [null, null], ["", null], ["   ", null], ["2019", null], ["19", null], ["50", null], ["51", null],
  ["2019–2023", null], ["03/2022–Atual", null], ["2022 - Presente", null], ["2020 to current", null],
  ["fev. de 2019 a mar. de 2023", null], ["January 2020 - December 2020", null],
  ["29/02/2024", null], ["29.02.2024", null], ["2024-02-29", null], ["2024-02", null],
  ["2024-02-01 - 2024-02-29", null], ["2020 - 2020", null], ["12/2020 - 2020", null],
  ["(2019 - 2023)", null], ["jan. de 2020 - dez. de 2021 (2 anos)", null],
  ["31/02/2024", "invalid_date"], ["29/02/2023", "invalid_date"], ["31.02.2024", "invalid_date"],
  ["2024-13-01", "invalid_date"], ["2024-02-30", "invalid_date"], ["31-02-2050", "invalid_date"], ["00/01/2022", "invalid_date"], ["999", "unrecognized"],
  ["0000", "invalid_date"], ["31 FEVEREIRO de 2024", "invalid_date"], ["32 MARÇO 2024", "invalid_date"], ["32 marc\u0327o 2024", "invalid_date"], ["31 fevereiro 2024", "invalid_date"], ["31/02/2024 - Atual", "invalid_date"],
  ["2020 - 31/02/2024", "invalid_date"], ["2024-02-30 - 2024-03-01", "invalid_date"],
  ["2024 - 2020", "reversed"], ["03/2024 - 02/2024", "reversed"],
  ["31/03/2024 a 01/03/2024", "reversed"], ["2024-03-31 - 2024-03-01", "reversed"],
  ["Atual", "missing_start"], ["Até o momento", "missing_start"],
  ["Durante o curso", "unrecognized"], ["2019 - não informado", "unrecognized"],
  ["Até 2022", "unrecognized"], ["2020 / 2022", "unrecognized"], ["foo 2020", "unrecognized"],
  ["31/02/2024 - sem data", "unrecognized"], ["2020 -", "unrecognized"], ["2020 - 2022 mais detalhes", "unrecognized"],
] as const;
