import "server-only";

import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";
import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

export type RetentionPolicy = {
  dataCategory: string;
  purposeCode: string;
  retentionDays: number | null;
  graceDays: number;
  disposition: "Delete" | "Anonymize" | "Archive" | "Review";
  policyVersion: number;
  status: string;
  legalBasis: string | null;
  effectiveAtUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type RetentionDeletionPreview = {
  pendingCount: number;
  eligibleCount: number;
  heldCount: number;
  destructiveActionPerformed: false;
  freshness: { status: "fresh" | "stale"; asOfUtc: string };
};

export type RetentionHold = {
  id: string;
  accountId: string;
  dataCategory: string | null;
  purposeCode: string | null;
  reasonCode: string;
  status: string;
  expiresAtUtc: string | null;
  createdByAccountId: string;
  createdAtUtc: string;
  releasedByAccountId: string | null;
  releasedAtUtc: string | null;
};

export type RetentionWorkspaceData = {
  policies: RetentionPolicy[];
  preview: RetentionDeletionPreview;
  holds: RetentionHold[];
};

export type RetentionReadResult =
  | { kind: "ok"; data: RetentionWorkspaceData }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "unavailable"; correlationId?: string };

export type RetentionMutationResult =
  | { kind: "ok"; replayed: boolean }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid"; message?: string }
  | { kind: "conflict"; message?: string }
  | { kind: "unavailable"; correlationId?: string; message?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[a-z][a-z0-9._-]{2,79}$/;

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nonNegativeInteger(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : null;
}

function nullableInteger(value: unknown): number | null | undefined {
  if (value === null) return null;
  const parsed = nonNegativeInteger(value);
  return parsed === null ? undefined : parsed;
}

function iso(value: unknown): string | null {
  const candidate = text(value);
  return candidate && !Number.isNaN(Date.parse(candidate)) ? candidate : null;
}

function parsePolicy(value: unknown): RetentionPolicy | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const dataCategory = text(row.data_category ?? row.dataCategory);
  const purposeCode = text(row.purpose_code ?? row.purposeCode);
  const retentionDays = nullableInteger(row.retention_days ?? row.retentionDays);
  const graceDays = nonNegativeInteger(row.grace_days ?? row.graceDays);
  const disposition = text(row.disposition);
  const policyVersion = nonNegativeInteger(row.policy_version ?? row.policyVersion);
  const status = text(row.status);
  const legalBasisValue = row.legal_basis ?? row.legalBasis;
  const legalBasis = legalBasisValue === null ? null : text(legalBasisValue);
  const effectiveValue = row.effective_at_utc ?? row.effectiveAtUtc;
  const effectiveAtUtc = effectiveValue === null ? null : iso(effectiveValue);
  const createdAtUtc = iso(row.created_at_utc ?? row.createdAtUtc);
  const updatedAtUtc = iso(row.updated_at_utc ?? row.updatedAtUtc);
  if (
    !dataCategory ||
    !KEY.test(dataCategory) ||
    !purposeCode ||
    !KEY.test(purposeCode) ||
    retentionDays === undefined ||
    graceDays === null ||
    !disposition ||
    !["Delete", "Anonymize", "Archive", "Review"].includes(disposition) ||
    policyVersion === null ||
    policyVersion < 1 ||
    !status ||
    !createdAtUtc ||
    !updatedAtUtc ||
    (effectiveValue !== null && effectiveAtUtc === null)
  )
    return null;
  return {
    dataCategory,
    purposeCode,
    retentionDays,
    graceDays,
    disposition: disposition as RetentionPolicy["disposition"],
    policyVersion,
    status,
    legalBasis,
    effectiveAtUtc,
    createdAtUtc,
    updatedAtUtc,
  };
}

function parseFreshness(value: unknown): RetentionDeletionPreview["freshness"] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const status = row.status;
  const asOfUtc = iso(row.asOfUtc);
  return (status === "fresh" || status === "stale") && asOfUtc ? { status, asOfUtc } : null;
}

function parsePreview(value: unknown): RetentionDeletionPreview | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const pendingCount = nonNegativeInteger(row.pendingCount);
  const eligibleCount = nonNegativeInteger(row.eligibleCount);
  const heldCount = nonNegativeInteger(row.heldCount);
  const freshness = parseFreshness(row.freshness);
  if (
    pendingCount === null ||
    eligibleCount === null ||
    heldCount === null ||
    row.destructiveActionPerformed !== false ||
    !freshness
  )
    return null;
  return { pendingCount, eligibleCount, heldCount, destructiveActionPerformed: false, freshness };
}

function parseHold(value: unknown): RetentionHold | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const id = text(row.id);
  const accountId = text(row.account_id ?? row.accountId);
  const dataCategoryValue = row.data_category ?? row.dataCategory;
  const purposeCodeValue = row.purpose_code ?? row.purposeCode;
  const reasonCode = text(row.reason_code ?? row.reasonCode);
  const status = text(row.status);
  const expiresValue = row.expires_at_utc ?? row.expiresAtUtc;
  const createdByAccountId = text(row.created_by_account_id ?? row.createdByAccountId);
  const createdAtUtc = iso(row.created_at_utc ?? row.createdAtUtc);
  const releasedByValue = row.released_by_account_id ?? row.releasedByAccountId;
  const releasedAtValue = row.released_at_utc ?? row.releasedAtUtc;
  if (
    !id ||
    !UUID.test(id) ||
    !accountId ||
    !UUID.test(accountId) ||
    !reasonCode ||
    !KEY.test(reasonCode) ||
    !status ||
    !createdByAccountId ||
    !UUID.test(createdByAccountId) ||
    !createdAtUtc
  )
    return null;
  const dataCategory = dataCategoryValue === null ? null : text(dataCategoryValue);
  const purposeCode = purposeCodeValue === null ? null : text(purposeCodeValue);
  const expiresAtUtc = expiresValue === null ? null : iso(expiresValue);
  const releasedByAccountId = releasedByValue === null ? null : text(releasedByValue);
  const releasedAtUtc = releasedAtValue === null ? null : iso(releasedAtValue);
  if (
    (dataCategory && !KEY.test(dataCategory)) ||
    (purposeCode && !KEY.test(purposeCode)) ||
    (expiresValue !== null && expiresAtUtc === null) ||
    (releasedByAccountId && !UUID.test(releasedByAccountId)) ||
    (releasedAtValue !== null && releasedAtUtc === null)
  )
    return null;
  return {
    id,
    accountId,
    dataCategory,
    purposeCode,
    reasonCode,
    status,
    expiresAtUtc,
    createdByAccountId,
    createdAtUtc,
    releasedByAccountId,
    releasedAtUtc,
  };
}

async function authenticatedFetch(path: string, init: RequestInit): Promise<Response | null> {
  const token = await getServerAdminAccessToken();
  if (!token) return null;
  const config = getPublicRuntimeConfig();
  return fetch(`${config.adminApiUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
}

async function readJson(
  path: string,
): Promise<{ kind: "ok"; value: unknown } | Exclude<RetentionReadResult, { kind: "ok" }>> {
  try {
    const response = await authenticatedFetch(path, { method: "GET" });
    if (!response || response.status === 401) return { kind: "unauthenticated" };
    if (response.status === 403) return { kind: "forbidden" };
    if (!response.ok)
      return {
        kind: "unavailable",
        correlationId: response.headers.get("x-correlation-id") ?? undefined,
      };
    return { kind: "ok", value: await response.json().catch(() => null) };
  } catch {
    return { kind: "unavailable" };
  }
}

export async function getRetentionWorkspace(): Promise<RetentionReadResult> {
  const [policiesResult, previewResult, holdsResult] = await Promise.all([
    readJson("/api/v1/security/retention/policies"),
    readJson("/api/v1/security/retention/deletion-preview"),
    readJson("/api/v1/security/retention/holds"),
  ]);
  const blocked = [policiesResult, previewResult, holdsResult].find((item) => item.kind !== "ok");
  if (blocked && blocked.kind !== "ok") return blocked;
  if (policiesResult.kind !== "ok" || previewResult.kind !== "ok" || holdsResult.kind !== "ok")
    return { kind: "unavailable" };
  const policiesPayload = policiesResult.value as Record<string, unknown> | null;
  const holdsPayload = holdsResult.value as Record<string, unknown> | null;
  if (
    !policiesPayload ||
    !Array.isArray(policiesPayload.items) ||
    !holdsPayload ||
    !Array.isArray(holdsPayload.items)
  )
    return { kind: "unavailable" };
  const policies = policiesPayload.items.map(parsePolicy);
  const holds = holdsPayload.items.map(parseHold);
  const preview = parsePreview(previewResult.value);
  if (policies.some((item) => item === null) || holds.some((item) => item === null) || !preview)
    return { kind: "unavailable" };
  return {
    kind: "ok",
    data: { policies: policies as RetentionPolicy[], holds: holds as RetentionHold[], preview },
  };
}

function messageFrom(value: unknown): string | undefined {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).message === "string"
    ? String((value as Record<string, unknown>).message)
    : undefined;
}

async function mutate(
  path: string,
  body: Record<string, unknown>,
  idempotencyKey: string,
): Promise<RetentionMutationResult> {
  try {
    const response = await authenticatedFetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(body),
    });
    if (!response || response.status === 401) return { kind: "unauthenticated" };
    if (response.status === 403) return { kind: "forbidden" };
    const payload = await response.json().catch(() => null);
    const message = messageFrom(payload);
    if (response.status === 400) return { kind: "invalid", message };
    if (response.status === 409) return { kind: "conflict", message };
    if (!response.ok)
      return {
        kind: "unavailable",
        correlationId: response.headers.get("x-correlation-id") ?? undefined,
        message,
      };
    const replayed =
      !!payload &&
      typeof payload === "object" &&
      !Array.isArray(payload) &&
      (payload as Record<string, unknown>).replayed === true;
    return { kind: "ok", replayed };
  } catch {
    return { kind: "unavailable" };
  }
}

export function activateRetentionPolicy(input: {
  dataCategory: string;
  purposeCode: string;
  retentionDays: number | null;
  graceDays: number;
  disposition: RetentionPolicy["disposition"];
  legalBasis: string | null;
  reason: string;
  idempotencyKey: string;
}) {
  return mutate(
    "/api/v1/security/retention/policies",
    {
      dataCategory: input.dataCategory,
      purposeCode: input.purposeCode,
      retentionDays: input.retentionDays,
      graceDays: input.graceDays,
      disposition: input.disposition,
      legalBasis: input.legalBasis,
      reason: input.reason,
    },
    input.idempotencyKey,
  );
}

export function createRetentionHold(input: {
  accountId: string;
  dataCategory: string | null;
  purposeCode: string | null;
  reasonCode: string;
  reason: string;
  expiresAtUtc: string | null;
  idempotencyKey: string;
}) {
  return mutate(
    "/api/v1/security/retention/holds",
    {
      accountId: input.accountId,
      dataCategory: input.dataCategory,
      purposeCode: input.purposeCode,
      reasonCode: input.reasonCode,
      reason: input.reason,
      expiresAtUtc: input.expiresAtUtc,
    },
    input.idempotencyKey,
  );
}

export function releaseRetentionHold(input: {
  holdId: string;
  reason: string;
  idempotencyKey: string;
}) {
  return mutate(
    `/api/v1/security/retention/holds/${encodeURIComponent(input.holdId)}/release`,
    { reason: input.reason },
    input.idempotencyKey,
  );
}
