import { createServer, request as httpRequest } from "node:http";
import { Readable } from "node:stream";
import { chmod, unlink } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

export const TRANSPORT_VERSION = "paddle-hosted-transport-1.0.0";
export const PARSER_TRANSPORT_VERSION = "parser-ia-hosted-transport-1.0.0";
export const MAX_BODY_BYTES = 21 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROUTES = new Map([
  ["/document-intelligence/layout-parsing", { target: "http://127.0.0.1:18080/layout-parsing", kind: "structure" }],
  ["/document-intelligence-vl/layout-parsing", { target: "http://127.0.0.1:18081/layout-parsing", kind: "recovery" }],
  ["/parser-ia-hosted/parse", { target: "http://127.0.0.1:18787/parse", kind: "parser" }],
]);
const FORWARDED_PARSER_ERRORS = new Set([
  "PARSER_BUSY", "PARSER_KEY_MISSING", "PARSER_KEY_REJECTED", "PARSER_CREDIT_BALANCE_EXHAUSTED",
  "PARSER_SPEND_LIMIT_EXCEEDED", "PARSER_RATE_LIMIT", "PARSER_PROVIDER_FAILED", "PARSER_INCOMPLETE_RESPONSE",
  "PARSER_REFUSED", "PARSER_RESPONSE_INVALID", "PARSER_RESPONSE_LIMIT", "PARSER_USAGE_INVALID", "PARSER_NO_SUPPORTED_FACTS", "PARSER_TIMEOUT",
]);

class HttpFailure extends Error {
  constructor(status, code) { super(code); this.status = status; }
}

export function createAuthorizer({ supabaseUrl, publishableKey, fetchImpl = fetch }) {
  const url = new URL(supabaseUrl);
  if (url.protocol !== "https:" || url.hostname !== "ioldpnqqvobprjiontre.supabase.co" || !publishableKey) {
    throw new Error("Expected configured Prisma-QA backend and publishable key");
  }
  return async (authorization, organizationId) => {
    const headers = { apikey: publishableKey, Authorization: authorization };
    async function get(path) {
      const response = await fetchImpl(new URL(path, url), { headers, redirect: "error", signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new HttpFailure(response.status === 401 ? 401 : 403, "access_denied");
      return response.json();
    }
    const user = await get("/auth/v1/user");
    if (!UUID.test(user?.id ?? "") || user.is_anonymous === true) throw new HttpFailure(401, "invalid_session");
    const operators = await get(`/rest/v1/platform_users?auth_user_id=eq.${user.id}&select=status,access_profile&limit=2`);
    if (!Array.isArray(operators) || operators.length !== 1 || operators[0].status !== "active") throw new HttpFailure(403, "operator_inactive");
    const role = operators[0].access_profile;
    if (!["super_admin", "owner", "admin", "recruiter"].includes(role)) throw new HttpFailure(403, "role_denied");
    // RLS and the live operator/membership rows, never client claims, are authoritative.
    const organizations = await get(`/rest/v1/organizations?id=eq.${organizationId}&select=id&limit=2`);
    if (!Array.isArray(organizations) || organizations.length !== 1 || organizations[0].id !== organizationId) throw new HttpFailure(403, "organization_denied");
    if (role !== "super_admin") {
      const memberships = await get(`/rest/v1/organization_memberships?user_id=eq.${user.id}&organization_id=eq.${organizationId}&select=role&limit=2`);
      if (!Array.isArray(memberships) || memberships.length !== 1 || !["owner", "admin", "recruiter"].includes(memberships[0].role)) throw new HttpFailure(403, "membership_denied");
    }
  };
}

export function validatePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new HttpFailure(400, "invalid_payload");
  const fields = ["file", "fileType", "useDocOrientationClassify", "useDocUnwarping", "useTextlineOrientation", "useTableRecognition", "useFormulaRecognition", "useChartRecognition", "returnMarkdownImages", "visualize"];
  if (Object.keys(payload).some((key) => !fields.includes(key)) || fields.some((key) => !Object.hasOwn(payload, key))) throw new HttpFailure(400, "invalid_fields");
  if (![0, 1].includes(payload.fileType) || typeof payload.file !== "string" || payload.file.length === 0 || payload.file.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload.file)) throw new HttpFailure(400, "invalid_file");
  if (fields.slice(2).some((key) => typeof payload[key] !== "boolean") || payload.useFormulaRecognition || payload.useChartRecognition || payload.returnMarkdownImages || payload.visualize || !payload.useTableRecognition) throw new HttpFailure(400, "invalid_options");
  const bytes = Buffer.from(payload.file, "base64");
  if (bytes.length > 15 * 1024 * 1024) throw new HttpFailure(413, "file_too_large");
  const pdf = bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (payload.fileType === 0 ? !pdf : !(png || jpeg)) throw new HttpFailure(400, "invalid_signature");
}

export function validateParserPayload(payload, organizationId) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)
    || Object.keys(payload).sort().join() !== "organizationId,pdfBase64,sourceSha256"
    || payload.organizationId !== organizationId
    || typeof payload.pdfBase64 !== "string" || payload.pdfBase64.length === 0 || payload.pdfBase64.length % 4 !== 0
    || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload.pdfBase64)
    || !/^[a-f0-9]{64}$/.test(payload.sourceSha256 ?? "")) throw new HttpFailure(400, "invalid_payload");
  const bytes = Buffer.from(payload.pdfBase64, "base64");
  if (bytes.length > 15 * 1024 * 1024) throw new HttpFailure(413, "file_too_large");
  if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-" || !bytes.subarray(-2048).includes(Buffer.from("%%EOF"))) throw new HttpFailure(400, "invalid_signature");
  if (createHash("sha256").update(bytes).digest("hex") !== payload.sourceSha256) throw new HttpFailure(400, "source_mismatch");
}

async function readBody(request, maximum = MAX_BODY_BYTES) {
  if (Number(request.headers["content-length"]) > maximum) throw new HttpFailure(413, "body_too_large");
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > maximum) throw new HttpFailure(413, "body_too_large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readWorkerBody(response, maximum) {
  const chunks = [];
  let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > maximum) throw new HttpFailure(502, "worker_response_too_large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function requestLoopbackWorker(target, { method, headers, body, signal }) {
  const url = new URL(target);
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || url.username || url.password) return Promise.reject(new Error("invalid_worker_target"));
  // Native HTTP preserves the explicit loopback Host across the reverse tunnel.
  // Node fetch can replace it with the tunnel port, which the worker must reject.
  return new Promise((resolve, reject) => {
    const request = httpRequest(url, { method, headers, signal, agent: false }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400) {
        response.destroy(); reject(new Error("worker_redirect_denied")); return;
      }
      const responseHeaders = new Headers();
      for (const [name, value] of Object.entries(response.headers)) {
        if (value !== undefined) for (const item of Array.isArray(value) ? value : [value]) responseHeaders.append(name, item);
      }
      resolve(new Response([204, 304].includes(response.statusCode) ? null : Readable.toWeb(response), { status: response.statusCode, headers: responseHeaders }));
    });
    request.on("error", reject);
    request.end(body);
  });
}

export function createGateway({ authorize, fetchImpl = requestLoopbackWorker, origin = "https://prisma.hrtsolutions.com.br", timeoutMs = 295000, log = (entry) => console.log(JSON.stringify(entry)) }) {
  // Keep local Paddle inference serialized across both routes. Its uncertain
  // cancellation must not hold capacity for the separate Parser IA service.
  const busyUntilByWorker = new Map();
  let activeRequests = 0;
  return createServer({ requestTimeout: 30000, headersTimeout: 10000, maxHeaderSize: 16384 }, async (request, response) => {
    const started = Date.now();
    let status = 500;
    let ownsWorker = false;
    let holdWorker = false;
    const route = ROUTES.get(request.url);
    const worker = route?.kind === "parser" ? "parser" : "paddle";
    const controller = new AbortController();
    let timer;
    const reply = (code, payload) => {
      status = code;
      response.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
      response.end(JSON.stringify(payload));
    };
    const onClose = () => { if (!response.writableEnded) controller.abort(); };
    response.on("close", onClose);
    // Also bound concurrent authorization requests and slow uploads before allocating document memory.
    activeRequests += 1;
    try {
      if (activeRequests > 8) throw new HttpFailure(429, "gateway_busy");
      if (!route) throw new HttpFailure(404, "route_not_found");
      if (request.method !== "POST") throw new HttpFailure(405, "method_not_allowed");
      if (request.headers.origin !== origin) throw new HttpFailure(403, "origin_denied");
      const expectedContract = route.kind === "parser" ? request.headers["x-prisma-parser-contract"] : request.headers["x-prisma-document-contract"];
      if (expectedContract !== (route.kind === "parser" ? PARSER_TRANSPORT_VERSION : TRANSPORT_VERSION)) throw new HttpFailure(400, "contract_required");
      if (!/^application\/json(?:\s*;.*)?$/i.test(request.headers["content-type"] ?? "") || request.headers["content-encoding"]) throw new HttpFailure(415, "content_type_denied");
      const authorization = request.headers.authorization;
      const organizationId = request.headers["x-prisma-organization-id"];
      if (typeof authorization !== "string" || !/^Bearer [A-Za-z0-9._~-]+$/.test(authorization)) throw new HttpFailure(401, "session_required");
      if (typeof organizationId !== "string" || !UUID.test(organizationId)) throw new HttpFailure(403, "organization_required");
      await authorize(authorization, organizationId);
      if (controller.signal.aborted) throw new HttpFailure(499, "client_disconnected");
      if (Date.now() < (busyUntilByWorker.get(worker) ?? 0)) throw new HttpFailure(429, "worker_busy");
      busyUntilByWorker.set(worker, Number.POSITIVE_INFINITY);
      ownsWorker = true;
      const body = await readBody(request);
      let payload;
      try { payload = JSON.parse(body); } catch { throw new HttpFailure(400, "invalid_json"); }
      if (route.kind === "parser") validateParserPayload(payload, organizationId);
      else validatePayload(payload);
      if (controller.signal.aborted) throw new HttpFailure(499, "client_disconnected");
      timer = setTimeout(() => controller.abort(), timeoutMs);
      // Do not retry non-idempotent inference; credentials never reach Paddle.
      let upstream;
      try {
        const upstreamHeaders = route.kind === "parser"
          ? { "Content-Type": "application/json", Host: "127.0.0.1:8787", Origin: "http://127.0.0.1:5555", "X-Prisma-Local-Parser": "1" }
          : { "Content-Type": "application/json" };
        upstream = await fetchImpl(route.target, { method: "POST", headers: upstreamHeaders, body, signal: controller.signal, redirect: "error" });
      } catch {
        holdWorker = true; // Disconnect cannot prove that Paddle cancelled its CPU work.
        throw new HttpFailure(controller.signal.aborted ? 504 : 502, "worker_unavailable");
      }
      if (!upstream.ok) {
        if (route.kind === "parser" && upstream.status === 422 && upstream.headers.get("content-type")?.includes("application/json")) {
          const rawError = await readWorkerBody(upstream, 4096);
          let parserError;
          try { parserError = JSON.parse(rawError)?.error; } catch { /* Sanitized below. */ }
          if (FORWARDED_PARSER_ERRORS.has(parserError)) { reply(422, { error: parserError }); return; }
        }
        throw new HttpFailure(502, "worker_failed");
      }
      if (!upstream.headers.get("content-type")?.includes("application/json")) throw new HttpFailure(502, "worker_invalid_response");
      const result = await readWorkerBody(upstream, 64 * 1024 * 1024).catch((error) => { controller.abort(); throw error; });
      try { JSON.parse(result); } catch { throw new HttpFailure(502, "worker_invalid_json"); }
      status = 200;
      response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
      response.end(result);
    } catch (error) {
      if (error instanceof HttpFailure) reply(error.status, { error: error.message });
      else reply(503, { error: "gateway_unavailable" });
    } finally {
      clearTimeout(timer);
      response.off("close", onClose);
      if (ownsWorker) busyUntilByWorker.set(worker, holdWorker ? Date.now() + timeoutMs : 0);
      activeRequests -= 1;
      log({ event: "document_transport", route: route?.kind ?? "unknown", status, durationMs: Date.now() - started });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const socket = "/run/paddle-gateway/gateway.sock";
  const authorize = createAuthorizer({ supabaseUrl: process.env.SUPABASE_URL, publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY });
  // Only this service owns this exact disposable socket, not its parent volume.
  await unlink(socket).catch((error) => { if (error.code !== "ENOENT") throw error; });
  const server = createGateway({ authorize });
  server.listen(socket, async () => { await chmod(socket, 0o666); console.log("Paddle gateway ready on Unix socket"); });
}
