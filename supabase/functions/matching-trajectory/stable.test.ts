import { stableMatching } from "./stable.ts";
import { handleMatchingTrajectory, type Dependencies, type RpcClient } from "./handler.ts";
const ok = (v: unknown, m = "assertion failed") => { if (!v) throw new Error(m); };
const ids = { organizationId: "10000000-0000-0000-0000-000000000001", profileId: "20000000-0000-0000-0000-000000000001", positionVersionId: "30000000-0000-0000-0000-000000000001", referenceDate: "2026-10-07", operation: "stable_load" };
const saved = { state: "current", acquired: false, evaluationId: "40000000-0000-0000-0000-000000000001", match: { score: { score: 55, referenceDate: "2026-09-01", inputFingerprint: "fixed" } }, audit: { previousScore: 50, newScore: 55 } };
function fixture() {
  const calls: Array<{name: string; args: Record<string, unknown>}> = [];
  let authorized = true, claim: Record<string, unknown> = structuredClone(saved), commitFailure = false, providerCalls = 0;
  const actor = { id: "actor", client: { rpc: () => Promise.resolve({ data: authorized ? {} : null, error: authorized ? null : { code: "42501" } }) } as RpcClient };
  const deps: Dependencies = { env: () => undefined, authenticate: async () => actor, fetch: (() => { throw Error("external forbidden"); }) as typeof fetch,
    service: () => ({rpc: (name,args) => { calls.push({name,args});
      if (name === "claim_stable_matching_score") return Promise.resolve({data:claim,error:null});
      return Promise.resolve({data:args.p_match ? {state:"current",match:args.p_match,evaluationId:saved.evaluationId} : {state:"update_failed"},error:commitFailure?{code:"40001"}:null});
    }}) };
  const interpret = async () => { providerCalls++; return new Response(JSON.stringify({ status: "unavailable" })); };
  const run = async (body: Record<string,unknown> = ids) => (await stableMatching(body,"Bearer synthetic",actor,deps,interpret)).json();
  return { run, calls, deps, setAuthorized:(v:boolean)=>authorized=v, setClaim:(v:Record<string,unknown>)=>claim=v,
    failCommit:()=>commitFailure=true, providerCalls:()=>providerCalls };
}
Deno.test("reload, next day and different browser date return intact saved projection without provider/commit", async () => {
  const f=fixture();
  for(const referenceDate of ["2026-10-07","2026-10-08","2027-01-01"]) {
    const r=await f.run({...ids,referenceDate});ok(JSON.stringify(r)===JSON.stringify(saved));
  }
  ok(f.providerCalls()===0);ok(f.calls.every(c=>c.name==="claim_stable_matching_score"));
});
Deno.test("updating and failure retain previous score rather than a deterministic intermediate", async()=>{
  for(const state of ["updating","update_failed"]) { const f=fixture();f.setClaim({...saved,state});const r=await f.run();ok(r.match.score.score===55);ok(f.providerCalls()===0); }
});
Deno.test("authorization checked before service claim; browser cannot submit a score",async()=>{
  const f=fixture();f.setAuthorized(false);const r=await f.run();ok(r.reasonCode==="NOT_AUTHORIZED"&&f.calls.length===0);
  const g=fixture();const request=new Request("https://test.invalid",{method:"POST",headers:{Authorization:"Bearer test"},body:JSON.stringify({...ids,score:99})});
  ok((await handleMatchingTrajectory(request,g.deps)).status===400);ok(g.calls.length===0);
});
function acquired() {
  return {...saved,acquired:true,lease:"50000000-0000-0000-0000-000000000001",reason:"dependencies_changed",changedDependencies:["profile"],
    sources:{stableDependencies:{profile:"hash"},vacancy:{id:"vacancy",organizationId:ids.organizationId,versionId:ids.positionVersionId,version:1,title:"Backend developer",area:"Technology",requirements:[],experiencePolicy:"required"},
      candidate:{personId:"person",fullName:"Synthetic",profileId:ids.profileId,profileVersion:1,knowledge:[],profileData:{experiences:[{id:"e1",role:"Backend developer",period:"2020 - 2022",description:"Built APIs"}]}},
      occupationReference:null,positionDecision:null,demonstratedEvidence:[]}};
}
Deno.test("provider failure during dependency update releases lease and preserves exact previous result",async()=>{
 const f=fixture();f.setClaim(acquired());const r=await f.run();ok(r.state==="update_failed"&&r.match.score.score===55);
 ok(f.providerCalls()===1);ok(f.calls.at(-1)?.args.p_match===null);
});
Deno.test("resolved internal relation uses shared engine and never provider; stale commit preserves previous",async()=>{
 for(const stale of [false,true]) {const f=fixture(),c=acquired();const s=c.sources as Record<string,unknown>;
 s.positionDecision="confirmed";f.setClaim(c);if(stale)f.failCommit();const r=await f.run();ok(f.providerCalls()===0);
 if(stale)ok(r.match.score.score===55&&r.state==="update_failed");else {ok(r.state==="current");const committed=f.calls.find(c=>c.name==="complete_stable_matching_score")!;ok(!(committed.args.p_match as Record<string,unknown>).candidate);}
 }
});
Deno.test("explicit recalculate reaches server authority gate; normal load cannot request force implicitly",async()=>{
 const f=fixture();await f.run();ok(f.calls[0]?.args.p_recalculate===false);await f.run({...ids,operation:"recalculate"});ok(f.calls[1]?.args.p_recalculate===true);
});

Deno.test("calculation filters expired evidence at its exact instant, without touching frozen reads",async()=>{
 const f=fixture(),c=acquired(),s=c.sources as Record<string,unknown>;
 s.positionDecision="confirmed";
 (s.vacancy as Record<string,unknown>).requirements=[{id:"r",stableId:"r",label:"SQL",category:"technology",importance:"required",relatedSignals:[]}];
 const evidence={competencyKey:"SQL",demonstratedLevel:"advanced",confidenceState:"high",verificationDefinitionVersion:"m51a-verification-definition-1.0.0",evaluationVersion:"m51b-assessment-evaluation-1.0.0",integrityRuleVersion:"m51b-integrity-ruleset-1.0.0",verifiedAt:"2026-01-01"};
 s.demonstratedEvidence=[{...evidence,id:"expired",validUntil:new Date(Date.now()-60000).toISOString()},{...evidence,id:"valid",validUntil:new Date(Date.now()+86400000).toISOString()}];
 f.setClaim(c);const r=await f.run();ok(r.state==="current");
 const requirement=r.match.requirements[0];ok(requirement.evidence[0].sourceId==="valid");ok(f.providerCalls()===0);
});
