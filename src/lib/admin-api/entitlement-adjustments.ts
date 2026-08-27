import "server-only";

import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";
import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

export type ManualEntitlementOperation = "Grant" | "Extend" | "Reduce" | "Revoke";
export type ManualEntitlementTarget = "Product" | "Offer";
export type ManualEntitlementSchedule = "ExactExpiry" | "AddDays" | "AddMonths" | "Immediate";

export type ManualEntitlementAdjustmentInput = {
  subjectAccountId: string;
  targetType: ManualEntitlementTarget;
  targetId: string;
  entitlementId: string | null;
  expectedEntitlementVersion: number | null;
  operation: ManualEntitlementOperation;
  scheduleMode: ManualEntitlementSchedule;
  scheduleAmount: number | null;
  exactExpiresAtUtc: string | null;
  referenceAtUtc: string;
  reason: string;
  confirmed: boolean;
  approvalRequestId: string | null;
  approvalExpectedVersion: number | null;
};

export type ManualEntitlementHistoryItem = {
  id: string;
  targetType: string;
  targetId: string;
  entitlementId: string | null;
  operation: string;
  scheduleMode: string;
  scheduleAmount: number | null;
  exactExpiresAtUtc: string | null;
  referenceAtUtc: string;
  affectedEntitlementIds: string[];
  approvalRequestId: string | null;
  abuseDecisionId: string | null;
  actorAccountId: string;
  reason: string;
  correlationId: string;
  createdAtUtc: string;
};

export type ManualEntitlementHistory = {
  subjectAccountId: string;
  items: ManualEntitlementHistoryItem[];
  limit: number;
  freshness: { status: "fresh" | "stale"; asOfUtc: string };
};

export type EntitlementAdjustmentResult =
  | { kind: "ok"; data: Record<string, unknown> }
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; message?: string }
  | { kind: "not_found"; message?: string }
  | { kind: "invalid"; code?: string; message?: string }
  | { kind: "conflict"; code?: string; message?: string }
  | { kind: "unavailable"; correlationId?: string };

export type EntitlementAdjustmentHistoryResult =
  | { kind: "ok"; data: ManualEntitlementHistory }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "not_found" }
  | { kind: "unavailable"; correlationId?: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;

async function problem(response: Response) {
  try {
    const body = (await response.json()) as Record<string, unknown>;
    return {
      code: typeof body.code === "string" ? body.code : undefined,
      message:
        typeof body.detail === "string"
          ? body.detail
          : typeof body.title === "string"
            ? body.title
            : typeof body.message === "string"
              ? body.message
              : undefined,
      correlationId: typeof body.correlationId === "string" ? body.correlationId : undefined,
    };
  } catch {
    return {};
  }
}

async function request(
  path: string,
  init: RequestInit,
): Promise<Response | null> {
  const token = await getServerAdminAccessToken();
  if (!token) return null;
  const config = getPublicRuntimeConfig();
  return fetch(`${config.adminApiUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
}

function classifyFailure(response: Response, issue: Awaited<ReturnType<typeof problem>>): EntitlementAdjustmentResult {
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden", message: issue.message };
  if (response.status === 404) return { kind: "not_found", message: issue.message };
  if (response.status === 409) return { kind: "conflict", code: issue.code, message: issue.message };
  if (response.status === 400) return { kind: "invalid", code: issue.code, message: issue.message };
  return { kind: "unavailable", correlationId: issue.correlationId };
}

async function mutate(
  path: string,
  body: ManualEntitlementAdjustmentInput,
  idempotencyKey?: string,
): Promise<EntitlementAdjustmentResult> {
  if (idempotencyKey && !IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return { kind: "invalid", message: "شناسه امن درخواست معتبر نیست." };
  }
  let response: Response | null;
  try {
    response = await request(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    return { kind: "unavailable" };
  }
  if (!response) return { kind: "unauthenticated" };
  if (!response.ok) return classifyFailure(response, await problem(response));
  try {
    const value = (await response.json()) as unknown;
    return value && typeof value === "object" && !Array.isArray(value)
      ? { kind: "ok", data: value as Record<string, unknown> }
      : { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }
}

function historyItem(value: unknown): ManualEntitlementHistoryItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || !UUID_PATTERN.test(row.id)) return null;
  if (typeof row.target_type !== "string" || typeof row.target_id !== "string") return null;
  if (!UUID_PATTERN.test(row.target_id)) return null;
  if (typeof row.operation !== "string" || typeof row.schedule_mode !== "string") return null;
  if (typeof row.reference_at_utc !== "string" || typeof row.actor_account_id !== "string") return null;
  if (!UUID_PATTERN.test(row.actor_account_id)) return null;
  if (typeof row.reason !== "string" || typeof row.correlation_id !== "string") return null;
  if (!UUID_PATTERN.test(row.correlation_id) || typeof row.created_at_utc !== "string") return null;
  const affected = Array.isArray(row.affected_entitlement_ids)
    ? row.affected_entitlement_ids.filter((item): item is string => typeof item === "string" && UUID_PATTERN.test(item))
    : [];
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    entitlementId: typeof row.entitlement_id === "string" ? row.entitlement_id : null,
    operation: row.operation,
    scheduleMode: row.schedule_mode,
    scheduleAmount: Number.isInteger(row.schedule_amount) ? Number(row.schedule_amount) : null,
    exactExpiresAtUtc: typeof row.exact_expires_at_utc === "string" ? row.exact_expires_at_utc : null,
    referenceAtUtc: row.reference_at_utc,
    affectedEntitlementIds: affected,
    approvalRequestId: typeof row.approval_request_id === "string" ? row.approval_request_id : null,
    abuseDecisionId: typeof row.abuse_decision_id === "string" ? row.abuse_decision_id : null,
    actorAccountId: row.actor_account_id,
    reason: row.reason,
    correlationId: row.correlation_id,
    createdAtUtc: row.created_at_utc,
  };
}

export function previewEntitlementAdjustment(input: ManualEntitlementAdjustmentInput) {
  return mutate("/api/v1/commerce/entitlement-adjustments/preview", input);
}

export function requestEntitlementAdjustment(
  input: ManualEntitlementAdjustmentInput,
  idempotencyKey: string,
) {
  return mutate("/api/v1/commerce/entitlement-adjustments/requests", input, idempotencyKey);
}

export function executeEntitlementAdjustment(
  input: ManualEntitlementAdjustmentInput,
  idempotencyKey: string,
) {
  return mutate("/api/v1/commerce/entitlement-adjustments/execute", input, idempotencyKey);
}

export async function getEntitlementAdjustmentHistory(
  accountId: string,
  limit = 50,
): Promise<EntitlementAdjustmentHistoryResult> {
  if (!UUID_PATTERN.test(accountId)) return { kind: "not_found" };
  const boundedLimit = Number.isInteger(limit) && limit >= 1 && limit <= 100 ? limit : 50;
  let response: Response | null;
  try {
    response = await request(
      `/api/v1/commerce/accounts/${accountId}/entitlement-adjustments?limit=${boundedLimit}`,
      { method: "GET" },
    );
  } catch {
    return { kind: "unavailable" };
  }
  if (!response) return { kind: "unauthenticated" };
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 404) return { kind: "not_found" };
  if (!response.ok) return { kind: "unavailable", correlationId: (await problem(response)).correlationId };
  try {
    const body = (await response.json()) as Record<string, unknown>;
    if (body.subjectAccountId !== accountId || !Array.isArray(body.items)) return { kind: "unavailable" };
    if (!Number.isInteger(body.limit) || !body.freshness || typeof body.freshness !== "object") return { kind: "unavailable" };
    const freshness = body.freshness as Record<string, unknown>;
    if ((freshness.status !== "fresh" && freshness.status !== "stale") || typeof freshness.asOfUtc !== "string") {
      return { kind: "unavailable" };
    }
    const items = body.items.map(historyItem);
    if (items.some((item) => item === null)) return { kind: "unavailable" };
    return {
      kind: "ok",
      data: {
        subjectAccountId: accountId,
        items: items as ManualEntitlementHistoryItem[],
        limit: Number(body.limit),
        freshness: { status: freshness.status, asOfUtc: freshness.asOfUtc },
      },
    };
  } catch {
    return { kind: "unavailable" };
  }
}
