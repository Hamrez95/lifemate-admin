import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export type CommerceSubscriptionStatus =
  | "Trial"
  | "Active"
  | "PastDue"
  | "Cancelled"
  | "Expired"
  | "Refunded";

export type CommerceSubscriptionItem = {
  subscriptionId: string;
  customerAccountId: string;
  beneficiaryPersonId: string | null;
  productCode: string;
  productName: string;
  planCode: string;
  planName: string;
  provider: string;
  status: CommerceSubscriptionStatus;
  startsAtUtc: string;
  currentPeriodEndUtc: string | null;
  cancelledAtUtc: string | null;
};

export type CommerceDashboardResponse = {
  summary: Record<CommerceSubscriptionStatus, number> & { total: number };
  products: Array<{ code: string; name: string }>;
  plans: Array<{ productCode: string; code: string; name: string }>;
  planDistribution: Array<{
    productCode: string;
    planCode: string;
    planName: string;
    subscriptionCount: number;
  }>;
  entitlementCoverage: Array<{
    featureCode: string;
    activeCount: number;
    expiringSoonCount: number;
  }>;
  renewalHighlights: Array<{
    subscriptionId: string;
    customerAccountId: string;
    productCode: string;
    planCode: string;
    status: CommerceSubscriptionStatus;
    currentPeriodEndUtc: string;
    daysRemaining: number;
  }>;
  subscriptions: CommerceSubscriptionItem[];
  page: number;
  pageSize: number;
  total: number;
  filters: {
    product: string | null;
    plan: string | null;
    status: CommerceSubscriptionStatus | null;
  };
  freshness: { status: "fresh" | "stale"; asOfUtc: string };
};

export type CommerceDashboardResult =
  | { kind: "ok"; data: CommerceDashboardResponse }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid" }
  | { kind: "unavailable"; correlationId?: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUSES = new Set<CommerceSubscriptionStatus>([
  "Trial",
  "Active",
  "PastDue",
  "Cancelled",
  "Expired",
  "Refunded",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function parseResponse(value: unknown): CommerceDashboardResponse | null {
  if (!isRecord(value) || !isRecord(value.summary) || !isRecord(value.filters)) return null;
  if (!isRecord(value.freshness) || !Array.isArray(value.products) || !Array.isArray(value.plans)) {
    return null;
  }
  if (
    !Array.isArray(value.planDistribution) ||
    !Array.isArray(value.entitlementCoverage) ||
    !Array.isArray(value.renewalHighlights) ||
    !Array.isArray(value.subscriptions)
  ) {
    return null;
  }
  if (!Number.isInteger(value.page) || !Number.isInteger(value.pageSize) || !nonNegativeInteger(value.total)) {
    return null;
  }
  const freshness = value.freshness as Record<string, unknown>;
  if (freshness.status !== "fresh" && freshness.status !== "stale") return null;
  if (typeof freshness.asOfUtc !== "string") return null;

  for (const key of ["total", "Trial", "Active", "PastDue", "Cancelled", "Expired", "Refunded"]) {
    if (!nonNegativeInteger(value.summary[key])) return null;
  }

  for (const raw of value.subscriptions) {
    if (!isRecord(raw)) return null;
    if (typeof raw.subscriptionId !== "string" || !UUID_PATTERN.test(raw.subscriptionId)) return null;
    if (typeof raw.customerAccountId !== "string" || !UUID_PATTERN.test(raw.customerAccountId)) return null;
    if (!nullableString(raw.beneficiaryPersonId)) return null;
    if (raw.beneficiaryPersonId && !UUID_PATTERN.test(raw.beneficiaryPersonId)) return null;
    if (typeof raw.productCode !== "string" || typeof raw.productName !== "string") return null;
    if (typeof raw.planCode !== "string" || typeof raw.planName !== "string") return null;
    if (typeof raw.provider !== "string") return null;
    if (typeof raw.status !== "string" || !STATUSES.has(raw.status as CommerceSubscriptionStatus)) {
      return null;
    }
    if (typeof raw.startsAtUtc !== "string") return null;
    if (!nullableString(raw.currentPeriodEndUtc) || !nullableString(raw.cancelledAtUtc)) return null;
  }

  return value as unknown as CommerceDashboardResponse;
}

async function correlationId(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as Record<string, unknown>;
    return typeof body.correlationId === "string" ? body.correlationId : undefined;
  } catch {
    return undefined;
  }
}

export async function getCommerceDashboard(
  params: URLSearchParams,
): Promise<CommerceDashboardResult> {
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
    response = await fetch(`${config.adminApiUrl}/api/v1/commerce/dashboard?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }

  if (response.ok) {
    const parsed = parseResponse(await response.json());
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 400) return { kind: "invalid" };
  return { kind: "unavailable", correlationId: await correlationId(response) };
}
