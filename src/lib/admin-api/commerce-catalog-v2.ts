import "server-only";

import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";
import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

export type CommerceCatalogPrice = {
  id: string;
  countryCode: string | null;
  currency: string;
  storeProvider: string;
  amountMinor: string;
  effectiveFromUtc: string | null;
};

export type CommerceCatalogOffer = {
  id: string;
  code: string;
  name: string;
  durationMonths: number;
  status: string;
  giftEligible: boolean;
  version: number;
  price: CommerceCatalogPrice | null;
};

export type CommerceCatalogPolicy = {
  key: string;
  value: unknown;
  valueType: string;
  version: number;
};

export type CommerceCatalogProduct = {
  id: string;
  code: string;
  name: string;
  status: string;
  version: number;
  updatedAtUtc: string | null;
  offers: CommerceCatalogOffer[];
  policies: CommerceCatalogPolicy[];
};

export type CommerceCatalogBundle = {
  id: string;
  code: string;
  name: string;
  status: string;
  giftEligible: boolean;
  version: number;
  items: Array<{ offerId: string; offerCode: string; productId: string }>;
};

export type CommerceCatalogV2 = {
  version: string;
  products: CommerceCatalogProduct[];
  bundles: CommerceCatalogBundle[];
  freshness: { status: "fresh" | "stale"; asOfUtc: string };
};

export type CommerceCatalogV2Result =
  | { kind: "ok"; data: CommerceCatalogV2 }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid" }
  | { kind: "unavailable"; correlationId?: string };

export type CommerceCatalogMutationResult =
  | { kind: "ok"; replayed: boolean }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid"; message?: string }
  | { kind: "conflict"; message?: string }
  | { kind: "unavailable"; message?: string; correlationId?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE = /^[a-z0-9][a-z0-9._-]{1,63}$/;
const CURRENCY = /^[A-Z]{3}$/;

function string(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function integer(value: unknown): number | null {
  return Number.isInteger(value) ? Number(value) : null;
}

function parsePrice(value: unknown): CommerceCatalogPrice | null | undefined {
  if (value === null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const row = value as Record<string, unknown>;
  const id = string(row.id);
  const currency = string(row.currency);
  const provider = string(row.storeProvider);
  const amountMinor = string(row.amountMinor);
  if (!id || !UUID.test(id) || !currency || !CURRENCY.test(currency) || !provider || !amountMinor) {
    return undefined;
  }
  if (!/^-?[0-9]+$/.test(amountMinor)) return undefined;
  const country = row.countryCode === null ? null : string(row.countryCode);
  const effective = row.effectiveFromUtc === null ? null : string(row.effectiveFromUtc);
  return {
    id,
    countryCode: country,
    currency,
    storeProvider: provider,
    amountMinor,
    effectiveFromUtc: effective,
  };
}

function parseOffer(value: unknown): CommerceCatalogOffer | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const id = string(row.id);
  const code = string(row.code);
  const name = string(row.name);
  const durationMonths = integer(row.durationMonths);
  const version = integer(row.version);
  const status = string(row.status);
  const price = parsePrice(row.price);
  if (
    !id ||
    !UUID.test(id) ||
    !code ||
    !CODE.test(code) ||
    !name ||
    durationMonths === null ||
    durationMonths < 1 ||
    version === null ||
    version < 1 ||
    !status ||
    typeof row.giftEligible !== "boolean" ||
    price === undefined
  ) {
    return null;
  }
  return {
    id,
    code,
    name,
    durationMonths,
    version,
    status,
    giftEligible: row.giftEligible,
    price,
  };
}

function parsePolicy(value: unknown): CommerceCatalogPolicy | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const key = string(row.key);
  const valueType = string(row.valueType);
  const version = integer(row.version);
  if (!key || !valueType || version === null || version < 1) return null;
  return { key, value: row.value, valueType, version };
}

function parseProduct(value: unknown): CommerceCatalogProduct | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const id = string(row.id);
  const code = string(row.code);
  const name = string(row.name);
  const status = string(row.status);
  const version = integer(row.version);
  if (
    !id ||
    !UUID.test(id) ||
    !code ||
    !CODE.test(code) ||
    !name ||
    !status ||
    version === null ||
    version < 1
  ) {
    return null;
  }
  if (!Array.isArray(row.offers) || !Array.isArray(row.policies)) return null;
  const offers = row.offers.map(parseOffer);
  const policies = row.policies.map(parsePolicy);
  if (offers.some((item) => item === null) || policies.some((item) => item === null)) return null;
  return {
    id,
    code,
    name,
    status,
    version,
    updatedAtUtc: row.updatedAtUtc === null ? null : string(row.updatedAtUtc),
    offers: offers as CommerceCatalogOffer[],
    policies: policies as CommerceCatalogPolicy[],
  };
}

function parseBundle(value: unknown): CommerceCatalogBundle | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const id = string(row.id);
  const code = string(row.code);
  const name = string(row.name);
  const status = string(row.status);
  const version = integer(row.version);
  if (
    !id ||
    !UUID.test(id) ||
    !code ||
    !CODE.test(code) ||
    !name ||
    !status ||
    version === null ||
    version < 1 ||
    typeof row.giftEligible !== "boolean" ||
    !Array.isArray(row.items)
  ) {
    return null;
  }
  const items: CommerceCatalogBundle["items"] = [];
  for (const item of row.items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const entry = item as Record<string, unknown>;
    const offerId = string(entry.offerId);
    const offerCode = string(entry.offerCode);
    const productId = string(entry.productId);
    if (
      !offerId ||
      !UUID.test(offerId) ||
      !offerCode ||
      !CODE.test(offerCode) ||
      !productId ||
      !UUID.test(productId)
    ) {
      return null;
    }
    items.push({ offerId, offerCode, productId });
  }
  return { id, code, name, status, version, giftEligible: row.giftEligible, items };
}

function parseCatalog(value: unknown): CommerceCatalogV2 | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const version = string(row.version);
  if (!version || !Array.isArray(row.products) || !Array.isArray(row.bundles)) return null;
  if (!row.freshness || typeof row.freshness !== "object" || Array.isArray(row.freshness)) {
    return null;
  }
  const freshness = row.freshness as Record<string, unknown>;
  const status = freshness.status;
  const asOfUtc = string(freshness.asOfUtc);
  if ((status !== "fresh" && status !== "stale") || !asOfUtc) return null;
  const products = row.products.map(parseProduct);
  const bundles = row.bundles.map(parseBundle);
  if (products.some((item) => item === null) || bundles.some((item) => item === null)) return null;
  return {
    version,
    products: products as CommerceCatalogProduct[],
    bundles: bundles as CommerceCatalogBundle[],
    freshness: { status, asOfUtc },
  };
}

async function serverRequest(path: string, init?: RequestInit): Promise<Response | null> {
  const token = await getServerAdminAccessToken();
  if (!token) return null;
  const config = getPublicRuntimeConfig();
  try {
    return await fetch(`${config.adminApiUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return null;
  }
}

export async function getCommerceCatalogV2(input?: {
  product?: string;
  includeHidden?: boolean;
}): Promise<CommerceCatalogV2Result> {
  const product = input?.product?.trim().toLowerCase();
  if (product && !CODE.test(product)) return { kind: "invalid" };
  const search = new URLSearchParams();
  if (product) search.set("product", product);
  if (input?.includeHidden) search.set("includeHidden", "true");
  const suffix = search.size ? `?${search.toString()}` : "";
  const response = await serverRequest(`/api/v1/commerce/catalog-v2${suffix}`);
  if (!response) return { kind: "unauthenticated" };
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 400) return { kind: "invalid" };
  if (!response.ok) {
    const correlationId = response.headers.get("x-correlation-id") ?? undefined;
    return { kind: "unavailable", correlationId };
  }
  try {
    const parsed = parseCatalog((await response.json()) as unknown);
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }
}

export async function mutateCommerceCatalogV2(
  path: string,
  method: "POST" | "PUT",
  payload: Record<string, unknown>,
  idempotencyKey: string,
): Promise<CommerceCatalogMutationResult> {
  if (!path.startsWith("/api/v1/commerce/catalog-v2/") || idempotencyKey.length < 8) {
    return { kind: "invalid", message: "Catalog mutation request is invalid." };
  }
  const response = await serverRequest(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  if (!response) return { kind: "unauthenticated" };
  let body: Record<string, unknown> | null = null;
  try {
    const value = (await response.json()) as unknown;
    body =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
  } catch {
    body = null;
  }
  const message =
    body && typeof body.detail === "string"
      ? body.detail
      : body && typeof body.message === "string"
        ? body.message
        : undefined;
  if (response.ok) {
    return { kind: "ok", replayed: body?.replayed === true };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 409) return { kind: "conflict", message };
  if (response.status >= 400 && response.status < 500) return { kind: "invalid", message };
  return {
    kind: "unavailable",
    message,
    correlationId: response.headers.get("x-correlation-id") ?? undefined,
  };
}
