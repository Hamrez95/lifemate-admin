import "server-only";

import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export type CommerceDiscountCode = {
  codeId: string;
  code: string;
  status: "Active" | "Disabled";
  maxRedemptions: number | null;
  version: number;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type DiscountCodeListResult =
  | { kind: "ok"; items: CommerceDiscountCode[] }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "not_found" }
  | { kind: "unavailable"; correlationId?: string };

export type DiscountCodeMutationResult =
  | { kind: "ok"; data: Record<string, unknown> }
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; message?: string }
  | { kind: "not_found"; message?: string }
  | { kind: "conflict"; message?: string }
  | { kind: "invalid"; message?: string }
  | { kind: "unavailable"; correlationId?: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9._-]{2,63}$/;
const PREFIX_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,19}$/;

async function accessToken(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function problem(response: Response) {
  try {
    const body = (await response.json()) as Record<string, unknown>;
    return {
      message:
        typeof body.title === "string"
          ? body.title
          : typeof body.detail === "string"
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

function parseItem(value: unknown): CommerceDiscountCode | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.codeId !== "string" ||
    !UUID_PATTERN.test(item.codeId) ||
    typeof item.code !== "string" ||
    !CODE_PATTERN.test(item.code) ||
    (item.status !== "Active" && item.status !== "Disabled") ||
    !(item.maxRedemptions === null || (Number.isInteger(item.maxRedemptions) && Number(item.maxRedemptions) > 0)) ||
    !Number.isInteger(item.version) ||
    Number(item.version) < 1 ||
    typeof item.createdAtUtc !== "string" ||
    typeof item.updatedAtUtc !== "string"
  ) {
    return null;
  }
  return item as CommerceDiscountCode;
}

export async function getCommerceDiscountCodes(
  promotionId: string,
): Promise<DiscountCodeListResult> {
  if (!UUID_PATTERN.test(promotionId)) return { kind: "not_found" };
  const token = await accessToken();
  if (!token) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();

  let response: Response;
  try {
    response = await fetch(
      `${config.adminApiUrl}/api/v1/commerce/promotions/${promotionId}/discount-codes`,
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
    const body = (await response.json()) as Record<string, unknown>;
    if (!Array.isArray(body.items)) return { kind: "unavailable" };
    const items = body.items.map(parseItem);
    return items.every((item): item is CommerceDiscountCode => item !== null)
      ? { kind: "ok", items }
      : { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 404) return { kind: "not_found" };
  return { kind: "unavailable", correlationId: (await problem(response)).correlationId };
}

async function mutate(
  path: string,
  body: unknown,
  idempotencyKey: string,
): Promise<DiscountCodeMutationResult> {
  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return { kind: "invalid", message: "شناسه امن درخواست معتبر نیست." };
  }
  const token = await accessToken();
  if (!token) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();

  let response: Response;
  try {
    response = await fetch(`${config.adminApiUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }

  if (response.ok) {
    const data = (await response.json()) as unknown;
    return data && typeof data === "object" && !Array.isArray(data)
      ? { kind: "ok", data: data as Record<string, unknown> }
      : { kind: "unavailable" };
  }
  const issue = await problem(response);
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden", message: issue.message };
  if (response.status === 404) return { kind: "not_found", message: issue.message };
  if (response.status === 409) return { kind: "conflict", message: issue.message };
  if (response.status === 400) return { kind: "invalid", message: issue.message };
  return { kind: "unavailable", correlationId: issue.correlationId };
}

export function issueCommerceDiscountCodes(input: {
  promotionId: string;
  codes: string[] | null;
  generateCount: number | null;
  prefix: string | null;
  maxRedemptions: number | null;
  reason: string;
  idempotencyKey: string;
}) {
  if (!UUID_PATTERN.test(input.promotionId)) {
    return Promise.resolve({ kind: "not_found" } as DiscountCodeMutationResult);
  }
  if (input.codes) {
    const normalized = input.codes.map((code) => code.trim().toUpperCase());
    if (
      normalized.length < 1 ||
      normalized.length > 50 ||
      normalized.some((code) => !CODE_PATTERN.test(code)) ||
      new Set(normalized).size !== normalized.length ||
      input.generateCount !== null
    ) {
      return Promise.resolve({ kind: "invalid", message: "کدهای تخفیف معتبر نیستند." } as DiscountCodeMutationResult);
    }
  } else if (
    !Number.isInteger(input.generateCount) ||
    Number(input.generateCount) < 1 ||
    Number(input.generateCount) > 50 ||
    (input.prefix !== null && !PREFIX_PATTERN.test(input.prefix))
  ) {
    return Promise.resolve({ kind: "invalid", message: "تنظیمات تولید کد معتبر نیست." } as DiscountCodeMutationResult);
  }
  return mutate(
    `/api/v1/commerce/promotions/${input.promotionId}/discount-codes`,
    {
      codes: input.codes,
      generateCount: input.generateCount,
      prefix: input.prefix,
      maxRedemptions: input.maxRedemptions,
      reason: input.reason,
    },
    input.idempotencyKey,
  );
}

export function setCommerceDiscountCodeStatus(input: {
  promotionId: string;
  codeId: string;
  status: "Active" | "Disabled";
  expectedVersion: number;
  reason: string;
  idempotencyKey: string;
}) {
  if (!UUID_PATTERN.test(input.promotionId) || !UUID_PATTERN.test(input.codeId)) {
    return Promise.resolve({ kind: "not_found" } as DiscountCodeMutationResult);
  }
  return mutate(
    `/api/v1/commerce/promotions/${input.promotionId}/discount-codes/${input.codeId}/actions/status`,
    {
      status: input.status,
      expectedVersion: input.expectedVersion,
      reason: input.reason,
    },
    input.idempotencyKey,
  );
}
