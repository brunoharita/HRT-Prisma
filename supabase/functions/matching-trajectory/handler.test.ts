import { handleMatchingTrajectory, canonical, inputHash, type Dependencies, type RpcClient } from "./handler.ts";
import { prepareTrajectoryContext, SEMANTIC_PROMPT_VERSION, type TrajectoryEvidenceInput } from "../../../src/domain/semanticTrajectory.ts";

function assert(condition: unknown, message = "assertion failed"): asserts condition {
  if (!condition) throw new Error(message);
}
const ids = { organizationId: "10000000-0000-0000-0000-000000000001", profileId: "20000000-0000-0000-0000-000000000001", positionVersionId: "30000000-0000-0000-0000-000000000001", referenceDate: "2026-09-27" };
const source = {
  profileData: { professionalTitle: "Backend developer", experiences: [
    { organization: "SecretEmployer", role: "Backend developer", period: "01/2020 - 09/2026", description: "Built APIs; Test Person SecretEmployer test@example.invalid https://example.invalid +5511999999999" },
    { role: "Software developer", period: "01/2020 - 09/2026", description: "Programmed software" },
  ] },
  position: { title: "Backend developer", mission: "Build APIs", responsibilities: [] },
  redactions: ["Test Person", "SecretEmployer"], sourceVersions: { profileVersion: 2, positionVersion: 1, knowledgeGlobalVersion: 4 },
};
function fixture() {
  const requests: Record<string, unknown>[] = [], calls: Array<{ name: string; params: Record<string, unknown> }> = [];
  const diagnostics: Array<Parameters<NonNullable<Dependencies["logDiagnostic"]>>[0]> = [];
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
  let reviewData: Record<string, unknown> | null = null;
  let reviewError: { code: string } | null = null;
  let legacyClaim: Record<string, unknown> = { acquired: true, id: "40000000-0000-0000-0000-000000000001",
    lease: "legacy-lease", status: "processing", attempts: 4 };
  const env: Record<string, string> = { KNOWLEDGE_AGENT_ENABLED: "true", KNOWLEDGE_RESEARCH_MODEL: "configured-model", OPENAI_API_KEY: "test-key" };
  let provider: (context: TrajectoryEvidenceInput, index: number) => Record<string, unknown> = context => ({
    status: "completed", model: "provider-model-revision", output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify({ items: context.entries.map(entry => ({ id: entry.id, activity: "backend_execution", evidenceId: entry.segments[0]?.id })) }) }] }],
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
        if (name === "load_matching_trajectory_review") return Promise.resolve({ data: reviewData, error: reviewError });
        if (name === "save_matching_trajectory_review") return Promise.resolve({ data: { reviewId: "50000000-0000-0000-0000-000000000001",
          status: params.p_reading ? "resolved" : "unresolved" }, error: reviewError });
        if (name === "claim_matching_legacy_review_refresh") return Promise.resolve({ data: legacyClaim, error: reviewError });
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
    logDiagnostic: event => diagnostics.push(event),
  };
  const request = (body: unknown = ids, bearer = "Bearer test") => new Request("https://test.invalid/matching-trajectory", { method: "POST", headers: { Authorization: bearer, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { deps, env, calls, requests, diagnostics, request, setAuthorized: (value: boolean) => authorized = value,
    setAuthenticated: (value: boolean) => authenticated = value, serviceCreated: () => serviceCreated,
    setFinalSource: (value: typeof source) => finalSource = value,
    setCache: (value: Record<string, unknown>) => cached = value,
    setSnapshotSources: (value: Record<string, unknown>) => snapshotSources = value,
    snapshotSources: () => snapshotSources,
    setCommitError: (value: { code: string } | null) => commitError = value,
    setReviewData: (value: Record<string, unknown> | null) => reviewData = value,
    setReviewError: (value: { code: string } | null) => reviewError = value,
    setLegacyClaim: (value: Record<string, unknown>) => legacyClaim = value,
    setProvider: (value: typeof provider) => provider = value };
}

Deno.test("auth/session/source authorization precedes all service and provider access", async () => {
  for (const kind of ["missing", "invalid", "tenant"] as const) {
    const f = fixture();
    if (kind === "invalid") f.setAuthenticated(false);
    if (kind === "tenant") f.setAuthorized(false);
    const result = await handleMatchingTrajectory(f.request(ids, kind === "missing" ? "" : "Bearer test"), f.deps);
    assert([401, 403].includes(result.status)); assert(f.serviceCreated() === 0); assert(f.requests.length === 0);
    assert(f.diagnostics.length === 0);
  }
});
Deno.test("server triage rejects contextual, resolved and human-decided profiles before cache or provider", async () => {
  for (const kind of ["contextual", "tool_only", "resolved", "related", "confirmed", "dismissed"] as const) for (const snapshot of [false, true]) {
    const f = fixture(), s = f.snapshotSources(), candidate = s.candidate as Record<string, unknown>;
    f.setSnapshotSources({ ...s,
      candidate: { ...candidate, profileData: kind === "contextual" || kind === "tool_only"
        ? { experiences: [{ role: "Vendedor de tecnologia" }], competencies: kind === "tool_only" ? ["APIs"] : [] }
        : candidate.profileData },
      occupationReference: kind === "resolved" || kind === "related" ? { conceptId: "occupation-backend", canonicalLabel: "Backend developer", aliases: [],
        relations: kind === "related" ? [{ conceptId: "occupation-software", label: "Software developer", relationType: "related_to" }] : [] } : null,
      positionDecision: kind === "dismissed" ? "dismissed" : kind === "confirmed" ? "confirmed" : null,
      ...(kind === "resolved" || kind === "related" ? { vacancy: { ...(s.vacancy as Record<string, unknown>), referenceConceptId: "occupation-backend" },
        candidate: { ...candidate, knowledge: [{ state: "resolved", conceptType: "occupation", conceptId: kind === "related" ? "occupation-software" : "occupation-backend",
          originalTerm: "Software developer", canonicalLabel: "Software developer" }] } } : {}),
    });
    const data = await (await handleMatchingTrajectory(f.request(snapshot ? { ...ids, operation: "snapshot" } : ids), f.deps)).json();
    assert(data.reasonCode === "OUTSIDE_SEMANTIC_TRIAGE", `${kind}: ${JSON.stringify(data)}`);
    assert(f.serviceCreated() === 0 && f.requests.length === 0);
    assert(!f.calls.some(c => c.name === "claim_matching_trajectory"));
  }
});
Deno.test("server triage uses source identity and revisions, never browser approval", async () => {
  for (const change of ["tenant", "profile", "version", "revision"] as const) {
    const f = fixture(), s = structuredClone(f.snapshotSources());
    if (change === "tenant") (s.vacancy as Record<string, unknown>).organizationId = "another";
    if (change === "profile") (s.candidate as Record<string, unknown>).profileId = "another";
    if (change === "version") (s.vacancy as Record<string, unknown>).versionId = "another";
    if (change === "revision") s.sourceVersions = { changed: true };
    f.setSnapshotSources(s);
    const data = await (await handleMatchingTrajectory(f.request(), f.deps)).json();
    assert(["SOURCE_STALE", "TRIAGE_SOURCE_INVALID"].includes(data.reasonCode));
    assert(f.serviceCreated() === 0 && f.requests.length === 0);
  }
  const f = fixture();
  assert((await handleMatchingTrajectory(f.request({ ...ids, discoveryGroup: "main_area" }), f.deps)).status === 400);
  assert(f.calls.length === 0);
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
  assert(evaluation.score.score === 100 && evaluation.score.matchingContractVersion === "vacancy-matching-semantic-7.0.0");
  assert(evaluation.requirements[0].stableId === "stable" && evaluation.requirements[0].status === "met");
  assert(call.params.p_source_fingerprint === "db-fingerprint" && call.params.p_analysis_id === "analysis");
});
Deno.test("prompt 2.1 binds cached assessment and server snapshot without provider replay", async () => {
  assert(SEMANTIC_PROMPT_VERSION === "trajectory-evidence-2.1.0");
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
  assert(!("last_reading_pair" in data) && !("readingPair" in data));
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
  const completion = f.calls.find(c => c.name === "complete_matching_trajectory_audited")!;
  assert(completion.params.p_actual_model_version === "provider-model-revision");
  const pair = completion.params.p_reading_pair as Array<{ outcome: string; model: string; items: Array<{ id: string; activity: string; evidenceId: string }> }>;
  assert(pair.length === 2 && pair.every(side => side.outcome === "validated" && side.model === "provider-model-revision"));
  assert(pair.every(side => side.items.every(item => item.evidenceId.startsWith(`${item.id}:`))));
  for (const sensitive of ["Test Person", "SecretEmployer", "test@example.invalid", "Built APIs"]) {
    assert(!JSON.stringify(pair).includes(sensitive));
  }
  assert(!JSON.stringify(data).includes("private-lease") && !JSON.stringify(data).includes("test-key"));
  assert(f.diagnostics.length === 0);
});
Deno.test("disagreement persists indeterminate without a reading", async () => {
  const f = fixture();
  f.setProvider((ctx, index) => ({ status: "completed", model: "resolved", output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify({ items: ctx.entries.map(e => ({ id: e.id, activity: index ? "software_leadership" : "backend_execution", evidenceId: e.segments[0]?.id })) }) }] }] }));
  const data = await (await handleMatchingTrajectory(f.request(), f.deps)).json();
  assert(data.status === "indeterminate" && data.reasonCode === "READINGS_DISAGREE" && !data.reading);
  assert(!("last_reading_pair" in data) && !("readingPair" in data));
  const completion = f.calls.find(c => c.name === "complete_matching_trajectory_audited")!;
  assert(completion.params.p_reading === null);
  const pair = completion.params.p_reading_pair as Array<{ outcome: string; items: Array<{ activity: string }> }>;
  assert(pair.length === 2 && pair[0].outcome === "validated" && pair[1].outcome === "validated");
  assert(pair[0].items[0].activity !== pair[1].items[0].activity);
  assert(f.diagnostics.length === 1 && f.diagnostics[0].stage === "readings_disagree");
  assert(f.diagnostics[0].readings.every(item => item.outcome === "validated"));
});
Deno.test("diagnostic isolates both readings, incomplete reason and bounded usage without provider content", async () => {
  const f = fixture();
  f.setProvider((ctx, index) => index === 0
    ? { status: "incomplete", model: "resolved", incomplete_details: { reason: "max_output_tokens", detail: "private provider text" },
      usage: { input_tokens: 123, output_tokens: 6000 }, output: [{ type: "message", content: [{ text: "secret response" }] }] }
    : { status: "completed", model: "resolved", output: [{ type: "message", role: "assistant", status: "completed",
      content: [{ type: "output_text", text: JSON.stringify({ items: ctx.entries.map(e => ({ id: e.id, activity: "unclear", evidenceId: "" })) }) }] }] });
  const data = await (await handleMatchingTrajectory(f.request(), f.deps)).json();
  assert(data.status === "unavailable" && data.reasonCode === "RESPONSE_INVALID");
  assert(f.diagnostics.length === 1);
  const log = f.diagnostics[0];
  assert(log.event === "matching_trajectory_readings" && log.analysisId === "analysis" && log.stage === "reading_failure");
  assert(log.readings[0].stage === "provider_status" && log.readings[0].outcome === "failed");
  assert(log.readings[0].httpStatus === 200 && log.readings[0].providerStatus === "incomplete"
    && log.readings[0].incompleteReason === "max_output_tokens" && log.readings[0].outputTokens === 6000);
  assert(log.readings[1].stage === "validated" && log.readings[1].outcome === "validated");
  const pair = f.calls.find(c => c.name === "complete_matching_trajectory_audited")!.params.p_reading_pair as Array<Record<string, unknown>>;
  assert(pair[0].outcome === "failed" && pair[0].stage === "provider_status" && pair[0].reasonCode === "RESPONSE_INVALID");
  assert(pair[1].outcome === "validated");
  for (const sensitive of ["secret", "private", "Test Person", "test@example.invalid", "Bearer", "provider text"]) {
    assert(!JSON.stringify(log).includes(sensitive));
    assert(!JSON.stringify(pair).includes(sensitive));
  }
});
Deno.test("diagnostic distinguishes malformed JSON, invalid quote and model mismatch without changing public reason", async () => {
  for (const stage of ["output_json", "reading_evidence", "model_disagreement"] as const) {
    const f = fixture();
    f.setProvider((ctx, index) => ({ status: "completed", model: stage === "model_disagreement" ? `model-${index}` : "resolved",
      output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text",
        text: stage === "output_json" && index === 0 ? "private malformed JSON"
          : JSON.stringify({ items: ctx.entries.map(e => ({ id: e.id, activity: "backend_execution",
            evidenceId: stage === "reading_evidence" && index === 0 ? "invented private reference" : e.segments[0]?.id })) }) }] }] }));
    const data = await (await handleMatchingTrajectory(f.request(), f.deps)).json();
    assert(data.status === "unavailable" && data.reasonCode === "RESPONSE_INVALID", stage);
    assert(f.diagnostics.length === 1 && f.diagnostics[0].readings.length === 2, stage);
    assert((stage === "model_disagreement" ? f.diagnostics[0].stage : f.diagnostics[0].readings[0].stage) === stage, stage);
    assert(!JSON.stringify(f.diagnostics[0]).includes("private"), stage);
  }
});
Deno.test("diagnostic logger failure cannot alter a completed assessment or public error", async () => {
  for (const invalid of [false, true]) {
    const f = fixture();
    f.deps.logDiagnostic = () => { throw new Error("logging unavailable private detail"); };
    if (invalid) f.setProvider(() => ({ status: "incomplete", model: "resolved", output: [] }));
    const data = await (await handleMatchingTrajectory(f.request(), f.deps)).json();
    assert(data.status === (invalid ? "unavailable" : "complete"));
    assert(data.reasonCode === (invalid ? "RESPONSE_INVALID" : undefined));
    assert(f.calls.some(call => call.name === "complete_matching_trajectory_audited"));
  }
});
Deno.test("diagnostic sanitizes unknown provider metadata and does not record cached failures", async () => {
  const f = fixture();
  f.setProvider(() => ({ status: "incomplete-private", model: "resolved",
    incomplete_details: { reason: "private diagnosis" }, usage: { input_tokens: -4, output_tokens: "123" }, output: [] }));
  const data = await (await handleMatchingTrajectory(f.request(), f.deps)).json();
  assert(data.reasonCode === "RESPONSE_INVALID");
  const diagnostic = f.diagnostics[0].readings[0];
  assert(diagnostic.providerStatus === "other" && diagnostic.incompleteReason === "other");
  assert(diagnostic.inputTokens === undefined && diagnostic.outputTokens === undefined);
  assert(!JSON.stringify(f.diagnostics[0]).includes("private"));
  const cached = fixture(); cached.setCache({ acquired: false, status: "unavailable", reason_code: "RESPONSE_INVALID", id: "analysis" });
  assert((await (await handleMatchingTrajectory(cached.request(), cached.deps)).json()).reasonCode === "RESPONSE_INVALID");
  assert(cached.requests.length === 0 && cached.diagnostics.length === 0);
});
Deno.test("cached failure exposes only truthful bounded retry state without calling the provider", async () => {
  const cases = [
    { status: "unavailable", attempts: 1, retry_after: "2026-01-01T00:00:00Z", retryAvailable: true, retryExhausted: false },
    { status: "unavailable", attempts: 1, retry_after: "2099-01-01T00:00:00Z", retryAvailable: false, retryExhausted: false },
    { status: "unavailable", attempts: 3, retry_after: "2026-01-01T00:00:00Z", retryAvailable: false, retryExhausted: true },
    { status: "indeterminate", attempts: 1, retry_after: undefined, retryAvailable: false, retryExhausted: false },
  ];
  for (const item of cases) {
    const f = fixture();
    f.setCache({ acquired: false, status: item.status, id: "analysis", attempts: item.attempts,
      reason_code: item.status === "indeterminate" ? "READINGS_DISAGREE" : "RESPONSE_INVALID", retry_after: item.retry_after });
    const data = await (await handleMatchingTrajectory(f.request(), f.deps)).json();
    assert(data.retryAvailable === item.retryAvailable && data.retryExhausted === item.retryExhausted);
    assert(data.retryAfter === (item.status === "unavailable" ? item.retry_after : undefined));
    assert(f.requests.length === 0);
  }
});
Deno.test("refusal, incomplete, missing model, invented evidence IDs and malformed JSON remain unavailable", async () => {
  for (const output of [
    { status: "incomplete", model: "resolved", output: [] },
    { status: "completed", model: "resolved", output: [{ content: [{ type: "refusal", refusal: "private provider detail" }] }] },
    { status: "completed", output: [] },
    { status: "completed", model: "resolved", output: [{ content: [{ type: "output_text", text: "invalid secret details" }] }] },
    { status: "completed", model: "resolved", output: [{ content: [{ type: "output_text", text: '{"items":[{"id":"e0","activity":"backend_execution","evidenceId":"invented"}]}' }] }] },
  ]) {
    const f = fixture(); f.setProvider(() => output);
    const data = await (await handleMatchingTrajectory(f.request(), f.deps)).json();
    assert(data.status === "unavailable" && data.reasonCode === "RESPONSE_INVALID");
    assert(!JSON.stringify(data).includes("private") && !JSON.stringify(data).includes("secret"));
  }
});
Deno.test("model resolution disagreement cannot produce a complete assessment", async () => {
  const f = fixture(); f.setProvider((ctx, index) => ({ status: "completed", model: `model-${index}`, output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify({ items: ctx.entries.map(e => ({ id: e.id, activity: "unclear", evidenceId: "" })) }) }] }] }));
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
        content: [{ type: "output_text", text: JSON.stringify({ items: ctx.entries.map(e => ({ id: e.id, activity: "unclear", evidenceId: "" })) }) }] };
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

Deno.test("one verified conflict is reviewable without a provider call, and human choice is assembled from evidence", async () => {
  const f = fixture(), context = prepareTrajectoryContext(source.profileData, source.position, source.redactions);
  const sourceItems = context.entries.map(entry => ({ id: entry.id, activity: "direct_function", evidenceId: `${entry.id}:0` }));
  const pair = { attempt: 1, readings: [
    { outcome: "validated", model: "resolved", items: sourceItems },
    { outcome: "validated", model: "resolved", items: sourceItems.map(item => item.id === "e0" ? { ...item, activity: "related_function" } : item).reverse() },
  ] };
  f.setCache({ status: "indeterminate", reason_code: "READINGS_DISAGREE", acquired: false,
    id: "40000000-0000-0000-0000-000000000001" });
  f.setReviewData({ reviewable: true, conflictCount: 1, pair, context });
  const loaded = await (await handleMatchingTrajectory(f.request({ ...ids, operation: "review_load" }), f.deps)).json();
  assert(loaded.status === "review_pending" && loaded.conflicts.length === 1 && loaded.conflicts[0].id === "e0");
  assert(!("pair" in loaded) && !("context" in loaded) && f.requests.length === 0);
  const saved = await (await handleMatchingTrajectory(f.request({ ...ids, operation: "review_save", analysisId: loaded.analysisId,
    choices: [{ id: "e0", choice: "second" }] }), f.deps)).json();
  assert(saved.status === "resolved" && f.requests.length === 0);
  const save = f.calls.find(call => call.name === "save_matching_trajectory_review");
  const reviewed = save?.params.p_reading as { items: Array<{ id: string; activity: string }> } | undefined;
  assert(reviewed?.items.find(item => item.id === "e0")?.activity === "related_function");
  const unresolved = await (await handleMatchingTrajectory(f.request({ ...ids, operation: "review_save", analysisId: loaded.analysisId,
    choices: [{ id: "e0", choice: "cannot_determine" }] }), f.deps)).json();
  assert(unresolved.status === "unresolved");
  assert(f.calls.filter(call => call.name === "save_matching_trajectory_review").at(-1)?.params.p_reading === null);
  const beforeStale = f.calls.filter(call => call.name === "save_matching_trajectory_review").length;
  const stale = await handleMatchingTrajectory(f.request({ ...ids, operation: "review_save",
    analysisId: "40000000-0000-0000-0000-000000000002", choices: [{ id: "e0", choice: "first" }] }), f.deps);
  assert(stale.status === 409 && f.calls.filter(call => call.name === "save_matching_trajectory_review").length === beforeStale);
});

Deno.test("large reviews load every verified conflict and save atomically without provider calls", async () => {
  for (const count of [5, 6, 21]) {
    const f = fixture(), expanded = { ...source, profileData: { ...source.profileData, experiences: Array.from({ length: count }, (_, i) => ({ role: "Backend developer", description: `Built APIs for project ${i}` })) } };
    f.deps.authenticate = () => Promise.resolve({ id: "actor", client: { rpc: name => Promise.resolve({ error: null, data: name === "load_matching_snapshot_sources" ? { ...f.snapshotSources(), candidate: { ...(f.snapshotSources().candidate as Record<string, unknown>), profileData: expanded.profileData } } : expanded }) } });
    const context = prepareTrajectoryContext(expanded.profileData, expanded.position, expanded.redactions);
    const sides = ["direct_function", "related_function"].map(activity => ({ outcome: "validated", model: "resolved", items: context.entries.map(entry => ({ id: entry.id, activity, evidenceId: `${entry.id}:0` })) }));
    const total = context.entries.length;
    f.setCache({ status: "indeterminate", reason_code: "READINGS_DISAGREE", acquired: false, id: "40000000-0000-0000-0000-000000000001" });
    f.setReviewData({ reviewable: true, conflictCount: total, pair: { attempt: 1, readings: sides }, context });
    const loaded = await (await handleMatchingTrajectory(f.request({ ...ids, operation: "review_load" }), f.deps)).json();
    assert(loaded.status === "review_pending" && loaded.conflicts.length === total && total >= count, JSON.stringify({ count, total, loaded }));
    assert(!("pair" in loaded) && !("context" in loaded));
    const choices = context.entries.map(entry => ({ id: entry.id, choice: "first" }));
    for (const invalid of [choices.slice(1), [{ ...choices[0], id: "unknown" }, ...choices.slice(1)], [choices[0], ...choices.slice(0, -1)]]) {
      const result = await handleMatchingTrajectory(f.request({ ...ids, operation: "review_save", analysisId: loaded.analysisId, choices: invalid }), f.deps);
      assert(result.status === 400 && !f.calls.some(call => call.name === "save_matching_trajectory_review"));
    }
    const result = await (await handleMatchingTrajectory(f.request({ ...ids, operation: "review_save", analysisId: loaded.analysisId, choices }), f.deps)).json();
    assert(result.status === "resolved" && f.requests.length === 0);
    const saved = f.calls.filter(call => call.name === "save_matching_trajectory_review");
    assert(saved.length === 1 && (saved[0].params.p_choices as unknown[]).length === total);
    const uncertain = await (await handleMatchingTrajectory(f.request({ ...ids, operation: "review_save", analysisId: loaded.analysisId, choices: [{ ...choices[0], choice: "cannot_determine" }, ...choices.slice(1)] }), f.deps)).json();
    assert(uncertain.status === "unresolved" && f.calls.filter(call => call.name === "save_matching_trajectory_review").at(-1)?.params.p_reading === null);
  }
});

Deno.test("unready, unauthorized or malformed reviews cannot save", async () => {
  const f = fixture(); f.setCache({ status: "indeterminate", reason_code: "READINGS_DISAGREE", acquired: false,
    id: "40000000-0000-0000-0000-000000000001" });
  f.setReviewData({ reviewable: false, conflictCount: 6 });
  const overLimit = await (await handleMatchingTrajectory(f.request({ ...ids, operation: "review_load" }), f.deps)).json();
  assert(overLimit.status === "unavailable" && overLimit.reasonCode === "REVIEW_NOT_READY" && f.requests.length === 0);
  const malformed = await (await handleMatchingTrajectory(f.request({ ...ids, operation: "review_save", analysisId: "40000000-0000-0000-0000-000000000001", choices: [{ id: "bad", choice: "first" }] }), f.deps)).json();
  assert(malformed.status === "unavailable" && !f.calls.some(call => call.name === "save_matching_trajectory_review"));
  f.setReviewError({ code: "42501" });
  const denied = await handleMatchingTrajectory(f.request({ ...ids, operation: "review_load" }), f.deps);
  assert(denied.status === 403 && f.requests.length === 0);
});

Deno.test("a legacy disagreement without stored readings is reported promptly without a provider call", async () => {
  const f = fixture(); f.setCache({ status: "indeterminate", reason_code: "READINGS_DISAGREE", acquired: false,
    id: "40000000-0000-0000-0000-000000000001" });
  f.setReviewData({ reviewable: false, reasonCode: "PAIR_NOT_STORED", conflictCount: 0,
    analysisId: "40000000-0000-0000-0000-000000000001" });
  const response = await handleMatchingTrajectory(f.request({ ...ids, operation: "review_load" }), f.deps);
  const data = await response.json();
  assert(response.status === 200 && data.status === "review_unavailable" && data.reasonCode === "PAIR_NOT_STORED");
  assert(data.analysisId === "40000000-0000-0000-0000-000000000001" && f.requests.length === 0);
  assert(!f.calls.some(call => call.name === "claim_matching_legacy_review_refresh"));
});

Deno.test("only an explicit legacy refresh claims the old cache and requests two new readings", async () => {
  const f = fixture();
  f.setProvider((ctx, index) => ({ status: "completed", model: "resolved", output: [{ type: "message", role: "assistant",
    status: "completed", content: [{ type: "output_text", text: JSON.stringify({ items: ctx.entries.map(entry => ({
      id: entry.id, activity: index ? "software_leadership" : "backend_execution", evidenceId: entry.segments[0]?.id,
    })) }) }] }] }));
  const data = await (await handleMatchingTrajectory(f.request({ ...ids, operation: "review_refresh",
    analysisId: "40000000-0000-0000-0000-000000000001" }), f.deps)).json();
  assert(data.status === "indeterminate" && data.reasonCode === "READINGS_DISAGREE");
  assert(data.analysisId === "40000000-0000-0000-0000-000000000001");
  assert(f.calls.some(call => call.name === "claim_matching_legacy_review_refresh"));
  assert(!f.calls.some(call => call.name === "claim_matching_trajectory"));
  assert(f.requests.length === 2);
  const completion = f.calls.find(call => call.name === "complete_matching_trajectory_audited");
  assert(completion?.params.p_lease === "legacy-lease");
  assert((completion?.params.p_reading_pair as unknown[]).length === 2);
});

Deno.test("legacy refresh does not pay for a second request when unclaimed, malformed or unauthorized", async () => {
  const f = fixture(); f.setLegacyClaim({ acquired: false, status: "unavailable", reason_code: "REVIEW_NOT_READY" });
  const body = { ...ids, operation: "review_refresh", analysisId: "40000000-0000-0000-0000-000000000001" };
  const unavailable = await (await handleMatchingTrajectory(f.request(body), f.deps)).json();
  assert(unavailable.status === "unavailable" && unavailable.reasonCode === "REVIEW_NOT_READY" && f.requests.length === 0);
  const malformed = await handleMatchingTrajectory(f.request({ ...body, extra: true }), f.deps);
  assert(malformed.status === 400 && f.requests.length === 0);
  const denied = fixture(); denied.setAuthorized(false);
  const forbidden = await handleMatchingTrajectory(denied.request(body), denied.deps);
  assert(forbidden.status === 403 && denied.requests.length === 0 && denied.serviceCreated() === 0);
});
