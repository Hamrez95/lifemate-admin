import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export const promotionStatuses = ["Draft", "Active", "Paused", "Expired"] as const;
export type PromotionStatus = (typeof promotionStatuses)[number];
export type PromotionDiscountType = "Percentage" | "FixedAmount";
export type DiscountCodeStatus = "Active" | "Disabled";

type RedemptionSummary = {
  state: "unavailable";
  count: null;
  reason: string;
};

export type CommercePromotionRow = {
  promotionId: string;
  name: string;
  description: string | null;
  product: null | { id: string; code: string; name: string };
  discount: {
    type: PromotionDiscountType;
    percentageBasisPoints: number | null;
    fixedAmountMinor: string | null;
    currency: string | null;
  };
  storedStatus: PromotionStatus;
  effectiveStatus: PromotionStatus;
  startsAtUtc: string;
  endsAtUtc: string | null;
  maxRedemptions: number | null;
  primaryCodeMasked: string | null;
  primaryCodeStatus: DiscountCodeStatus | null;
  primaryCodeMaxRedemptions: number | null;
  codeCount: number;
  redemptionSummary: RedemptionSummary;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type CommercePromotionsResponse = {
  products: Array<{ id: string; code: string; name: string }>;
  summary: { total: number; draft: number; active: number; paused: number; expired: number };
  items: CommercePromotionRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: {
    product: string | null;
    status: PromotionStatus | null;
    q: string | null;
    code: string | null;
  };
  source: { kind: "canonical"; label: string };
  freshness: { status: "fresh" | "stale"; asOfUtc: string };
};

export type CommercePromotionDetail = {
  promotion: Omit<
    CommercePromotionRow,
    "primaryCodeMasked" | "primaryCodeStatus" | "primaryCodeMaxRedemptions" | "codeCount"
  >;
  codes: Array<{
    codeId: string;
    code: string;
    status: DiscountCodeStatus;
    maxRedemptions: number | null;
    redemptionSummary: RedemptionSummary;
    createdAtUtc: string;
    updatedAtUtc: string;
  }>;
  auditEvidence:
    | { state: "forbidden" }
    | {
        state: "ready";
        items: Array<{
          auditEventId: string;
          action: string;
          result: string;
          reason: string | null;
          correlationId: string;
          actorLinked: boolean;
          occurredAtUtc: string;
        }>;
      };
  source: { kind: "canonical"; label: string };
  freshness: { status: "fresh" | "stale"; asOfUtc: string };
};

export type PromotionWritePayload = {
  productId: string | null;
  name: string;
  description: string | null;
  discountType: PromotionDiscountType;
  percentageBasisPoints: number | null;
  fixedAmountMinor: string | null;
  currency: string | null;
  startsAtUtc: string;
  endsAtUtc: string | null;
  maxRedemptions: number | null;
  primaryCode: string;
  codeMaxRedemptions: number | null;
  reason: string;
};

export type PromotionUpdatePayload = PromotionWritePayload & {
  codeStatus: DiscountCodeStatus;
};

export type PromotionReadResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "not_found" }
  | { kind: "invalid"; code?: string; message?: string }
  | { kind: "unavailable"; correlationId?: string };

export type PromotionMutationResult =
  | { kind: "ok"; data: Record<string, unknown> }
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; message?: string }
  | { kind: "not_found"; message?: string }
  | { kind: "conflict"; code?: string; message?: string }
  | { kind: "invalid"; code?: string; message?: string }
  | { kind: "unavailable"; correlationId?: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;
const AMOUNT_PATTERN = /^\d+$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9._-]{2,63}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isUuid(value: unknown): value is string {
  return isString(value) && UUID_PATTERN.test(value);
}

function isDateTime(value: unknown): value is string {
  return isString(value) && value.length <= 64 && !Number.isNaN(Date.parse(value));
}

function isNullableDateTime(value: unknown): value is string | null {
  return value === null || isDateTime(value);
}

function isNullableText(value: unknown, max = 1000): value is string | null {
  return value === null || (isString(value) && value.length <= max);
}

function isNullablePositiveInteger(value: unknown): value is number | null {
  return value === null || (Number.isInteger(value) && Number(value) > 0);
}

function isStatus(value: unknown): value is PromotionStatus {
  return isString(value) && promotionStatuses.includes(value as PromotionStatus);
}

function isCodeStatus(value: unknown): value is DiscountCodeStatus {
  return value === "Active" || value === "Disabled";
}

function parseProduct(
  value: unknown,
): { id: string; code: string; name: string } | null | undefined {
  if (value === null) return null;
  if (!isRecord(value) || !isUuid(value.id) || !isString(value.code) || !isString(value.name)) {
    return undefined;
  }
  return { id: value.id, code: value.code, name: value.name };
}

function parseRedemption(value: unknown): RedemptionSummary | null {
  if (
    !isRecord(value) ||
    value.state !== "unavailable" ||
    value.count !== null ||
    !isString(value.reason)
  ) {
    return null;
  }
  return { state: "unavailable", count: null, reason: value.reason };
}

function parseDiscount(value: unknown): CommercePromotionRow["discount"] | null {
  if (!isRecord(value) || (value.type !== "Percentage" && value.type !== "FixedAmount")) {
    return null;
  }
  const percentage = value.percentageBasisPoints;
  const fixed = value.fixedAmountMinor;
  const currency = value.currency;
  if (
    !(percentage === null || Number.isInteger(percentage)) ||
    !(fixed === null || (isString(fixed) && AMOUNT_PATTERN.test(fixed))) ||
    !(currency === null || (isString(currency) && CURRENCY_PATTERN.test(currency)))
  ) {
    return null;
  }
  if (value.type === "Percentage" && (percentage === null || fixed !== null || currency !== null)) {
    return null;
  }
  if (
    value.type === "FixedAmount" &&
    (fixed === null || currency === null || percentage !== null)
  ) {
    return null;
  }
  return {
    type: value.type,
    percentageBasisPoints: percentage as number | null,
    fixedAmountMinor: fixed as string | null,
    currency: currency as string | null,
  };
}

function parsePromotion(value: unknown, list: boolean): CommercePromotionRow | null {
  if (!isRecord(value)) return null;
  const product = parseProduct(value.product);
  const discount = parseDiscount(value.discount);
  const redemptionSummary = parseRedemption(value.redemptionSummary);
  if (
    product === undefined ||
    !discount ||
    !redemptionSummary ||
    !isUuid(value.promotionId) ||
    !isString(value.name) ||
    !isNullableText(value.description) ||
    !isStatus(value.storedStatus) ||
    !isStatus(value.effectiveStatus) ||
    !isDateTime(value.startsAtUtc) ||
    !isNullableDateTime(value.endsAtUtc) ||
    !isNullablePositiveInteger(value.maxRedemptions) ||
    !isDateTime(value.createdAtUtc) ||
    !isDateTime(value.updatedAtUtc)
  ) {
    return null;
  }
  if (list) {
    if (
      !(value.primaryCodeMasked === null || isString(value.primaryCodeMasked)) ||
      !(value.primaryCodeStatus === null || isCodeStatus(value.primaryCodeStatus)) ||
      !isNullablePositiveInteger(value.primaryCodeMaxRedemptions) ||
      !Number.isInteger(value.codeCount) ||
      Number(value.codeCount) < 0
    ) {
      return null;
    }
  }
  return {
    promotionId: value.promotionId,
    name: value.name,
    description: value.description,
    product,
    discount,
    storedStatus: value.storedStatus,
    effectiveStatus: value.effectiveStatus,
    startsAtUtc: value.startsAtUtc,
    endsAtUtc: value.endsAtUtc,
    maxRedemptions: value.maxRedemptions,
    primaryCodeMasked: list ? (value.primaryCodeMasked as string | null) : null,
    primaryCodeStatus: list ? (value.primaryCodeStatus as DiscountCodeStatus | null) : null,
    primaryCodeMaxRedemptions: list ? (value.primaryCodeMaxRedemptions as number | null) : null,
    codeCount: list ? Number(value.codeCount) : 0,
    redemptionSummary,
    createdAtUtc: value.createdAtUtc,
    updatedAtUtc: value.updatedAtUtc,
  };
}

function parseFreshness(value: unknown): { status: "fresh" | "stale"; asOfUtc: string } | null {
  if (
    !isRecord(value) ||
    (value.status !== "fresh" && value.status !== "stale") ||
    !isDateTime(value.asOfUtc)
  ) {
    return null;
  }
  return { status: value.status, asOfUtc: value.asOfUtc };
}

function parseList(value: unknown): CommercePromotionsResponse | null {
  if (!isRecord(value) || !Array.isArray(value.products) || !Array.isArray(value.items))
    return null;
  const products = value.products.map(parseProduct);
  const items = value.items.map((item) => parsePromotion(item, true));
  if (products.some((item) => !item) || items.some((item) => !item)) return null;
  if (!isRecord(value.summary) || !isRecord(value.filters) || !isRecord(value.source)) return null;
  const summary = value.summary;
  const summaryKeys = ["total", "draft", "active", "paused", "expired"] as const;
  if (summaryKeys.some((key) => !Number.isInteger(summary[key]) || Number(summary[key]) < 0)) {
    return null;
  }
  if (
    !Number.isInteger(value.total) ||
    !Number.isInteger(value.page) ||
    !Number.isInteger(value.pageSize)
  ) {
    return null;
  }
  const freshness = parseFreshness(value.freshness);
  if (!freshness || value.source.kind !== "canonical" || !isString(value.source.label)) return null;
  return {
    products: products as Array<{ id: string; code: string; name: string }>,
    summary: {
      total: Number(summary.total),
      draft: Number(summary.draft),
      active: Number(summary.active),
      paused: Number(summary.paused),
      expired: Number(summary.expired),
    },
    items: items as CommercePromotionRow[],
    total: Number(value.total),
    page: Number(value.page),
    pageSize: Number(value.pageSize),
    filters: {
      product: typeof value.filters.product === "string" ? value.filters.product : null,
      status: isStatus(value.filters.status) ? value.filters.status : null,
      q: typeof value.filters.q === "string" ? value.filters.q : null,
      code: typeof value.filters.code === "string" ? value.filters.code : null,
    },
    source: { kind: "canonical", label: value.source.label },
    freshness,
  };
}

function parseDetail(value: unknown): CommercePromotionDetail | null {
  if (!isRecord(value)) return null;
  const row = parsePromotion(value.promotion, false);
  if (
    !row ||
    !Array.isArray(value.codes) ||
    !isRecord(value.auditEvidence) ||
    !isRecord(value.source)
  ) {
    return null;
  }
  const codes = value.codes.map((candidate) => {
    if (!isRecord(candidate)) return null;
    const redemptionSummary = parseRedemption(candidate.redemptionSummary);
    if (
      !redemptionSummary ||
      !isUuid(candidate.codeId) ||
      !isString(candidate.code) ||
      !CODE_PATTERN.test(candidate.code) ||
      !isCodeStatus(candidate.status) ||
      !isNullablePositiveInteger(candidate.maxRedemptions) ||
      !isDateTime(candidate.createdAtUtc) ||
      !isDateTime(candidate.updatedAtUtc)
    ) {
      return null;
    }
    return {
      codeId: candidate.codeId,
      code: candidate.code,
      status: candidate.status,
      maxRedemptions: candidate.maxRedemptions,
      redemptionSummary,
      createdAtUtc: candidate.createdAtUtc,
      updatedAtUtc: candidate.updatedAtUtc,
    };
  });
  if (codes.some((item) => item === null)) return null;
  let auditEvidence: CommercePromotionDetail["auditEvidence"];
  if (value.auditEvidence.state === "forbidden") {
    auditEvidence = { state: "forbidden" };
  } else if (value.auditEvidence.state === "ready" && Array.isArray(value.auditEvidence.items)) {
    const items = value.auditEvidence.items.map((event) => {
      if (
        !isRecord(event) ||
        !isUuid(event.auditEventId) ||
        !isString(event.action) ||
        !isString(event.result) ||
        !isNullableText(event.reason) ||
        !isUuid(event.correlationId) ||
        typeof event.actorLinked !== "boolean" ||
        !isDateTime(event.occurredAtUtc)
      ) {
        return null;
      }
      return {
        auditEventId: event.auditEventId,
        action: event.action,
        result: event.result,
        reason: event.reason,
        correlationId: event.correlationId,
        actorLinked: event.actorLinked,
        occurredAtUtc: event.occurredAtUtc,
      };
    });
    if (items.some((item) => item === null)) return null;
    auditEvidence = { state: "ready", items: items as NonNullable<(typeof items)[number]>[] };
  } else {
    return null;
  }
  const freshness = parseFreshness(value.freshness);
  if (!freshness || value.source.kind !== "canonical" || !isString(value.source.label)) return null;
  const detailPromotion: CommercePromotionDetail["promotion"] = {
    promotionId: row.promotionId,
    name: row.name,
    description: row.description,
    product: row.product,
    discount: row.discount,
    storedStatus: row.storedStatus,
    effectiveStatus: row.effectiveStatus,
    startsAtUtc: row.startsAtUtc,
    endsAtUtc: row.endsAtUtc,
    maxRedemptions: row.maxRedemptions,
    redemptionSummary: row.redemptionSummary,
    createdAtUtc: row.createdAtUtc,
    updatedAtUtc: row.updatedAtUtc,
  };
  return {
    promotion: detailPromotion,
    codes: codes as CommercePromotionDetail["codes"],
    auditEvidence,
    source: { kind: "canonical", label: value.source.label },
    freshness,
  };
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

async function problem(
  response: Response,
): Promise<{ code?: string; message?: string; correlationId?: string }> {
  try {
    const body = (await response.json()) as Record<string, unknown>;
    return {
      code: typeof body.code === "string" ? body.code : undefined,
      message:
        typeof body.detail === "string"
          ? body.detail
          : typeof body.message === "string"
            ? body.message
            : undefined,
      correlationId: typeof body.correlationId === "string" ? body.correlationId : undefined,
    };
  } catch {
    return {};
  }
}

async function authorizedFetch(path: string, init?: RequestInit): Promise<Response | null> {
  const token = await accessToken();
  if (!token) return null;
  const config = getPublicRuntimeConfig();
  return fetch(`${config.adminApiUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
}

function mapReadFailure(
  response: Response,
  issue: Awaited<ReturnType<typeof problem>>,
): PromotionReadResult<never> {
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 404) return { kind: "not_found" };
  if (response.status === 400) return { kind: "invalid", code: issue.code, message: issue.message };
  return { kind: "unavailable", correlationId: issue.correlationId };
}

function mapMutationFailure(
  response: Response,
  issue: Awaited<ReturnType<typeof problem>>,
): PromotionMutationResult {
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden", message: issue.message };
  if (response.status === 404) return { kind: "not_found", message: issue.message };
  if (response.status === 409)
    return { kind: "conflict", code: issue.code, message: issue.message };
  if (response.status === 400) return { kind: "invalid", code: issue.code, message: issue.message };
  return { kind: "unavailable", correlationId: issue.correlationId };
}

export async function getCommercePromotions(
  params: URLSearchParams,
): Promise<PromotionReadResult<CommercePromotionsResponse>> {
  let response: Response;
  try {
    const fetched = await authorizedFetch(`/api/v1/commerce/promotions?${params.toString()}`);
    if (!fetched) return { kind: "unauthenticated" };
    response = fetched;
  } catch {
    return { kind: "unavailable" };
  }
  if (response.ok) {
    const parsed = parseList(await response.json());
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  return mapReadFailure(response, await problem(response));
}

export async function getCommercePromotionDetail(
  promotionId: string,
): Promise<PromotionReadResult<CommercePromotionDetail>> {
  if (!UUID_PATTERN.test(promotionId)) return { kind: "not_found" };
  let response: Response;
  try {
    const fetched = await authorizedFetch(`/api/v1/commerce/promotions/${promotionId}`);
    if (!fetched) return { kind: "unauthenticated" };
    response = fetched;
  } catch {
    return { kind: "unavailable" };
  }
  if (response.ok) {
    const parsed = parseDetail(await response.json());
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  return mapReadFailure(response, await problem(response));
}

async function mutatePromotion(
  path: string,
  method: "POST" | "PUT",
  body: unknown,
  idempotencyKey: string,
): Promise<PromotionMutationResult> {
  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return { kind: "invalid", message: "شناسه امن درخواست معتبر نیست." };
  }
  let response: Response;
  try {
    const fetched = await authorizedFetch(path, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
    });
    if (!fetched) return { kind: "unauthenticated" };
    response = fetched;
  } catch {
    return { kind: "unavailable" };
  }
  if (response.ok) {
    const data = (await response.json()) as unknown;
    return isRecord(data) ? { kind: "ok", data } : { kind: "unavailable" };
  }
  return mapMutationFailure(response, await problem(response));
}

export function createCommercePromotion(payload: PromotionWritePayload, idempotencyKey: string) {
  return mutatePromotion("/api/v1/commerce/promotions", "POST", payload, idempotencyKey);
}

export function updateCommercePromotion(
  promotionId: string,
  payload: PromotionUpdatePayload,
  idempotencyKey: string,
) {
  if (!UUID_PATTERN.test(promotionId))
    return Promise.resolve({ kind: "not_found" } as PromotionMutationResult);
  return mutatePromotion(
    `/api/v1/commerce/promotions/${promotionId}`,
    "PUT",
    payload,
    idempotencyKey,
  );
}

export function setCommercePromotionStatus(
  promotionId: string,
  status: "Active" | "Paused",
  reason: string,
  idempotencyKey: string,
) {
  if (!UUID_PATTERN.test(promotionId))
    return Promise.resolve({ kind: "not_found" } as PromotionMutationResult);
  return mutatePromotion(
    `/api/v1/commerce/promotions/${promotionId}/actions/status`,
    "POST",
    { status, reason },
    idempotencyKey,
  );
}
