import test from "node:test";
import assert from "node:assert/strict";
import {personReviewNotice} from "../web/src/domain/personReviewNotice.js";
import {reviewFieldPathExists} from "../web/src/domain/reviewFieldLifecycle.js";
import {profileFixture,documentFixture} from "./fixtures/personFlow.js";
import type {PersonIngestionWorkspace} from "../web/src/domain/personIngestion.js";
function workspace(period:string|null):PersonIngestionWorkspace {const document=documentFixture();return {person:{} as PersonIngestionWorkspace["person"],documents:[document],selectedDocument:document,pages:[],draft:profileFixture({education:[{id:"education_mba",source:"human",course:"MBA",institution:null,period,description:null,evidenceText:"",page:null}]})};}
test("known date issue has an existing field destination without completing the missing fact",()=>{const value=workspace("Atual");const before=JSON.stringify(value);const notice=personReviewNotice(value,value.documents[0]!);assert.equal(notice?.title,"Período de formação incompleto");assert.ok(reviewFieldPathExists(value.draft!,notice!.fieldPath));assert.match(notice!.description,/sem quando começou/);assert.equal(JSON.stringify(value),before);});
test("localized validator distinguishes invalid and reversed dates",()=>{for(const period of ["31/02/2020 - 2021","2024 - 2020"]){const value=workspace(period);assert.equal(personReviewNotice(value,value.documents[0]!)?.title,"Período de formação a conferir");}});
test("absence or unrecognized date is advisory, not an invented required correction",()=>{for(const period of [null,"", "Texto do currículo", "2019 - 2020"]){const value=workspace(period);assert.equal(personReviewNotice(value,value.documents[0]!),null);}});
test("another document or no reviewable draft never inherits the selected document diagnosis",()=>{const value=workspace("Atual");assert.equal(personReviewNotice(value,documentFixture({id:"another"})),null);assert.equal(personReviewNotice({...value,draft:null},value.documents[0]!),null);assert.equal(personReviewNotice(value,{...value.documents[0]!,reviewAttempt:null}),null);});
