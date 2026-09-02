import type { ProcessingVersions } from "./types.js";

export const CURRENT_VERSIONS: ProcessingVersions = Object.freeze({
  extractionVersion: "extraction-rules-2.0.0",
  inferenceVersion: "inference-ontology-1.0.0",
  embeddingVersion: "structured-lexical-1.0.0",
  matchingVersion: "matching-explainable-1.0.0",
  promptVersion: "no-llm-prompt-1.0.0",
  modelVersion: "deterministic-local-2.0.0",
});
