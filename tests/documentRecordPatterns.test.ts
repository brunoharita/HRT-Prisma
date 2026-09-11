import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRelativeRecordSignature,
  compareRelativeRecordPattern,
  locateRecordAnchor,
  removeRepeatedMarginNoise,
  type RecordPatternLine,
} from "../web/src/domain/documentRecordPatterns.js";

function recordLine(text: string, pageNumber: number, sequence: number, x: number, y: number, emphasis: RecordPatternLine["emphasis"] = "regular"): RecordPatternLine {
  return { text, pageNumber, sequence, x, y, width: 0.36, height: 0.02, fontSize: 11, emphasis };
}

test("relative record signatures ignore absolute page position and column", () => {
  const source = [recordLine("Cargo 2020 - 2022", 1, 0, 0.08, 0.2, "strong"), recordLine("• Atividade", 1, 1, 0.10, 0.24)];
  const candidate = [recordLine("Outro cargo 2018 - 2020", 2, 2, 0.58, 0.6, "strong"), recordLine("• Outra atividade", 2, 3, 0.60, 0.64)];
  const comparison = compareRelativeRecordPattern(buildRelativeRecordSignature(source), candidate);
  assert.equal(comparison.classification, "strong");
  assert.ok(comparison.criteria.includes("relative-topology"));
});

test("record anchor uses all human fields instead of assuming the selected line is a header", () => {
  const lines = [
    recordLine("Desenvolvedora, Movile 06/2021 - 09/2023", 1, 0, 0.08, 0.2, "strong"),
    recordLine("• Desenvolveu plataforma de comércio eletrônico", 1, 1, 0.10, 0.24),
  ];
  const index = locateRecordAnchor(lines, ["Desenvolvedora", "Movile", "06/2021 - 09/2023", "Desenvolveu plataforma de comércio eletrônico"], [{ pageNumber: 1, x: 0.1, y: 0.24, width: 0.36, height: 0.02 }], (line) => /2023/.test(line.text));
  assert.equal(index, 0);
});

test("repeated page-margin text is removed without a hard-coded header or footer name", () => {
  const lines = [
    recordLine("Currículo profissional", 1, 0, 0.1, 0.03),
    recordLine("Experiência A", 1, 1, 0.1, 0.3),
    recordLine("Currículo profissional", 2, 2, 0.1, 0.03),
    recordLine("Experiência B", 2, 3, 0.1, 0.3),
  ];
  assert.deepEqual(removeRepeatedMarginNoise(lines).map((line) => line.text), ["Experiência A", "Experiência B"]);
});
