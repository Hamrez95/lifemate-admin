import "server-only";

import {
  parseCommerceTrialMutationSuccess,
  parseCommerceTrialReadEnvelope,
  type CommerceTrialPolicy,
  type CommerceTrialPolicyMutationSuccess,
} from "@/src/lib/admin-api/commerce-trial-policy-contract";
import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";
import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

export type CommerceTrialPolicyReadResult =
  | {
      kind: "ok";
      policy: CommerceTrialPolicy | null;
      freshness: { status: "fresh"; asOfUtc: string };
    }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "not_found" }
  | { kind: "unavailable"; correlationId?: string };

export type CommerceTrialPolicyMutationResult =
  | { kind: "ok"; data: CommerceTrialPolicyMutationSuccess }
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; code?: string; message?: string }
  | { kind: "not_found"; code?: string; message?: string }
  | { kind: "conflict"; code?: string; message?: string }
  | { kind: "invalid"; code?: string; message?: string }
  | { kind: "unavailable"; correlationId?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9._:-]{8,180}$/;

type Problem = { code?: string; message?: string; correlationId?: string };

async function problem(response: Response): Promise<Problem> {
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
    return { correlationId: response.headers.get("x-correlation-id") ?? undefined };
  }
}

function validMutationInput(input: {
  planId: string;
  durationDays: number;
  expectedVersion: number;
  reason: string;
  idempotencyKey: string;
}) {
  const reason = input.reason.trim();
  return (
    UUID.test(input.planId) &&
    Number.isInteger(input.durationDays) &&
    input.durationDays >= 1 &&
    input.durationDays <= 365 &&
    Number.isInteger(input.expectedVersion) &&
    input.expectedVersion >= 0 &&
    input.expectedVersion <= 1_000_000_000 &&
    reason.length >= 10 &&
    reason.length <= 1000 &&
    IDEMPOTENCY_KEY.test(input.idempotencyKey)
  );
}

export async function getCommerceTrialPolicy(
  planId: string,
): Promise<CommerceTrialPolicyReadResult> {
  if (!UUID.test(planId)) return { kind: "not_found" };
  const token = await getServerAdminAccessToken();
  if (!token) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();

  let response: Response;
  try {
    response = await fetch(`${config.adminApiUrl}/api/v1/commerce/plans/${planId}/trial-policy`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }

  if (response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { kind: "unavailable" };
    }
    const parsed = parseCommerceTrialReadEnvelope(body);
    return parsed ? { kind: "ok", ...parsed } : { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 404) return { kind: "not_found" };
  return { kind: "unavailable", correlationId: (await problem(response)).correlationId };
}

export async function configureCommerceTrialPolicy(input: {
  planId: string;
  durationDays: number;
  eligibilityRule: "NoPriorTrialForProduct";
  status: "Active" | "Disabled";
  expectedVersion: number;
  reason: string;
  idempotencyKey: string;
}): Promise<CommerceTrialPolicyMutationResult> {
  if (!validMutationInput(input) || input.eligibilityRule !== "NoPriorTrialForProduct") {
    return { kind: "invalid", message: "Trial policy request is invalid." };
  }
  const token = await getServerAdminAccessToken();
  if (!token) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();

  let response: Response;
  try {
    response = await fetch(
      `${config.adminApiUrl}/api/v1/commerce/plans/${input.planId}/trial-policy`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify({
          durationDays: input.durationDays,
          eligibilityRule: input.eligibilityRule,
          status: input.status,
          expectedVersion: input.expectedVersion,
          reason: input.reason.trim(),
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch {
    return { kind: "unavailable" };
  }

  if (response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { kind: "unavailable" };
    }
    const parsed = parseCommerceTrialMutationSuccess(body);
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }

  const issue = await problem(response);
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) {
    return { kind: "forbidden", code: issue.code, message: issue.message };
  }
  if (response.status === 404) {
    return { kind: "not_found", code: issue.code, message: issue.message };
  }
  if (response.status === 409) {
    return { kind: "conflict", code: issue.code, message: issue.message };
  }
  if (response.status === 400) {
    return { kind: "invalid", code: issue.code, message: issue.message };
  }
  return { kind: "unavailable", correlationId: issue.correlationId };
}
