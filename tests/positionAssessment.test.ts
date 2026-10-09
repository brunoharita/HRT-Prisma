import test from "node:test";
import assert from "node:assert/strict";
import { assessmentDistributions, createDistributionSnapshot, inspectComposition as inspectTenantComposition, questionViolations, QuestionFocusTracker,
  type ContextualAssessmentQuestion, type QuestionObservationScope } from "../src/domain/positionAssessment.js";

function question(id: string, difficulty: ContextualAssessmentQuestion["difficulty"] = "easy", source: ContextualAssessmentQuestion["source"] = "bank"): ContextualAssessmentQuestion {
  return { organizationId: "tenant", id, version: "1.0.0", requirementId: "req-api", competencyKey: "api", difficulty, source, language: "pt-BR",
    stem: "Qual código HTTP representa a criação de um recurso?", options: [{id:"A",label:"200"},{id:"B",label:"201"},{id:"C",label:"204"},{id:"D",label:"400"},{id:"E",label:"500"}],
    correctOptionId: "B", explanation: "201 representa criação bem-sucedida.", review: "approved", provenance: { method: "human", version: "1.0.0", authorId: "reviewer" } };
}
const scope: QuestionObservationScope = { organizationId: "tenant", attemptId: "attempt", questionInstanceId: "q1", questionVersion: "1.0.0" };
const inspectComposition = (snapshot: Parameters<typeof inspectTenantComposition>[0], requirements: string[], questions: ContextualAssessmentQuestion[], mode: Parameters<typeof inspectTenantComposition>[3]) => inspectTenantComposition(snapshot,requirements,questions,mode,"tenant");

test("all five levels retain mandatory ratios with exact integer counts and independent snapshots", () => {
  for (const level of [1,2,3,4,5] as const) for (const quantity of [10,20,30,100]) {
    const snapshot = createDistributionSnapshot(quantity,level);
    assert.equal(Object.values(snapshot.counts).reduce((a,b) => a+b,0), quantity);
    assert.deepEqual(snapshot.percentages, assessmentDistributions[level]);
    assert.ok(Object.values(snapshot.counts).every(Number.isInteger));
  }
  assert.deepEqual(createDistributionSnapshot(20,3).counts,{easy:6,medium:8,hard:6});
  const mutableCopy=createDistributionSnapshot(20,3); mutableCopy.percentages.easy=100;
  assert.equal(createDistributionSnapshot(20,3).percentages.easy,30);
  for(const quantity of [0,-10,1,12,19,20.5,NaN,Infinity]) assert.throws(()=>createDistributionSnapshot(quantity,3));
  for(const level of [0,6,1.5,NaN]) assert.throws(()=>createDistributionSnapshot(20,level));
});

test("the approved mixed example reports exactly 2/3/3 missing without filling or approving", () => {
  const bank=[...Array.from({length:4},(_,i)=>question(`e${i}`,"easy")),...Array.from({length:5},(_,i)=>question(`m${i}`,"medium")),...Array.from({length:3},(_,i)=>question(`h${i}`,"hard"))];
  const before=structuredClone(bank);
  const result=inspectComposition(createDistributionSnapshot(20,3),["req-api"],bank,"mixed");
  assert.deepEqual(result.deficit,{easy:2,medium:3,hard:3}); assert.equal(result.totalDeficit,8);
  assert.equal(result.readyForInvitation,false); assert.deepEqual(bank,before);
  const generated=[...Array.from({length:2},(_,i)=>question(`ae${i}`,"easy","ai")),...Array.from({length:3},(_,i)=>question(`am${i}`,"medium","ai")),...Array.from({length:3},(_,i)=>question(`ah${i}`,"hard","ai"))];
  generated[0]!.review="pending";
  assert.equal(inspectComposition(createDistributionSnapshot(20,3),["req-api"],[...bank,...generated],"mixed").readyForInvitation,false);
  generated[0]!.review="approved";
  assert.equal(inspectComposition(createDistributionSnapshot(20,3),["req-api"],[...bank,...generated],"mixed").readyForInvitation,true);
});

test("composition refuses cross-requirement, duplicates, excess, source mismatch and manipulated snapshot", () => {
  const q=question("q1"); const snapshot=createDistributionSnapshot(10,3);
  assert.ok(inspectComposition(snapshot,["other"],[q],"bank").violations.includes("q1:REQUIREMENT_OUTSIDE_SELECTION"));
  assert.ok(inspectComposition(snapshot,["req-api"],[q,q],"bank").violations.includes("DUPLICATE_QUESTION"));
  assert.ok(inspectComposition(snapshot,["req-api"],[question("ai","easy","ai")],"bank").violations.includes("ai:SOURCE_OUTSIDE_MODE"));
  assert.ok(inspectComposition(snapshot,["req-api"],[q],"ai").violations.includes("q1:SOURCE_OUTSIDE_MODE"));
  assert.deepEqual(inspectComposition(snapshot,["req-api","req-sql"],[q],"bank").uncoveredRequirementIds,["req-sql"]);
  assert.ok(inspectComposition(snapshot,["req-api"],Array.from({length:4},(_,i)=>question(`e${i}`)),"bank").violations.includes("EXCESS_EASY_QUESTIONS"));
  snapshot.counts.easy=4;
  assert.ok(inspectComposition(snapshot,["req-api"],[q],"bank").violations.includes("DISTRIBUTION_SNAPSHOT_MISMATCH"));
});

test("legacy four-option questions remain incompatible; five unique alternatives and one key are mandatory", () => {
  assert.deepEqual(questionViolations(question("valid")),[]);
  const q=question("invalid"); q.options.pop();
  assert.ok(questionViolations(q).includes("EXACTLY_FIVE_OPTIONS_REQUIRED"));
  q.options.push({id:"B",label:"201"});
  assert.ok(questionViolations(q).includes("EXACTLY_ONE_CORRECT_OPTION_REQUIRED"));
  assert.ok(questionViolations(q).includes("INVALID_OR_DUPLICATE_OPTIONS"));
  q.options[4]={id:"E",label:" 200 "}; q.correctOptionId="outside"; q.explanation=" ";
  assert.ok(questionViolations(q).includes("EXACTLY_ONE_CORRECT_OPTION_REQUIRED"));
  assert.ok(questionViolations(q).includes("INVALID_OR_DUPLICATE_OPTIONS"));
  assert.ok(questionViolations(q).includes("REQUIRED_QUESTION_METADATA"));
});

test("composition fails closed for missing tenant, foreign tenant and unknown parameter version", () => {
  const snapshot=createDistributionSnapshot(10,3), q=question("q1");
  assert.ok(inspectTenantComposition(snapshot,["req-api"],[q],"bank","").violations.includes("ORGANIZATION_REQUIRED"));
  assert.ok(inspectTenantComposition(snapshot,["req-api"],[q],"bank","foreign").violations.includes("q1:ORGANIZATION_MISMATCH"));
  const unknown={...snapshot,version:"unknown"} as unknown as typeof snapshot;
  assert.ok(inspectComposition(unknown,["req-api"],[q],"bank").violations.includes("UNKNOWN_DISTRIBUTION_VERSION"));
});

test("blur plus hidden is one episode and partial return does not close it", () => {
  const tracker=new QuestionFocusTracker(); tracker.activate(scope,0);
  assert.deepEqual(tracker.observe({hidden:false,focused:false},100),[]);
  assert.deepEqual(tracker.observe({hidden:true,focused:false},110),[]);
  assert.deepEqual(tracker.observe({hidden:false,focused:false},1000),[]);
  const returned=tracker.observe({hidden:false,focused:true},1900);
  assert.equal(returned.length,1); assert.equal(returned[0]!.durationMs,1800);
  assert.equal(returned[0]!.questionInstanceId,"q1");
  assert.equal(returned[0]!.limitation,"destination_not_observable");
  assert.deepEqual(tracker.observe({hidden:false,focused:true},2000),[]);
});

test("changing question during inactive period splits attribution, preserving each instance version", () => {
  const tracker=new QuestionFocusTracker(); tracker.activate(scope,0);
  tracker.observe({hidden:true,focused:false},100);
  const first=tracker.activate({...scope,questionInstanceId:"q2",questionVersion:"2.0.0"},500);
  const second=tracker.observe({hidden:false,focused:true},900);
  assert.equal(first[0]!.questionInstanceId,"q1"); assert.equal(first[0]!.questionVersion,"1.0.0");
  assert.equal(first[0]!.durationMs,400); assert.equal(first[0]!.closedBy,"question_changed");
  assert.equal(second[0]!.questionInstanceId,"q2"); assert.equal(second[0]!.questionVersion,"2.0.0");
  assert.equal(second[0]!.durationMs,400);
});

test("stopped collector preserves final episode and rejects invalid clock/scope", () => {
  const tracker=new QuestionFocusTracker(); tracker.activate(scope,0);
  tracker.observe({hidden:false,focused:false},100);
  assert.equal(tracker.activate(null,300)[0]!.closedBy,"collector_stopped");
  assert.deepEqual(tracker.observe({hidden:false,focused:true},400),[]);
  assert.throws(()=>tracker.activate(scope,399),/CLOCK_INVALID/);
  assert.throws(()=>new QuestionFocusTracker().activate({...scope,attemptId:""},0),/SCOPE_REQUIRED/);
});
