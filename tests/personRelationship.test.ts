import assert from "node:assert/strict";
import test from "node:test";
import { personRelationshipLabels } from "../web/src/domain/personRelationship.js";
test("tags require confirmed current facts; independent tags coexist",()=>{
 assert.deepEqual(personRelationshipLabels({}),[]);
 assert.deepEqual(personRelationshipLabels({isCandidate:false,isActiveEmployee:false}),[]);
 assert.deepEqual(personRelationshipLabels({isCandidate:true}),["Candidato"]);
 assert.deepEqual(personRelationshipLabels({isActiveEmployee:true}),["Colaborador"]);
 assert.deepEqual(personRelationshipLabels({isActiveEmployee:true,isCandidate:true}),["Colaborador","Candidato"]);
 assert.deepEqual(personRelationshipLabels({isActiveEmployee:true,isCandidate:true,operationalStatus:"archived"}),[]);
});
