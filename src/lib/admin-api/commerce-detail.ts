import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

type BoundedCollection<T> = {
  items: T[];
  total: number;
};

type InstrumentationState = {
  instrumented: boolean;
  reason: string;
};

export type CommercePlanDetail = {
  plan: {
    id: string;
    code: string;
    name: string;
    status: string;
    createdAtUtc: string;
  };
  product: {
    id: string;
    code: string;
    name: string;
    status: string;
  };
  featureRules: BoundedCollection<{
    featureId: string;
    featureCode: string;
    description: string;
    minimumPlanCode: string | null;
  }>;
  prices: BoundedCollection<{
    priceId: string;
    countryCode: string | null;
    currency: string;
    storeProvider: string;
    billingPeriodMonths: number;
    amountMinor: string;
    status: string;
    effectiveFromUtc: string;
    effectiveToUtc: string | null;
  }>;
  subscriptionSummary: {
    total: number;
    trial: number;
    active: number;
    pastDue: number;
    cancelled: number;
    expired: number;
    refunded: number;
  };
  subscriptions: BoundedCollection<{
    subscriptionId: string;
    status: string;
    startsAtUtc: string;
    currentPeriodEndUtc: string | null;
    cancelledAtUtc: string | null;
    createdAtUtc: string;
    updatedAtUtc: string;
  }>;
  changeHistory: InstrumentationState;
  transactionLinkage: InstrumentationState;
  page: number;
  pageSize: number;
  freshness: { status: "fresh" | "stale"; asOfUtc: string };
};

export type CommerceEntitlementDetail = {
  feature: {
    id: string;
    code: string;
    description: string;
    createdAtUtc: string;
  };
  productRules: BoundedCollection<{
    productId: string;
    productCode: string;
    productName: string;
    productStatus: string;
    minimumPlanCode: string | null;
  }>;
  summary: {
    total: number;
    active: number;
    expired: number;
    revoked: number;
    scheduled: number;
  };
  entitlements: BoundedCollection<{
    entitlementId: string;
    source: string;
    status: string;
    targetKind: string;
    startsAtUtc: string;
    expiresAtUtc: string | null;
    createdAtUtc: string;
    updatedAtUtc: string;
  }>;
  eventHistory: BoundedCollection<{
    eventId: string;
    entitlementId: string;
    eventType: string;
    occurredAtUtc: string;
    recordedAtUtc: string;
  }>;
  page: number;
  pageSize: number;
  freshness: { status: "fresh" | "stale"; asOfUtc: string };
};

export type CommerceDetailResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "not_found" }
  | { kind: "invalid" }
  | { kind: "unavailable"; correlationId?: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NON_NEGATIVE_INTEGER_STRING = /^\d+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function validFreshness(value: unknown): value is CommercePlanDetail["freshness"] {
  if (!isRecord(value)) return false;
  return (
    (value.status === "fresh" || value.status === "stale") &&
    typeof value.asOfUtc === "string"
  );
}

function validPage(body: Record<string, unknown>): boolean {
  return (
    Number.isInteger(body.page) && Number.isInteger(body.pageSize) && validFreshness(body.freshness)
  );
}

function validInstrumentationState(value: unknown): value is InstrumentationState {
  return (
    isRecord(value) &&
    typeof value.instrumented === "boolean" &&
    typeof value.reason === "string"
  );
}

function validCollection(value: unknown): value is BoundedCollection<unknown> {
  return isRecord(value) && Array.isArray(value.items) && nonNegativeInteger(value.total);
}

function validPlanDetail(value: unknown): value is CommercePlanDetail {
  if (!isRecord(value) || !isRecord(value.plan) || !isRecord(value.product)) return false;
  if (!validPage(value)) return false;
  const plan = value.plan;
  const product = value.product;
  if (typeof plan.id !== "string" || !UUID_PATTERN.test(plan.id)) return false;
  if (typeof product.id !== "string" || !UUID_PATTERN.test(product.id)) return false;
  for (const key of ["code", "name", "status", "createdAtUtc"]) {
    if (typeof plan[key] !== "string") return false;
  }
  for (const key of ["code", "name", "status"]) {
    if (typeof product[key] !== "string") return false;
  }
  if (!validCollection(value.featureRules) || !validCollection(value.prices)) return false;
  if (!isRecord(value.subscriptionSummary) || !validCollection(value.subscriptions)) return false;
  if (!validInstrumentationState(value.changeHistory)) return false;
  if (!validInstrumentationState(value.transactionLinkage)) return false;
  for (const key of ["total", "trial", "active", "pastDue", "cancelled", "expired", "refunded"]) {
    if (!nonNegativeInteger(value.subscriptionSummary[key])) return false;
  }

  for (const raw of value.featureRules.items) {
    if (!isRecord(raw)) return false;
    if (typeof raw.featureId !== "string" || !UUID_PATTERN.test(raw.featureId)) return false;
    if (
      typeof raw.featureCode !== "string" ||
      typeof raw.description !== "string" ||
      !nullableString(raw.minimumPlanCode)
    ) {
      return false;
    }
  }

  for (const raw of value.prices.items) {
    if (!isRecord(raw)) return false;
    if (typeof raw.priceId !== "string" || !UUID_PATTERN.test(raw.priceId)) return false;
    if (!nullableString(raw.countryCode) || !nullableString(raw.effectiveToUtc)) return false;
    for (const key of ["currency", "storeProvider", "status", "effectiveFromUtc"]) {
      if (typeof raw[key] !== "string") return false;
    }
    if (!Number.isInteger(raw.billingPeriodMonths)) return false;
    if (
      typeof raw.amountMinor !== "string" ||
      !NON_NEGATIVE_INTEGER_STRING.test(raw.amountMinor)
    ) {
      return false;
    }
  }

  for (const raw of value.subscriptions.items) {
    if (!isRecord(raw)) return false;
    if (typeof raw.subscriptionId !== "string" || !UUID_PATTERN.test(raw.subscriptionId)) return false;
    for (const key of ["status", "startsAtUtc", "createdAtUtc", "updatedAtUtc"]) {
      if (typeof raw[key] !== "string") return false;
    }
    if (!nullableString(raw.currentPeriodEndUtc) || !nullableString(raw.cancelledAtUtc)) return false;
  }
  return true;
}

function validEntitlementDetail(value: unknown): value is CommerceEntitlementDetail {
  if (!isRecord(value) || !isRecord(value.feature) || !validPage(value)) return false;
  const feature = value.feature;
  if (typeof feature.id !== "string" || !UUID_PATTERN.test(feature.id)) return false;
  for (const key of ["code", "description", "createdAtUtc"]) {
    if (typeof feature[key] !== "string") return false;
  }
  if (!validCollection(value.productRules) || !isRecord(value.summary)) return false;
  for (const key of ["total", "active", "expired", "revoked", "scheduled"]) {
    if (!nonNegativeInteger(value.summary[key])) return false;
  }
  for (const raw of value.productRules.items) {
    if (!isRecord(raw)) return false;
    if (typeof raw.productId !== "string" || !UUID_PATTERN.test(raw.productId)) return false;
    for (const key of ["productCode", "productName", "productStatus"]) {
      if (typeof raw[key] !== "string") return false;
    }
    if (!nullableString(raw.minimumPlanCode)) return false;
  }

  if (!validCollection(value.entitlements)) return false;
  for (const raw of value.entitlements.items) {
    if (!isRecord(raw)) return false;
    if (typeof raw.entitlementId !== "string" || !UUID_PATTERN.test(raw.entitlementId)) return false;
    for (const key of [
      "source",
      "status",
      "targetKind",
      "startsAtUtc",
      "createdAtUtc",
      "updatedAtUtc",
    ]) {
      if (typeof raw[key] !== "string") return false;
    }
    if (!nullableString(raw.expiresAtUtc)) return false;
  }

  if (!validCollection(value.eventHistory)) return false;
  for (const raw of value.eventHistory.items) {
    if (!isRecord(raw)) return false;
    if (typeof raw.eventId !== "string" || !UUID_PATTERN.test(raw.eventId)) return false;
    if (typeof raw.entitlementId !== "string" || !UUID_PATTERN.test(raw.entitlementId)) return false;
    for (const key of ["eventType", "occurredAtUtc", "recordedAtUtc"]) {
      if (typeof raw[key] !== "string") return false;
    }
  }
  return true;
}

async function accessToken(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function correlationId(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { correlationId?: unknown };
    return typeof body.correlationId === "string" ? body.correlationId : undefined;
  } catch {
    return undefined;
  }
}

async function requestDetail<T>(
  path: string,
  parse: (value: unknown) => value is T,
): Promise<CommerceDetailResult<T>> {
  const token = await accessToken();
  if (!token) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(`${config.adminApiUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }

  if (response.ok) {
    const value = await response.json();
    return parse(value) ? { kind: "ok", data: value } : { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 404) return { kind: "not_found" };
  if (response.status === 400) return { kind: "invalid" };
  return { kind: "unavailable", correlationId: await correlationId(response) };
}

export async function getCommercePlanDetail(
  planId: string,
  params: URLSearchParams,
): Promise<CommerceDetailResult<CommercePlanDetail>> {
  if (!UUID_PATTERN.test(planId)) return { kind: "not_found" };
  return requestDetail(
    `/api/v1/commerce/plans/${planId}?${params.toString()}`,
    validPlanDetail,
  );
}

export async function getCommerceEntitlementDetail(
  featureCode: string,
  params: URLSearchParams,
): Promise<CommerceDetailResult<CommerceEntitlementDetail>> {
  if (!featureCode || featureCode.length > 128) return { kind: "not_found" };
  return requestDetail(
    `/api/v1/commerce/entitlements/${encodeURIComponent(featureCode)}?${params.toString()}`,
    validEntitlementDetail,
  );
}
