import test from "node:test";
import assert from "node:assert/strict";
import {assessmentRemainingSeconds,assessmentRemainingLabel,assessmentDeadlineLabel} from "../web/src/domain/assessmentPortalPresentation.js";
test("portal countdown presents days hours minutes without seconds",()=>{
 assert.equal(assessmentRemainingLabel(6*86400+23*3600+45*60+59),"6 dias, 23 horas e 45 minutos restantes");
 assert.equal(assessmentRemainingLabel(86400+3600+60),"1 dia, 1 hora e 1 minuto restantes");
 for(const [n,text] of [[86400,"1 dia restante"],[3600,"1 hora restante"],[120,"2 minutos restantes"],[60,"1 minuto restante"],[59,"Menos de 1 minuto restante"],[0,"Prazo encerrado"],[-1,"Prazo encerrado"]] as const)assert.equal(assessmentRemainingLabel(n),text);
 assert.equal(assessmentRemainingLabel(null),"Tempo indisponível");assert.equal(assessmentRemainingLabel(NaN),"Tempo indisponível");
});
test("remaining time follows actual server deadline and does not shift or extend it",()=>{
 const deadline="2026-10-19T02:59:59.999Z",limit=Date.parse(deadline);
 assert.equal(assessmentRemainingSeconds(deadline,limit-1),1);assert.equal(assessmentRemainingSeconds(deadline,limit),0);assert.equal(assessmentRemainingSeconds(deadline,limit+1000),0);
 assert.equal(assessmentRemainingSeconds("invalid",limit),null);assert.equal(assessmentRemainingSeconds(undefined,limit),null);
});
test("deadline date shows Brasília without seconds and preserves historical actual hours",()=>{
 assert.equal(assessmentDeadlineLabel("2026-10-19T02:59:59.999Z"),"18/10/2026 às 23:59");
 assert.equal(assessmentDeadlineLabel("2026-10-19T03:20:00Z"),"19/10/2026 às 00:20");
 assert.equal(assessmentDeadlineLabel("invalid"),"Data indisponível");assert.equal(assessmentDeadlineLabel(undefined),"Data indisponível");
});
