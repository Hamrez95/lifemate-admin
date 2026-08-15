import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export type CommerceSubscriptionSummary = {
  active: number;
  trial: number;
  pastDue: number;
  cancelled: number;
  expired: number;
  refunded: number;
};

export type CommerceEntitlementSummary = {
  active: number;
  expired: number;
  revoked: number;
};

export type CommerceProduct = {
  id: string;
  code: string;
  name: string;
  status: string;
  planCount: number;
};

export type CommercePlanDistribution = {
  planId: string;
  productCode: string;
  productName: string;
  planCode: string;
  planName: string;
  planStatus: string;
  subscriptions: number;
  activeSubscriptions: number;
};

export type CommerceEntitlementCoverage = {
  featureCode: string;
  active: number;
  expired: number;
  revoked: number;
};

export type CommerceRenewalHighlight = {
  subscriptionId: string;
  productCode: string;
  planCode: string;
  planName: string;
  status: string;
  currentPeriodEndUtc: string;
};

export type CommerceEntitlementExpiry = {
  entitlementId: string;
  featureCode: string;
  source: string;
  expiresAtUtc: string;
};

export type CommerceSubscriptionRow = {
  subscriptionId: string;
  productCode: string;
  productName: string;
  planId: string;
  planCode: string;
  planName: string;
  status: string;
  startsAtUtc: string;
  currentPeriodEndUtc: string | null;
  cancelledAtUtc: string | null;
};

export type CommerceOverviewResponse = {
  summary: {
    subscriptions: CommerceSubscriptionSummary;
    entitlements: CommerceEntitlementSummary;
  };
  products: CommerceProduct[];
  planDistribution: CommercePlanDistribution[];
  entitlementCoverage: CommerceEntitlementCoverage[];
  renewalHighlights: CommerceRenewalHighlight[];
  entitlementExpiryHighlights: CommerceEntitlementExpiry[];
  subscriptions: {
    items: CommerceSubscriptionRow[];
    total: number;
  };
  page: number;
  pageSize: number;
  filters: {
    product: string | null;
    status: string | null;
  };
  freshness: {
    status: "fresh" | "stale";
    asOfUtc: string;
  };
};

export type CommerceOverviewResult =
  | { kind: "ok"; data: CommerceOverviewResponse }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid" }
  | { kind: "unavailable"; correlationId?: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function nonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function parseOverview(value: unknown): CommerceOverviewResponse | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (!body.summary || typeof body.summary !== "object") return null;
  const summary = body.summary as Record<string, unknown>;
  if (!summary.subscriptions || !summary.entitlements) return null;
  const subscriptionsSummary = summary.subscriptions as Record<string, unknown>;
  const entitlementsSummary = summary.entitlements as Record<string, unknown>;
  for (const key of ["active", "trial", "pastDue", "cancelled", "expired", "refunded"]) {
    if (!nonNegativeInteger(subscriptionsSummary[key])) return null;
  }
  for (const key of ["active", "expired", "revoked"]) {
    if (!nonNegativeInteger(entitlementsSummary[key])) return null;
  }
  if (!Array.isArray(body.products) || !Array.isArray(body.planDistribution)) return null;
  if (!Array.isArray(body.entitlementCoverage) || !Array.isArray(body.renewalHighlights))
    return null;
  if (!Array.isArray(body.entitlementExpiryHighlights)) return null;
  if (!body.subscriptions || typeof body.subscriptions !== "object") return null;
  const subscriptionList = body.subscriptions as Record<string, unknown>;
  if (!Array.isArray(subscriptionList.items) || !nonNegativeInteger(subscriptionList.total))
    return null;
  if (!Number.isInteger(body.page) || !Number.isInteger(body.pageSize)) return null;
  if (!body.filters || typeof body.filters !== "object") return null;
  const filters = body.filters as Record<string, unknown>;
  if (!nullableString(filters.product) || !nullableString(filters.status)) return null;
  if (!body.freshness || typeof body.freshness !== "object") return null;
  const freshness = body.freshness as Record<string, unknown>;
  if (freshness.status !== "fresh" && freshness.status !== "stale") return null;
  if (typeof freshness.asOfUtc !== "string") return null;

  const products: CommerceProduct[] = [];
  for (const raw of body.products) {
    if (!raw || typeof raw !== "object") return null;
    const row = raw as Record<string, unknown>;
    if (typeof row.id !== "string" || !UUID_PATTERN.test(row.id)) return null;
    if (typeof row.code !== "string" || typeof row.name !== "string") return null;
    if (typeof row.status !== "string" || !nonNegativeInteger(row.planCount)) return null;
    products.push({
      id: row.id,
      code: row.code,
      name: row.name,
      status: row.status,
      planCount: row.planCount,
    });
  }

  const planDistribution: CommercePlanDistribution[] = [];
  for (const raw of body.planDistribution) {
    if (!raw || typeof raw !== "object") return null;
    const row = raw as Record<string, unknown>;
    if (typeof row.planId !== "string" || !UUID_PATTERN.test(row.planId)) return null;
    for (const key of ["productCode", "productName", "planCode", "planName", "planStatus"]) {
      if (typeof row[key] !== "string") return null;
    }
    if (!nonNegativeInteger(row.subscriptions) || !nonNegativeInteger(row.activeSubscriptions)) {
      return null;
    }
    planDistribution.push(row as unknown as CommercePlanDistribution);
  }

  const entitlementCoverage: CommerceEntitlementCoverage[] = [];
  for (const raw of body.entitlementCoverage) {
    if (!raw || typeof raw !== "object") return null;
    const row = raw as Record<string, unknown>;
    if (typeof row.featureCode !== "string") return null;
    if (
      !nonNegativeInteger(row.active) ||
      !nonNegativeInteger(row.expired) ||
      !nonNegativeInteger(row.revoked)
    ) {
      return null;
    }
    entitlementCoverage.push(row as unknown as CommerceEntitlementCoverage);
  }

  const renewalHighlights: CommerceRenewalHighlight[] = [];
  for (const raw of body.renewalHighlights) {
    if (!raw || typeof raw !== "object") return null;
    const row = raw as Record<string, unknown>;
    if (typeof row.subscriptionId !== "string" || !UUID_PATTERN.test(row.subscriptionId))
      return null;
    for (const key of ["productCode", "planCode", "planName", "status", "currentPeriodEndUtc"]) {
      if (typeof row[key] !== "string") return null;
    }
    renewalHighlights.push(row as unknown as CommerceRenewalHighlight);
  }

  const entitlementExpiryHighlights: CommerceEntitlementExpiry[] = [];
  for (const raw of body.entitlementExpiryHighlights) {
    if (!raw || typeof raw !== "object") return null;
    const row = raw as Record<string, unknown>;
    if (typeof row.entitlementId !== "string" || !UUID_PATTERN.test(row.entitlementId)) return null;
    for (const key of ["featureCode", "source", "expiresAtUtc"]) {
      if (typeof row[key] !== "string") return null;
    }
    entitlementExpiryHighlights.push(row as unknown as CommerceEntitlementExpiry);
  }

  const subscriptionItems: CommerceSubscriptionRow[] = [];
  for (const raw of subscriptionList.items) {
    if (!raw || typeof raw !== "object") return null;
    const row = raw as Record<string, unknown>;
    if (typeof row.subscriptionId !== "string" || !UUID_PATTERN.test(row.subscriptionId))
      return null;
    if (typeof row.planId !== "string" || !UUID_PATTERN.test(row.planId)) return null;
    for (const key of [
      "productCode",
      "productName",
      "planCode",
      "planName",
      "status",
      "startsAtUtc",
    ]) {
      if (typeof row[key] !== "string") return null;
    }
    if (!nullableString(row.currentPeriodEndUtc) || !nullableString(row.cancelledAtUtc))
      return null;
    subscriptionItems.push(row as unknown as CommerceSubscriptionRow);
  }

  return {
    summary: {
      subscriptions: subscriptionsSummary as unknown as CommerceSubscriptionSummary,
      entitlements: entitlementsSummary as unknown as CommerceEntitlementSummary,
    },
    products,
    planDistribution,
    entitlementCoverage,
    renewalHighlights,
    entitlementExpiryHighlights,
    subscriptions: {
      items: subscriptionItems,
      total: subscriptionList.total as number,
    },
    page: body.page as number,
    pageSize: body.pageSize as number,
    filters: {
      product: filters.product,
      status: filters.status,
    },
    freshness: {
      status: freshness.status,
      asOfUtc: freshness.asOfUtc,
    },
  };
}

async function correlationId(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { correlationId?: unknown };
    return typeof body.correlationId === "string" ? body.correlationId : undefined;
  } catch {
    return undefined;
  }
}

export async function getCommerceOverview(
  params: URLSearchParams,
): Promise<CommerceOverviewResult> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) return { kind: "unauthenticated" };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { kind: "unauthenticated" };

  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(`${config.adminApiUrl}/api/v1/commerce/overview?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }

  if (response.ok) {
    const parsed = parseOverview(await response.json());
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 400) return { kind: "invalid" };
  return { kind: "unavailable", correlationId: await correlationId(response) };
}
