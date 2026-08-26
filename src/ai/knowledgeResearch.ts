import type { KnowledgeProposal, SanitizedKnowledgeResearchRequest } from "../domain/knowledge.js";

export const KNOWLEDGE_RESEARCH_CONTRACT_VERSION = "knowledge-research-1.0.0";
export const KNOWLEDGE_RESEARCH_PROMPT_VERSION = "knowledge-agent-1.0.0";
export const KNOWLEDGE_SOURCE_POLICY_VERSION = "trusted-sources-1.0.0";

export interface KnowledgeResearchUsage {
  requestCount: number; inputTokens: number | null; outputTokens: number | null;
  estimatedCostUsd: number | null; durationMs: number;
}

export interface KnowledgeResearchResult {
  proposal: KnowledgeProposal; provider: string; model: string; providerResponseId: string | null;
  usage: KnowledgeResearchUsage;
}

export interface KnowledgeResearchProvider {
  readonly providerName: string;
  research(request: SanitizedKnowledgeResearchRequest): Promise<KnowledgeResearchResult>;
}

export class DisabledKnowledgeResearchProvider implements KnowledgeResearchProvider {
  readonly providerName = "disabled";
  async research(_request: SanitizedKnowledgeResearchRequest): Promise<KnowledgeResearchResult> {
    throw new Error("knowledge_agent_not_activated");
  }
}
