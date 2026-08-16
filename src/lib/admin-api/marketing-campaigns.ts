import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export const marketingCampaignStatuses = [
  "Draft",
  "Ready",
  "Active",
  "Paused",
  "Completed",
  "Cancelled",
] as const;

export type MarketingCampaignStatus = (typeof marketingCampaignStatuses)[number];

export type MarketingCampaign = {
  id: string;
  name: string;
  objective: string | null;
  productCode: string | null;
  channelCode: string | null;
  status: MarketingCampaignStatus;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  ownerAdminAccountId: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type MarketingCampaignList = {
  items: MarketingCampaign[];
  total: number;
  summary: {
    total: number;
    draft: number;
    ready: number;
    active: number;
    paused: number;
    completed: number;
    cancelled: number;
  };
  page: number;
  pageSize: number;
  filters: {
    q: string | null;
    product: string | null;
    channel: string | null;
    status: MarketingCampaignStatus | null;
    owner: string | null;
    from: string | null;
    to: string | null;
  };
  freshness: {
    status: "fresh" | "stale";
    asOfUtc: string;
    source: string;
  };
};

export type MarketingCampaignWritePayload = {
  name: string;
  objective: string | null;
  productCode: string | null;
  channelCode: string | null;
  ownerAdminAccountId: string | null;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  reason: string;
};

export type MarketingCampaignResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; message?: string }
  | { kind: "not_found"; message?: string }
  | { kind: "invalid"; code?: string; message?: string }
  | { kind: "conflict"; code?: string; message?: string }
  | { kind: "unavailable"; correlationId?: string };

type Problem = {
  code?: unknown;
  title?: unknown;
  correlationId?: unknown;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE_PATTERN = /^[a-z0-9][a-z0-9_.:-]{0,63}$/;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nullableText(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function instant(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function nullableInstant(value: unknown): value is string | null {
  return value === null || instant(value);
}

function status(value: unknown): value is MarketingCampaignStatus {
  return (
    typeof value === "string" &&
    marketingCampaignStatuses.includes(value as MarketingCampaignStatus)
  );
}

function parseCampaign(value: unknown): MarketingCampaign | null {
  const item = record(value);
  if (!item) return null;
  if (
    typeof item.id !== "string" ||
    !UUID_PATTERN.test(item.id) ||
    typeof item.name !== "string" ||
    !nullableText(item.objective) ||
    !nullableText(item.productCode) ||
    !nullableText(item.channelCode) ||
    !status(item.status) ||
    !nullableInstant(item.startsAtUtc) ||
    !nullableInstant(item.endsAtUtc) ||
    !nullableText(item.ownerAdminAccountId) ||
    !instant(item.createdAtUtc) ||
    !instant(item.updatedAtUtc)
  ) {
    return null;
  }
  if (item.productCode && !CODE_PATTERN.test(item.productCode)) return null;
  if (item.channelCode && !CODE_PATTERN.test(item.channelCode)) return null;
  if (item.ownerAdminAccountId && !UUID_PATTERN.test(item.ownerAdminAccountId)) return null;
  return item as MarketingCampaign;
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function parseList(value: unknown): MarketingCampaignList | null {
  const body = record(value);
  if (!body || !Array.isArray(body.items)) return null;
  const items = body.items.map(parseCampaign);
  if (items.some((item) => !item)) return null;
  if (
    !nonNegativeInteger(body.total) ||
    !Number.isInteger(body.page) ||
    !Number.isInteger(body.pageSize)
  ) {
    return null;
  }
  const summary = record(body.summary);
  const filters = record(body.filters);
  const freshness = record(body.freshness);
  if (!summary || !filters || !freshness) return null;
  const keys = ["total", "draft", "ready", "active", "paused", "completed", "cancelled"] as const;
  if (keys.some((key) => !nonNegativeInteger(summary[key]))) return null;
  if (
    (filters.status !== null && !status(filters.status)) ||
    !nullableText(filters.q) ||
    !nullableText(filters.product) ||
    !nullableText(filters.channel) ||
    !nullableText(filters.owner) ||
    !nullableText(filters.from) ||
    !nullableText(filters.to)
  ) {
    return null;
  }
  if (
    (freshness.status !== "fresh" && freshness.status !== "stale") ||
    !instant(freshness.asOfUtc) ||
    typeof freshness.source !== "string"
  ) {
    return null;
  }
  return {
    items: items as MarketingCampaign[],
    total: Number(body.total),
    summary: {
      total: Number(summary.total),
      draft: Number(summary.draft),
      ready: Number(summary.ready),
      active: Number(summary.active),
      paused: Number(summary.paused),
      completed: Number(summary.completed),
      cancelled: Number(summary.cancelled),
    },
    page: Number(body.page),
    pageSize: Number(body.pageSize),
    filters: {
      q: filters.q as string | null,
      product: filters.product as string | null,
      channel: filters.channel as string | null,
      status: filters.status as MarketingCampaignStatus | null,
      owner: filters.owner as string | null,
      from: filters.from as string | null,
      to: filters.to as string | null,
    },
    freshness: {
      status: freshness.status,
      asOfUtc: freshness.asOfUtc,
      source: freshness.source,
    },
  };
}

async function bearer(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error } = await supabase.auth.getClaims();
  if (error || !claimsData?.claims?.sub) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function problem(response: Response): Promise<Problem> {
  try {
    return ((await response.json()) as Problem) ?? {};
  } catch {
    return {};
  }
}

function failed<T>(response: Response, body: Problem): MarketingCampaignResult<T> {
  const message = typeof body.title === "string" ? body.title : undefined;
  const code = typeof body.code === "string" ? body.code : undefined;
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden", message };
  if (response.status === 404) return { kind: "not_found", message };
  if (response.status === 409) return { kind: "conflict", code, message };
  if (response.status === 400) return { kind: "invalid", code, message };
  return {
    kind: "unavailable",
    correlationId: typeof body.correlationId === "string" ? body.correlationId : undefined,
  };
}

async function request(
  path: string,
  init?: RequestInit,
): Promise<{ response: Response; body: unknown } | null> {
  const token = await bearer();
  if (!token) return null;
  const config = getPublicRuntimeConfig();
  try {
    const response = await fetch(`${config.adminApiUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    return { response, body };
  } catch {
    return { response: new Response(null, { status: 503 }), body: null };
  }
}

export async function getMarketingCampaigns(
  params: URLSearchParams,
): Promise<MarketingCampaignResult<MarketingCampaignList>> {
  const result = await request(`/api/v1/marketing/campaigns?${params.toString()}`);
  if (!result) return { kind: "unauthenticated" };
  if (result.response.ok) {
    const parsed = parseList(result.body);
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  return failed(result.response, record(result.body) ?? {});
}

export async function createMarketingCampaign(
  payload: MarketingCampaignWritePayload,
  idempotencyKey: string,
): Promise<MarketingCampaignResult<Record<string, unknown>>> {
  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey))
    return { kind: "invalid", code: "idempotency_invalid" };
  const result = await request("/api/v1/marketing/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(payload),
  });
  if (!result) return { kind: "unauthenticated" };
  if (result.response.ok && record(result.body))
    return { kind: "ok", data: result.body as Record<string, unknown> };
  return failed(result.response, record(result.body) ?? {});
}

export async function updateMarketingCampaign(
  campaignId: string,
  payload: MarketingCampaignWritePayload,
  idempotencyKey: string,
): Promise<MarketingCampaignResult<Record<string, unknown>>> {
  if (!UUID_PATTERN.test(campaignId) || !IDEMPOTENCY_PATTERN.test(idempotencyKey))
    return { kind: "invalid" };
  const result = await request(`/api/v1/marketing/campaigns/${campaignId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(payload),
  });
  if (!result) return { kind: "unauthenticated" };
  if (result.response.ok && record(result.body))
    return { kind: "ok", data: result.body as Record<string, unknown> };
  return failed(result.response, record(result.body) ?? {});
}

export async function setMarketingCampaignStatus(
  campaignId: string,
  targetStatus: MarketingCampaignStatus,
  reason: string,
  idempotencyKey: string,
): Promise<MarketingCampaignResult<Record<string, unknown>>> {
  if (
    !UUID_PATTERN.test(campaignId) ||
    !status(targetStatus) ||
    !IDEMPOTENCY_PATTERN.test(idempotencyKey)
  ) {
    return { kind: "invalid" };
  }
  const result = await request(`/api/v1/marketing/campaigns/${campaignId}/actions/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ status: targetStatus, reason }),
  });
  if (!result) return { kind: "unauthenticated" };
  if (result.response.ok && record(result.body))
    return { kind: "ok", data: result.body as Record<string, unknown> };
  return failed(result.response, record(result.body) ?? {});
}
