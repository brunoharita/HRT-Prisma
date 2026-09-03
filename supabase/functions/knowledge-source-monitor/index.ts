import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import {
  assessDetectedRelease,
  cboArtifactsMatchManifest,
  DetectionError,
  KNOWLEDGE_SOURCE_MONITOR_VERSION,
  parseCboReleasePage,
  parseEscoReleasePage,
  parseOnetReleaseArchive,
  parseOnetReleasePage,
  type DetectedSourceRelease,
  type KnowledgeSourceMonitorStatus,
} from "../../../src/knowledge/sourceMonitoring.ts";

type MonitorTrigger = "scheduled" | "retry" | "manual";
type SourceName = "CBO" | "ESCO" | "O*NET";

interface SourceRow {
  id: string;
  name: SourceName;
  monitor_strategy: "cbo_downloads" | "esco_release_page" | "onet_database_page";
  monitor_url: string;
  monitor_status: string;
  next_check_at: string | null;
}

interface VersionRow {
  source_id: string;
  external_version: string;
  is_current: boolean;
  manifest: unknown;
}

interface DetectionResult extends DetectedSourceRelease {
  fingerprint: string | null;
  artifacts: Record<string, unknown>;
  contentMatchesPublished: boolean;
}

const cboFiles = {
  family: "https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo/servicos/downloads/cbo2002-familia.csv",
  occupation: "https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo/servicos/downloads/cbo2002-ocupacao.csv",
  synonym: "https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo/servicos/downloads/cbo2002-sinonimo.csv",
} as const;

Deno.serve(async (request) => {
  if (request.method !== "POST") return jsonResponse(405, { error: "METHOD_NOT_ALLOWED" });
  const startedAt = new Date();
  try {
    const payload = await parsePayload(request);
    const serviceClient = createServiceClient();
    const secret = request.headers.get("x-prisma-monitor-secret") ?? "";
    const { data: authorized, error: authorizationError } = await serviceClient
      .rpc("authorize_knowledge_source_monitor", { p_secret: secret });
    if (authorizationError || authorized !== true) return jsonResponse(401, { error: "UNAUTHORIZED_MONITOR_INVOCATION" });

    const { data: sourceData, error: sourceError } = await serviceClient
      .from("knowledge_sources")
      .select("id,name,monitor_strategy,monitor_url,monitor_status,next_check_at")
      .eq("monitoring_enabled", true)
      .in("name", ["CBO", "ESCO", "O*NET"]);
    if (sourceError) throw new Error("SOURCE_REGISTRY_UNAVAILABLE");
    const sources = (sourceData ?? []) as SourceRow[];
    const dueSources = selectDueSources(sources, payload.trigger, payload.sourceId, startedAt);
    if (dueSources.length === 0) return jsonResponse(200, { checked: 0, failed: 0, results: [] });

    const { data: versionData, error: versionError } = await serviceClient
      .from("knowledge_source_versions")
      .select("source_id,external_version,is_current,manifest")
      .in("source_id", dueSources.map((source) => source.id));
    if (versionError) throw new Error("SOURCE_VERSIONS_UNAVAILABLE");
    const versions = (versionData ?? []) as VersionRow[];

    const results = [];
    for (const source of dueSources) {
      const sourceVersions = versions.filter((version) => version.source_id === source.id);
      const trigger = resolveTrigger(source, payload.trigger);
      const slot = source.next_check_at ?? startedAt.toISOString().slice(0, 13);
      const idempotencyKey = await sha256(`${source.id}|${trigger}|${slot}|${KNOWLEDGE_SOURCE_MONITOR_VERSION}`);
      const sourceStartedAt = new Date();
      try {
        const detection = await detectSource(source, sourceVersions);
        const published = sourceVersions.find((version) => version.is_current)?.external_version ?? null;
        const status = detection.contentMatchesPublished
          ? "current"
          : assessDetectedRelease({
              detectedVersion: detection.externalVersion,
              publishedVersion: published,
              knownVersions: sourceVersions.map((version) => version.external_version),
            });
        await recordCheck(serviceClient, {
          source, trigger, status, detection, errorCode: null, idempotencyKey,
          startedAt: sourceStartedAt, completedAt: new Date(),
        });
        results.push({ source: source.name, status, version: detection.externalVersion });
      } catch (error) {
        const errorCode = safeErrorCode(error);
        const status: KnowledgeSourceMonitorStatus = error instanceof DetectionError ? "validation_failed" : "temporary_failure";
        await recordCheck(serviceClient, {
          source, trigger, status, detection: null, errorCode, idempotencyKey,
          startedAt: sourceStartedAt, completedAt: new Date(),
        });
        results.push({ source: source.name, status, errorCode });
      }
    }

    return jsonResponse(200, {
      checked: results.length,
      failed: results.filter((result) => result.status === "temporary_failure" || result.status === "validation_failed").length,
      results,
    });
  } catch (error) {
    return jsonResponse(500, { error: safeErrorCode(error) });
  }
});

async function detectSource(source: SourceRow, versions: VersionRow[]): Promise<DetectionResult> {
  if (source.monitor_strategy === "cbo_downloads") {
    const [html, ...downloads] = await Promise.all([
      fetchText(source.monitor_url),
      ...Object.values(cboFiles).map((url) => fetchBytes(url)),
    ]);
    const release = parseCboReleasePage(html);
    const keys = Object.keys(cboFiles) as Array<keyof typeof cboFiles>;
    const hashes = Object.fromEntries(await Promise.all(downloads.map(async (bytes, index) => [keys[index]!, await sha256(bytes)])));
    const currentManifest = versions.find((version) => version.is_current)?.manifest;
    return {
      ...release,
      fingerprint: await sha256(keys.map((key) => `${key}:${hashes[key]}`).join("\n")),
      artifacts: { fileHashes: hashes, officialFiles: cboFiles },
      contentMatchesPublished: cboArtifactsMatchManifest(hashes, currentManifest),
    };
  }

  const html = await fetchText(source.monitor_url);
  let release: DetectedSourceRelease;
  if (source.monitor_strategy === "esco_release_page") {
    release = parseEscoReleasePage(html);
  } else {
    const detected = parseOnetReleasePage(html);
    const archive = await fetchText("https://www.onetcenter.org/db_releases.html");
    release = { ...detected, releaseDate: parseOnetReleaseArchive(archive, detected.externalVersion) };
  }
  return {
    ...release,
    fingerprint: await sha256(`${source.name}|${release.externalVersion}|${release.releaseDate ?? "unknown"}`),
    artifacts: { releasePage: source.monitor_url },
    contentMatchesPublished: false,
  };
}

function selectDueSources(sources: SourceRow[], trigger: "due" | "manual", sourceId: string | null, now: Date): SourceRow[] {
  if (trigger === "manual") return sourceId ? sources.filter((source) => source.id === sourceId) : sources;
  return sources.filter((source) => source.next_check_at !== null && new Date(source.next_check_at).getTime() <= now.getTime());
}

function resolveTrigger(source: SourceRow, requested: "due" | "manual"): MonitorTrigger {
  if (requested === "manual") return "manual";
  return source.monitor_status === "temporary_failure" || source.monitor_status === "validation_failed" ? "retry" : "scheduled";
}

async function recordCheck(
  serviceClient: ReturnType<typeof createServiceClient>,
  input: {
    source: SourceRow;
    trigger: MonitorTrigger;
    status: KnowledgeSourceMonitorStatus;
    detection: DetectionResult | null;
    errorCode: string | null;
    idempotencyKey: string;
    startedAt: Date;
    completedAt: Date;
  },
) {
  const { error } = await serviceClient.rpc("record_knowledge_source_check", {
    p_source_id: input.source.id,
    p_trigger: input.trigger,
    p_status: input.status,
    p_detected_version: input.detection?.externalVersion ?? null,
    p_detected_release_date: input.detection?.releaseDate ?? null,
    p_detected_fingerprint: input.detection?.fingerprint ?? null,
    p_artifacts: input.detection?.artifacts ?? {},
    p_error_code: input.errorCode,
    p_monitor_version: KNOWLEDGE_SOURCE_MONITOR_VERSION,
    p_idempotency_key: input.idempotencyKey,
    p_started_at: input.startedAt.toISOString(),
    p_completed_at: input.completedAt.toISOString(),
  });
  if (error) throw new Error("MONITOR_RESULT_PERSISTENCE_FAILED");
}

async function fetchText(url: string): Promise<string> {
  const response = await monitoredFetch(url);
  return await response.text();
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await monitoredFetch(url);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length < 32 || new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 100)).toLowerCase().includes("<html")) {
    throw new DetectionError("SOURCE_ARTIFACT_INVALID");
  }
  return bytes;
}

async function monitoredFetch(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Prisma-Knowledge-Monitor/1.0 (+https://github.com/brunoharita/HRT-Prisma)" },
    });
    if (!response.ok) throw new Error(`SOURCE_HTTP_${response.status}`);
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function sha256(value: string | Uint8Array): Promise<string> {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

async function parsePayload(request: Request): Promise<{ trigger: "due" | "manual"; sourceId: string | null }> {
  let payload: unknown;
  try { payload = await request.json(); } catch { throw new DetectionError("INVALID_REQUEST_BODY"); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new DetectionError("INVALID_REQUEST_BODY");
  const record = payload as Record<string, unknown>;
  const trigger = record.trigger === "manual" ? "manual" : record.trigger === "due" ? "due" : null;
  if (!trigger) throw new DetectionError("INVALID_TRIGGER");
  const sourceId = typeof record.sourceId === "string" && /^[0-9a-f-]{36}$/i.test(record.sourceId) ? record.sourceId : null;
  return { trigger, sourceId };
}

function createServiceClient() {
  const url = readRequiredEnv("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) throw new Error("MISSING_SERVICE_CONFIGURATION");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function readRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error("MISSING_SERVICE_CONFIGURATION");
  return value;
}

function safeErrorCode(error: unknown): string {
  const raw = error instanceof DetectionError ? error.code : error instanceof Error ? error.message : "UNEXPECTED_MONITOR_FAILURE";
  return raw.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "UNEXPECTED_MONITOR_FAILURE";
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
