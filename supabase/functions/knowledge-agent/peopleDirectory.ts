import type { SupabaseClient } from "npm:@supabase/supabase-js@2.112.3";
import { withAiHistory } from "../../../src/infrastructure/aiHistory.ts";
import { directoryInstructions, directorySchema, PEOPLE_DIRECTORY_METHOD, readDirectoryAnswer, safeDirectoryInput } from "../../../src/knowledge/peopleDirectory.ts";

export async function processPeopleDirectory(client: SupabaseClient) {
  const { data: job, error } = await client.rpc("claim_people_directory");
  if (error) throw Error("DIRECTORY_CLAIM_FAILED");
  if (!job) return { processed: 0 };
  let errorCode: string | null = null;
  let answer = { areaIds: [] as string[], functionId: null as string | null };
  const missing = (job.exact.areas.length === 0 && job.candidates.some((c: {kind:string}) => c.kind === "area"))
    || (!job.exact.function && job.candidates.some((c: {kind:string}) => c.kind === "function"));
  try {
    if (missing) {
      const key = Deno.env.get("OPENAI_API_KEY");
      if (!job.externalEnabled || Deno.env.get("KNOWLEDGE_AGENT_ENABLED") !== "true" || !key || Deno.env.get("KNOWLEDGE_RESEARCH_MODEL") !== job.model) errorCode = "AI_DISABLED";
      else if (!safeDirectoryInput(job.input) || job.candidates.some((c: {label:string;description?:string;aliases?:string[]}) => !safeDirectoryInput({role:c.label,context:c.description ?? "",areas:c.aliases ?? []}))) errorCode = "INPUT_LIMIT";
      else {
        const { data: allowed, error: budgetError } = await client.rpc("reserve_people_directory_call", {
          p_run_id: job.id, p_lease: job.lease,
          p_daily_cap: Number(Deno.env.get("COMPETENCY_NORMALIZATION_DAILY_CAP") ?? 0),
          p_monthly_cap: Number(Deno.env.get("COMPETENCY_NORMALIZATION_MONTHLY_CAP") ?? 0),
        });
        if (budgetError || !allowed) errorCode = "BUDGET_LIMITED";
        else await withAiHistory(client, { organizationId: job.organizationId, functionName: "people_directory", operationId: job.lease,
          sourceVersion: PEOPLE_DIRECTORY_METHOD, inputFingerprint: job.fingerprint }, async fetcher => {
          const response = await fetcher("https://api.openai.com/v1/responses", {
            method: "POST", signal: AbortSignal.timeout(90_000),
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: job.model, store: false, max_output_tokens: 600, instructions: directoryInstructions,
              input: JSON.stringify({ experience: job.input, candidates: job.candidates }),
              text: { format: { type: "json_schema", name: "people_directory", strict: true, schema: directorySchema } } }),
          });
          if (!response.ok) throw Error("PROVIDER_UNAVAILABLE");
          const body = await response.json();
          const output = body.output_text ?? body.output?.flatMap((m: {content?: Array<{type:string;text?:string}>}) => m.content ?? [])
            .filter((c: {type:string}) => c.type === "output_text").map((c: {text:string}) => c.text).join("");
          try { answer = readDirectoryAnswer(JSON.parse(output), job.candidates); } catch { throw Error("RESPONSE_INVALID"); }
        });
      }
    }
  } catch (caught) { errorCode = caught instanceof Error && caught.message === "RESPONSE_INVALID" ? "RESPONSE_INVALID" : "PROVIDER_UNAVAILABLE"; }
  const completed = await client.rpc("complete_people_directory", { p_run_id: job.id, p_lease: job.lease, p_answer: answer, p_error: errorCode });
  if (completed.error) throw Error("DIRECTORY_COMPLETION_FAILED");
  return { processed: 1, status: errorCode ? "failed" : "complete", errorCode };
}
