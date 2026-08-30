import "server-only";

import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";
import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

export type GiftTestFinalizeResult =
  | { kind: "ok"; replayed: boolean }
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; code?: string }
  | { kind: "invalid"; code?: string; message?: string }
  | { kind: "conflict"; code?: string; message?: string }
  | { kind: "unavailable"; correlationId?: string; message?: string };

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export async function finalizeGiftForInternalTest(input: {
  giftIntentId: string;
  transactionId: string;
  claimTokenHash: string;
  claimTtlHours: number;
  idempotencyKey: string;
}): Promise<GiftTestFinalizeResult> {
  const accessToken = await getServerAdminAccessToken();
  if (!accessToken) return { kind: "unauthenticated" };

  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(`${config.adminApiUrl}/api/v1/commerce/gifts/test-finalize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        giftIntentId: input.giftIntentId,
        transactionId: input.transactionId,
        claimTokenHash: input.claimTokenHash,
        claimTtlHours: input.claimTtlHours,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }

  const payload = record(await response.json().catch(() => null));
  const code = payload && typeof payload.code === "string" ? payload.code : undefined;
  const message = payload
    ? typeof payload.detail === "string"
      ? payload.detail
      : typeof payload.message === "string"
        ? payload.message
        : undefined
    : undefined;
  const correlationId =
    payload && typeof payload.correlationId === "string" ? payload.correlationId : undefined;

  if (response.ok) {
    return {
      kind: "ok",
      replayed: payload?.replayed === true,
    };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden", code };
  if (response.status === 400 || response.status === 422) return { kind: "invalid", code, message };
  if (response.status === 409) return { kind: "conflict", code, message };
  return { kind: "unavailable", correlationId, message };
}
