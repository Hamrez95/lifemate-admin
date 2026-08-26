import "server-only";

import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";
import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

export type BreakGlassCapability = "health.read.elevated" | "women_health.read.elevated";
export type BreakGlassStatus = "Pending" | "Approved" | "Denied" | "Expired" | "Revoked";
export type BreakGlassAction = "approve" | "deny" | "revoke";

export type BreakGlassItem = {
  requestId: string;
  requesterAccountId: string;
  subjectPersonId: string;
  capability: BreakGlassCapability;
  reason: string;
  status: BreakGlassStatus;
  ttlMinutes: number;
  requestedAtUtc: string;
  reviewedByAccountId: string | null;
  reviewedAtUtc: string | null;
  expiresAtUtc: string | null;
  revokedAtUtc: string | null;
  reviewReason: string | null;
  version: number;
};

export type BreakGlassListResult =
  | { kind: "ok"; items: BreakGlassItem[]; asOfUtc: string }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "unavailable"; correlationId?: string };

export type BreakGlassMutationResult =
  | { kind: "ok"; requestId: string; status: BreakGlassStatus; version: number; replayed: boolean }
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; message?: string }
  | { kind: "invalid"; message?: string; correlationId?: string }
  | { kind: "conflict"; message?: string; correlationId?: string }
  | { kind: "unavailable"; correlationId?: string };

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isCapability(value: unknown): value is BreakGlassCapability {
  return value === "health.read.elevated" || value === "women_health.read.elevated";
}

function isStatus(value: unknown): value is BreakGlassStatus {
  return value === "Pending" || value === "Approved" || value === "Denied" || value === "Expired" || value === "Revoked";
}

function parseItem(value: unknown): BreakGlassItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (
    !isUuid(row.requestId) ||
    !isUuid(row.requesterAccountId) ||
    !isUuid(row.subjectPersonId) ||
    !isCapability(row.capability) ||
    !isStatus(row.status) ||
    typeof row.reason !== "string" ||
    !Number.isInteger(row.ttlMinutes) ||
    Number(row.ttlMinutes) < 5 ||
    typeof row.requestedAtUtc !== "string" ||
    !Number.isInteger(row.version) ||
    Number(row.version) < 1
  ) return null;
  for (const key of ["reviewedByAccountId", "reviewedAtUtc", "expiresAtUtc", "revokedAtUtc", "reviewReason"] as const) {
    if (row[key] !== null && typeof row[key] !== "string") return null;
  }
  return row as unknown as BreakGlassItem;
}

async function problem(response: Response): Promise<{ message?: string; correlationId?: string }> {
  try {
    const body = (await response.json()) as Record<string, unknown>;
    return {
      message: typeof body.detail === "string" ? body.detail : typeof body.message === "string" ? body.message : undefined,
      correlationId: typeof body.correlationId === "string" ? body.correlationId : undefined,
    };
  } catch {
    return {};
  }
}

async function call(path: string, init?: RequestInit): Promise<Response | null> {
  const token = await getServerAdminAccessToken();
  if (!token) return null;
  const config = getPublicRuntimeConfig();
  try {
    return await fetch(`${config.adminApiUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return new Response(null, { status: 599 });
  }
}

export async function getBreakGlassRequests(): Promise<BreakGlassListResult> {
  const response = await call("/api/v1/security/break-glass/requests");
  if (!response) return { kind: "unauthenticated" };
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (!response.ok) {
    const details = await problem(response);
    return { kind: "unavailable", correlationId: details.correlationId };
  }
  const body = (await response.json()) as Record<string, unknown>;
  const freshness = body.freshness as Record<string, unknown> | undefined;
  if (!Array.isArray(body.items) || typeof freshness?.asOfUtc !== "string") return { kind: "unavailable" };
  const items = body.items.map(parseItem);
  if (items.some((item) => item === null)) return { kind: "unavailable" };
  return { kind: "ok", items: items as BreakGlassItem[], asOfUtc: freshness.asOfUtc };
}

async function mutation(path: string, payload: Record<string, unknown>, idempotencyKey: string): Promise<BreakGlassMutationResult> {
  const response = await call(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(payload),
  });
  if (!response) return { kind: "unauthenticated" };
  if (response.status === 401) return { kind: "unauthenticated" };
  const details = response.ok ? {} : await problem(response);
  if (response.status === 403) return { kind: "forbidden", message: details.message };
  if (response.status === 409) return { kind: "conflict", ...details };
  if (response.status === 400 || response.status === 404 || response.status === 422) return { kind: "invalid", ...details };
  if (!response.ok) return { kind: "unavailable", correlationId: details.correlationId };
  const body = (await response.json()) as Record<string, unknown>;
  if (!isUuid(body.requestId) || !isStatus(body.status) || !Number.isInteger(body.version) || typeof body.replayed !== "boolean") {
    return { kind: "unavailable" };
  }
  return { kind: "ok", requestId: body.requestId, status: body.status, version: Number(body.version), replayed: body.replayed };
}

export function createBreakGlassRequest(input: {
  subjectPersonId: string;
  capability: BreakGlassCapability;
  ttlMinutes: number;
  reason: string;
  idempotencyKey: string;
}) {
  return mutation(
    "/api/v1/security/break-glass/requests",
    { subjectPersonId: input.subjectPersonId, capability: input.capability, ttlMinutes: input.ttlMinutes, reason: input.reason },
    input.idempotencyKey,
  );
}

export function mutateBreakGlassRequest(input: {
  requestId: string;
  action: BreakGlassAction;
  expectedVersion: number;
  reason: string;
  idempotencyKey: string;
}) {
  return mutation(
    `/api/v1/security/break-glass/requests/${input.requestId}/actions/${input.action}`,
    { expectedVersion: input.expectedVersion, reason: input.reason },
    input.idempotencyKey,
  );
}
