import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const env = await loadEnv(".env.local");
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY;
const username = process.env.PRISMA_QA_USERNAME;
const password = process.env.PRISMA_QA_PASSWORD;
const memberPassword = process.env.PRISMA_QA_MEMBER_PASSWORD ?? `${password ?? ""}M2C`;
const memberUsername = "qa.m2c.member3";
if (!url || !key || !username || !password) {
  throw new Error("VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, PRISMA_QA_USERNAME and PRISMA_QA_PASSWORD are required.");
}

const superClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
await signInWithUsername(superClient, username, password);

const { data: memberships, error: membershipError } = await superClient
  .from("organization_memberships")
  .select("organization_id, role")
  .order("created_at");
assert.ifError(membershipError);
assert.ok(memberships?.length, "The QA operator must have at least one organization.");
const organizationId = memberships[0].organization_id;

const suffix = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const { data: person, error: personError } = await superClient.from("people")
  .insert({ organization_id: organizationId, full_name: `[QA M2-C] Concorrência ${suffix}`, lifecycle: "candidate" })
  .select("id").single();
assert.ifError(personError);
assert.ok(person?.id);

const firstKey = `qa-register-same-${crypto.randomUUID()}`;
const firstRequest = registerDocument(superClient, organizationId, person.id, firstKey, "fonte-principal.txt", "a".repeat(64));
const [firstLeft, firstRight] = await Promise.all([firstRequest, registerDocument(superClient, organizationId, person.id, firstKey, "fonte-principal.txt", "a".repeat(64))]);
assert.equal(firstLeft.document_id, firstRight.document_id, "Same idempotency key must return the same document.");

const [second, third] = await Promise.all([
  registerDocument(superClient, organizationId, person.id, `qa-register-${crypto.randomUUID()}`, "fonte-secundaria.txt", "b".repeat(64)),
  registerDocument(superClient, organizationId, person.id, `qa-register-${crypto.randomUUID()}`, "fonte-terciaria.txt", "c".repeat(64)),
]);
assert.equal(new Set([firstLeft.document_version, second.document_version, third.document_version]).size, 3, "Concurrent registrations must allocate distinct versions.");

const pages = [{ page_number: 1, text_content: "Desenvolvedor Full Stack em Prisma QA 2024 - Atual React TypeScript SQL com evidência sintética controlada para validar concorrência e revisão humana.", origin: "manual_text", useful_character_count: 130, method: "qa-fixture", method_version: "m2c-connected-v1" }];
const draft = {
  summary: "Desenvolvedor Full Stack com experiência documentada na Prisma QA.",
  experiences: [{ role: "Desenvolvedor Full Stack", organization: "Prisma QA", period: "2024 - Atual", evidenceText: pages[0].text_content, page: 1 }],
  education: [], certifications: [], languages: ["Português"], competencies: ["React", "TypeScript", "SQL"],
  uncertainties: [], notIdentified: ["formação acadêmica"],
};
const extractionKey = `qa-extraction-same-${crypto.randomUUID()}`;
const [extractionLeft, extractionRight] = await Promise.all([
  persistExtraction(superClient, organizationId, person.id, firstLeft.document_id, pages, draft, extractionKey, null),
  persistExtraction(superClient, organizationId, person.id, firstLeft.document_id, pages, draft, extractionKey, null),
]);
assert.equal(extractionLeft.processing_attempt_id, extractionRight.processing_attempt_id, "Repeated extraction must reuse the same attempt.");

const { data: failureRows, error: failureError } = await superClient.rpc("record_document_failure", {
  p_organization_id: organizationId, p_person_id: person.id, p_document_id: second.document_id,
  p_failure_state: "failed_extraction", p_failure_code: "qa_recoverable_failure",
  p_failure_message: "Falha sintética recuperável.", p_idempotency_key: `qa-failure-${crypto.randomUUID()}`,
});
assert.ifError(failureError);
const failedAttempt = failureRows?.[0];
assert.ok(failedAttempt?.processing_attempt_id);
const retry = await persistExtraction(superClient, organizationId, person.id, second.document_id, pages, draft, `qa-retry-${crypto.randomUUID()}`, failedAttempt.processing_attempt_id);
assert.equal(retry.attempt_number, failedAttempt.attempt_number + 1, "Retry must create a linked later attempt.");

const reviewKey = `qa-review-same-${crypto.randomUUID()}`;
const [reviewLeft, reviewRight] = await Promise.all([
  startReview(superClient, organizationId, person.id, firstLeft.document_id, extractionLeft.processing_attempt_id, reviewKey),
  startReview(superClient, organizationId, person.id, firstLeft.document_id, extractionLeft.processing_attempt_id, reviewKey),
]);
assert.equal(reviewLeft.review_id, reviewRight.review_id, "Repeated review start must reuse the same review.");

const reviewed = { ...draft, summary: "Desenvolvedor Full Stack com experiência revisada e aprovada na Prisma QA." };
const { data: savedRows, error: saveError } = await superClient.rpc("save_profile_review", {
  p_organization_id: organizationId, p_review_id: reviewLeft.review_id, p_expected_lock_version: reviewLeft.lock_version,
  p_reviewed_data: reviewed, p_reason: "Correção sintética para validar rastreabilidade.", p_idempotency_key: `qa-save-${crypto.randomUUID()}`,
});
assert.ifError(saveError);
const saved = savedRows?.[0];
assert.equal(saved?.lock_version, reviewLeft.lock_version + 1);

const { error: staleError } = await superClient.rpc("save_profile_review", {
  p_organization_id: organizationId, p_review_id: reviewLeft.review_id, p_expected_lock_version: reviewLeft.lock_version,
  p_reviewed_data: reviewed, p_reason: "Tentativa concorrente obsoleta.", p_idempotency_key: `qa-stale-${crypto.randomUUID()}`,
});
assert.ok(staleError?.message.includes("review_conflict"), "A stale review save must fail with review_conflict.");

const approvalKey = `qa-approve-same-${crypto.randomUUID()}`;
const [approvedLeft, approvedRight] = await Promise.all([
  approveReview(superClient, organizationId, reviewLeft.review_id, saved.lock_version, approvalKey),
  approveReview(superClient, organizationId, reviewLeft.review_id, saved.lock_version, approvalKey),
]);
assert.equal(approvedLeft.profile_id, approvedRight.profile_id, "Repeated approval must reuse the same profile.");

const { error: directWriteError } = await superClient.from("professional_profiles").insert({
  organization_id: organizationId, person_id: person.id, source_document_id: firstLeft.document_id,
  profile_data: {}, uncertainties: [], not_identified: [], extraction_version: "forbidden",
  inference_version: "none", embedding_version: "none", prompt_version: "none", model_version: "none",
});
assert.ok(directWriteError, "Direct profile writes must remain revoked.");

const { data: auditRows, error: auditError } = await superClient.from("person_ingestion_events")
  .select("event_type, metadata").eq("organization_id", organizationId).eq("person_id", person.id);
assert.ifError(auditError);
assert.ok((auditRows ?? []).some((event) => event.event_type === "profile_review_approved"));
assert.equal(JSON.stringify(auditRows).includes(pages[0].text_content), false, "Audit metadata must not contain resume text.");

const reviewerRoles = [];
for (const profile of ["owner", "admin", "recruiter"]) {
  const reviewerUsername = `qa.m2c.${profile}`;
  const reviewerResult = await ensureUserFixture(superClient, organizationId, reviewerUsername, memberPassword, profile);
  assert.equal(reviewerResult.createdOrAvailable, true, `The ${profile} fixture is required: ${reviewerResult.reason ?? "unknown"}`);
  const reviewerClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  await signInWithUsername(reviewerClient, reviewerUsername, memberPassword);
  const { data: visibleDocument, error: reviewerReadError } = await reviewerClient.from("documents")
    .select("id").eq("organization_id", organizationId).eq("id", second.document_id).maybeSingle();
  assert.ifError(reviewerReadError);
  assert.equal(visibleDocument?.id, second.document_id, `${profile} must read in-scope raw documents.`);
  const reviewerReview = await startReview(
    reviewerClient, organizationId, person.id, second.document_id,
    retry.processing_attempt_id, `qa-${profile}-review-${crypto.randomUUID()}`,
  );
  assert.ok(reviewerReview.review_id);
  reviewerRoles.push(profile);
}

const memberResult = await ensureUserFixture(superClient, organizationId, memberUsername, memberPassword, "member");
if (memberResult.createdOrAvailable) {
  const memberClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  await signInWithUsername(memberClient, memberUsername, memberPassword);
  const { data: memberDocuments, error: memberReadError } = await memberClient.from("documents").select("id").eq("organization_id", organizationId);
  assert.ifError(memberReadError);
  assert.equal(memberDocuments?.length, 0, "Member must not read raw documents.");
  const { error: memberRpcError } = await memberClient.rpc("start_profile_review", {
    p_organization_id: organizationId, p_person_id: person.id, p_document_id: firstLeft.document_id,
    p_processing_attempt_id: extractionLeft.processing_attempt_id, p_idempotency_key: `qa-member-denied-${crypto.randomUUID()}`,
  });
  assert.ok(memberRpcError, "Member must not start a review.");
}
assert.equal(memberResult.createdOrAvailable, true, `A policy-compliant Member fixture is required for the role matrix: ${memberResult.reason ?? "unknown"}`);

process.stdout.write(JSON.stringify({
  ok: true,
  organizationId,
  personId: person.id,
  documentVersions: [firstLeft.document_version, second.document_version, third.document_version].sort((a, b) => a - b),
  idempotentDocumentId: firstLeft.document_id,
  retryAttemptNumber: retry.attempt_number,
  reviewId: reviewLeft.review_id,
  approvedProfileId: approvedLeft.profile_id,
  approvedProfileVersion: approvedLeft.profile_version,
  auditEventCount: auditRows?.length ?? 0,
  memberValidated: memberResult.createdOrAvailable,
  reviewerRoles,
}, null, 2));

async function registerDocument(client, organizationId, personId, idempotencyKey, filename, checksum) {
  const { data, error } = await client.rpc("register_person_document", {
    p_organization_id: organizationId, p_person_id: personId, p_source_type: "manual_text",
    p_filename: filename, p_declared_mime_type: "text/plain", p_validated_mime_type: "text/plain",
    p_checksum_sha256: checksum, p_byte_size: 256, p_page_count: 1,
    p_extraction_version: "m2c-connected-v1", p_idempotency_key: idempotencyKey,
  });
  assert.ifError(error); assert.ok(data?.[0]); return data[0];
}

async function persistExtraction(client, organizationId, personId, documentId, pages, draft, idempotencyKey, retryOfAttemptId) {
  const { data, error } = await client.rpc("persist_person_extraction", {
    p_organization_id: organizationId, p_person_id: personId, p_document_id: documentId,
    p_pages: pages, p_draft: draft, p_pages_native: 1, p_pages_ocr: 0,
    p_native_extraction_version: "m2c-connected-v1", p_ocr_version: null,
    p_structuring_version: "m2c-connected-v1", p_draft_version: "m2c-connected-v1",
    p_idempotency_key: idempotencyKey, p_retry_of_attempt_id: retryOfAttemptId,
  });
  assert.ifError(error); assert.ok(data?.[0]); return data[0];
}

async function startReview(client, organizationId, personId, documentId, attemptId, idempotencyKey) {
  const { data, error } = await client.rpc("start_profile_review", {
    p_organization_id: organizationId, p_person_id: personId, p_document_id: documentId,
    p_processing_attempt_id: attemptId, p_idempotency_key: idempotencyKey,
  });
  assert.ifError(error); assert.ok(data?.[0]); return data[0];
}

async function approveReview(client, organizationId, reviewId, lockVersion, idempotencyKey) {
  const { data, error } = await client.rpc("approve_profile_review", {
    p_organization_id: organizationId, p_review_id: reviewId,
    p_expected_lock_version: lockVersion, p_idempotency_key: idempotencyKey,
  });
  assert.ifError(error); assert.ok(data?.[0]); return data[0];
}

async function signInWithUsername(client, username, password) {
  const { data, error } = await client.functions.invoke("operator-sign-in", { body: { username, password } });
  assert.ifError(error); assert.ok(data?.access_token && data?.refresh_token);
  const { error: sessionError } = await client.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
  assert.ifError(sessionError);
}

async function ensureUserFixture(client, organizationId, username, password, profile) {
  const { data: organization, error: organizationError } = await client.from("organizations").select("group_id").eq("id", organizationId).single();
  assert.ifError(organizationError);
  const input = {
    fullName: `[QA M2-C] ${profile}`,
    username,
    email: `${username}@example.com`,
    status: "active",
    profile,
    groupId: organization.group_id,
    organizationIds: [organizationId],
    phoneCountryIso2: "BR",
    phoneNationalNumber: "11999990000",
    credentialMode: "manual_password",
    password,
    passwordConfirmation: password,
  };
  const { error } = await client.functions.invoke("platform-users", { body: { action: "create", input } });
  if (!error) return { createdOrAvailable: true, reason: null };
  let reason = error.message;
  try {
    const payload = await error.context?.json();
    if (typeof payload?.error === "string") reason = payload.error;
  } catch {
    // Keep the transport error when the Edge Function body is unavailable.
  }
  const { data: signInData, error: signInError } = await client.functions.invoke("operator-sign-in", { body: { username: input.username, password } });
  return { createdOrAvailable: !signInError && Boolean(signInData?.access_token), reason };
}

async function loadEnv(path) {
  const content = await readFile(path, "utf8");
  return Object.fromEntries(content.split(/\r?\n/).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => {
    const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1)];
  }));
}
