import { handleMatchingTrajectory, canonical, inputHash, type Dependencies, type RpcClient } from "./handler.ts";
import { prepareTrajectoryContext, SEMANTIC_PROMPT_VERSION } from "../../../src/domain/semanticTrajectory.ts";

function assert(condition: unknown, message = "assertion failed"): asserts condition {
  if (!condition) throw new Error(message);
}
const ids = { organizationId: "10000000-0000-0000-0000-000000000001", profileId: "20000000-0000-0000-0000-000000000001", positionVersionId: "30000000-0000-0000-0000-000000000001" };
const source = {
  profileData: { professionalTitle: "Backend developer", experiences: [
    { organization: "SecretEmployer", role: "Backend developer", description: "Built APIs; Test Person SecretEmployer test@example.invalid https://example.invalid +5511999999999" },
    { role: "Software developer", description: "Programmed software" },
  ] },
  position: { title: "Backend developer", mission: "Build APIs", responsibilities: [] },
  redactions: ["Test Person", "SecretEmployer"], sourceVersions: { profileVersion: 2, positionVersion: 1, knowledgeGlobalVersion: 4 },
};
function fixture() {
  const requests: Record<string, unknown>[] = [], calls: Array<{ name: string; params: Record<string, unknown> }> = [];
  let serviceCreated = 0, authorized = true, authenticated = true, sourceReads = 0;
  let finalSource = source, cached: Record<string, unknown> | null = null;
  let snapshotSources: Record<string, unknown> = {
    sourceVersions: source.sourceVersions, fingerprint: "db-fingerprint",
    vacancy: { id: "vacancy", organizationId: ids.organizationId, versionId: ids.positionVersionId, version: 1,
      title: "Backend developer", area: "Software", mission: "Build APIs", responsibilities: [], expectedOutcomes: [], contextItems: [],
      referenceConceptId: null, requirements: [{ id: "requirement", stableId: "stable", label: "APIs", category: "technology", importance: "required", relatedSignals: [] }] },
    candidate: { personId: "person", profileId: ids.profileId, profileVersion: 2, fullName: "Test Person", profileData: source.profileData, knowledge: [] },
    occupationReference: null, demonstratedEvidence: [], positionDecision: null,
  };
  let commitError: { code: string } | null = null;
  const env: Record<string, string> = { KNOWLEDGE_AGENT_ENABLED: "true", KNOWLEDGE_RESEARCH_MODEL: "configured-model", OPENAI_API_KEY: "test-key" };
  let provider: (context: ReturnType<typeof prepareTrajectoryContext>, index: number) => Record<string, unknown> = context => ({
    status: "completed", model: "provider-model-revision", output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify({ items: context.entries.map(entry => ({ id: entry.id, activity: "backend_execution", quote: entry.text })) }) }] }],
  });
  const user: RpcClient = { rpc: (name, params) => {
    if (name === "load_matching_snapshot_sources") { calls.push({ name, params }); return Promise.resolve({ data: snapshotSources, error: null }); }
    calls.push({ name, params }); sourceReads++;
    return Promise.resolve(authorized ? { data: sourceReads === 1 ? source : finalSource, error: null } : { data: null, error: { code: "42501" } });
  } };
  const deps: Dependencies = {
    env: name => env[name], authenticate: () => Promise.resolve(authenticated ? { id: "actor", client: user } : null),
    service: () => {
      serviceCreated++;
      return { rpc: (name, params) => {
        calls.push({ name, params });
        if (name === "commit_matching_snapshot") return Promise.resolve({ data: { evaluationId: "40000000-0000-0000-0000-000000000001" }, error: commitError });
        if (name === "claim_matching_trajectory") return Promise.resolve({ data: cached ?? (params.p_allow_compute === false
          ? { acquired: false, status: "unavailable", reason_code: "AI_DISABLED" }
          : { acquired: true, id: "analysis", lease: "private-lease", status: "processing" }), error: null });
        return Promise.resolve({ data: { status: params.p_status, reading: params.p_reading, reason_code: params.p_reason_code, actual_model_version: params.p_actual_model_version }, error: null });
      } };
    },
    fetch: ((_url: unknown, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body)); requests.push(payload);
      return Promise.resolve(new Response(JSON.stringify(provider(JSON.parse(payload.input), requests.length - 1)), { status: 200 }));
    }) as typeof fetch,
  };
  const request = (body: unknown = ids, bearer = "Bearer test") => new Request("https://test.invalid/matching-trajectory", { method: "POST", headers: { Authorization: bearer, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { deps, env, calls, requests, request, setAuthorized: (value: boolean) => authorized = value,
    setAuthenticated: (value: boolean) => authenticated = value, serviceCreated: () => serviceCreated,
    setFinalSource: (value: typeof source) => finalSource = value,
    setCache: (value: Record<string, unknown>) => cached = value,
    setSnapshotSources: (value: Record<string, unknown>) => snapshotSources = value,
    snapshotSources: () => snapshotSources,
    setCommitError: (value: { code: string } | null) => commitError = value,
    setProvider: (value: typeof provider) => provider = value };
}

Deno.test("auth/session/source authorization precedes all service and provider access", async () => {
  for (const kind of ["missing", "invalid", "tenant"] as const) {
    const f = fixture();
    if (kind === "invalid") f.setAuthenticated(false);
    if (kind === "tenant") f.setAuthorized(false);
    const result = await handleMatchingTrajectory(f.request(ids, kind === "missing" ? "" : "Bearer test"), f.deps);
    assert([401, 403].includes(result.status)); assert(f.serviceCreated() === 0); assert(f.requests.length === 0);
  }
});
Deno.test("snapshot returns committed ID and server-computed score fingerprint", async () => {
  const f = fixture();
  const context = prepareTrajectoryContext(source.profileData, source.position, source.redactions);
  f.setCache({ status: "complete", acquired: false, id: "analysis", actual_model_version: "resolved",
    reading: { items: context.entries.map(e => ({ id: e.id, activity: "backend_execution", quote: e.text })) } });
  const data = await (await handleMatchingTrajectory(f.request({ ...ids, operation: "snapshot" }), f.deps)).json();
  assert(data.evaluationId === "40000000-0000-0000-0000-000000000001", JSON.stringify(data));
  assert(Object.keys(data).join() === "evaluationId,inputFingerprint" && f.requests.length === 0);
  const call = f.calls.find(c => c.name === "commit_matching_snapshot")!;
  const evaluation = call.params.p_evaluation as { score: { score: number; matchingContractVersion: string; inputFingerprint: string }; requirements: { stableId: string; status: string }[] };
  assert(typeof data.inputFingerprint === "string" && data.inputFingerprint === evaluation.score.inputFingerprint);
  assert(evaluation.score.score === 100 && evaluation.score.matchingContractVersion === "vacancy-matching-semantic-6.0.0");
  assert(evaluation.requirements[0].stableId === "stable" && evaluation.requirements[0].status === "met");
  assert(call.params.p_source_fingerprint === "db-fingerprint" && call.params.p_analysis_id === "analysis");
});
Deno.test("prompt 1.2 binds cached assessment and server snapshot without provider replay", async () => {
  assert(SEMANTIC_PROMPT_VERSION === "trajectory-evidence-1.2.0");
  for (const snapshot of [false, true]) {
    const f = fixture();
    delete f.env.OPENAI_API_KEY;
    f.env.KNOWLEDGE_AGENT_ENABLED = "false";
    const context = prepareTrajectoryContext(source.profileData, source.position, source.redactions);
    f.setCache({ status: "complete", acquired: false, id: "analysis", actual_model_version: "resolved", prompt_version: SEMANTIC_PROMPT_VERSION,
      reading: { items: context.entries.map(e => ({ id: e.id, activity: "backend_execution", quote: e.text })) } });
    const data = await (await handleMatchingTrajectory(f.request(snapshot ? { ...ids, operation: "snapshot" } : ids), f.deps)).json();
    const claim = f.calls.find(c => c.name === "claim_matching_trajectory")!;
    assert(claim.params.p_prompt_version === SEMANTIC_PROMPT_VERSION && claim.params.p_allow_compute === false && f.requests.length === 0);
    if (snapshot) {
      const evaluation = f.calls.find(c => c.name === "commit_matching_snapshot")!.params.p_evaluation as { semanticInterpretation: { promptVersion: string }; score: { inputFingerprint: string } };
      assert(data.evaluationId && data.inputFingerprint === evaluation.score.inputFingerprint && evaluation.semanticInterpretation.promptVersion === SEMANTIC_PROMPT_VERSION);
    } else assert(data.status === "complete" && data.promptVersion === SEMANTIC_PROMPT_VERSION);
  }
});
Deno.test("snapshot ignores no client fields: forged points, sources or analysis ID rejected", async () => {
  for (const key of ["score", "analysisId", "evaluation", "candidate", "fingerprint", "inputFingerprint", "reading"]) {
    const f = fixture(); const response = await handleMatchingTrajectory(f.request({ ...ids, operation: "snapshot", [key]: "forged" }), f.deps);
    assert(response.status === 400 && f.calls.length === 0);
  }
});
Deno.test("snapshot cannot compute a missing cache or persist indeterminate/processing/unclear results", async () => {
  for (const status of ["missing", "indeterminate", "processing", "complete"]) {
    const f = fixture();
    const context = prepareTrajectoryContext(source.profileData, source.position, source.redactions);
    if (status !== "missing") f.setCache({ status, acquired: false, id: "analysis", actual_model_version: "resolved",
      reading: { items: context.entries.map(e => ({ id: e.id, activity: "unclear", quote: "" })) } });
    const data = await (await handleMatchingTrajectory(f.request({ ...ids, operation: "snapshot" }), f.deps)).json();
    assert(!data.evaluationId && f.requests.length === 0);
    assert(!f.calls.some(c => c.name === "commit_matching_snapshot"));
  }
});
Deno.test("snapshot rejects cross-tenant source projection and changed semantic source version", async () => {
  for (const scenario of ["tenant", "version"]) {
    const f = fixture(); const context = prepareTrajectoryContext(source.profileData, source.position, source.redactions);
    f.setCache({ status: "complete", acquired: false, id: "analysis", actual_model_version: "resolved",
      reading: { items: context.entries.map(e => ({ id: e.id, activity: "backend_execution", quote: e.text })) } });
    const s = f.snapshotSources();
    f.setSnapshotSources(scenario === "version" ? { ...s, sourceVersions: { changed: true } }
      : { ...s, vacancy: { ...s.vacancy as object, organizationId: "other-tenant" } });
    const data = await (await handleMatchingTrajectory(f.request({ ...ids, operation: "snapshot" }), f.deps)).json();
    assert(data.status === "unavailable" && !f.calls.some(c => c.name === "commit_matching_snapshot"));
  }
});
Deno.test("atomic commit rejects stale source/revoked actor without exposing backend errors", async () => {
  for (const code of ["40001", "42501", "55P03"]) {
    const f = fixture(); const context = prepareTrajectoryContext(source.profileData, source.position, source.redactions);
    f.setCache({ status: "complete", acquired: false, id: "analysis", actual_model_version: "resolved",
      reading: { items: context.entries.map(e => ({ id: e.id, activity: "backend_execution", quote: e.text })) } });
    f.setCommitError({ code });
    const data = await (await handleMatchingTrajectory(f.request({ ...ids, operation: "snapshot" }), f.deps)).json();
    assert(!data.evaluationId && data.reasonCode === (code === "40001" ? "SOURCE_STALE" : code === "42501" ? "AUTH_REVOKED" : "SNAPSHOT_UNAVAILABLE"));
  }
});
Deno.test("browser cannot inject text, model, source revisions or actor", async () => {
  for (const property of ["text", "model", "sourceVersions", "actorId"]) {
    const f = fixture(); const result = await handleMatchingTrajectory(f.request({ ...ids, [property]: "injected" }), f.deps);
    assert(result.status === 400); assert(f.calls.length === 0); assert(f.serviceCreated() === 0);
  }
});
Deno.test("chunked/oversized body is bounded", async () => {
  const f = fixture(); const result = await handleMatchingTrajectory(f.request({ ...ids, text: "x".repeat(2000) }), f.deps);
  assert(result.status === 400); assert(f.serviceCreated() === 0);
});
Deno.test("disabled provider/missing model has no fallback and no calls", async () => {
  for (const key of ["KNOWLEDGE_AGENT_ENABLED", "KNOWLEDGE_RESEARCH_MODEL", "OPENAI_API_KEY"]) {
    const f = fixture(); delete f.env[key];
    const data = await (await handleMatchingTrajectory(f.request(), f.deps)).json();
    assert(data.status === "unavailable" && data.reasonCode === "AI_DISABLED"); assert(f.requests.length === 0);
    assert(f.serviceCreated() === (key === "KNOWLEDGE_RESEARCH_MODEL" ? 0 : 1));
  }
});
Deno.test("two independent reverse-order reads, strict/store false, minimized context, actual model persisted", async () => {
  const f = fixture(); const data = await (await handleMatchingTrajectory(f.request(), f.deps)).json();
  assert(data.status === "complete"); assert(data.modelVersion === "provider-model-revision"); assert(f.requests.length === 2);
  const [a, b] = f.requests;
  assert(a.store === false && a.model === "configured-model" && a.max_output_tokens === 6000);
  assert((a.reasoning as { effort: string }).effort === "low" && !("temperature" in a));
  assert((a.text as { format: { strict: boolean } }).format.strict === true);
  const first = JSON.parse(String(a.input)), second = JSON.parse(String(b.input));
  assert(JSON.stringify(first.entries.map((e: { id: string }) => e.id).reverse()) === JSON.stringify(second.entries.map((e: { id: string }) => e.id)));
  for (const marker of ["Test Person", "SecretEmployer", "test@example.invalid", "https://example.invalid", "+5511999999999"]) assert(!String(a.input).includes(marker));
  const claim = f.calls.find(c => c.name === "claim_matching_trajectory")!;
  assert(claim.params.p_model_version === "configured-model");
  assert(!JSON.stringify(claim.params.p_context).includes("organization"));
  const completion = f.calls.find(c => c.name === "complete_matching_trajectory")!;
  assert(completion.params.p_actual_model_version === "provider-model-revision");
  assert(!JSON.stringify(data).includes("private-lease") && !JSON.stringify(data).includes("test-key"));
});
Deno.test("disagreement persists indeterminate without a reading", async () => {
  const f = fixture();
  f.setProvider((ctx, index) => ({ status: "completed", model: "resolved", output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify({ items: ctx.entries.map(e => ({ id: e.id, activity: index ? "software_leadership" : "backend_execution", quote: e.text })) }) }] }] }));
  const data = await (await handleMatchingTrajectory(f.request(), f.deps)).json();
  assert(data.status === "indeterminate" && data.reasonCode === "READINGS_DISAGREE" && !data.reading);
  assert(f.calls.find(c => c.name === "complete_matching_trajectory")?.params.p_reading === null);
});
Deno.test("refusal, incomplete, missing model, invented quotes and malformed JSON remain unavailable", async () => {
  for (const output of [
    { status: "incomplete", model: "resolved", output: [] },
    { status: "completed", model: "resolved", output: [{ content: [{ type: "refusal", refusal: "private provider detail" }] }] },
    { status: "completed", output: [] },
    { status: "completed", model: "resolved", output: [{ content: [{ type: "output_text", text: "invalid secret details" }] }] },
    { status: "completed", model: "resolved", output: [{ content: [{ type: "output_text", text: '{"items":[{"id":"e0","activity":"backend_execution","quote":"invented"}]}' }] }] },
  ]) {
    const f = fixture(); f.setProvider(() => output);
    const data = await (await handleMatchingTrajectory(f.request(), f.deps)).json();
    assert(data.status === "unavailable" && data.reasonCode === "RESPONSE_INVALID");
    assert(!JSON.stringify(data).includes("private") && !JSON.stringify(data).includes("secret"));
  }
});
Deno.test("model resolution disagreement cannot produce a complete assessment", async () => {
  const f = fixture(); f.setProvider((ctx, index) => ({ status: "completed", model: `model-${index}`, output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify({ items: ctx.entries.map(e => ({ id: e.id, activity: "unclear", quote: "" })) }) }] }] }));
  const data = await (await handleMatchingTrajectory(f.request(), f.deps)).json();
  assert(data.status === "unavailable" && data.reasonCode === "RESPONSE_INVALID");
});
Deno.test("provider error and timeout produce bounded reason codes", async () => {
  for (const mode of ["http", "timeout"]) {
    const f = fixture();
    f.deps.fetch = (() => mode === "http" ? Promise.resolve(new Response("secret", { status: 429 })) : Promise.reject(new DOMException("sensitive", "TimeoutError"))) as typeof fetch;
    const data = await (await handleMatchingTrajectory(f.request(), f.deps)).json();
    assert(data.status === "unavailable" && data.reasonCode === (mode === "http" ? "PROVIDER_UNAVAILABLE" : "PROVIDER_TIMEOUT"));
  }
});
Deno.test("completed, disagreement, processing and cooldown cache paths do not call provider", async () => {
  for (const status of ["complete", "indeterminate", "processing", "unavailable"]) {
    const f = fixture(); const context = prepareTrajectoryContext(source.profileData, source.position, source.redactions);
    f.setCache({ status, acquired: false, id: "existing", actual_model_version: "resolved", reading: { items: context.entries.map(e => ({ id: e.id, activity: "unclear", quote: "" })) } });
    const data = await (await handleMatchingTrajectory(f.request(), f.deps)).json();
    assert(data.status === status); assert(f.requests.length === 0);
  }
});
Deno.test("source change after provider/cache returns stale without releasing evidence", async () => {
  const f = fixture(); f.setFinalSource({ ...source, sourceVersions: { ...source.sourceVersions, knowledgeGlobalVersion: 5 } });
  const data = await (await handleMatchingTrajectory(f.request(), f.deps)).json();
  assert(data.status === "unavailable" && data.reasonCode === "SOURCE_STALE" && !data.reading && !data.context);
});
Deno.test("compatible cache remains readable with flag off or API key missing", async () => {
  for (const key of ["KNOWLEDGE_AGENT_ENABLED", "OPENAI_API_KEY"]) {
    const f = fixture(); delete f.env[key];
    const context = prepareTrajectoryContext(source.profileData, source.position, source.redactions);
    f.setCache({ status: "complete", acquired: false, id: "existing", actual_model_version: "resolved",
      reading: { items: context.entries.map(e => ({ id: e.id, activity: "unclear", quote: "" })) } });
    const data = await (await handleMatchingTrajectory(f.request(), f.deps)).json();
    assert(data.status === "complete" && data.modelVersion === "resolved"); assert(f.requests.length === 0);
    assert(f.calls.find(c => c.name === "claim_matching_trajectory")?.params.p_allow_compute === false);
  }
});
Deno.test("sensitive professional clause returns review required without cache or provider", async () => {
  const f = fixture();
  f.deps.authenticate = () => Promise.resolve({ id: "actor", client: { rpc: () => Promise.resolve({ error: null, data: {
    ...source, profileData: { experiences: [{ role: "Developer", description: "Desenvolvi APIs com deficiência" }] },
  } }) } });
  const data = await (await handleMatchingTrajectory(f.request(), f.deps)).json();
  assert(data.status === "unavailable" && data.reasonCode === "INPUT_REQUIRES_REVIEW");
  assert(f.serviceCreated() === 0 && f.requests.length === 0);
});
Deno.test("strict provider envelope rejects tools, duplicate messages, extra content, errors and incomplete details", async () => {
  for (const mode of ["tool", "duplicate", "extra", "error", "incomplete", "wrongrole", "pending"]) {
    const f = fixture(); f.setProvider(ctx => {
      const message = { type: "message", role: mode === "wrongrole" ? "user" : "assistant", status: mode === "pending" ? "in_progress" : "completed",
        content: [{ type: "output_text", text: JSON.stringify({ items: ctx.entries.map(e => ({ id: e.id, activity: "unclear", quote: "" })) }) }] };
      if (mode === "extra") message.content.push({ type: "output_text", text: "extra" });
      return { status: "completed", model: "resolved", error: mode === "error" ? { message: "private" } : null,
        incomplete_details: mode === "incomplete" ? { reason: "max_output_tokens" } : null,
        output: mode === "duplicate" ? [message, message] : mode === "tool" ? [message, { type: "function_call" }] : [message] };
    });
    const data = await (await handleMatchingTrajectory(f.request(), f.deps)).json();
    assert(data.status === "unavailable" && data.reasonCode === "RESPONSE_INVALID", mode);
  }
});
Deno.test("hash is canonical and changes with Knowledge revision or minimized text", async () => {
  assert(canonical({ b: 2, a: 1 }) === canonical({ a: 1, b: 2 }));
  const context = prepareTrajectoryContext(source.profileData, source.position, source.redactions);
  const a = await inputHash(context, { a: 1, b: 2 });
  assert(a === await inputHash(context, { b: 2, a: 1 }));
  assert(a !== await inputHash(context, { a: 2, b: 2 }));
  assert(a !== await inputHash({ ...context, position: "Changed" }, { a: 1, b: 2 }));
});
