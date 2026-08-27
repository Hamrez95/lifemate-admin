"use server";

import { revalidatePath } from "next/cache";

import { mutateCommerceCatalogV2 } from "@/src/lib/admin-api/commerce-catalog-v2";

export type CatalogActionState = { status: "idle" | "success" | "error"; message: string };
export const initialCatalogActionState: CatalogActionState = { status: "idle", message: "" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE = /^[a-z0-9][a-z0-9._-]{1,127}$/;
const ZONED_INSTANT = /(?:[zZ]|[+-]\d{2}:\d{2})$/;

function text(form: FormData, name: string, min: number, max: number): string | null {
  const value = form.get(name);
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length >= min && normalized.length <= max ? normalized : null;
}

function integer(form: FormData, name: string, min: number, max = Number.MAX_SAFE_INTEGER) {
  const raw = text(form, name, 1, 24);
  if (!raw || !/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= min && value <= max ? value : null;
}

function bool(form: FormData, name: string) {
  const value = form.get(name);
  return value === "true" ? true : value === "false" ? false : null;
}

function lifecycle(form: FormData, name = "status") {
  const value = text(form, name, 6, 9);
  return value === "Hidden" || value === "Published" || value === "Retired" ? value : null;
}

function resultState(
  result: Awaited<ReturnType<typeof mutateCommerceCatalogV2>>,
): CatalogActionState {
  if (result.kind === "ok") {
    return {
      status: "success",
      message: result.replayed ? "درخواست قبلی با همان کلید بازیابی شد." : "تغییر کاتالوگ ثبت شد.",
    };
  }
  if (result.kind === "forbidden")
    return { status: "error", message: "مجوز commerce.catalog.write وجود ندارد." };
  if (result.kind === "unauthenticated")
    return { status: "error", message: "نشست مدیریتی معتبر نیست." };
  return {
    status: "error",
    message: result.message ?? "تغییر کاتالوگ کامل نشد؛ وضعیت را تازه‌سازی کنید.",
  };
}

async function mutate(
  path: string,
  method: "POST" | "PUT",
  payload: Record<string, unknown>,
  key: string,
) {
  const state = resultState(await mutateCommerceCatalogV2(path, method, payload, key));
  if (state.status === "success") revalidatePath("/commerce/catalog");
  return state;
}

export async function updateProductAction(
  _previous: CatalogActionState,
  form: FormData,
): Promise<CatalogActionState> {
  const id = text(form, "productId", 36, 36);
  const name = text(form, "name", 2, 120);
  const status = lifecycle(form);
  const expectedVersion = integer(form, "expectedVersion", 1);
  const reason = text(form, "reason", 10, 1000);
  const key = text(form, "idempotencyKey", 8, 180);
  if (!id || !UUID.test(id) || !name || !status || expectedVersion === null || !reason || !key) {
    return { status: "error", message: "اطلاعات Product معتبر نیست." };
  }
  return mutate(
    `/api/v1/commerce/catalog-v2/products/${id}`,
    "PUT",
    { name, status, expectedVersion, reason },
    key,
  );
}

export async function createOfferAction(
  _previous: CatalogActionState,
  form: FormData,
): Promise<CatalogActionState> {
  const productId = text(form, "productId", 36, 36);
  const code = text(form, "code", 2, 64)?.toLowerCase();
  const name = text(form, "name", 2, 120);
  const durationMonths = integer(form, "durationMonths", 1, 120);
  const status = lifecycle(form);
  const giftEligible = bool(form, "giftEligible");
  const reason = text(form, "reason", 10, 1000);
  const key = text(form, "idempotencyKey", 8, 180);
  if (
    !productId ||
    !UUID.test(productId) ||
    !code ||
    !CODE.test(code) ||
    !name ||
    durationMonths === null ||
    !status ||
    giftEligible === null ||
    !reason ||
    !key
  ) {
    return { status: "error", message: "اطلاعات Offer معتبر نیست." };
  }
  return mutate(
    "/api/v1/commerce/catalog-v2/offers",
    "POST",
    { productId, code, name, durationMonths, status, giftEligible, reason },
    key,
  );
}

export async function updateOfferAction(
  _previous: CatalogActionState,
  form: FormData,
): Promise<CatalogActionState> {
  const offerId = text(form, "offerId", 36, 36);
  const name = text(form, "name", 2, 120);
  const durationMonths = integer(form, "durationMonths", 1, 120);
  const status = lifecycle(form);
  const giftEligible = bool(form, "giftEligible");
  const expectedVersion = integer(form, "expectedVersion", 1);
  const reason = text(form, "reason", 10, 1000);
  const key = text(form, "idempotencyKey", 8, 180);
  if (
    !offerId ||
    !UUID.test(offerId) ||
    !name ||
    durationMonths === null ||
    !status ||
    giftEligible === null ||
    expectedVersion === null ||
    !reason ||
    !key
  ) {
    return { status: "error", message: "اطلاعات Offer معتبر نیست." };
  }
  return mutate(
    `/api/v1/commerce/catalog-v2/offers/${offerId}`,
    "PUT",
    { name, durationMonths, status, giftEligible, expectedVersion, reason },
    key,
  );
}

export async function schedulePriceAction(
  _previous: CatalogActionState,
  form: FormData,
): Promise<CatalogActionState> {
  const offerId = text(form, "offerId", 36, 36);
  const countryRaw = text(form, "countryCode", 0, 2);
  const countryCode = countryRaw ? countryRaw.toUpperCase() : null;
  const currency = text(form, "currency", 3, 3)?.toUpperCase();
  const storeProvider = text(form, "storeProvider", 2, 40)?.toLowerCase();
  const amountMinor = text(form, "amountMinor", 1, 19);
  const effectiveFromUtc = text(form, "effectiveFromUtc", 10, 64);
  const reason = text(form, "reason", 10, 1000);
  const key = text(form, "idempotencyKey", 8, 180);
  if (
    !offerId ||
    !UUID.test(offerId) ||
    (countryCode && !/^[A-Z]{2}$/.test(countryCode)) ||
    !currency ||
    !/^[A-Z]{3}$/.test(currency) ||
    !storeProvider ||
    !amountMinor ||
    !/^\d+$/.test(amountMinor) ||
    !effectiveFromUtc ||
    !ZONED_INSTANT.test(effectiveFromUtc) ||
    Number.isNaN(Date.parse(effectiveFromUtc)) ||
    !reason ||
    !key
  ) {
    return {
      status: "error",
      message: "اطلاعات قیمت معتبر نیست؛ زمان باید ISO-8601 با Z یا offset باشد.",
    };
  }
  return mutate(
    `/api/v1/commerce/catalog-v2/offers/${offerId}/prices`,
    "POST",
    {
      countryCode,
      currency,
      storeProvider,
      amountMinor,
      effectiveFromUtc: new Date(effectiveFromUtc).toISOString(),
      reason,
    },
    key,
  );
}

export async function upsertPolicyAction(
  _previous: CatalogActionState,
  form: FormData,
): Promise<CatalogActionState> {
  const productId = text(form, "productId", 36, 36);
  const policyKey = text(form, "policyKey", 2, 128)?.toLowerCase();
  const valueType = text(form, "valueType", 4, 7);
  const rawValue = text(form, "value", 1, 4096);
  const status = text(form, "policyStatus", 6, 7);
  const expectedVersionRaw = text(form, "expectedVersion", 0, 24);
  const expectedVersion = expectedVersionRaw ? Number(expectedVersionRaw) : null;
  const reason = text(form, "reason", 10, 1000);
  const key = text(form, "idempotencyKey", 8, 180);
  if (
    !productId ||
    !UUID.test(productId) ||
    !policyKey ||
    !CODE.test(policyKey) ||
    !["integer", "boolean", "string", "json"].includes(valueType ?? "") ||
    !rawValue ||
    (status !== "Active" && status !== "Retired") ||
    (expectedVersion !== null && (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1)) ||
    !reason ||
    !key
  ) {
    return { status: "error", message: "اطلاعات Policy معتبر نیست." };
  }
  let value: unknown = rawValue;
  try {
    if (valueType === "integer") value = Number(rawValue);
    if (valueType === "boolean") {
      if (rawValue !== "true" && rawValue !== "false") throw new Error();
      value = rawValue === "true";
    }
    if (valueType === "json") {
      value = JSON.parse(rawValue);
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    }
    if (valueType === "integer" && (!Number.isSafeInteger(value) || Number(value) < 0))
      throw new Error();
  } catch {
    return { status: "error", message: "مقدار Policy با نوع انتخاب‌شده سازگار نیست." };
  }
  return mutate(
    `/api/v1/commerce/catalog-v2/products/${productId}/policies/${encodeURIComponent(policyKey)}`,
    "PUT",
    { valueType, value, status, expectedVersion, reason },
    key,
  );
}

function offerIds(form: FormData): string[] | null {
  const raw = text(form, "offerIds", 36, 2000);
  if (!raw) return null;
  const ids = raw
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (
    ids.length < 1 ||
    ids.length > 32 ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !UUID.test(id))
  )
    return null;
  return ids;
}

export async function createBundleAction(
  _previous: CatalogActionState,
  form: FormData,
): Promise<CatalogActionState> {
  const code = text(form, "code", 2, 64)?.toLowerCase();
  const name = text(form, "name", 2, 120);
  const status = lifecycle(form);
  const giftEligible = bool(form, "giftEligible");
  const ids = offerIds(form);
  const reason = text(form, "reason", 10, 1000);
  const key = text(form, "idempotencyKey", 8, 180);
  if (
    !code ||
    !CODE.test(code) ||
    !name ||
    !status ||
    giftEligible === null ||
    !ids ||
    !reason ||
    !key
  )
    return { status: "error", message: "اطلاعات Bundle معتبر نیست." };
  return mutate(
    "/api/v1/commerce/catalog-v2/bundles",
    "POST",
    { code, name, status, giftEligible, offerIds: ids, reason },
    key,
  );
}

export async function updateBundleAction(
  _previous: CatalogActionState,
  form: FormData,
): Promise<CatalogActionState> {
  const bundleId = text(form, "bundleId", 36, 36);
  const name = text(form, "name", 2, 120);
  const status = lifecycle(form);
  const giftEligible = bool(form, "giftEligible");
  const ids = offerIds(form);
  const expectedVersion = integer(form, "expectedVersion", 1);
  const reason = text(form, "reason", 10, 1000);
  const key = text(form, "idempotencyKey", 8, 180);
  if (
    !bundleId ||
    !UUID.test(bundleId) ||
    !name ||
    !status ||
    giftEligible === null ||
    !ids ||
    expectedVersion === null ||
    !reason ||
    !key
  )
    return { status: "error", message: "اطلاعات Bundle معتبر نیست." };
  return mutate(
    `/api/v1/commerce/catalog-v2/bundles/${bundleId}`,
    "PUT",
    { name, status, giftEligible, offerIds: ids, expectedVersion, reason },
    key,
  );
}
