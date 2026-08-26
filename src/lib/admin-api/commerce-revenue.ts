import "server-only";

import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";
import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

export type RevenueMetric = {
  name: "mrr" | "arr" | "arpu" | "paid_conversion" | "revenue_churn" | "refund_amount";
  state: "ready" | "partial" | "unavailable";
  value: string | number | null;
  currency: string | null;
  reason: string;
};

export type CommerceRevenueResponse = {
  query: {
    from: string | null;
    to: string | null;
    currency: string | null;
    product: string | null;
    plan: string | null;
  };
  kpis: RevenueMetric[];
  actualByCurrency: Array<{
    currency: string;
    succeededAmountMinor: string;
    refundedAmountMinor: string | null;
    succeededTransactions: number;
    refundedTransactions: number | null;
    payingAccounts: number;
  }>;
  series: Array<{
    date: string;
    currency: string;
    succeededAmountMinor: string;
    refundedAmountMinor: string | null;
  }>;
  source: {
    state: "partial" | "unavailable";
    ledger: string;
    refundLedger: string | null;
    note: string;
  };
  freshness: {
    status: "partial" | "unavailable";
    asOfUtc: string;
  };
};

export type CommerceRevenueResult =
  | { kind: "ok"; data: CommerceRevenueResponse }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid"; correlationId?: string }
  | { kind: "unavailable"; correlationId?: string };

const metricNames = new Set([
  "mrr",
  "arr",
  "arpu",
  "paid_conversion",
  "revenue_churn",
  "refund_amount",
]);

function nonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function minor(value: unknown): value is string {
  return typeof value === "string" && /^\d+$/.test(value);
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function parseCommerceRevenueResponse(value: unknown): CommerceRevenueResponse | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (!body.query || typeof body.query !== "object") return null;
  if (!body.source || typeof body.source !== "object") return null;
  if (!body.freshness || typeof body.freshness !== "object") return null;
  if (
    !Array.isArray(body.kpis) ||
    !Array.isArray(body.actualByCurrency) ||
    !Array.isArray(body.series)
  ) {
    return null;
  }

  for (const metric of body.kpis) {
    if (!metric || typeof metric !== "object") return null;
    const row = metric as Record<string, unknown>;
    if (
      !metricNames.has(String(row.name)) ||
      !["ready", "partial", "unavailable"].includes(String(row.state)) ||
      !(row.value === null || typeof row.value === "number" || typeof row.value === "string") ||
      !nullableString(row.currency) ||
      typeof row.reason !== "string"
    ) {
      return null;
    }
  }

  for (const item of body.actualByCurrency) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    if (
      typeof row.currency !== "string" ||
      !minor(row.succeededAmountMinor) ||
      !(row.refundedAmountMinor === null || minor(row.refundedAmountMinor)) ||
      !nonNegativeInteger(row.succeededTransactions) ||
      !(row.refundedTransactions === null || nonNegativeInteger(row.refundedTransactions)) ||
      !nonNegativeInteger(row.payingAccounts)
    ) {
      return null;
    }
  }

  for (const point of body.series) {
    if (!point || typeof point !== "object") return null;
    const row = point as Record<string, unknown>;
    if (
      typeof row.date !== "string" ||
      typeof row.currency !== "string" ||
      !minor(row.succeededAmountMinor) ||
      !(row.refundedAmountMinor === null || minor(row.refundedAmountMinor))
    ) {
      return null;
    }
  }

  const source = body.source as Record<string, unknown>;
  if (
    !["partial", "unavailable"].includes(String(source.state)) ||
    typeof source.ledger !== "string" ||
    !nullableString(source.refundLedger) ||
    typeof source.note !== "string"
  ) {
    return null;
  }

  const freshness = body.freshness as Record<string, unknown>;
  if (
    !["partial", "unavailable"].includes(String(freshness.status)) ||
    typeof freshness.asOfUtc !== "string"
  ) {
    return null;
  }

  return body as unknown as CommerceRevenueResponse;
}

async function correlationId(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { correlationId?: unknown };
    return typeof body.correlationId === "string" ? body.correlationId : undefined;
  } catch {
    return undefined;
  }
}

export async function getCommerceRevenue(params: URLSearchParams): Promise<CommerceRevenueResult> {
  const token = await getServerAdminAccessToken();
  if (!token) return { kind: "unauthenticated" };

  const config = getPublicRuntimeConfig();
  const query = params.toString();
  const url = `${config.adminApiUrl}/api/v1/commerce/revenue${query ? `?${query}` : ""}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }

  if (response.ok) {
    const parsed = parseCommerceRevenueResponse(await response.json());
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 400) {
    return { kind: "invalid", correlationId: await correlationId(response) };
  }
  return { kind: "unavailable", correlationId: await correlationId(response) };
}
