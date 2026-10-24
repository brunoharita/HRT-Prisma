import assert from "node:assert/strict";
import test from "node:test";
import {readPositionOccupationalRecognition} from "../web/src/domain/positionOccupationalRecognition.js";
const value={review:{id:"inbox",title:"Gerente de Estoque",status:"research_queued",context:{contract:"occupational-rag-1.0.0",responsibilities:"Controlar inventário."},proposal:null},candidates:[{id:"approved",label:"Gestor de Estoque",scope:"organization",description:"Controlar estoques.",version:1,sources:[]}]};
test("Position reads the scoped original queue without interpreting suggestion as decision",()=>{
 const result=readPositionOccupationalRecognition(value);assert.equal(result.review.status,"research_queued");assert.equal(result.candidates[0]?.id,"approved");assert.equal(result.review.proposal,null);
});
test("malformed references, unknown context, missing versions and oversized candidates fail closed",()=>{
 for(const changed of [null,{}, {...value,review:{...value.review,context:{contract:"future",responsibilities:"X"}}}, {...value,candidates:[{...value.candidates[0],version:0}]}, {...value,candidates:[{...value.candidates[0],scope:"foreign"}]}, {...value,candidates:Array(17).fill(value.candidates[0])}, {...value,candidates:[{...value.candidates[0],sources:[{name:"ESCO"}]}]}])assert.throws(()=>readPositionOccupationalRecognition(changed));
});
