import assert from "node:assert/strict";
import test from "node:test";
import {bankTextMatches,difficultyName,formatQuestionTime,pendingProposal,proposalSituation,questionAvailability,questionRate,scopeName} from "../web/src/domain/questionBankPresentation.js";
import type {GenerationProposalView} from "../web/src/domain/assessmentItemGovernanceData.js";
test("bank search finds accented content, topic and secondary code without ranking",()=>{
 assert.ok(bankTextMatches("transacao",["Transação técnica em SQL"]));
 assert.ok(bankTextMatches("sql-02",["Uma questão", "SQL-02"]));
 assert.ok(!bankTextMatches("vendas",["SQL"]));
});
test("absence of metric stays unavailable while actual zero stays zero",()=>{
 assert.equal(questionRate(null),"Não disponível");assert.equal(questionRate(undefined),"Não disponível");assert.equal(questionRate(0),"0%");
 assert.equal(formatQuestionTime(null),"Não disponível");assert.equal(formatQuestionTime(0),"0 s");assert.equal(formatQuestionTime(125),"2 min 5 s");
});
test("availability preserves every material persisted lifecycle state",()=>{
 assert.equal(new Set(Object.values(questionAvailability)).size,Object.keys(questionAvailability).length);
 assert.equal(questionAvailability.approved,"Aprovada");assert.equal(questionAvailability.active,"Ativa no banco");
 assert.equal(difficultyName("low"),"Fácil");assert.equal(difficultyName("high"),"Difícil");assert.equal(scopeName(undefined),"Destino não informado");
});
test("review pending counter excludes approved and closed historical proposals",()=>{
 for(const status of Object.keys(proposalSituation))assert.equal(pendingProposal({status} as GenerationProposalView),["proposed","in_review","validation_failed","duplicate_candidate"].includes(status));
});
