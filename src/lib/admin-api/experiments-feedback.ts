import "server-only";

import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";
import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

export type ExperimentVariant = {
  key: string;
  weightBasisPoints: number;
  controlValue: unknown;
  version: number;
};

export type ExperimentDefinition = {
  key: string;
  name: string;
  controlKey: string;
  surface: string;
  productCode: string | null;
  segmentKey: string | null;
  primaryMetricCode: string;
  guardrailMetricCodes: string[];
  status: string;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  version: number;
  variants: ExperimentVariant[];
};

export type FeedbackItem = {
  itemId: string;
  kind: string;
  status: string;
  productCode: string;
  appVersion: string | null;
  buildNumber: string | null;
  npsScore: number | null;
  message: string | null;
  advocacyOptIn: boolean;
  linkedSupportTicketId: string | null;
  linkedProductIssueRef: string | null;
  createdAtUtc: string;
  acknowledgedAtUtc: string | null;
  triagedAtUtc: string | null;
  resolvedAtUtc: string | null;
};

export type FeedbackTrend = {
  day: string;
  product_code: string;
  kind: string;
  status: string;
  item_count: number | string;
  nps_response_count: number | string;
  average_nps: number | string | null;
};

export type ProductSignalResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid"; message?: string }
  | { kind: "unavailable"; correlationId?: string };

async function adminFetch(path: string, init?: RequestInit): Promise<Response | null> {
  const token = await getServerAdminAccessToken();
  if (!token) return null;
  const { adminApiUrl } = getPublicRuntimeConfig();
  try {
    return await fetch(`${adminApiUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}

async function mapped<T>(response: Response | null): Promise<ProductSignalResult<T>> {
  if (response === null) return { kind: "unauthenticated" };
  if (response.ok) {
    try {
      return { kind: "ok", data: (await response.json()) as T };
    } catch {
      return { kind: "unavailable" };
    }
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  let body: Record<string, unknown> = {};
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    // Fail closed without surfacing provider/transport internals.
  }
  if (response.status === 400 || response.status === 404 || response.status === 409) {
    return {
      kind: "invalid",
      message: typeof body.message === "string" ? body.message : undefined,
    };
  }
  return {
    kind: "unavailable",
    correlationId: typeof body.correlationId === "string" ? body.correlationId : undefined,
  };
}

export async function listExperiments(): Promise<
  ProductSignalResult<{ items: ExperimentDefinition[]; total: number; outcomesComputed: boolean }>
> {
  return mapped(await adminFetch("/api/v1/experiments"));
}

export async function createExperiment(input: {
  payload: Record<string, unknown>;
  idempotencyKey: string;
}): Promise<ProductSignalResult<Record<string, unknown>>> {
  return mapped(
    await adminFetch("/api/v1/experiments", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": input.idempotencyKey },
      body: JSON.stringify(input.payload),
    }),
  );
}

export async function setExperimentStatus(input: {
  experimentKey: string;
  status: string;
  expectedVersion: number;
  reason: string;
  idempotencyKey: string;
}): Promise<ProductSignalResult<Record<string, unknown>>> {
  return mapped(
    await adminFetch(`/api/v1/experiments/${encodeURIComponent(input.experimentKey)}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": input.idempotencyKey },
      body: JSON.stringify({
        status: input.status,
        expectedVersion: input.expectedVersion,
        reason: input.reason,
      }),
    }),
  );
}

export async function listFeedback(query: {
  status?: string;
  kind?: string;
  product?: string;
  appVersion?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<ProductSignalResult<{ items: FeedbackItem[]; total: number; limit: number; offset: number }>> {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.kind) params.set("kind", query.kind);
  if (query.product) params.set("product", query.product);
  if (query.appVersion) params.set("appVersion", query.appVersion);
  if (query.limit) params.set("limit", String(query.limit));
  if (query.offset) params.set("offset", String(query.offset));
  return mapped(await adminFetch(`/api/v1/feedback${params.size ? `?${params}` : ""}`));
}

export async function listFeedbackTrends(input: {
  product?: string;
  days?: number;
} = {}): Promise<ProductSignalResult<{ items: FeedbackTrend[]; days: number }>> {
  const params = new URLSearchParams();
  if (input.product) params.set("product", input.product);
  if (input.days) params.set("days", String(input.days));
  return mapped(await adminFetch(`/api/v1/feedback/trends${params.size ? `?${params}` : ""}`));
}

export async function mutateFeedback(input: {
  itemId: string;
  expectedStatus: string;
  action: string;
  reason: string;
  supportTicketId?: string | null;
  productIssueRef?: string | null;
  idempotencyKey: string;
}): Promise<ProductSignalResult<Record<string, unknown>>> {
  return mapped(
    await adminFetch(`/api/v1/feedback/${encodeURIComponent(input.itemId)}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": input.idempotencyKey },
      body: JSON.stringify({
        expectedStatus: input.expectedStatus,
        action: input.action,
        reason: input.reason,
        ...(input.supportTicketId ? { supportTicketId: input.supportTicketId } : {}),
        ...(input.productIssueRef ? { productIssueRef: input.productIssueRef } : {}),
      }),
    }),
  );
}
