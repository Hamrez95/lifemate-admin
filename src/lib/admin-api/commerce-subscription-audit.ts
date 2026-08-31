import "server-only";

import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";
import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

export type CommerceConversionAuditRow = {
  conversionId: string;
  sourceSubscriptionId: string;
  targetSubscriptionId: string;
  sourceTransactionId: string;
  sourceProductCode: string;
  targetProductCode: string;
  currency: string;
  originalPaidMinor: string;
  transferredCreditMinor: string;
  convertedAtUtc: string;
  idempotencyKey: string | null;
};

export type CommerceGiftAuditRow = {
  giftIntentId: string;
  purchaserAccountId: string;
  recipientAccountId: string;
  targetKind: string;
  offerCode: string | null;
  productCode: string | null;
  status: string;
  transactionId: string | null;
  priceAmountMinor: string | null;
  priceCurrency: string | null;
  paidAtUtc: string | null;
  claimExpiresAtUtc: string | null;
  claimedAtUtc: string | null;
  resultingSubscriptionId: string | null;
  expiresAtUtc: string | null;
};

type Page<T> = { items: T[]; total: number; freshness: { asOfUtc: string } };
export type CommerceSubscriptionAuditSnapshot = {
  conversions: Page<CommerceConversionAuditRow> | null;
  gifts: Page<CommerceGiftAuditRow> | null;
  access: {
    conversions: "ready" | "forbidden" | "unavailable";
    gifts: "ready" | "forbidden" | "unavailable";
  };
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function read<T>(
  path: string,
  parse: (value: unknown) => T | null,
): Promise<{ kind: "ok"; data: Page<T> } | { kind: "forbidden" | "unavailable" }> {
  const token = await getServerAdminAccessToken();
  if (!token) return { kind: "forbidden" };
  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(`${config.adminApiUrl}${path}?page=1&pageSize=8`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }
  if (response.status === 403 || response.status === 401) return { kind: "forbidden" };
  if (!response.ok) return { kind: "unavailable" };
  const body = record(await response.json());
  if (!body || !Array.isArray(body.items) || !Number.isInteger(body.total))
    return { kind: "unavailable" };
  const freshness = record(body.freshness);
  if (!freshness || typeof freshness.asOfUtc !== "string") return { kind: "unavailable" };
  const items = body.items.map(parse);
  if (items.some((item) => item === null)) return { kind: "unavailable" };
  return {
    kind: "ok",
    data: {
      items: items as T[],
      total: Number(body.total),
      freshness: { asOfUtc: freshness.asOfUtc },
    },
  };
}

function conversion(value: unknown): CommerceConversionAuditRow | null {
  const row = record(value);
  if (!row) return null;
  for (const key of [
    "conversionId",
    "sourceSubscriptionId",
    "targetSubscriptionId",
    "sourceTransactionId",
    "sourceProductCode",
    "targetProductCode",
    "currency",
    "originalPaidMinor",
    "transferredCreditMinor",
    "convertedAtUtc",
  ] as const) {
    if (typeof row[key] !== "string") return null;
  }
  if (row.idempotencyKey !== null && typeof row.idempotencyKey !== "string") return null;
  return row as unknown as CommerceConversionAuditRow;
}

function gift(value: unknown): CommerceGiftAuditRow | null {
  const row = record(value);
  if (!row) return null;
  for (const key of [
    "giftIntentId",
    "purchaserAccountId",
    "recipientAccountId",
    "targetKind",
    "status",
  ] as const) {
    if (typeof row[key] !== "string") return null;
  }
  const nullable = [
    "offerCode",
    "productCode",
    "transactionId",
    "priceAmountMinor",
    "priceCurrency",
    "paidAtUtc",
    "claimExpiresAtUtc",
    "claimedAtUtc",
    "resultingSubscriptionId",
    "expiresAtUtc",
  ] as const;
  if (nullable.some((key) => row[key] !== null && typeof row[key] !== "string")) return null;
  return row as unknown as CommerceGiftAuditRow;
}

export async function getCommerceSubscriptionAuditSnapshot(): Promise<CommerceSubscriptionAuditSnapshot> {
  const [conversions, gifts] = await Promise.all([
    read("/api/v1/commerce/conversions", conversion),
    read("/api/v1/commerce/gifts", gift),
  ]);
  return {
    conversions: conversions.kind === "ok" ? conversions.data : null,
    gifts: gifts.kind === "ok" ? gifts.data : null,
    access: {
      conversions: conversions.kind === "ok" ? "ready" : conversions.kind,
      gifts: gifts.kind === "ok" ? "ready" : gifts.kind,
    },
  };
}
