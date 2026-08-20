import type { ExtractionDraft } from "../domain/types.js";

export interface ExtractionRequest {
  sourceText: string;
  filename: string;
  mediaType: string;
}

export interface ProviderUsage {
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostUsd: number;
}

export interface ExtractionResponse {
  draft: ExtractionDraft;
  usage: ProviderUsage;
}

export interface ExtractionProvider {
  readonly name: string;
  readonly model: string;
  extract(request: ExtractionRequest): Promise<ExtractionResponse>;
}

export class ProviderFailure extends Error {
  public constructor(
    message: string,
    public readonly category:
      | "provider_failure"
      | "invalid_provider_response"
      | "schema_incompatible"
      | "timeout",
  ) {
    super(message);
    this.name = "ProviderFailure";
  }
}
