import type { SupabaseClient } from "npm:@supabase/supabase-js@2.112.3";
import {
  canSendCompetencyTerm, competencyNormalizationInstructions, competencyNormalizationSchema,
  deterministicCompetencies, prepareCompetencyInputs, readNormalizedCompetencies,
} from "../../../src/knowledge/competencyNormalization.ts";

type Client = SupabaseClient;
export async function processCompetencyNormalization(client: Client) {
  const { data: job, error: claimError } = await client.rpc("claim_profile_competency_normalization");
  if (claimError) throw new Error("COMPETENCY_CLAIM_FAILED");
  if (!job) return { processed: 0 };
  const terms: string[] = job.terms;
  const human = new Set<string>(job.humanTerms);
  const validTerms = terms.every((term) => typeof term === "string");
  const inputs = validTerms ? prepareCompetencyInputs(terms) : [];
  let items = deterministicCompetencies(inputs);
  let errorCode: string | null = null;
  let model: string | null = null;
  let usage: { input_tokens?: number; output_tokens?: number } = {};
  try {
    // Only individual competence strings leave the backend. Never identity, CV, job title or evidence.
    const aiInputs = inputs.filter((input) => !human.has(input.originalTerm) && canSendCompetencyTerm(input.sourceText));
    if (inputs.length > 200 || !validTerms || inputs.some((input) => input.sourceText.length > 240)) { errorCode = "INPUT_LIMIT"; items = []; }
    else if (aiInputs.length && job.externalEnabled) {
      model = Deno.env.get("KNOWLEDGE_RESEARCH_MODEL") ?? null;
      const key = Deno.env.get("OPENAI_API_KEY");
      if (Deno.env.get("KNOWLEDGE_AGENT_ENABLED") !== "true" || !model || !key) errorCode = "AI_DISABLED";
      else {
        const { data: reserved, error: budgetError } = await client.rpc("reserve_competency_normalization_call", {
          p_run_id: job.id, p_lease: job.lease,
          p_daily_cap: Number(Deno.env.get("KNOWLEDGE_RESEARCH_DAILY_CAP") ?? 0),
          p_monthly_cap: Number(Deno.env.get("KNOWLEDGE_RESEARCH_MONTHLY_CAP") ?? 0),
        });
        if (budgetError) throw new Error("BUDGET_UNAVAILABLE");
        if (!reserved) errorCode = "BUDGET_LIMITED";
        else {
          const response = await fetch("https://api.openai.com/v1/responses", {
            method: "POST", signal: AbortSignal.timeout(90_000),
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model, store: false, max_output_tokens: 14000,
              instructions: competencyNormalizationInstructions,
              input: JSON.stringify(aiInputs.map((input, inputIndex) => ({ inputIndex, term: input.sourceText }))),
              text: { format: { type: "json_schema", name: "competency_normalization", strict: true, schema: competencyNormalizationSchema } },
            }),
          });
          if (!response.ok) errorCode = "PROVIDER_UNAVAILABLE";
          else {
            const provider = await response.json();
            usage = provider.usage ?? {};
            const text = provider.output_text ?? provider.output?.flatMap((message: { content?: Array<{ type: string; text?: string }> }) => message.content ?? [])
              .filter((content: { type: string }) => content.type === "output_text").map((content: { text: string }) => content.text).join("");
            try {
              const normalized = readNormalizedCompetencies(JSON.parse(text), aiInputs);
              const selected = new Set(aiInputs.map((input) => `${input.originalIndex}:${input.sourceText}`));
              items = [...items.filter((item) => !selected.has(`${item.originalIndex}:${item.sourceText}`)), ...normalized];
            } catch { errorCode = "RESPONSE_INVALID"; }
          }
        }
      }
    }
  } catch { errorCode = "PROVIDER_UNAVAILABLE"; }
  const { error: completionError } = await client.rpc("complete_profile_competency_normalization", {
    p_run_id: job.id, p_lease: job.lease, p_items: items, p_error: errorCode, p_model: model,
    p_input_tokens: usage.input_tokens ?? null, p_output_tokens: usage.output_tokens ?? null,
  });
  if (completionError) throw new Error("COMPETENCY_COMPLETION_FAILED");
  // No terms, identifiers, provider body or personal information in response/logs.
  return { processed: 1, status: errorCode ? "failed" : "complete", errorCode };
}
