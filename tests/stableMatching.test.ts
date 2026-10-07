import assert from "node:assert/strict";
import test from "node:test";
import { restoreStableMatch } from "../web/src/domain/stableMatching.js";
import type { VacancyDetail } from "../web/src/domain/vacancy.js";
import type { PublishedProfileCandidate } from "../web/src/domain/profileDiscovery.js";
const vacancy = {versionId:"v1"} as VacancyDetail;
const candidate = {profileId:"p1",personId:"person1"} as PublishedProfileCandidate;
const value={state:"current",evaluationId:"40000000-0000-0000-0000-000000000001",match:{score:{score:55,referenceDate:"2026-09-01",profileVersion:"p1",positionVersion:"v1"},requirements:[],discoveryGroup:"main_area"}};
test("restoration preserves exact score reference without any clock or scoring operation",()=>{
 const a=restoreStableMatch(vacancy,candidate,value),b=restoreStableMatch(vacancy,candidate,value);
 assert.deepEqual(a.score,b.score);assert.equal(a.score,value.match.score);assert.equal(a.stableResult?.evaluationId,value.evaluationId);
});
test("old result remains visible while updating changed sources; current mismatched identity fails closed",()=>{
 assert.throws(()=>restoreStableMatch({...vacancy,versionId:"new"},candidate,value));
 const a=restoreStableMatch({...vacancy,versionId:"new"},candidate,{...value,state:"updating"});assert.equal(a.score.score,55);assert.equal(a.stableResult?.state,"updating");
});
test("missing snapshot is never replaced with a guessed score",()=>{
 for(const invalid of [null,{}, {...value,match:null},{...value,evaluationId:"invented"}])assert.throws(()=>restoreStableMatch(vacancy,candidate,invalid));
});
