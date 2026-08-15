import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export const transactionStatuses = [
  "Pending",
  "Succeeded",
  "Failed",
  "Cancelled",
  "Refunded",
  "Chargeback",
] as const;

export type TransactionStatus = (typeof transactionStatuses)[number];

export type CommerceTransactionRow = {
  transactionId: string;
  orderId: string | null;
  subscriptionId: string | null;
  accountLinked: boolean;
  productCode: string;
  productName: string;
  provider: string;
  providerStatus: string;
  normalizedStatus: TransactionStatus;
  amountMinor: string;
  currency: string;
  occurredAtUtc: string;
  receivedAtUtc: string;
  observationState: "InOrder" | "Duplicate" | "OutOfOrder" | "NoEvent";
  latestEventOccurredAtUtc: string | null;
  latestEventReceivedAtUtc: string | null;
};

export type CommerceOrderRow = {
  orderId: string;
  subscriptionId: string | null;
  productCode: string;
  productName: string;
  status: string;
  amountMinor: string;
  currency: string;
  occurredAtUtc: string;
  updatedAtUtc: string;
  hasTransaction: boolean;
};

export type CommerceTransactionsResponse = {
  summary: {
    total: number;
    pending: number;
    succeeded: number;
    failed: number;
    cancelled: number;
    refunded: number;
    chargeback: number;
  };
  anomalies: {
    duplicateEvents: number;
    outOfOrderEvents: number;
  };
  transactions: {
    items: CommerceTransactionRow[];
    total: number;
  };
  recentOrders: {
    items: CommerceOrderRow[];
    total: number;
  };
  products: Array<{ id: string; code: string; name: string }>;
  providers: string[];
  page: number;
  pageSize: number;
  filters: {
    product: string | null;
    provider: string | null;
    status: TransactionStatus | null;
    from: string | null;
    to: string | null;
    q: string | null;
  };
  source: {
    kind: "canonical";
    label: string;
  };
  freshness: {
    status: "fresh" | "stale";
    asOfUtc: string;
  };
};

export type CommerceTransactionsResult =
  | { kind: "ok"; data: CommerceTransactionsResponse }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid" }
  | { kind: "unavailable"; correlationId?: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INTEGER_PATTERN = /^\d+$/;
const AMOUNT_PATTERN = /^\d+$/;
const STATUS_SET = new Set<string>(transactionStatuses);
const OBSERVATIONS = new Set(["InOrder", "Duplicate", "OutOfOrder", "NoEvent"]);

function nonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function uuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function timestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function amount(value: unknown): value is string {
  return typeof value === "string" && AMOUNT_PATTERN.test(value);
}

function parseTransaction(raw: unknown): CommerceTransactionRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (!uuid(row.transactionId)) return null;
  if (row.orderId !== null && !uuid(row.orderId)) return null;
  if (row.subscriptionId !== null && !uuid(row.subscriptionId)) return null;
  if (typeof row.accountLinked !== "boolean") return null;
  for (const key of ["productCode", "productName", "provider", "providerStatus", "currency"]) {
    if (typeof row[key] !== "string") return null;
  }
  if (typeof row.normalizedStatus !== "string" || !STATUS_SET.has(row.normalizedStatus))
    return null;
  if (!amount(row.amountMinor)) return null;
  if (!timestamp(row.occurredAtUtc) || !timestamp(row.receivedAtUtc)) return null;
  if (typeof row.observationState !== "string" || !OBSERVATIONS.has(row.observationState))
    return null;
  if (
    !nullableString(row.latestEventOccurredAtUtc) ||
    !nullableString(row.latestEventReceivedAtUtc)
  ) {
    return null;
  }
  if (row.latestEventOccurredAtUtc && !timestamp(row.latestEventOccurredAtUtc)) return null;
  if (row.latestEventReceivedAtUtc && !timestamp(row.latestEventReceivedAtUtc)) return null;
  return row as unknown as CommerceTransactionRow;
}

function parseOrder(raw: unknown): CommerceOrderRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (!uuid(row.orderId)) return null;
  if (row.subscriptionId !== null && !uuid(row.subscriptionId)) return null;
  for (const key of ["productCode", "productName", "status", "currency"]) {
    if (typeof row[key] !== "string") return null;
  }
  if (!amount(row.amountMinor)) return null;
  if (!timestamp(row.occurredAtUtc) || !timestamp(row.updatedAtUtc)) return null;
  if (typeof row.hasTransaction !== "boolean") return null;
  return row as unknown as CommerceOrderRow;
}

function parseResponse(value: unknown): CommerceTransactionsResponse | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (!body.summary || typeof body.summary !== "object") return null;
  const summary = body.summary as Record<string, unknown>;
  for (const key of [
    "total",
    "pending",
    "succeeded",
    "failed",
    "cancelled",
    "refunded",
    "chargeback",
  ]) {
    if (!nonNegativeInteger(summary[key])) return null;
  }

  if (!body.anomalies || typeof body.anomalies !== "object") return null;
  const anomalies = body.anomalies as Record<string, unknown>;
  if (!nonNegativeInteger(anomalies.duplicateEvents)) return null;
  if (!nonNegativeInteger(anomalies.outOfOrderEvents)) return null;

  if (!body.transactions || typeof body.transactions !== "object") return null;
  const transactions = body.transactions as Record<string, unknown>;
  if (!Array.isArray(transactions.items) || !nonNegativeInteger(transactions.total)) return null;
  const transactionItems: CommerceTransactionRow[] = [];
  for (const raw of transactions.items) {
    const parsed = parseTransaction(raw);
    if (!parsed) return null;
    transactionItems.push(parsed);
  }

  if (!body.recentOrders || typeof body.recentOrders !== "object") return null;
  const recentOrders = body.recentOrders as Record<string, unknown>;
  if (!Array.isArray(recentOrders.items) || !nonNegativeInteger(recentOrders.total)) return null;
  const orderItems: CommerceOrderRow[] = [];
  for (const raw of recentOrders.items) {
    const parsed = parseOrder(raw);
    if (!parsed) return null;
    orderItems.push(parsed);
  }

  if (!Array.isArray(body.products) || !Array.isArray(body.providers)) return null;
  const products: Array<{ id: string; code: string; name: string }> = [];
  for (const raw of body.products) {
    if (!raw || typeof raw !== "object") return null;
    const product = raw as Record<string, unknown>;
    if (!uuid(product.id) || typeof product.code !== "string" || typeof product.name !== "string") {
      return null;
    }
    products.push({ id: product.id, code: product.code, name: product.name });
  }
  if (!body.providers.every((provider) => typeof provider === "string")) return null;
  const providers = body.providers as string[];

  if (!Number.isInteger(body.page) || !Number.isInteger(body.pageSize)) return null;
  if (!body.filters || typeof body.filters !== "object") return null;
  const filters = body.filters as Record<string, unknown>;
  for (const key of ["product", "provider", "from", "to", "q"]) {
    if (!nullableString(filters[key])) return null;
  }
  if (
    filters.status !== null &&
    (typeof filters.status !== "string" || !STATUS_SET.has(filters.status))
  ) {
    return null;
  }

  if (!body.source || typeof body.source !== "object") return null;
  const source = body.source as Record<string, unknown>;
  if (source.kind !== "canonical" || typeof source.label !== "string") return null;

  if (!body.freshness || typeof body.freshness !== "object") return null;
  const freshness = body.freshness as Record<string, unknown>;
  if (freshness.status !== "fresh" && freshness.status !== "stale") return null;
  if (!timestamp(freshness.asOfUtc)) return null;

  return {
    summary: summary as CommerceTransactionsResponse["summary"],
    anomalies: anomalies as CommerceTransactionsResponse["anomalies"],
    transactions: { items: transactionItems, total: transactions.total as number },
    recentOrders: { items: orderItems, total: recentOrders.total as number },
    products,
    providers,
    page: body.page as number,
    pageSize: body.pageSize as number,
    filters: filters as CommerceTransactionsResponse["filters"],
    source: source as CommerceTransactionsResponse["source"],
    freshness: freshness as CommerceTransactionsResponse["freshness"],
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

export function isExactInternalReference(value: string): boolean {
  return value === "" || UUID_PATTERN.test(value);
}

export function isPageValue(value: string): boolean {
  return value === "" || INTEGER_PATTERN.test(value);
}

export async function getCommerceTransactions(
  params: URLSearchParams,
): Promise<CommerceTransactionsResult> {
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
    response = await fetch(
      `${config.adminApiUrl}/api/v1/commerce/transactions?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
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
