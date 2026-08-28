import "server-only";

import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";
import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

export type ProductVersionAdoptionItem = {
  product: string;
  platform: string;
  appVersion: string;
  buildNumber: string;
  accountCount: number;
  firstSeenAtUtc: string;
  lastSeenAtUtc: string;
  freshnessAtUtc: string;
};

export type ProductUpdatePolicy = {
  product: string;
  platform: string;
  minimumSupportedVersion: string;
  recommendedVersion: string | null;
  mode: "Soft" | "Force";
  reasonCode: "Routine" | "Critical" | "Security" | "BreakingCompatibility";
  messageKey: string | null;
  status: "Active" | "Disabled";
  policyVersion: number;
  effectiveAtUtc: string;
  updatedAtUtc: string;
};

export type AccountProductVersion = {
  accountId: string;
  product: string;
  platform: string;
  appVersion: string;
  buildNumber: string;
  rolloutCohort: string | null;
  firstSeenAtUtc: string;
  lastSeenAtUtc: string;
};

type Result<T> =
  | { kind: "ok"; data: T }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid"; message?: string }
  | { kind: "unavailable"; correlationId?: string };

async function request(path: string, init?: RequestInit): Promise<Response | null> {
  const token = await getServerAdminAccessToken();
  if (!token) return null;
  const { adminApiUrl } = getPublicRuntimeConfig();
  try {
    return await fetch(`${adminApiUrl}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}

async function mapped<T>(response: Response | null): Promise<Result<T>> {
  if (response === null) return { kind: "unauthenticated" };
  let body: Record<string, unknown> = {};
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    if (response.ok) return { kind: "unavailable" };
  }
  if (response.ok) return { kind: "ok", data: body as T };
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if ([400, 404, 409].includes(response.status)) {
    return { kind: "invalid", message: typeof body.message === "string" ? body.message : undefined };
  }
  return {
    kind: "unavailable",
    correlationId: typeof body.correlationId === "string" ? body.correlationId : undefined,
  };
}

export async function getProductVersionAdoption(input: {
  product?: string;
  platform?: string;
} = {}): Promise<Result<{ items: ProductVersionAdoptionItem[] }>> {
  const params = new URLSearchParams();
  if (input.product) params.set("product", input.product);
  if (input.platform) params.set("platform", input.platform);
  return mapped(
    await request(`/api/v1/analytics/product-version-adoption${params.size ? `?${params}` : ""}`),
  );
}

export async function getProductUpdatePolicies(): Promise<Result<{ items: ProductUpdatePolicy[] }>> {
  return mapped(await request("/api/v1/platform/product-update-policies"));
}

export async function getAccountProductVersions(
  accountId: string,
): Promise<Result<{ accountId: string; items: AccountProductVersion[] }>> {
  return mapped(await request(`/api/v1/accounts/${encodeURIComponent(accountId)}/product-versions`));
}

export async function putProductUpdatePolicy(input: {
  product: "wellmate" | "caremate";
  platform: "android" | "ios" | "web" | "windows" | "macos" | "linux";
  minimumSupportedVersion: string;
  recommendedVersion: string | null;
  mode: "Soft" | "Force";
  reasonCode: "Routine" | "Critical" | "Security" | "BreakingCompatibility";
  messageKey: string | null;
  status: "Active" | "Disabled";
  effectiveAtUtc: string;
  expectedVersion: number;
  reason: string;
  idempotencyKey: string;
}): Promise<Result<Record<string, unknown>>> {
  return mapped(
    await request("/api/v1/platform/product-update-policies", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        product: input.product,
        platform: input.platform,
        minimumSupportedVersion: input.minimumSupportedVersion,
        recommendedVersion: input.recommendedVersion,
        mode: input.mode,
        reasonCode: input.reasonCode,
        messageKey: input.messageKey,
        status: input.status,
        effectiveAtUtc: input.effectiveAtUtc,
        expectedVersion: input.expectedVersion,
        reason: input.reason,
      }),
    }),
  );
}
