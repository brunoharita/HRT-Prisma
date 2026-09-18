import { processCompetencyNormalization } from "./competencyNormalization.ts";

function assert(value: unknown, message: string) { if (!value) throw new Error(message); }
const originalFetch = globalThis.fetch;
Deno.test("M73 worker: scoped input, grounded result, no CV, exactly one call and usage metadata", async () => {
  Deno.env.set("KNOWLEDGE_AGENT_ENABLED", "true"); Deno.env.set("KNOWLEDGE_RESEARCH_MODEL", "fixture-model");
  Deno.env.set("OPENAI_API_KEY", "fixture-not-a-secret"); Deno.env.set("KNOWLEDGE_RESEARCH_DAILY_CAP", "10"); Deno.env.set("KNOWLEDGE_RESEARCH_MONTHLY_CAP", "100");
  const calls: Array<{ name: string; args: any }> = [];
  const client = { rpc(name: string, args: any) {
    calls.push({ name, args });
    return Promise.resolve({ error: null, data: name === "claim_profile_competency_normalization"
      ? { id: "run", lease: "lease", organizationId: "org", terms: ["Excel e Word", "negociação", "person@example.com"], humanTerms: [], externalEnabled: true }
      : name === "reserve_competency_normalization_call" ? true : null });
  } };
  let requests = 0;
  globalThis.fetch = async (_url, init) => {
    requests++; const body = JSON.parse(String(init?.body));
    assert(body.store === false && !body.tools, "provider must not store or call tools");
    assert(!body.input.includes("person@example.com") && !body.input.includes("organizationId"), "no PII/identity payload");
    const entries = JSON.parse(body.input);
    const items = entries.map((entry: any) => ({ inputIndex: entry.inputIndex, sourceText: entry.term,
      normalizedTerm: entry.term === "negociação" ? "Negociação" : `Microsoft ${entry.term}`,
      searchTerms: [entry.term === "negociação" ? "Negotiation" : `Microsoft ${entry.term}`], ambiguous: false }));
    return new Response(JSON.stringify({ output: [{ content: [{ type: "output_text", text: JSON.stringify({ items }) }] }], usage: { input_tokens: 10, output_tokens: 20 } }));
  };
  try {
    const result = await processCompetencyNormalization(client as never);
    assert(result.status === "complete" && requests === 1, "one bounded complete run");
    const saved = calls.find((call) => call.name === "complete_profile_competency_normalization")?.args;
    assert(saved.p_items.length === 4 && saved.p_items.filter((item: any) => item.originalTerm === "Excel e Word").length === 2, "source preserved through split");
    assert(saved.p_input_tokens === 10 && saved.p_output_tokens === 20 && saved.p_model === "fixture-model", "usage audit");
  } finally { globalThis.fetch = originalFetch; }
});
Deno.test("M73 worker: malformed/omitted AI output preserves every deterministic declaration and records failure", async () => {
  let saved: any;
  const client = { rpc(name: string, args: any) {
    if (name === "complete_profile_competency_normalization") saved = args;
    return Promise.resolve({ error: null, data: name === "claim_profile_competency_normalization"
      ? { id: "run", lease: "lease", terms: ["Excel e Word", "gestão de projetos e programas"], humanTerms: [], externalEnabled: true } : true });
  } };
  globalThis.fetch = async () => new Response(JSON.stringify({ output_text: '{"items":[]}' }));
  try {
    const result = await processCompetencyNormalization(client as never);
    assert(result.status === "failed" && saved.p_error === "RESPONSE_INVALID", "incomplete is failure, not empty success");
    assert(saved.p_items.length === 3 && saved.p_items[0].originalTerm === "Excel e Word", "safe fallback keeps all terms");
  } finally { globalThis.fetch = originalFetch; }
});
Deno.test("M73 worker: external opt-out and existing human decisions never call provider", async () => {
  for (const humanTerms of [[], ["Java"]]) {
    let saved: any;
    const client = { rpc(name: string, args: any) { if (name === "complete_profile_competency_normalization") saved = args;
      return Promise.resolve({ error: null, data: name === "claim_profile_competency_normalization"
        ? { id: "run", lease: "lease", terms: ["Java"], humanTerms, externalEnabled: humanTerms.length > 0 } : null }); } };
    globalThis.fetch = async () => { throw new Error("provider must not be called"); };
    try { const result = await processCompetencyNormalization(client as never); assert(result.status === "complete" && saved.p_items.length === 1, "deterministic only"); }
    finally { globalThis.fetch = originalFetch; }
  }
});
