import assert from "node:assert/strict";
import test from "node:test";
import {recordFieldLabel,recordScalarLabel,recordTextLabel} from "../web/src/ui/readableRecordValues.js";
test("records preserve null, empty, zero, false and precision distinctly",()=>{
  assert.equal(recordScalarLabel(null),"Não informado");assert.equal(recordScalarLabel(""),"Texto vazio");
  assert.equal(recordScalarLabel(false),"Não");assert.equal(recordScalarLabel(true),"Sim");assert.equal(recordScalarLabel(0),"0");
  assert.equal(recordScalarLabel(0.123456789012345),"0,123456789012345");
});
test("known categories and relations are readable without translating arbitrary evidence",()=>{
  assert.equal(recordScalarLabel("is_a","relationType"),"É um tipo de");
  assert.equal(recordScalarLabel("is_a","notes"),"is_a");
  assert.equal(recordScalarLabel("query_modeling","requiredDimensions"),"Modelagem de consultas");
  assert.equal(recordScalarLabel("future_value","method"),"future_value");
  assert.equal(recordFieldLabel("source_file"),"Arquivo de origem");assert.equal(recordFieldLabel("futureField"),"Future Field");
});
test("identifiers, literal document text and long strings are not truncated or parsed",()=>{
  const original='{"literal":"texto original"}';assert.equal(recordScalarLabel(original),original);
  const long="x".repeat(9000);assert.equal(recordScalarLabel(long),long);
  assert.equal(recordScalarLabel("ab123", "snapshotId"),"ab123");
});
test("nested comparison summaries remain readable without JSON or object coercion",()=>{
  const text=recordTextLabel({role:"Analista",extra:{enabled:false,values:[0,"SQL"]}});
  assert.match(text,/Cargo: Analista/);assert.match(text,/Enabled: Não/);assert.match(text,/0; SQL/);assert.doesNotMatch(text,/\[object Object\]|[{}]/);
});
