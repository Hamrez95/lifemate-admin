import "server-only";

import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export type CreateCommercePlanPayload = {
  productId: string;
  code: string;
  name: string;
  reason: string;
};

export type UpdateCommercePlanPayload = {
  name: string;
  status: "Active" | "Retired";
  reason: string;
};

export type ScheduleCommercePricePayload = {
  countryCode: string | null;
  currency: string;
  storeProvider: string;
  billingPeriodMonths: number;
  amountMinor: string;
  effectiveFromUtc: string;
  reason: string;
};

export type CommerceCatalogMutationResult =
  | { kind: "ok"; data: Record<string, unknown> }
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; message?: string }
  | { kind: "not_found"; message?: string }
  | { kind: "conflict"; code?: string; message?: string }
  | { kind: "invalid"; code?: string; message?: string }
  | { kind: "unavailable"; correlationId?: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;

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

async function mutateCatalog(
  path: string,
  method: "POST" | "PUT",
  body: unknown,
  idempotencyKey: string,
): Promise<CommerceCatalogMutationResult> {
  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return { kind: "invalid", message: "شناسه امن درخواست معتبر نیست." };
  }

  const token = await accessToken();
  if (!token) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();

  let response: Response;
  try {
    response = await fetch(`${config.adminApiUrl}${path}`, {
      method,
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
  if (response.status === 409) {
    return { kind: "conflict", code: issue.code, message: issue.message };
  }
  if (response.status === 400) {
    return { kind: "invalid", code: issue.code, message: issue.message };
  }
  return { kind: "unavailable", correlationId: issue.correlationId };
}

export function createCommercePlan(
  payload: CreateCommercePlanPayload,
  idempotencyKey: string,
) {
  return mutateCatalog("/api/v1/commerce/plans", "POST", payload, idempotencyKey);
}

export function updateCommercePlan(
  planId: string,
  payload: UpdateCommercePlanPayload,
  idempotencyKey: string,
) {
  if (!UUID_PATTERN.test(planId)) {
    return Promise.resolve({ kind: "not_found" } as CommerceCatalogMutationResult);
  }
  return mutateCatalog(`/api/v1/commerce/plans/${planId}`, "PUT", payload, idempotencyKey);
}

export function scheduleCommercePrice(
  planId: string,
  payload: ScheduleCommercePricePayload,
  idempotencyKey: string,
) {
  if (!UUID_PATTERN.test(planId)) {
    return Promise.resolve({ kind: "not_found" } as CommerceCatalogMutationResult);
  }
  return mutateCatalog(
    `/api/v1/commerce/plans/${planId}/prices`,
    "POST",
    payload,
    idempotencyKey,
  );
}
