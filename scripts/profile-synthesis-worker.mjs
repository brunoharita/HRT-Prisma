import {drainAssessmentEmails} from "./position-assessment-email-worker.mjs";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { createWorkerHistory, withAiHistory } from "./ai-history-client.mjs";
import { PROFILE_SYNTHESIS_INSTRUCTIONS, profileSynthesisSchemaForSources, preserveProfileSynthesisSections, readSynthesisSource, SynthesisFailure, synthesisDiagnostic } from "../dist/src/domain/profileSynthesis.js";

export function minimizeSources(sources) {
  return sources.map(readSynthesisSource).map(({ id, text, nature }) => ({ id, nature, text: text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[contato omitido]")
    .replace(/(?:\+?55[\s-]*)?\(?\d{2}\)?[\s-]*\d{4,5}[\s-]?\d{4}\b/g, "[telefone omitido]")
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "[identificador omitido]") }));
}
export function providerRequest(sources, model) {
  const minimal = minimizeSources(sources);
  if (Buffer.byteLength(JSON.stringify(minimal)) > 48000 || sources.length > 240) throw Error("INPUT_TOO_LARGE");
  return { model, store: false, instructions: PROFILE_SYNTHESIS_INSTRUCTIONS,
    input: [{ role: "user", content: [{ type: "input_text", text: JSON.stringify({ sources: minimal }) }] }],
    text: { format: { type: "json_schema", name: "prisma_profile_synthesis", strict: true, schema: profileSynthesisSchemaForSources(minimal) } }, reasoning: { effort: "low" }, max_output_tokens: 6000 };
}
export async function generateSynthesis(sources, config, fetcher = fetch) {
  let input;
  try { input = providerRequest(sources, config.model); }
  catch (cause) { throw new SynthesisFailure(synthesisDiagnostic("input", cause?.message === "INPUT_TOO_LARGE" ? "INPUT_TOO_LARGE" : "SOURCE_INVALID")); }
  let response;
  try { response = await fetcher("https://api.openai.com/v1/responses", { method: "POST",
    headers: { Authorization: `Bearer ${config.openaiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(input), signal: AbortSignal.timeout(90000) }); }
  catch { throw new SynthesisFailure(synthesisDiagnostic("provider", "REQUEST_INTERRUPTED")); }
  if (!response.ok) throw new SynthesisFailure(synthesisDiagnostic("provider", response.status === 429 ? "RATE_LIMITED" : response.status >= 500 ? "PROVIDER_UNAVAILABLE" : "CONFIGURATION_UNAVAILABLE", { httpStatus: response.status }));
  const reject = (reason, inputTokens = 0, outputTokens = 0) => { throw new SynthesisFailure(synthesisDiagnostic("response", reason), inputTokens, outputTokens); };
  const reader = response.body?.getReader(); if (!reader) reject("BODY_MISSING");
  let size = 0; const chunks = [];
  try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 512000) { await reader.cancel(); reject("BODY_TOO_LARGE"); } chunks.push(Buffer.from(value)); } }
  catch (cause) { if (cause instanceof SynthesisFailure) throw cause; reject("REQUEST_INTERRUPTED"); }
  finally { reader.releaseLock(); }
  let raw;
  try { raw = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { reject("JSON_INVALID"); }
  if (!raw || typeof raw !== "object") reject("STRUCTURE_INVALID");
  const tokens = [raw.usage?.input_tokens, raw.usage?.output_tokens];
  if (!tokens.every((n,i) => Number.isInteger(n) && n >= 0 && n <= (i === 0 ? 50000 : 6000))) reject("USAGE_INVALID");
  const [inputTokens, outputTokens] = tokens;
  if (raw.status !== "completed") reject("OUTPUT_INCOMPLETE", inputTokens, outputTokens);
  if (raw.model !== config.model) reject("MODEL_MISMATCH", inputTokens, outputTokens);
  if (!Array.isArray(raw.output) || raw.output.some(x => !x || typeof x !== "object" || x.type === "message" && !Array.isArray(x.content))) reject("STRUCTURE_INVALID", inputTokens, outputTokens);
  const messages = raw.output.filter(x => x.type === "message").flatMap(x => x.content);
  if (messages.some(x => x?.type === "refusal")) reject("REFUSAL", inputTokens, outputTokens);
  const output = messages.filter(x => x?.type === "output_text");
  if (output.length !== 1 || typeof output[0].text !== "string") reject("OUTPUT_MISSING", inputTokens, outputTokens);
  let result;
  try { result = JSON.parse(output[0].text); } catch { reject("JSON_INVALID", inputTokens, outputTokens); }
  try { return { result: preserveProfileSynthesisSections(result, sources), model: raw.model, inputTokens, outputTokens }; }
  catch (cause) { throw new SynthesisFailure(cause instanceof SynthesisFailure ? cause.diagnostic : synthesisDiagnostic("contract", "STRUCTURE_INVALID"), inputTokens, outputTokens); }
}
export async function rpc(config, name, args, fetcher = fetch) {
  try {
    const response = await fetcher(`${config.supabaseUrl}/rest/v1/rpc/${name}`, { method: "POST", headers: { apikey: config.publishableKey, "Content-Type": "application/json" }, body: JSON.stringify({ p_secret: config.workerSecret, ...args }), signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new SynthesisFailure(synthesisDiagnostic("persistence", response.status === 409 ? "LEASE_INVALID" : "DATABASE_UNAVAILABLE", { httpStatus: response.status }));
    return response.status === 204 ? null : await response.json();
  } catch (cause) { if (cause instanceof SynthesisFailure) throw cause; throw new SynthesisFailure(synthesisDiagnostic("persistence", "DATABASE_UNAVAILABLE")); }
}
export async function runOnce(config, fetcher = fetch) {
  const job = await rpc(config, "claim_profile_synthesis", {}, fetcher);
  if (!job) return { state: "idle" };
  const started = Date.now(); let output; let error = null; let diagnostic = null; let inputTokens = 0; let outputTokens = 0;
  try {
    output = config.historySecret
      ? await withAiHistory(createWorkerHistory({ ...config, fetcher }), {organizationId:job.organizationId,functionName:"profile_synthesis",operationId:job.lease,sourceVersion:"profile-synthesis-2.0.0",inputFingerprint:job.basisHash}, tracked => generateSynthesis(job.sources,{...config,model:job.model},tracked),fetcher)
      : await generateSynthesis(job.sources, { ...config, model: job.model }, fetcher);
  }
  catch (cause) {
    diagnostic = cause instanceof SynthesisFailure ? cause.diagnostic : synthesisDiagnostic("provider", "REQUEST_INTERRUPTED");
    inputTokens = cause instanceof SynthesisFailure ? cause.inputTokens : 0; outputTokens = cause instanceof SynthesisFailure ? cause.outputTokens : 0;
    error = ["INPUT_TOO_LARGE", "RATE_LIMITED", "PROVIDER_UNAVAILABLE", "CONFIGURATION_UNAVAILABLE", "REQUEST_INTERRUPTED"].includes(diagnostic.reason) ? diagnostic.reason : "RESPONSE_INVALID";
  }
  inputTokens = output?.inputTokens ?? inputTokens; outputTokens = output?.outputTokens ?? outputTokens;
  let completion;
  try { completion = await rpc(config, "complete_profile_synthesis", { p_job_id: job.id, p_lease: job.lease, p_result: output?.result ?? null, p_model: output?.model ?? job.model,
    p_input_tokens: inputTokens, p_output_tokens: outputTokens, p_duration_ms: Date.now() - started, p_error: error, p_diagnostic: diagnostic }, fetcher); }
  catch (cause) {
    if (cause instanceof SynthesisFailure) Object.assign(cause, { jobId: /^[a-f0-9-]{36}$/i.test(job.id) ? job.id : null, durationMs: Date.now() - started, inputTokens, outputTokens });
    throw cause;
  }
  return { state: completion?.state ?? (error ? "failed" : "complete"), jobId: job.id, error: completion?.errorCode ?? error, diagnostic: completion?.diagnostic ?? diagnostic, durationMs: Date.now() - started, inputTokens, outputTokens };
}
async function readEnvironmentFile(path) {
  const result = {};
  for (const line of (await readFile(path, "utf8")).split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/); if (match) result[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  } return result;
}
export async function loadConfig() {
  const env = { ...(process.env.SYNTHESIS_CONFIG_FILE ? await readEnvironmentFile(process.env.SYNTHESIS_CONFIG_FILE) : {}), ...process.env };
  if (env.OPENAI_ENV_FILE) Object.assign(env, await readEnvironmentFile(env.OPENAI_ENV_FILE));
  const config = { supabaseUrl: env.SUPABASE_URL, publishableKey: env.SUPABASE_ANON_KEY, workerSecret: env.SYNTHESIS_WORKER_SECRET, openaiKey: env.OPENAI_API_KEY, model: "gpt-5.6-luna", dispatcherSecret:env.ASSESSMENT_DISPATCHER_SECRET, historySecret: env.AI_HISTORY_WORKER_SECRET };
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(config.supabaseUrl ?? "") || !config.publishableKey || (config.workerSecret?.length ?? 0) < 40 || !config.openaiKey || (config.historySecret?.length??0)<40) throw Error("CONFIGURATION_UNAVAILABLE");
  return config;
}
async function main() {
  const config = await loadConfig();
  let stopping = false; process.on("SIGTERM", () => { stopping = true; }); process.on("SIGINT", () => { stopping = true; });
  while (!stopping) {
    try {
      try {await drainAssessmentEmails(config);} catch {console.error(JSON.stringify({event:"assessment_outbox_unavailable"}));}
      const state = await runOnce(config);
      await writeFile("/tmp/profile-synthesis-health.json", JSON.stringify({ at: Date.now(), state: state.state }));
      if (state.state !== "idle") console.log(JSON.stringify(state));
    } catch (cause) { console.error(JSON.stringify({ state: "queue_unavailable", diagnostic: cause instanceof SynthesisFailure ? cause.diagnostic : synthesisDiagnostic("persistence", "DATABASE_UNAVAILABLE"), ...(cause instanceof SynthesisFailure && cause.jobId ? { jobId: cause.jobId, durationMs: cause.durationMs, inputTokens: cause.inputTokens, outputTokens: cause.outputTokens } : {}) })); }
    if (process.argv.includes("--once")) break;
    for (let i = 0; i < 10 && !stopping; i++) await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(() => { console.error('{"state":"configuration_unavailable"}'); process.exitCode = 1; });
