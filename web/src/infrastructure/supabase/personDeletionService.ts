import {
  PERSON_DELETION_REQUEST_VERSION,
  normalizePersonDeletionImpact,
  type PersonDeletionPreview,
  type PersonSelfServiceLink,
  type PersonSelfServicePreview,
} from "../../domain/personDeletion";
import { supabaseFunctionOperationError } from "../../domain/reviewOperationErrors";
import { supabase } from "./client";

export const personDeletionService = {
  async preview(organizationId: string, personId: string): Promise<PersonDeletionPreview> {
    const data = await invoke("preview", { organizationId, personId });
    return {
      personId: String(data.person_id ?? personId),
      personName: String(data.person_name ?? "Pessoa"),
      preflightFingerprint: String(data.preflight_fingerprint ?? ""),
      impactSummary: normalizePersonDeletionImpact(data.impact_summary),
    };
  },

  async delete(organizationId: string, personId: string, preflightFingerprint: string): Promise<void> {
    const storageKey = `prisma.delete-person.${organizationId}.${personId}`;
    await invoke("delete", {
      organizationId,
      personId,
      preflightFingerprint,
      idempotencyKey: stableSessionKey(storageKey, "delete-person"),
    });
    window.sessionStorage.removeItem(storageKey);
  },

  async issueSelfServiceLink(
    organizationId: string,
    personId: string,
    contactKind: "email" | "phone",
  ): Promise<PersonSelfServiceLink> {
    const storageKey = `prisma.person-self-access.${organizationId}.${personId}.${contactKind}`;
    const data = await invoke("issue_self_access", {
      organizationId,
      personId,
      contactKind,
      validMinutes: 30,
      idempotencyKey: stableSessionKey(storageKey, "person-self-access"),
    });
    window.sessionStorage.removeItem(storageKey);
    return {
      relativePath: String(data.relativePath ?? data.relative_path ?? ""),
      expiresAt: String(data.expires_at ?? ""),
      reused: Boolean(data.reused),
    };
  },

  async inspectSelf(token: string): Promise<PersonSelfServicePreview> {
    const data = await invoke("inspect_self", {}, token);
    return {
      personName: String(data.personName ?? "Pessoa"),
      preflightFingerprint: String(data.preflightFingerprint ?? ""),
      impactSummary: normalizePersonDeletionImpact(data.impactSummary),
      expiresAt: String(data.expiresAt ?? ""),
    };
  },

  async deleteSelf(token: string, preflightFingerprint: string, idempotencyKey: string): Promise<void> {
    await invoke("delete_self", { preflightFingerprint, idempotencyKey }, token);
  },
};

async function invoke(action: string, payload: Record<string, unknown>, token?: string): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke("person-data-deletion", {
    body: {
      action,
      payload,
      schemaVersion: PERSON_DELETION_REQUEST_VERSION,
      ...(token ? { token } : {}),
    },
  });
  if (error) throw await supabaseFunctionOperationError(error, "Não foi possível concluir esta operação.");
  return isRecord(data) ? data : {};
}

function stableSessionKey(storageKey: string, scope: string): string {
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const created = `${scope}:${crypto.randomUUID()}`;
  window.sessionStorage.setItem(storageKey, created);
  return created;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
