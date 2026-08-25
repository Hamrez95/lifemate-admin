import "server-only";

import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export type CommercePlanFeature = {
  featureId: string;
  featureCode: string;
  description: string;
  assigned: boolean;
  version: number;
  updatedAtUtc: string | null;
};

export type CommercePlanFeatureListResult =
  | { kind: "ok"; items: CommercePlanFeature[] }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "not_found" }
  | { kind: "unavailable"; correlationId?: string };

export type CommercePlanFeatureMutationResult =
  | { kind: "ok" }
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; message?: string }
  | { kind: "not_found"; message?: string }
  | { kind: "conflict"; message?: string }
  | { kind: "invalid"; message?: string }
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
      correlationId:
        typeof body.correlationId === "string" ? body.correlationId : undefined,
    };
  } catch {
    return {};
  }
}

function parseItem(value: unknown): CommercePlanFeature | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.featureId !== "string" ||
    !UUID_PATTERN.test(item.featureId) ||
    typeof item.featureCode !== "string" ||
    typeof item.description !== "string" ||
    typeof item.assigned !== "boolean" ||
    !Number.isInteger(item.version) ||
    (item.updatedAtUtc !== null && typeof item.updatedAtUtc !== "string")
  ) {
    return null;
  }
  return item as CommercePlanFeature;
}

export async function getCommercePlanFeatures(
  planId: string,
): Promise<CommercePlanFeatureListResult> {
  if (!UUID_PATTERN.test(planId)) return { kind: "not_found" };
  const token = await accessToken();
  if (!token) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();

  let response: Response;
  try {
    response = await fetch(
      `${config.adminApiUrl}/api/v1/commerce/plans/${planId}/features`,
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
    return items.every((item): item is CommercePlanFeature => item !== null)
      ? { kind: "ok", items }
      : { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 404) return { kind: "not_found" };
  return { kind: "unavailable", correlationId: (await problem(response)).correlationId };
}

export async function configureCommercePlanFeature(input: {
  planId: string;
  featureId: string;
  assigned: boolean;
  expectedVersion: number;
  reason: string;
  idempotencyKey: string;
}): Promise<CommercePlanFeatureMutationResult> {
  if (!UUID_PATTERN.test(input.planId) || !UUID_PATTERN.test(input.featureId)) {
    return { kind: "invalid", message: "شناسه پلن یا قابلیت معتبر نیست." };
  }
  if (!IDEMPOTENCY_PATTERN.test(input.idempotencyKey)) {
    return { kind: "invalid", message: "شناسه امن درخواست معتبر نیست." };
  }
  const token = await accessToken();
  if (!token) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();

  let response: Response;
  try {
    response = await fetch(
      `${config.adminApiUrl}/api/v1/commerce/plans/${input.planId}/features`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify({
          featureId: input.featureId,
          assigned: input.assigned,
          expectedVersion: input.expectedVersion,
          reason: input.reason,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch {
    return { kind: "unavailable" };
  }

  if (response.ok) return { kind: "ok" };
  const issue = await problem(response);
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden", message: issue.message };
  if (response.status === 404) return { kind: "not_found", message: issue.message };
  if (response.status === 409) return { kind: "conflict", message: issue.message };
  if (response.status === 400) return { kind: "invalid", message: issue.message };
  return { kind: "unavailable", correlationId: issue.correlationId };
}
