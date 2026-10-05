import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { PROFILE_SYNTHESIS_INSTRUCTIONS, PROFILE_SYNTHESIS_SCHEMA, readProfileSynthesisResult, readSynthesisSource } from "../dist/src/domain/profileSynthesis.js";

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
    text: { format: { type: "json_schema", name: "prisma_profile_synthesis", strict: true, schema: PROFILE_SYNTHESIS_SCHEMA } }, reasoning: { effort: "low" }, max_output_tokens: 6000 };
}
export async function generateSynthesis(sources, config, fetcher = fetch) {
  const response = await fetcher("https://api.openai.com/v1/responses", { method: "POST",
    headers: { Authorization: `Bearer ${config.openaiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(providerRequest(sources, config.model)), signal: AbortSignal.timeout(90000) });
  if (!response.ok) throw Error(response.status === 429 ? "RATE_LIMITED" : response.status >= 500 ? "PROVIDER_UNAVAILABLE" : "CONFIGURATION_UNAVAILABLE");
  const reader = response.body?.getReader(); if (!reader) throw Error("RESPONSE_INVALID");
  let size = 0; const chunks = [];
  try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 512000) { await reader.cancel(); throw Error("RESPONSE_INVALID"); } chunks.push(Buffer.from(value)); } }
  finally { reader.releaseLock(); }
  const raw = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (raw.status !== "completed" || raw.model !== config.model || !Number.isInteger(raw.usage?.input_tokens) || raw.usage.input_tokens < 0 || raw.usage.input_tokens > 50000 || !Number.isInteger(raw.usage?.output_tokens) || raw.usage.output_tokens < 0 || raw.usage.output_tokens > 6000) throw Error("RESPONSE_INVALID");
  const messages = (raw.output ?? []).filter(x => x.type === "message").flatMap(x => x.content ?? []);
  if (messages.some(x => x.type === "refusal") || messages.filter(x => x.type === "output_text").length !== 1) throw Error("RESPONSE_INVALID");
  try { return { result: readProfileSynthesisResult(JSON.parse(messages.filter(x => x.type === "output_text").map(x => x.text).join("")), sources), model: raw.model,
    inputTokens: raw.usage?.input_tokens ?? 0, outputTokens: raw.usage?.output_tokens ?? 0 }; }
  catch { throw Error("RESPONSE_INVALID"); }
}
export async function rpc(config, name, args, fetcher = fetch) {
  const response = await fetcher(`${config.supabaseUrl}/rest/v1/rpc/${name}`, { method: "POST", headers: { apikey: config.publishableKey, "Content-Type": "application/json" }, body: JSON.stringify({ p_secret: config.workerSecret, ...args }), signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw Error("QUEUE_UNAVAILABLE");
  return response.status === 204 ? null : response.json();
}
export async function runOnce(config, fetcher = fetch) {
  const job = await rpc(config, "claim_profile_synthesis", {}, fetcher);
  if (!job) return { state: "idle" };
  const started = Date.now(); let output; let error = null;
  try { output = await generateSynthesis(job.sources, { ...config, model: job.model }, fetcher); }
  catch (cause) { const code = cause?.message; error = ["INPUT_TOO_LARGE", "RATE_LIMITED", "PROVIDER_UNAVAILABLE", "CONFIGURATION_UNAVAILABLE", "RESPONSE_INVALID"].includes(code) ? code : "REQUEST_INTERRUPTED"; }
  await rpc(config, "complete_profile_synthesis", { p_job_id: job.id, p_lease: job.lease, p_result: output?.result ?? null, p_model: output?.model ?? job.model,
    p_input_tokens: output?.inputTokens ?? 0, p_output_tokens: output?.outputTokens ?? 0, p_duration_ms: Date.now() - started, p_error: error }, fetcher);
  return { state: error ? "failed" : "complete", error, durationMs: Date.now() - started, inputTokens: output?.inputTokens ?? 0, outputTokens: output?.outputTokens ?? 0 };
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
  const config = { supabaseUrl: env.SUPABASE_URL, publishableKey: env.SUPABASE_ANON_KEY, workerSecret: env.SYNTHESIS_WORKER_SECRET, openaiKey: env.OPENAI_API_KEY, model: "gpt-5.6-luna" };
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(config.supabaseUrl ?? "") || !config.publishableKey || (config.workerSecret?.length ?? 0) < 40 || !config.openaiKey) throw Error("CONFIGURATION_UNAVAILABLE");
  return config;
}
async function main() {
  const config = await loadConfig();
  let stopping = false; process.on("SIGTERM", () => { stopping = true; }); process.on("SIGINT", () => { stopping = true; });
  while (!stopping) {
    try {
      const state = await runOnce(config);
      await writeFile("/tmp/profile-synthesis-health.json", JSON.stringify({ at: Date.now(), state: state.state }));
      if (state.state !== "idle") console.log(JSON.stringify(state));
    } catch { console.error('{"state":"queue_unavailable"}'); }
    if (process.argv.includes("--once")) break;
    for (let i = 0; i < 10 && !stopping; i++) await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(() => { console.error('{"state":"configuration_unavailable"}'); process.exitCode = 1; });
